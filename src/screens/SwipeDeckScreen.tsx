import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SwipeableItemCard, SwipeDirection } from '../components/SwipeableItemCard';
import { MatchOverlay } from '../components/MatchOverlay';
import { AdCard, type AdDeckItem } from '../components/AdCard';
import { MOCK_ITEMS } from '../utils/mockData';
import { useAppData, useAuth } from '../contexts';
import type { Item } from '../utils/mockData';
import type { SwipeStackParamList } from '../navigation/SwipeStack';
import { colors } from '../theme';
import type { ValueTier, ItemCategory } from '../utils/mockData';
import { fetchSwipeDeck, recordSwipe } from '../services/dbService';
import type { TabParamList } from '../navigation/TabNavigator';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { isFirebaseEnabled } from '../config/firebase';

// ── Ad data ───────────────────────────────────────────────────────────────────
const MOCK_ADS: AdDeckItem[] = [
  {
    id: 'ad-1', isAd: true,
    adTitle: 'Trade Smarter with Trades Pro',
    adBody: 'Get unlimited swipes, priority matching, and exclusive items near you.',
  },
  {
    id: 'ad-2', isAd: true,
    adTitle: 'Invite Friends & Earn',
    adBody: 'Refer a friend and earn bonus swipes when they complete their first trade!',
  },
  {
    id: 'ad-3', isAd: true,
    adTitle: 'Safe Trading Tips',
    adBody: 'Always meet in public places and use in-app chat to confirm details before meeting.',
  },
];

type DeckEntry = Item | AdDeckItem;

/** Insert one ad every AD_INTERVAL real items (after the 3rd, 8th, 13th…) */
function insertAds(items: Item[]): DeckEntry[] {
  const AD_INTERVAL = 5;
  const result: DeckEntry[] = [];
  let adIndex = 0;
  items.forEach((item, i) => {
    result.push(item);
    if ((i + 1) % AD_INTERVAL === 0 && i + 1 < items.length) {
      result.push(MOCK_ADS[adIndex % MOCK_ADS.length]);
      adIndex++;
    }
  });
  return result;
}

const TIERS: ValueTier[] = ['$', '$$', '$$$'];
const CATEGORIES: ItemCategory[] = [
  'Electronics', 'Clothing', 'Home', 'Sports', 'Books', 'SneakerHead', 'Art', 'Other',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getFilteredItems(
  tier: ValueTier | 'all',
  category: ItemCategory | 'all',
  items: Item[] = MOCK_ITEMS
): Item[] {
  return shuffle(items.filter((i) => {
    const matchTier = tier === 'all' || i.valueTier === tier;
    const matchCat = category === 'all' || i.category === category;
    return matchTier && matchCat;
  }));
}

export function SwipeDeckScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SwipeStackParamList, 'SwipeDeck'>>();
  const { user } = useAuth();
  const { addMatch } = useAppData();
  const [tierFilter, setTierFilter] = useState<ValueTier | 'all'>('$$');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [deck, setDeck] = useState<DeckEntry[]>(() => insertAds(getFilteredItems('$$', 'all')));
  const [deckLoading, setDeckLoading] = useState(false);
  const [showMatchOverlay, setShowMatchOverlay] = useState(false);
  const [pendingMatchItemId, setPendingMatchItemId] = useState<string | null>(null);
  const [matchedOtherUserId, setMatchedOtherUserId] = useState<string | null>(null);
  const [matchedOtherUserName, setMatchedOtherUserName] = useState<string | undefined>(undefined);
  const [matchedItemId, setMatchedItemId] = useState<string | null>(null);

  const loadDeck = useCallback(async (tier: ValueTier | 'all', category: ItemCategory | 'all') => {
    if (isFirebaseEnabled() && user) {
      setDeckLoading(true);
      try {
        const fbTier = tier === 'all' ? null : tier;
        const items = await fetchSwipeDeck(fbTier, user.id);
        const filtered = category === 'all'
          ? items
          : items.filter((i) => i.category === category);
        const base = filtered.length > 0 ? shuffle(filtered) : getFilteredItems(tier, category);
        setDeck(insertAds(base));
      } catch {
        setDeck(insertAds(getFilteredItems(tier, category)));
      } finally {
        setDeckLoading(false);
      }
    } else {
      setDeck(insertAds(getFilteredItems(tier, category)));
      setDeckLoading(false);
    }
  }, [user]);

  // Single effect for both tier and category changes
  useEffect(() => {
    loadDeck(tierFilter, categoryFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierFilter, categoryFilter]);

  const onMatchOverlayDismiss = useCallback(() => {
    const hadMatch = !!pendingMatchItemId;
    if (pendingMatchItemId) {
      addMatch(pendingMatchItemId);
      setPendingMatchItemId(null);
    }
    setMatchedOtherUserId(null);
    setMatchedOtherUserName(undefined);
    setMatchedItemId(null);
    setDeck((prev) => prev.slice(1));
    setShowMatchOverlay(false);
    // "Maybe Later" — go to the Chat tab so they can see the new conversation
    if (hadMatch) {
      const tabNav = navigation.getParent<BottomTabNavigationProp<TabParamList>>();
      tabNav?.navigate('Chat');
    }
  }, [pendingMatchItemId, addMatch, navigation]);

  const onStartChat = useCallback(() => {
    if (!matchedOtherUserId) return;
    const otherUserId = matchedOtherUserId;
    const itemId = matchedItemId ?? undefined;
    onMatchOverlayDismiss();
    const tabNav = navigation.getParent<BottomTabNavigationProp<TabParamList>>();
    tabNav?.navigate('Chat', {
      screen: 'ChatRoom',
      params: { otherUserId, otherUserName: matchedOtherUserName, itemId },
    } as never);
  }, [matchedOtherUserId, matchedOtherUserName, matchedItemId, onMatchOverlayDismiss, navigation]);

  const onSwipeComplete = useCallback(
    (direction: SwipeDirection) => {
      const top = deck[0];
      if (!top || 'isAd' in top) { setDeck((prev) => prev.slice(1)); return; }
      if (direction === 'right') {
        recordSwipe(top.id, direction, null)
          .then((result) => {
            if (result.matched && result.otherUserId) {
              setPendingMatchItemId(top.id);
              setMatchedOtherUserId(result.otherUserId);
              setMatchedOtherUserName(result.otherUserName);
              setMatchedItemId(result.itemId ?? null);
              setShowMatchOverlay(true);
            } else {
              setDeck((prev) => prev.slice(1));
            }
          })
          .catch(() => { setDeck((prev) => prev.slice(1)); });
      } else {
        recordSwipe(top.id, direction, null).catch(() => {});
        setDeck((prev) => prev.slice(1));
      }
    },
    [deck]
  );

  const onTierChange = useCallback((tier: ValueTier | 'all') => {
    setTierFilter(tier); // useEffect re-runs loadDeck
  }, []);

  const onCategoryChange = useCallback((category: ItemCategory | 'all') => {
    setCategoryFilter(category); // useEffect re-runs loadDeck
  }, []);

  if (deckLoading && deck.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading deck...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.chip, tierFilter === 'all' && styles.chipActive]}
          onPress={() => onTierChange('all')}
        >
          <Text style={[styles.chipText, tierFilter === 'all' && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {TIERS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, tierFilter === t && styles.chipActive]}
            onPress={() => onTierChange(t)}
          >
            <Text style={[styles.chipText, tierFilter === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        contentContainerStyle={styles.categoryContent}
      >
        <TouchableOpacity
          style={[styles.catChip, categoryFilter === 'all' && styles.catChipActive]}
          onPress={() => onCategoryChange('all')}
        >
          <Text style={[styles.catChipText, categoryFilter === 'all' && styles.catChipTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.catChip, categoryFilter === c && styles.catChipActive]}
            onPress={() => onCategoryChange(c)}
          >
            <Text style={[styles.catChipText, categoryFilter === c && styles.catChipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.deckContainer}>
        {deck.map((entry, index) => {
          const isTop = index === 0;
          const zIndex = deck.length - index;
          const isAd = 'isAd' in entry;
          return (
            <View
              key={entry.id}
              style={[styles.cardWrapper, { zIndex }]}
              pointerEvents={isTop ? 'auto' : 'none'}
            >
              {isTop && isAd ? (
                <AdCard
                  ad={entry as AdDeckItem}
                  onDismiss={() => setDeck((prev) => prev.slice(1))}
                />
              ) : !isAd ? (
                <SwipeableItemCard
                  item={entry as Item}
                  onSwipeComplete={onSwipeComplete}
                  onPressDetail={() => navigation.navigate('SwipeItemDetail', { itemId: entry.id })}
                />
              ) : (
                // Non-top ad: render a blank placeholder for deck depth
                <View style={styles.adPlaceholder} />
              )}
            </View>
          );
        })}
      </View>

      {deck.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nothing left to swipe</Text>
          <Text style={styles.emptySubtext}>Check back later or try a different tier</Text>
        </View>
      )}

      <MatchOverlay
        visible={showMatchOverlay}
        onDismiss={onMatchOverlayDismiss}
        onStartChat={matchedOtherUserId ? onStartChat : undefined}
        autoDismissMs={5000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  categoryRow: {
    maxHeight: 44,
    marginBottom: 4,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 6,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  catChipTextActive: {
    color: colors.text,
  },
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  adPlaceholder: {
    width: '88%' as `${number}%`,
    aspectRatio: 1.1,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
