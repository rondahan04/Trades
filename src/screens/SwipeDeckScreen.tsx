import React, { useState, useCallback, useEffect, useRef } from 'react';
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
const AD_INTERVAL = 5;

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
  const [deck, setDeck] = useState<Item[]>(() => getFilteredItems('$$', 'all'));
  const [deckLoading, setDeckLoading] = useState(false);
  const [showMatchOverlay, setShowMatchOverlay] = useState(false);
  const [pendingMatchItemId, setPendingMatchItemId] = useState<string | null>(null);
  const [matchedOtherUserId, setMatchedOtherUserId] = useState<string | null>(null);
  const [matchedOtherUserName, setMatchedOtherUserName] = useState<string | undefined>(undefined);
  const [matchedItemId, setMatchedItemId] = useState<string | null>(null);
  // Ad overlay — shown after every AD_INTERVAL item swipes, covers the deck entirely
  const [adOverlay, setAdOverlay] = useState<AdDeckItem | null>(null);
  const swipeCountRef = useRef(0);
  const adIndexRef = useRef(0);

  const advanceDeck = useCallback(() => {
    swipeCountRef.current += 1;
    setDeck((prev) => prev.slice(1));
    if (swipeCountRef.current % AD_INTERVAL === 0) {
      const ad = MOCK_ADS[adIndexRef.current % MOCK_ADS.length];
      adIndexRef.current += 1;
      setAdOverlay({ ...ad, id: `ad-slot-${adIndexRef.current}` });
    }
  }, []);

  const loadDeck = useCallback(async (tier: ValueTier | 'all', category: ItemCategory | 'all') => {
    if (isFirebaseEnabled() && user) {
      setDeckLoading(true);
      try {
        const fbTier = tier === 'all' ? null : tier;
        const fbItems = await fetchSwipeDeck(fbTier, user.id);
        const filtered = category === 'all'
          ? fbItems
          : fbItems.filter((i) => i.category === category);
        // Always pad the deck with mock items (exclude current user's items and dedupe by id)
        const fbIds = new Set(filtered.map((i) => i.id));
        const mockPadding = getFilteredItems(tier, category).filter(
          (m) => !fbIds.has(m.id) && m.ownerId !== user.id
        );
        setDeck(shuffle([...filtered, ...mockPadding]));
      } catch {
        setDeck(getFilteredItems(tier, category));
      } finally {
        setDeckLoading(false);
      }
    } else {
      setDeck(getFilteredItems(tier, category));
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
    advanceDeck();
    setShowMatchOverlay(false);
    // "Maybe Later" — go to the Chat tab so they can see the new conversation
    if (hadMatch) {
      const tabNav = navigation.getParent<BottomTabNavigationProp<TabParamList>>();
      tabNav?.navigate('Chat');
    }
  }, [pendingMatchItemId, addMatch, navigation, advanceDeck]);

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
      if (!top) return;
      if (direction === 'right') {
        recordSwipe(top.id, direction, null)
          .then((result) => {
            if (result.matched && result.otherUserId) {
              setPendingMatchItemId(top.id);
              setMatchedOtherUserId(result.otherUserId);
              setMatchedOtherUserName(result.otherUserName);
              setMatchedItemId(result.itemId ?? null);
              setShowMatchOverlay(true);
              // deck advance (+ possible ad) handled in onMatchOverlayDismiss
            } else {
              advanceDeck();
            }
          })
          .catch(() => { advanceDeck(); });
      } else {
        recordSwipe(top.id, direction, null).catch(() => {});
        advanceDeck();
      }
    },
    [deck, advanceDeck]
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
        {deck.map((item, index) => {
          const isTop = index === 0;
          const zIndex = deck.length - index;
          return (
            <View
              key={item.id}
              style={[styles.cardWrapper, { zIndex }]}
              pointerEvents={isTop ? 'auto' : 'none'}
            >
              <SwipeableItemCard
                item={item}
                onSwipeComplete={onSwipeComplete}
                onPressDetail={() => navigation.navigate('SwipeItemDetail', { itemId: item.id })}
              />
            </View>
          );
        })}

        {/* Ad overlay — covers the entire deck so no item peeks through */}
        {adOverlay && (
          <View style={styles.adOverlay}>
            <AdCard
              ad={adOverlay}
              onDismiss={() => setAdOverlay(null)}
            />
          </View>
        )}
      </View>

      {deck.length === 0 && !deckLoading && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>You've seen it all</Text>
          <Text style={styles.emptySubtext}>
            New listings show up as people add them.{'\n'}Check back later.
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadDeck(tierFilter, categoryFilter)}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
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
  adOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backgroundColor: colors.background,
  },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
});
