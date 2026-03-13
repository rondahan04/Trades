import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Metro resolves firebase/auth to the React Native bundle which exports getReactNativePersistence.
// TypeScript uses the web types which don't include it, so we require at runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { getReactNativePersistence } = require("firebase/auth") as any;
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only when required env vars are set (export for Functions usage)
export const app: FirebaseApp | null =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.appId
    ? initializeApp(firebaseConfig)
    : null;

// Auth with AsyncStorage persistence so the session survives app restarts/kills.
export const auth = app
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

/** Storage bucket name (for REST uploads that avoid Blob in RN). */
export const storageBucket = firebaseConfig.storageBucket || null;

/** Whether Firebase is configured and in use (for feature flags / mock fallback). */
export function isFirebaseEnabled(): boolean {
  return app != null && auth != null && db != null && storage != null;
}