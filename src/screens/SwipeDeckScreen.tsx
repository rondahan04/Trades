import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SwipeableItemCard, SwipeDirection } from '../components/SwipeableItemCard';
import { MatchOverlay } from '../components/MatchOverlay';
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

  const loadDeck = useCallback(async (tier: ValueTier | 'all') => {
    if (isFirebaseEnabled() && user) {
      setDeckLoading(true);
      try {
        const fbTier = tier === 'all' ? null : tier;
        const items = await fetchSwipeDeck(fbTier, user.id);
        const filtered = categoryFilter === 'all'
          ? items
          : items.filter((i) => i.category === categoryFilter);
        setDeck(filtered.length > 0 ? shuffle(filtered) : getFilteredItems(tier, categoryFilter));
      } catch (e) {
        console.error('fetchSwipeDeck failed, using mock', e);
        setDeck(getFilteredItems(tier, categoryFilter));
      } finally {
        setDeckLoading(false);
      }
    } else {
      setDeck(getFilteredItems(tier, categoryFilter));
      setDeckLoading(false);
    }
  }, [user, categoryFilter]);

  useEffect(() => {
    loadDeck(tierFilter);
  }, [tierFilter]);

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
      if (direction === 'right' && top) {
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
          .catch(() => {
            setDeck((prev) => prev.slice(1));
          });
      } else {
        if (top) recordSwipe(top.id, direction, null).catch(() => {});
        setDeck((prev) => prev.slice(1));
      }
    },
    [deck]
  );

  const onTierChange = useCallback((tier: ValueTier | 'all') => {
    setTierFilter(tier);
    loadDeck(tier);
  }, [loadDeck]);

  const onCategoryChange = useCallback((category: ItemCategory | 'all') => {
    setCategoryFilter(category);
    const list = getFilteredItems(tierFilter, category);
    setDeck(list);
  }, [tierFilter]);

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
});
