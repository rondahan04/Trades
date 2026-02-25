import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAZFLoBusjZax6xgAp06Zb6vHR3e21ryCc",
  authDomain: "trades-4903d.firebaseapp.com",
  projectId: "trades-4903d",
  storageBucket: "trades-4903d.firebasestorage.app",
  messagingSenderId: "135349224503",
  appId: "1:135349224503:web:a2405293916428c7d96bb2",
  measurementId: "G-SXYSM1NQ70"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Auth (persistence warning in RN is non-fatal; auth still works in-session)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/** Whether Firebase is configured and in use (for feature flags / mock fallback). */
export function isFirebaseEnabled(): boolean {
  return app != null && auth != null && db != null && storage != null;
}