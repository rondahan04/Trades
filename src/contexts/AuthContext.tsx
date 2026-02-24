import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../utils/mockData';
import { MOCK_USERS } from '../utils/mockData';

const AUTH_KEY = '@trades_user';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStoredUser = useCallback(async () => {
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
    loadStoredUser();
    // Fallback: never block app for more than 3s (e.g. if AsyncStorage hangs)
    const t = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(t);
  }, [loadStoredUser]);

  const login = useCallback(async (email: string, password: string) => {
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
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
