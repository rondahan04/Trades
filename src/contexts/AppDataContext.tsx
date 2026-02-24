import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MATCHES_KEY = '@trades_matches';
const RATINGS_KEY = '@trades_ratings';

export interface ItemRating {
  average: number;
  count: number;
}

export interface UserRatingMap {
  [itemId: string]: number; // userId not needed; we key by item and store one rating per user in memory
}

interface RatingsData {
  byItem: Record<string, { totalStars: number; count: number }>;
  byUserAndItem: Record<string, number>; // `${userId}_${itemId}` -> stars
}

interface AppDataContextValue {
  matchIds: string[];
  addMatch: (itemId: string) => void;
  removeMatch: (itemId: string) => void;
  isMatch: (itemId: string) => boolean;
  getRating: (itemId: string) => ItemRating;
  setRating: (itemId: string, userId: string, stars: number) => void;
  getUserRating: (itemId: string, userId: string) => number | null;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const defaultRatings: RatingsData = {
  byItem: {},
  byUserAndItem: {},
};

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [matchIds, setMatchIds] = useState<string[]>([]);
  const [ratings, setRatings] = useState<RatingsData>(defaultRatings);

  useEffect(() => {
    (async () => {
      try {
        const [m, r] = await Promise.all([
          AsyncStorage.getItem(MATCHES_KEY),
          AsyncStorage.getItem(RATINGS_KEY),
        ]);
        if (m) setMatchIds(JSON.parse(m));
        if (r) setRatings(JSON.parse(r));
      } catch {
        // ignore
      }
    })();
  }, []);

  const persistMatches = useCallback((ids: string[]) => {
    AsyncStorage.setItem(MATCHES_KEY, JSON.stringify(ids));
  }, []);

  const addMatch = useCallback((itemId: string) => {
    setMatchIds((prev) => {
      if (prev.includes(itemId)) return prev;
      const next = [...prev, itemId];
      persistMatches(next);
      return next;
    });
  }, [persistMatches]);

  const removeMatch = useCallback((itemId: string) => {
    setMatchIds((prev) => {
      const next = prev.filter((id) => id !== itemId);
      persistMatches(next);
      return next;
    });
  }, [persistMatches]);

  const isMatch = useCallback(
    (itemId: string) => matchIds.includes(itemId),
    [matchIds]
  );

  const getRating = useCallback(
    (itemId: string): ItemRating => {
      const data = ratings.byItem[itemId];
      if (!data || data.count === 0)
        return { average: 0, count: 0 };
      return {
        average: Math.round((data.totalStars / data.count) * 10) / 10,
        count: data.count,
      };
    },
    [ratings]
  );

  const getUserRating = useCallback(
    (itemId: string, userId: string): number | null => {
      const key = `${userId}_${itemId}`;
      const stars = ratings.byUserAndItem[key];
      return stars != null ? stars : null;
    },
    [ratings]
  );

  const setRating = useCallback((itemId: string, userId: string, stars: number) => {
    const key = `${userId}_${itemId}`;
    setRatings((prev) => {
      const oldUserStars = prev.byUserAndItem[key] ?? null;
      const byItem = { ...prev.byItem };
      const byUserAndItem = { ...prev.byUserAndItem };
      byUserAndItem[key] = stars;

      const current = byItem[itemId] ?? { totalStars: 0, count: 0 };
      const newTotal = current.totalStars - (oldUserStars ?? 0) + stars;
      const newCount = current.count + (oldUserStars == null ? 1 : 0);
      byItem[itemId] = { totalStars: newTotal, count: newCount };

      const next = { byItem, byUserAndItem };
      AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value: AppDataContextValue = {
    matchIds,
    addMatch,
    removeMatch,
    isMatch,
    getRating,
    setRating,
    getUserRating,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
