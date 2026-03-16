import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { getItemById } from '../utils/mockData';
import {
  fetchItemById,
  fetchSwipeCount,
  deleteItem,
  markItemAsTraded,
  markTradeCompleted,
  fetchMatchForItem,
} from '../services/dbService';
import { isFirebaseEnabled } from '../config/firebase';
import type { Item } from '../utils/mockData';
import type { MyItemsStackParamList } from '../navigation/MyItemsStack';
import { fetchUserProfile } from '../services/dbService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MyItemDashboardScreen({
  route,
}: {
  route: { params: { itemId: string } };
}) {
  const { itemId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MyItemsStackParamList, 'MyItemsItemDetail'>>();

  const [item, setItem] = useState<Item | null>(() => getItemById(itemId) ?? null);
  const [loading, setLoading] = useState(false);
  const [swipeCount, setSwipeCount] = useState<number | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Load item from Firestore if not in mock data
  useEffect(() => {
    if (item || !isFirebaseEnabled()) return;
    setLoading(true);
    fetchItemById(itemId)
      .then(setItem)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [itemId]);

  // Load interested count
  useEffect(() => {
    if (!isFirebaseEnabled()) return;
    fetchSwipeCount(itemId)
      .then(setSwipeCount)
      .catch(() => {});
  }, [itemId]);

  const handleMarkAsTraded = useCallback(() => {
    Alert.alert(
      'Mark as Traded',
      'This will mark the item as traded and remove it from the active listings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Traded',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const match = await fetchMatchForItem(itemId);
              if (match) {
                await markTradeCompleted(match.matchId);
                // Fetch the other trader's name for the review screen
                const otherUser = await fetchUserProfile(match.otherUserId);
                navigation.replace('LeaveReview', {
                  matchId: match.matchId,
                  revieweeId: match.otherUserId,
                  revieweeName: otherUser?.displayName ?? undefined,
                });
              } else {
                // No match found — mark directly in Firestore then go back
                await markItemAsTraded(itemId);
                Alert.alert('Done', 'Item marked as traded.', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              }
            } catch (e) {
              Alert.alert('Error', 'Could not update item.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [itemId, navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Item',
      'This will permanently delete the item. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteItem(itemId);
              Alert.alert('Deleted', 'Your item has been removed.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e) {
              Alert.alert('Error', 'Could not delete item.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [itemId, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Item not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photos = item.photos.length > 0
    ? item.photos
    : ['https://images.unsplash.com/photo-1588979353373-340e129bb785?w=600'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Photo carousel */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: photos[photoIndex] ?? photos[0] }}
          style={styles.image}
          resizeMode="cover"
        />
        {photos.length > 1 && (
          <View style={styles.dotsRow}>
            {photos.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setPhotoIndex(i)}>
                <View style={[styles.dot, i === photoIndex && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Title + badges */}
      <View style={styles.section}>
        <View style={styles.badgeRow}>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{item.valueTier}</Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="heart-outline" size={26} color={colors.primary} />
          <Text style={styles.statValue}>
            {swipeCount !== null ? swipeCount : '—'}
          </Text>
          <Text style={styles.statLabel}>Interested</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="location-outline" size={26} color={colors.primary} />
          <Text style={styles.statValue} numberOfLines={1}>{item.pickupLocation || '—'}</Text>
          <Text style={styles.statLabel}>Pickup</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons
            name={item.valueTier === '$$$' ? 'diamond-outline' : item.valueTier === '$$' ? 'cash-outline' : 'pricetag-outline'}
            size={26}
            color={colors.primary}
          />
          <Text style={styles.statValue}>{item.valueTier}</Text>
          <Text style={styles.statLabel}>Value tier</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={handleMarkAsTraded}
          disabled={actionLoading}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>Mark as Traded</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={handleDelete}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Delete Item</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 16,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: colors.borderLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tierBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  categoryBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionButtonDanger: {
    backgroundColor: '#E53E3E',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
