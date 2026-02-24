/**
 * Firebase initialization for Trades.
 * Uses standard env vars so you can keep secrets out of the repo.
 * If any required env is missing, auth/db/storage are still exported but may be null
 * and the app can fall back to mock data.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? undefined,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? undefined,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? undefined,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? undefined,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? undefined,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? undefined,
};

function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.appId
  );
}

let app: FirebaseApp | null = null;
if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  } catch (e) {
    if (__DEV__) {
      console.warn('Firebase init failed:', e);
    }
  }
}

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;
export const firebaseApp: FirebaseApp | null = app;

/** Use this to gate Firebase-only features or fall back to mock data */
export function isFirebaseEnabled(): boolean {
  return app != null && auth != null && db != null && storage != null;
}
