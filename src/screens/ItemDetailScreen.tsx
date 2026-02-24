import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getItemById, getUserById } from '../utils/mockData';
import { useAppData } from '../contexts';
import { useAuth } from '../contexts';
import type { Item } from '../utils/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMG_SIZE = SCREEN_WIDTH - 32;
const STAR_SIZE = 32;

export function ItemDetailScreen({
  route,
  navigation,
}: {
  route: { params: { itemId: string } };
  navigation: { goBack: () => void; getParent: () => { navigate: (tab: string, opts?: any) => void } | undefined };
}) {
  const { itemId } = route.params;
  const item = getItemById(itemId);
  const { user } = useAuth();
  const { getRating, setRating, getUserRating } = useAppData();
  const [photoIndex, setPhotoIndex] = useState(0);

  const rating = getRating(itemId);
  const userStars = user ? getUserRating(itemId, user.id) : null;
  const owner = item ? getUserById(item.ownerId) : null;

  const handleMessage = useCallback(() => {
    if (!owner || !user) return;
    const tabNav = navigation.getParent();
    tabNav?.navigate('Chat', { screen: 'Chat', params: { otherUserId: owner.id, otherUserName: owner.displayName, itemId } });
  }, [owner, user, navigation]);

  const handleRate = useCallback(
    (stars: number) => {
      if (user) setRating(itemId, user.id, stars);
    },
    [user, itemId, setRating]
  );

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

  const photos = item.photos.length > 0 ? item.photos : ['https://images.unsplash.com/photo-1588979353373-340e129bb785?w=600'];
  const currentPhoto = photos[photoIndex] ?? photos[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: currentPhoto }}
          style={styles.image}
          resizeMode="cover"
        />
        {photos.length > 1 && (
          <View style={styles.dots}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === photoIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{item.valueTier}</Text>
        </View>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.title}>{item.title}</Text>

        {owner && (
          <View style={styles.ownerRow}>
            {owner.avatarUrl ? (
              <Image source={{ uri: owner.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={20} color={colors.textSecondary} />
              </View>
            )}
            <Text style={styles.ownerText}>Listed by {owner.displayName}</Text>
            {user && user.id !== owner.id && (
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.textOnSwipe} />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={20} color={colors.primaryDark} />
            <Text style={styles.locationText}>{item.pickupLocation}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rating</Text>
          <View style={styles.ratingRow}>
            <View style={styles.starsDisplay}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={rating.average >= s ? 'star' : 'star-outline'}
                  size={24}
                  color={colors.primary}
                />
              ))}
            </View>
            <Text style={styles.ratingCount}>
              {rating.count === 0 ? 'No ratings yet' : `${rating.average} (${rating.count})`}
            </Text>
          </View>
          {user && (
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Your rating: </Text>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => handleRate(s)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={(userStars ?? 0) >= s ? 'star' : 'star-outline'}
                    size={STAR_SIZE}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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
    paddingBottom: 40,
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
    height: IMG_SIZE,
    backgroundColor: colors.borderLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
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
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  body: {
    padding: 20,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  tierText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  category: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerText: {
    fontSize: 15,
    color: colors.textSecondary,
    flex: 1,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsDisplay: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rateLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
    width: '100%',
    marginBottom: 4,
  },
  starButton: {
    padding: 4,
  },
});
