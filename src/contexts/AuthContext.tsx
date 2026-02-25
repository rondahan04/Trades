import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { User } from '../utils/mockData';
import { MOCK_USERS } from '../utils/mockData';
import { auth, db, isFirebaseEnabled } from '../config/firebase';

const AUTH_KEY = '@trades_user';
const USERS_COLLECTION = 'users';

/** Firestore user document shape (users collection) */
export interface FirestoreUserDoc {
  userId: string;
  email: string;
  displayName: string | null;
  bio?: string | null;
  location: string | null;
  profilePictureUrl: string | null;
}

function firestoreUserToAppUser(docData: FirestoreUserDoc): User {
  return {
    id: docData.userId,
    displayName: docData.displayName ?? 'Trader',
    email: docData.email,
    avatarUrl: docData.profilePictureUrl ?? undefined,
    bio: docData.bio ?? undefined,
    location: docData.location ?? undefined,
  };
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  /** Re-fetch current user from Firestore (e.g. after editing profile). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStoredMockUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_KEY);
      if (raw) {
        const u = JSON.parse(raw) as User;
        setUser(u);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseEnabled() || !auth || !db) {
      loadStoredMockUser();
      const t = setTimeout(() => setIsLoading(false), 3000);
      return () => clearTimeout(t);
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as FirestoreUserDoc;
          setUser(firestoreUserToAppUser({ ...data, userId: fbUser.uid }));
        } else {
          setUser({
            id: fbUser.uid,
            displayName: fbUser.displayName ?? 'Trader',
            email: fbUser.email ?? '',
            avatarUrl: fbUser.photoURL ?? undefined,
          });
        }
      } catch (e) {
        if (__DEV__) console.warn('Auth: failed to load user doc', e);
        setUser({
          id: fbUser.uid,
          displayName: fbUser.displayName ?? 'Trader',
          email: fbUser.email ?? '',
          avatarUrl: fbUser.photoURL ?? undefined,
        });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadStoredMockUser]);

  const login = useCallback(async (email: string, password: string) => {
    if (isFirebaseEnabled() && auth) {
      try {
        const normalized = email.trim().toLowerCase();
        await signInWithEmailAndPassword(auth, normalized, password);
        return { ok: true };
      } catch (err: unknown) {
        const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Login failed';
        return { ok: false, error: message };
      }
    }

    const normalized = email.trim().toLowerCase();
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === normalized && u.password === password
    );
    if (!found) {
      return { ok: false, error: 'Invalid email or password' };
    }
    const { password: _, ...safe } = found;
    const toStore = { ...safe };
    setUser(toStore as User);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(toStore));
    return { ok: true };
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (isFirebaseEnabled() && auth && db) {
        try {
          const normalized = email.trim().toLowerCase();
          const name = displayName.trim() || 'Trader';
          const cred = await createUserWithEmailAndPassword(auth, normalized, password);
          const uid = cred.user.uid;
          const userDoc: FirestoreUserDoc = {
            userId: uid,
            email: normalized,
            displayName: name,
            location: null,
            profilePictureUrl: null,
          };
          await setDoc(doc(db, USERS_COLLECTION, uid), userDoc);
          setUser(firestoreUserToAppUser(userDoc));
          return { ok: true };
        } catch (err: unknown) {
          const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Sign up failed';
          return { ok: false, error: message };
        }
      }

      const normalized = email.trim().toLowerCase();
      if (MOCK_USERS.some((u) => u.email.toLowerCase() === normalized)) {
        return { ok: false, error: 'Email already registered' };
      }
      const newUser: User = {
        id: `user-${Date.now()}`,
        displayName: displayName.trim() || 'Trader',
        email: normalized,
        password,
        avatarUrl: `https://i.pravatar.cc/150?u=${normalized}`,
      };
      const { password: _, ...safe } = newUser;
      const toStore = { ...safe };
      setUser(toStore as User);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(toStore));
      return { ok: true };
    },
    []
  );

  const logout = useCallback(async () => {
    if (isFirebaseEnabled() && auth) {
      await firebaseSignOut(auth);
    } else {
      setUser(null);
      await AsyncStorage.removeItem(AUTH_KEY);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!isFirebaseEnabled() || !auth?.currentUser || !db) return;
    const fbUser = auth.currentUser;
    try {
      const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as FirestoreUserDoc;
        setUser(firestoreUserToAppUser({ ...data, userId: fbUser.uid }));
      }
    } catch (e) {
      if (__DEV__) console.warn('refreshUser failed', e);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
