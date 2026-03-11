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
  deleteDoc,
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

/** Result returned by recordSwipe — indicates whether a mutual match was made. */
export interface SwipeResult {
  matched: boolean;
  otherUserId?: string;
  otherUserName?: string;
  /** The item the current user just liked (targetItemId) */
  itemId?: string;
}

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
// Chat image helper
// ---------------------------------------------------------------------------

/**
 * Resize + base64-encode an image for use in a chat message.
 * Returns a data:image/jpeg;base64,... string safe to store in Firestore.
 */
export async function prepareImageForChat(uri: string): Promise<string> {
  const resized = await manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.55, format: SaveFormat.JPEG }
  );
  const base64 = await readAsStringAsync(resized.uri, { encoding: EncodingType.Base64 });
  return `data:image/jpeg;base64,${base64}`;
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
 * Fetch items for the swipe deck filtered by valueTier, excluding the current user's items.
 * Uses a single-field query (no composite index required) and filters status + ownerId in JS.
 * Pass tier = null to fetch across all tiers.
 */
export async function fetchSwipeDeck(
  tier: ValueTier | null,
  currentUserId: string
): Promise<Item[]> {
  if (!isFirebaseEnabled() || !db) return [];

  const base = collection(db, ITEMS_COLLECTION);
  const q = tier
    ? query(base, where('valueTier', '==', tier), limit(200))
    : query(base, limit(200));

  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => {
      const data = d.data();
      const s = data.status as string | undefined;
      return data.ownerId !== currentUserId && (!s || s === 'active');
    })
    .map((d) => {
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
    where('ownerId', '==', ownerId)
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

/** Count how many unique users swiped right on a given item. */
export async function fetchSwipeCount(itemId: string): Promise<number> {
  if (!isFirebaseEnabled() || !db) return 0;
  // Single-field query — no composite index needed. Filter direction in JS.
  const snap = await getDocs(
    query(collection(db, SWIPES_COLLECTION), where('targetItemId', '==', itemId))
  );
  const uniqueRightSwipers = new Set(
    snap.docs
      .filter((d) => d.data().direction === 'right')
      .map((d) => String(d.data().swiperId))
  );
  return uniqueRightSwipers.size;
}

/** Save or update the Expo push token for a user. */
export async function savePushToken(userId: string, token: string): Promise<void> {
  if (!isFirebaseEnabled() || !db) return;
  await setDoc(
    doc(db, USERS_COLLECTION, userId),
    { pushToken: token },
    { merge: true }
  );
}

/** Permanently delete an item document from Firestore. */
export async function deleteItem(itemId: string): Promise<void> {
  if (!isFirebaseEnabled() || !db || !auth?.currentUser) {
    throw new Error('Firebase not configured or user not signed in.');
  }
  await deleteDoc(doc(db, ITEMS_COLLECTION, itemId));
}

/** Mark an item as traded. */
export async function markItemAsTraded(itemId: string): Promise<void> {
  if (!isFirebaseEnabled() || !db || !auth?.currentUser) {
    throw new Error('Firebase not configured or user not signed in.');
  }
  await updateDoc(doc(db, ITEMS_COLLECTION, itemId), { status: 'traded' as ItemStatus });
}

/**
 * Record a swipe event in the swipes collection.
 *
 * Uses a deterministic document ID (swiperId_targetItemId) so that:
 *   - Deduplication is a single getDoc — no composite index needed
 *   - Match checking is individual getDoc lookups — no composite index needed
 *
 * On a right-swipe:
 *   - Checks for a mutual match via direct doc lookups (no queries).
 *   - If matched: creates a match document and returns matched=true so the UI opens chat.
 *   - If not matched: sends a "liked" mock notification to the item owner.
 */
export async function recordSwipe(
  targetItemId: string,
  direction: SwipeDirection,
  myActiveItemId: string | null
): Promise<SwipeResult> {
  if (!isFirebaseEnabled() || !db || !auth?.currentUser) {
    return { matched: false };
  }
  const swiperId = auth.currentUser.uid;

  // Deterministic doc ID — dedup is a single getDoc, no composite index needed
  const swipeDocId = `${swiperId}_${targetItemId}`;
  const swipeRef = doc(db, SWIPES_COLLECTION, swipeDocId);
  const existingSnap = await getDoc(swipeRef);
  if (existingSnap.exists()) return { matched: false };

  await setDoc(swipeRef, {
    swiperId,
    targetItemId,
    direction,
    myActiveItemId: myActiveItemId ?? null,
    createdAt: serverTimestamp(),
  });

  if (direction !== 'right') return { matched: false };

  try {
    // Single doc read — no index needed
    const itemSnap = await getDoc(doc(db, ITEMS_COLLECTION, targetItemId));
    if (!itemSnap.exists()) return { matched: false };
    const ownerId = String(itemSnap.data().ownerId ?? '');
    if (!ownerId || ownerId === swiperId) return { matched: false };

    // Single-field query (ownerId only) — no composite index needed.
    // Filter status in JS.
    const myItemsSnap = await getDocs(
      query(collection(db, ITEMS_COLLECTION), where('ownerId', '==', swiperId))
    );
    const myActiveItemIds = myItemsSnap.docs
      .filter((d) => {
        const s = d.data().status;
        return !s || s === 'active'; // treat missing status as active (legacy docs)
      })
      .map((d) => d.id);

    // Match check: for each of my items, look up ${ownerId}_${myItemId} directly.
    // getDoc on a known ID — zero queries, zero indexes needed.
    let matchedMyItemId: string | null = null;
    for (const myItemId of myActiveItemIds) {
      const mutualRef = doc(db, SWIPES_COLLECTION, `${ownerId}_${myItemId}`);
      const mutualSnap = await getDoc(mutualRef);
      if (mutualSnap.exists() && mutualSnap.data().direction === 'right') {
        matchedMyItemId = myItemId;
        break;
      }
    }

    if (matchedMyItemId) {
      // ── MUTUAL MATCH ──────────────────────────────────────────────────────
      await setDoc(doc(collection(db, MATCHES_COLLECTION)), {
        participantIds: [swiperId, ownerId],
        itemIds: [targetItemId, matchedMyItemId],
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Best-effort: create conversation + fetch display name + notify User A.
      // These must NOT throw — the match doc is already written and the overlay
      // must always show for the current user.
      const convId = getConversationId(swiperId, ownerId);
      ensureConversation(convId, [swiperId, ownerId].sort(), targetItemId).catch((e) => {
        if (__DEV__) console.warn('[recordSwipe] ensureConversation failed:', e);
      });

      let otherUserName = 'Trader';
      try {
        const ownerProfileSnap = await getDoc(doc(db, USERS_COLLECTION, ownerId));
        if (ownerProfileSnap.exists()) {
          const ownerData = ownerProfileSnap.data();
          otherUserName = String(ownerData.displayName ?? 'Trader');
          // Notify the OTHER user (User A) that they have a match
          const ownerPushToken = String(ownerData.pushToken ?? '');
          if (ownerPushToken) {
            const { sendPushNotification } = await import('./notificationService');
            sendPushNotification(
              ownerPushToken,
              "It's a match!",
              'You have a new trade match. Open the app to start chatting!'
            ).catch(() => {});
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('[recordSwipe] post-match steps failed:', e);
      }

      return { matched: true, otherUserId: ownerId, otherUserName, itemId: targetItemId };
    } else {
      // ── LIKE ONLY ─────────────────────────────────────────────────────────
      const ownerSnap = await getDoc(doc(db, USERS_COLLECTION, ownerId));
      const ownerToken = ownerSnap.exists() ? String(ownerSnap.data().pushToken ?? '') : '';
      if (ownerToken) {
        const { sendPushNotification } = await import('./notificationService');
        await sendPushNotification(
          ownerToken,
          'Someone liked your item!',
          'A trader is interested in your listing. Check it out!'
        );
      }
      return { matched: false };
    }
  } catch (e) {
    console.error('[recordSwipe] match check failed:', e);
    return { matched: false };
  }
}

// ---------------------------------------------------------------------------
// Matches & reviews (post-trade)
// ---------------------------------------------------------------------------

/**
 * Find the pending match that includes a given item.
 * Returns { matchId, otherUserId } or null if no match is found.
 */
export async function fetchMatchForItem(
  itemId: string
): Promise<{ matchId: string; otherUserId: string; itemIds: string[] } | null> {
  if (!isFirebaseEnabled() || !db || !auth?.currentUser) return null;
  const uid = auth.currentUser.uid;
  const q = query(
    collection(db, MATCHES_COLLECTION),
    where('itemIds', 'array-contains', itemId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const matchDoc = snap.docs[0];
  const data = matchDoc.data();
  const participants: string[] = data.participantIds ?? [];
  const otherUserId = participants.find((id) => id !== uid) ?? '';
  return { matchId: matchDoc.id, otherUserId, itemIds: data.itemIds ?? [] };
}

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

/**
 * Ensure a conversation document exists for both participants.
 * Called at match time so the chat appears in both users' lists immediately,
 * even before either user sends a message.
 */
export async function ensureConversation(
  conversationId: string,
  participantIds: string[],
  itemId: string
): Promise<void> {
  if (!isFirebaseEnabled() || !db) return;
  await setDoc(
    doc(db, CONVERSATIONS_COLLECTION, conversationId),
    { participantIds, itemId, lastMessage: null, updatedAt: serverTimestamp() },
    { merge: true }
  );
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
export interface UserReview {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  timestamp: number;
}

/** Fetch reviews left for a user (revieweeId == userId). */
export async function fetchUserReviews(userId: string): Promise<UserReview[]> {
  if (!isFirebaseEnabled() || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, REVIEWS_COLLECTION), where('revieweeId', '==', userId), limit(30))
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        reviewerName: String(data.reviewerName ?? 'Trader'),
        rating: Number(data.rating ?? 5),
        comment: String(data.text ?? data.comment ?? ''),
        timestamp: Number(data.timestamp ?? 0),
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

/** Count completed trades a user has participated in. */
export async function fetchUserTradeCount(userId: string): Promise<number> {
  if (!isFirebaseEnabled() || !db) return 0;
  try {
    const snap = await getDocs(
      query(
        collection(db, MATCHES_COLLECTION),
        where('participantIds', 'array-contains', userId),
        where('status', '==', 'completed')
      )
    );
    return snap.size;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Trade proposals
// ---------------------------------------------------------------------------

const TRADE_PROPOSALS_COLLECTION = 'tradeProposals';

export interface TradeProposal {
  id: string;
  initiatorId: string;
  receiverId: string;
  itemIds: string[];
  status: 'pending' | 'accepted' | 'declined';
}

export async function createTradeProposal(
  initiatorId: string,
  receiverId: string,
  itemIds: string[]
): Promise<string> {
  if (!isFirebaseEnabled() || !db) throw new Error('Firebase not configured');
  const ref = doc(collection(db, TRADE_PROPOSALS_COLLECTION));
  await setDoc(ref, {
    initiatorId,
    receiverId,
    itemIds,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fetchTradeProposal(proposalId: string): Promise<TradeProposal | null> {
  if (!isFirebaseEnabled() || !db) return null;
  try {
    const snap = await getDoc(doc(db, TRADE_PROPOSALS_COLLECTION, proposalId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      id: snap.id,
      initiatorId: String(d.initiatorId ?? ''),
      receiverId: String(d.receiverId ?? ''),
      itemIds: (d.itemIds as string[]) ?? [],
      status: (d.status as TradeProposal['status']) ?? 'pending',
    };
  } catch {
    return null;
  }
}

export async function acceptTradeProposal(proposalId: string): Promise<void> {
  if (!isFirebaseEnabled() || !db) throw new Error('Firebase not configured');
  const ref = doc(db, TRADE_PROPOSALS_COLLECTION, proposalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Proposal not found');
  await updateDoc(ref, { status: 'accepted' });
  const itemIds: string[] = snap.data().itemIds ?? [];
  for (const itemId of itemIds) {
    try {
      await updateDoc(doc(db, ITEMS_COLLECTION, itemId), { status: 'traded' as ItemStatus });
    } catch (e) {
      if (__DEV__) console.warn('[acceptTradeProposal] failed to mark item traded:', itemId, e);
    }
  }
}

export async function declineTradeProposal(proposalId: string): Promise<void> {
  if (!isFirebaseEnabled() || !db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, TRADE_PROPOSALS_COLLECTION, proposalId), { status: 'declined' });
}

/**
 * Real-time listener for pending proposals where the given user is the receiver.
 * Fires onNew for each newly-added pending proposal document.
 * Returns an unsubscribe function.
 */
export function listenToIncomingTradeProposals(
  receiverId: string,
  onNew: (proposal: TradeProposal) => void
): () => void {
  if (!isFirebaseEnabled() || !db) return () => {};
  const q = query(
    collection(db, TRADE_PROPOSALS_COLLECTION),
    where('receiverId', '==', receiverId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const d = change.doc.data();
        onNew({
          id: change.doc.id,
          initiatorId: String(d.initiatorId ?? ''),
          receiverId: String(d.receiverId ?? ''),
          itemIds: (d.itemIds as string[]) ?? [],
          status: 'pending',
        });
      }
    });
  });
}

export async function fetchPushToken(userId: string): Promise<string | null> {
  if (!isFirebaseEnabled() || !db) return null;
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
    return snap.exists() ? (String(snap.data().pushToken ?? '') || null) : null;
  } catch {
    return null;
  }
}
