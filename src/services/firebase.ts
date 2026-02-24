/**
 * Firebase integration (future).
 * Uncomment and configure when ready to connect.
 */
// import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
// import { getFirestore } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth';

// const firebaseConfig = {
//   apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
// };

// let app: FirebaseApp | undefined;
// if (!getApps().length) {
//   app = initializeApp(firebaseConfig);
// }

// export const db = app ? getFirestore(app) : undefined;
// export const auth = app ? getAuth(app) : undefined;

export {};
