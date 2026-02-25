/**
 * Firestore + Storage data layer for Trades.
 * All Firebase calls are centralized here.
 */

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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

/**
 * Upload a single image to Storage and return its download URL.
 */
async function uploadImageToStorage(path: string, uri: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not configured');
  const storageRef = ref(storage, path);
  let blob: Blob;
  if (uri.startsWith('data:')) {
    const res = await fetch(uri);
    blob = await res.blob();
  } else {
    const res = await fetch(uri, { method: 'GET' });
    blob = await res.blob();
  }
  await uploadBytes(storageRef, blob);
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

/**
 * Update the current user's profile. If imageUri is provided, uploads to
 * /profile-pictures/{uid}.jpg and sets profilePictureUrl.
 */
export async function updateUserProfile(
  data: UpdateUserProfileInput,
  imageUri?: string | null
): Promise<void> {
  if (!isFirebaseEnabled() || !db || !storage || !auth?.currentUser) {
    throw new Error('Firebase not configured or user not signed in.');
  }
  const uid = auth.currentUser.uid;
  const userRef = doc(db, USERS_COLLECTION, uid);

  let profilePictureUrl: string | null = null;
  if (imageUri) {
    profilePictureUrl = await uploadImageToStorage(
      `${PROFILE_PICTURES_PREFIX}/${uid}.jpg`,
      imageUri
    );
  }

  const existing = await getDoc(userRef);
  const existingData = existing.exists() ? existing.data() : {};
  await setDoc(
    userRef,
    {
      ...existingData,
      userId: uid,
      email: existingData?.email ?? auth.currentUser.email ?? '',
      displayName: data.displayName ?? existingData?.displayName ?? null,
      bio: data.bio !== undefined ? data.bio : existingData?.bio ?? null,
      location: data.location !== undefined ? data.location : existingData?.location ?? null,
      profilePictureUrl: profilePictureUrl ?? existingData?.profilePictureUrl ?? null,
    },
    { merge: true }
  );
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
