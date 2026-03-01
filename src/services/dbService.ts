/**
 * Firestore + Storage data layer for Trades.
 * All Firebase calls are centralized here.
 * Image uploads use expo-file-system + uploadString (base64) to avoid React Native Blob issues.
 */

import { readAsStringAsync, EncodingType, uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage, auth, isFirebaseEnabled } from '../config/firebase';
import type { Item, ValueTier, ItemCategory } from '../utils/mockData';

const ITEMS_COLLECTION = 'items';
const SWIPES_COLLECTION = 'swipes';
const USERS_COLLECTION = 'users';
const MATCHES_COLLECTION = 'matches';
const REVIEWS_COLLECTION = 'reviews';
const ITEM_PHOTOS_PREFIX = 'item-photos';
const PROFILE_PICTURES_PREFIX = 'profile-pictures';

export type ItemStatus = 'active' | 'traded';

/** Shape of an item document in Firestore */
export interface FirestoreItemDoc {
  id?: string;
  ownerId: string;
  title: string;
  description: string;
  photos: string[];
  valueTier: ValueTier;
  pickupLocation: string;
  category: ItemCategory;
  status: ItemStatus;
  createdAt?: Timestamp;
}

/** Input for creating an item (no id/photos yet) */
export interface CreateItemInput {
  title: string;
  description: string;
  valueTier: ValueTier;
  pickupLocation: string;
  category: ItemCategory;
  ownerId: string;
}

/** Input for updating user profile */
export interface UpdateUserProfileInput {
  displayName?: string;
  bio?: string | null;
  location?: string | null;
}

/** Swipe direction for recordSwipe */
export type SwipeDirection = 'left' | 'right';

const UPLOAD_METADATA = { contentType: 'image/jpeg' } as const;
const PROFILE_PHOTO_UPLOAD_TIMEOUT_MS = 25_000;

/** Run a promise with a timeout; on timeout throw so caller can treat as upload failed. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

/** Get raw base64 string from URI or data URL. */
async function uriOrBase64ToBase64(uriOrDataUrl: string): Promise<string> {
  if (uriOrDataUrl.startsWith('data:')) {
    const part = uriOrDataUrl.split(',')[1];
    if (!part) throw new Error('Invalid data URL');
    return part;
  }
  return readAsStringAsync(uriOrDataUrl, { encoding: EncodingType.Base64 });
}

/**
 * Upload a single image to Storage and return its download URL.
 * Uses expo-file-system + uploadString (base64) only—no Blob/fetch (fixes RN Blob polyfill errors).
 */
async function uploadImageToStorage(
  path: string,
  uriOrBase64: string,
  isBase64?: boolean
): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not configured');
  const storageRef = ref(storage, path);
  let base64: string;
  if (isBase64) {
    base64 = uriOrBase64;
  } else if (uriOrBase64.startsWith('data:')) {
    const base64Part = uriOrBase64.split(',')[1];
    if (!base64Part) throw new Error('Invalid data URL');
    base64 = base64Part;
  } else {
    base64 = await readAsStringAsync(uriOrBase64, {
      encoding: EncodingType.Base64,
    });
  }
  // Use data_url format so Firebase SDK doesn't decode base64 to ArrayBuffer (avoids RN Blob error)
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  await uploadString(storageRef, dataUrl, 'data_url', UPLOAD_METADATA);
  return getDownloadURL(storageRef);
}

/**
 * Upload image URIs to Storage at /item-photos/{itemId}/photo_0.jpg, photo_1.jpg, ...
 */
async function uploadItemPhotos(itemId: string, photoUris: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < photoUris.length; i++) {
    const uri = photoUris[i];
    const path = `${ITEM_PHOTOS_PREFIX}/${itemId}/photo_${i}.jpg`;
    try {
      const url = await uploadImageToStorage(path, uri);
      urls.push(url);
    } catch (e) {
      if (__DEV__) console.warn('uploadItemPhotos failed for', uri, e);
    }
  }
  return urls;
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

/** Result of updateUserProfile when photo upload is skipped (e.g. timeout or network). */
export interface UpdateUserProfileResult {
  pictureUploadFailed?: boolean;
}

/**
 * Update the current user's profile. If imageUri or imageBase64 is provided, uploads via
 * Storage REST API (no Cloud Function, works on free Spark plan). On failure we still save
 * profile and set result.pictureUploadFailed.
 */
export async function updateUserProfile(
  data: UpdateUserProfileInput,
  imageUri?: string | null,
  imageBase64?: string | null
): Promise<UpdateUserProfileResult> {
  if (!isFirebaseEnabled() || !db || !auth?.currentUser) {
    throw new Error('Firebase not configured or user not signed in.');
  }
  const uid = auth.currentUser.uid;
  const userRef = doc(db, USERS_COLLECTION, uid);
  const existing = await getDoc(userRef);
  const existingData = existing.exists() ? existing.data() : {};

  let profilePictureUrl: string | null = existingData?.profilePictureUrl ?? null;
  let pictureUploadFailed = false;

  if (imageUri) {
    try {
      const uid = auth.currentUser.uid;
      
      // 1. Force the classic appspot bucket name for the REST API
      const bucket = 'trades-4903d.appspot.com'; 
      const path = `profile-pictures/${uid}.jpg`;
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(path)}`;

      // 2. Bypass React Native's broken Blob system and upload natively!
      const uploadResult = await uploadAsync(uploadUrl, imageUri, {
        httpMethod: 'POST',
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      // 3. The REST API returns JSON containing the secure download token (required for private files)
      const responseData = JSON.parse(uploadResult.body);
      const token = responseData.downloadTokens != null
        ? (Array.isArray(responseData.downloadTokens) ? responseData.downloadTokens[0] : responseData.downloadTokens)
        : responseData.metadata?.firebaseStorageDownloadTokens;

      profilePictureUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
      if (token) profilePictureUrl += `&token=${token}`;

    } catch (e) {
      console.error("Native Upload Failed:", e);
      pictureUploadFailed = true;
    }
  }

  await setDoc(
    userRef,
    {
      ...existingData,
      userId: uid,
      email: existingData?.email ?? auth.currentUser.email ?? '',
      displayName: data.displayName ?? existingData?.displayName ?? null,
      bio: data.bio !== undefined ? data.bio : existingData?.bio ?? null,
      location: data.location !== undefined ? data.location : existingData?.location ?? null,
      profilePictureUrl,
    },
    { merge: true }
  );

  return pictureUploadFailed ? { pictureUploadFailed: true } : {};
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/**
 * Create a new item: upload photos to Storage, then save the item document with status 'active'.
 */
export async function createItem(
  itemData: CreateItemInput,
  localImageUris: string[] = []
): Promise<Item> {
  if (!isFirebaseEnabled() || !db || !storage) {
    throw new Error('Firebase not configured. Use mock data for testing.');
  }
  const itemRef = doc(collection(db, ITEMS_COLLECTION));
  const itemId = itemRef.id;
  const photoUrls =
    localImageUris.length > 0 ? await uploadItemPhotos(itemId, localImageUris) : [];
  const docData: FirestoreItemDoc = {
    ownerId: itemData.ownerId,
    title: itemData.title.trim(),
    description: itemData.description.trim(),
    photos: photoUrls,
    valueTier: itemData.valueTier,
    pickupLocation: itemData.pickupLocation.trim(),
    category: itemData.category,
    status: 'active',
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(itemRef, docData);
  return {
    id: itemId,
    ownerId: docData.ownerId,
    title: docData.title,
    description: docData.description,
    photos: docData.photos,
    valueTier: docData.valueTier,
    pickupLocation: docData.pickupLocation,
    category: docData.category,
  };
}

/**
 * Fetch items for the swipe deck: valueTier == tier, status == 'active', exclude current user's items.
 */
export async function fetchSwipeDeck(
  tier: ValueTier,
  currentUserId: string
): Promise<Item[]> {
  if (!isFirebaseEnabled() || !db) {
    return [];
  }
  const q = query(
    collection(db, ITEMS_COLLECTION),
    where('valueTier', '==', tier),
    where('status', '==', 'active'),
    where('ownerId', '!=', currentUserId),
    orderBy('ownerId'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  const items: Item[] = [];
  snap.docs.forEach((d) => {
    const data = d.data() as FirestoreItemDoc;
    items.push({
      id: d.id,
      ownerId: data.ownerId,
      title: data.title,
      description: data.description,
      photos: data.photos ?? [],
      valueTier: data.valueTier,
      pickupLocation: data.pickupLocation,
      category: data.category,
    });
  });
  return items;
}

/**
 * Record a swipe event in the swipes collection.
 */
export async function recordSwipe(
  targetItemId: string,
  direction: SwipeDirection,
  myActiveItemId: string | null
): Promise<void> {
  if (!isFirebaseEnabled() || !db || !auth?.currentUser) {
    return;
  }
  await addDoc(collection(db, SWIPES_COLLECTION), {
    swiperId: auth.currentUser.uid,
    targetItemId,
    direction,
    myActiveItemId: myActiveItemId ?? null,
    createdAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Matches & reviews (post-trade)
// ---------------------------------------------------------------------------

/**
 * Mark a match as completed and set involved items' status to 'traded'.
 * Expects match doc to have: status, itemIds (array) or similar; adjust to your match schema.
 */
export async function markTradeCompleted(matchId: string): Promise<void> {
  if (!isFirebaseEnabled() || !db || !auth?.currentUser) {
    throw new Error('Firebase not configured or user not signed in.');
  }
  const matchRef = doc(db, MATCHES_COLLECTION, matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) {
    throw new Error('Match not found.');
  }
  const match = matchSnap.data();
  await updateDoc(matchRef, { status: 'completed' });
  const itemIds: string[] = match?.itemIds ?? [];
  for (const itemId of itemIds) {
    const itemRef = doc(db, ITEMS_COLLECTION, itemId);
    await updateDoc(itemRef, { status: 'traded' });
  }
}

/**
 * Submit a review. CRITICAL: Only allowed if match exists, user is a participant, and match.status === 'completed'.
 */
export async function submitReview(
  matchId: string,
  revieweeId: string,
  rating: number,
  reviewText: string
): Promise<void> {
  if (!isFirebaseEnabled() || !db || !auth?.currentUser) {
    throw new Error('Firebase not configured or user not signed in.');
  }
  const uid = auth.currentUser.uid;
  const matchRef = doc(db, MATCHES_COLLECTION, matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) {
    throw new Error('Match not found. You can only review completed trades.');
  }
  const match = matchSnap.data();
  const status = match?.status;
  if (status !== 'completed') {
    throw new Error('You can only leave a review after the trade is completed.');
  }
  const participants: string[] = match?.participantIds ?? [match?.user1Id, match?.user2Id].filter(Boolean);
  if (!participants.includes(uid) || !participants.includes(revieweeId)) {
    throw new Error('You can only review the other party in this trade.');
  }
  await addDoc(collection(db, REVIEWS_COLLECTION), {
    matchId,
    reviewerId: uid,
    revieweeId,
    rating,
    text: reviewText.trim(),
    timestamp: serverTimestamp(),
  });
}