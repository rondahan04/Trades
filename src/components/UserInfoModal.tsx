import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import type { User } from '../utils/mockData';
import { fetchUserReviews, fetchUserTradeCount, type UserReview } from '../services/dbService';
import { isFirebaseEnabled } from '../config/firebase';

// Shown when Firebase has no reviews yet
const MOCK_REVIEWS: UserReview[] = [
  { id: 'm1', reviewerName: 'Alex M.', rating: 5, comment: 'Great trader, very trustworthy! Item was exactly as described.', timestamp: Date.now() - 86400000 * 2 },
  { id: 'm2', reviewerName: 'Sarah K.', rating: 4, comment: 'Smooth transaction, would trade again.', timestamp: Date.now() - 86400000 * 8 },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  user: User | null;
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#F6C90E"
        />
      ))}
    </View>
  );
}

export function UserInfoModal({ visible, onClose, user }: Props) {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [tradeCount, setTradeCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setLoading(true);
    if (isFirebaseEnabled()) {
      Promise.all([fetchUserReviews(user.id), fetchUserTradeCount(user.id)])
        .then(([revs, count]) => {
          setReviews(revs.length > 0 ? revs : MOCK_REVIEWS);
          setTradeCount(count);
        })
        .catch(() => { setReviews(MOCK_REVIEWS); setTradeCount(0); })
        .finally(() => setLoading(false));
    } else {
      setReviews(MOCK_REVIEWS);
      setTradeCount(3);
      setLoading(false);
    }
  }, [visible, user]);

  if (!user) return null;

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Avatar + name */}
            <View style={styles.avatarRow}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {user.displayName[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <Text style={styles.displayName}>{user.displayName}</Text>
              {user.location ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.locationText}>{user.location}</Text>
                </View>
              ) : null}
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{tradeCount}</Text>
                <Text style={styles.statLabel}>Trades Done</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                </Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{reviews.length}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
            </View>

            {/* Bio */}
            {user.bio ? (
              <View style={styles.bioBox}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            ) : null}

            {/* Reviews */}
            <Text style={styles.sectionTitle}>Reviews</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            ) : reviews.length === 0 ? (
              <Text style={styles.emptyText}>No reviews yet.</Text>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{rev.reviewerName}</Text>
                    <Stars rating={rev.rating} />
                  </View>
                  {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
                  <Text style={styles.reviewDate}>
                    {new Date(rev.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  content: { padding: 20, paddingTop: 8, paddingBottom: 40 },

  avatarRow: { alignItems: 'center', gap: 8, marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 28, fontWeight: '700', color: colors.text },
  displayName: { fontSize: 20, fontWeight: '800', color: colors.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: colors.textSecondary },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: colors.borderLight },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },

  bioBox: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  bioText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: colors.text },
  reviewComment: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  reviewDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  emptyText: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' },
});
