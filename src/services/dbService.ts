/**
 * Firestore + Storage data layer for Trades.
 * All Firebase calls are centralized here. When Firebase is not configured,
 * functions return empty data or throw so callers can fall back to mock data.
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
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
const ITEM_PHOTOS_PREFIX = 'item-photos';

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

/** Swipe direction for recordSwipe */
export type SwipeDirection = 'left' | 'right';

/**
 * Upload image URIs to Storage at /item-photos/{itemId}/0, 1, ... and return download URLs.
 * photos: array of local file URIs (e.g. from ImagePicker) or remote URLs (we upload as-is by fetching first).
 */
async function uploadItemPhotos(itemId: string, photoUris: string[]): Promise<string[]> {
  if (!storage) throw new Error('Firebase Storage not configured');
  const urls: string[] = [];
  for (let i = 0; i < photoUris.length; i++) {
    const uri = photoUris[i];
    const storageRef = ref(storage, `${ITEM_PHOTOS_PREFIX}/${itemId}/${i}`);
    let blob: Blob;
    try {
      if (uri.startsWith('data:')) {
        const res = await fetch(uri);
        blob = await res.blob();
      } else {
        const res = await fetch(uri, { method: 'GET' });
        blob = await res.blob();
      }
    } catch (e) {
      if (__DEV__) console.warn('uploadItemPhotos: fetch blob failed for', uri, e);
      continue;
    }
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }
  return urls;
}

/**
 * Create a new item: upload photos to Storage, then save the item document to Firestore.
 * @param itemData - title, description, valueTier, pickupLocation, category, ownerId
 * @param photos - array of image URIs (local file:// or data URL); can be empty
 * @returns the created Item with id and photo URLs
 */
export async function createItem(
  itemData: CreateItemInput,
  photos: string[] = []
): Promise<Item> {
  if (!isFirebaseEnabled() || !db || !storage) {
    throw new Error('Firebase not configured. Use mock data for testing.');
  }
  const itemRef = doc(collection(db, ITEMS_COLLECTION));
  const itemId = itemRef.id;
  const photoUrls = photos.length > 0 ? await uploadItemPhotos(itemId, photos) : [];
  const docData: FirestoreItemDoc = {
    ownerId: itemData.ownerId,
    title: itemData.title.trim(),
    description: itemData.description.trim(),
    photos: photoUrls,
    valueTier: itemData.valueTier,
    pickupLocation: itemData.pickupLocation.trim(),
    category: itemData.category,
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
 * Fetch items for the swipe deck: same valueTier, exclude items owned by currentUser.
 * No geospatial filtering in this phase.
 */
export async function fetchSwipeDeck(
  valueTier: ValueTier,
  currentUserId: string
): Promise<Item[]> {
  if (!isFirebaseEnabled() || !db) {
    return [];
  }
  const q = query(
    collection(db, ITEMS_COLLECTION),
    where('valueTier', '==', valueTier),
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
 * @param targetItemId - the item that was swiped
 * @param direction - 'left' or 'right'
 * @param myActiveItemId - optional; the item the user is “offering” (for later matching logic)
 */
export async function recordSwipe(
  targetItemId: string,
  direction: SwipeDirection,
  myActiveItemId: string | null
): Promise<void> {
  if (!isFirebaseEnabled() || !db || !auth?.currentUser) {
    return;
  }
  const swiperId = auth.currentUser.uid;
  await addDoc(collection(db, SWIPES_COLLECTION), {
    swiperId,
    targetItemId,
    direction,
    myActiveItemId: myActiveItemId ?? null,
    createdAt: serverTimestamp(),
  });
}
