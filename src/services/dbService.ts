/**
 * Firestore + Storage data layer for Trades.
 * All Firebase calls are centralized here.
 * Image uploads use expo-file-system + uploadString (base64) to avoid React Native Blob issues.
 */

import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
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
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db, auth, isFirebaseEnabled } from '../config/firebase';
import type { Item, ValueTier, ItemCategory } from '../utils/mockData';

const ITEMS_COLLECTION = 'items';
const SWIPES_COLLECTION = 'swipes';
const USERS_COLLECTION = 'users';
const MATCHES_COLLECTION = 'matches';
const REVIEWS_COLLECTION = 'reviews';

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
 * Resize, compress, and base64-encode item photos for storage in Firestore.
 * Same approach as profile pictures — no Firebase Storage needed, no Blob issues.
 * Each photo is resized to 600×600 at 0.6 quality (~40 KB each as base64).
 */
async function uploadItemPhotos(_itemId: string, photoUris: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const uri of photoUris) {
    try {
      const resized = await manipulateAsync(
        uri,
        [{ resize: { width: 600, height: 600 } }],
        { compress: 0.6, format: SaveFormat.JPEG }
      );
      const base64 = await readAsStringAsync(resized.uri, { encoding: EncodingType.Base64 });
      results.push(`data:image/jpeg;base64,${base64}`);
    } catch (e) {
      if (__DEV__) console.warn('uploadItemPhotos failed for', uri, e);
    }
  }
  return results;
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
  imageUri?: string | null
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
      // Resize to 200×200 and compress — keeps the Firestore doc well under 1MB
      const resized = await manipulateAsync(
        imageUri,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.6, format: SaveFormat.JPEG }
      );
      const base64 = await readAsStringAsync(resized.uri, { encoding: EncodingType.Base64 });
      profilePictureUrl = `data:image/jpeg;base64,${base64}`;
    } catch (e) {
      if (__DEV__) console.error('Profile picture resize failed:', e);
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
  if (!isFirebaseEnabled() || !db) {
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
 * Fetch a single item by ID from Firestore.
 */
export async function fetchItemById(itemId: string): Promise<Item | null> {
  if (!isFirebaseEnabled() || !db) return null;
  const snap = await getDoc(doc(db, ITEMS_COLLECTION, itemId));
  if (!snap.exists()) return null;
  const data = snap.data() as FirestoreItemDoc;
  return {
    id: snap.id,
    ownerId: data.ownerId,
    title: data.title,
    description: data.description,
    photos: data.photos ?? [],
    valueTier: data.valueTier,
    pickupLocation: data.pickupLocation,
    category: data.category,
  };
}

/**
 * Fetch all active items owned by a specific user from Firestore.
 */
export async function fetchItemsByOwnerId(ownerId: string): Promise<Item[]> {
  if (!isFirebaseEnabled() || !db) return [];
  const q = query(
    collection(db, ITEMS_COLLECTION),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as FirestoreItemDoc;
    return {
      id: d.id,
      ownerId: data.ownerId,
      title: data.title,
      description: data.description,
      photos: data.photos ?? [],
      valueTier: data.valueTier,
      pickupLocation: data.pickupLocation,
      category: data.category,
    };
  });
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

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_SUBCOLLECTION = 'messages';

export interface ConversationDoc {
  id: string;
  participantIds: string[];
  itemId: string;
  lastMessage: { senderId: string; text: string; timestamp: number } | null;
}

/** Deterministic conversation ID from two user IDs. */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/** Send a message and create/update the conversation metadata doc. */
export async function sendChatMessage(
  conversationId: string,
  participantIds: string[],
  itemId: string,
  senderId: string,
  text: string
): Promise<void> {
  if (!isFirebaseEnabled() || !db) throw new Error('Firebase not configured');
  const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await setDoc(
    convRef,
    {
      participantIds,
      itemId,
      lastMessage: { senderId, text, timestamp: Date.now() },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await addDoc(collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION), {
    senderId,
    text: text.trim(),
    timestamp: serverTimestamp(),
  });
}

/** Real-time listener for messages in a conversation. Returns unsubscribe fn. */
export function listenToConversationMessages(
  conversationId: string,
  callback: (messages: Array<{ id: string; senderId: string; text: string; timestamp: number }>) => void
): () => void {
  if (!isFirebaseEnabled() || !db) return () => {};
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        senderId: String(d.data().senderId),
        text: String(d.data().text),
        timestamp: (d.data().timestamp as Timestamp | null)?.toMillis() ?? Date.now(),
      }))
    );
  });
}

/** Real-time listener for all conversations the user participates in. Returns unsubscribe fn. */
export function listenToUserConversations(
  userId: string,
  callback: (conversations: ConversationDoc[]) => void
): () => void {
  if (!isFirebaseEnabled() || !db) return () => {};
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('participantIds', 'array-contains', userId)
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        participantIds: (d.data().participantIds as string[]) ?? [],
        itemId: String(d.data().itemId ?? ''),
        lastMessage: d.data().lastMessage ?? null,
      }))
    );
  });
}

/** Fetch a single user's profile from the Firestore users collection. */
export async function fetchUserProfile(userId: string): Promise<import('../utils/mockData').User | null> {
  if (!isFirebaseEnabled() || !db) return null;
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: userId,
      displayName: String(data.displayName ?? 'Trader'),
      email: String(data.email ?? ''),
      avatarUrl: data.profilePictureUrl ?? undefined,
      bio: data.bio ?? undefined,
      location: data.location ?? undefined,
    };
  } catch {
    return null;
  }
}