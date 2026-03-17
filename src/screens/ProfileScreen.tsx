import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../contexts';
import { getItemsByOwnerId } from '../utils/mockData';
import type { Item } from '../utils/mockData';
import type { ProfileStackParamList } from '../navigation/ProfileStack';
import { db, isFirebaseEnabled } from '../config/firebase';
import { fetchItemsByOwnerId } from '../services/dbService';

const USERS_COLLECTION = 'users';

/** Fetched profile data from Firestore (users collection) */
interface ProfileUserData {
  displayName: string | null;
  email: string;
  bio: string | null;
  location: string | null;
  profilePictureUrl: string | null;
}

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>>();
  const [userData, setUserData] = useState<ProfileUserData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Safely grab the correct ID
  const currentUserId = (user as any)?.uid || (user as any)?.id;

  useFocusEffect(
    useCallback(() => {
      if (!user || !currentUserId) {
        setUserData(null);
        setProfileLoading(false);
        return;
      }

      if (!isFirebaseEnabled() || !db) {
        setUserData({
          displayName: user.displayName ?? null,
          email: user.email,
          bio: (user as any).bio ?? null,
          location: (user as any).location ?? null,
          profilePictureUrl: (user as any).avatarUrl ?? null,
        });
        setMyItems(getItemsByOwnerId(currentUserId));
        setProfileLoading(false);
        return;
      }

      let cancelled = false;
      setProfileLoading(true);
      setItemsLoading(true);

      getDoc(doc(db, USERS_COLLECTION, currentUserId))
        .then((snap) => {
          if (cancelled) return;
          if (snap.exists()) {
            const data = snap.data();
            setUserData({
              displayName: data.displayName ?? null,
              email: data.email ?? user.email,
              bio: data.bio ?? null,
              location: data.location ?? null,
              profilePictureUrl: data.profilePictureUrl ?? null,
            });
          } else {
            setUserData({
              displayName: user.displayName ?? null,
              email: user.email,
              bio: null,
              location: null,
              profilePictureUrl: (user as any).avatarUrl ?? null,
            });
          }
        })
        .catch((err) => {
          if (__DEV__) console.error('Error fetching user profile:', err);
          if (!cancelled) {
            setUserData({
              displayName: user.displayName ?? null,
              email: user.email,
              bio: (user as any).bio ?? null,
              location: (user as any).location ?? null,
              profilePictureUrl: (user as any).avatarUrl ?? null,
            });
          }
        })
        .finally(() => { if (!cancelled) setProfileLoading(false); });

      fetchItemsByOwnerId(currentUserId)
        .then((items) => { if (!cancelled) setMyItems(items); })
        .catch(() => { if (!cancelled) setMyItems(getItemsByOwnerId(currentUserId)); })
        .finally(() => { if (!cancelled) setItemsLoading(false); });

      return () => { cancelled = true; };
    }, [user, currentUserId])
  );

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Sign in to see your profile.</Text>
      </View>
    );
  }

  // The master data object the UI will strictly read from
  const displayData = userData ?? {
    displayName: user.displayName ?? null,
    email: user.email,
    bio: (user as any).bio ?? null,
    location: (user as any).location ?? null,
    profilePictureUrl: (user as any).avatarUrl ?? null,
  };

  const [imageError, setImageError] = useState(false);
  useEffect(() => { setImageError(false); }, [displayData.profilePictureUrl]);
  const avatarUri = displayData.profilePictureUrl && !imageError ? displayData.profilePictureUrl : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {profileLoading ? (
          <View style={[styles.avatarCircle, styles.avatarPlaceholder]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : avatarUri ? (
          <Image
            key={avatarUri}
            source={{ uri: avatarUri }}
            style={styles.avatarCircle}
            onError={() => setImageError(true)}
            onLoadStart={() => setImageError(false)}
          />
        ) : (
          <View style={[styles.avatarCircle, styles.avatarPlaceholder]} />
        )}
        
        <Text style={styles.displayName}>{displayData.displayName || 'Test'}</Text>
        <Text style={styles.email}>{displayData.email}</Text>
        
        {displayData.bio ? (
          <Text style={styles.bio}>{displayData.bio}</Text>
        ) : null}
        
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="pencil" size={18} color={colors.primaryDark} />
          <Text style={styles.editProfileText}>Edit profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Listings</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{myItems.length}</Text>
          </View>
        </View>

        {itemsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
        ) : myItems.length === 0 ? (
          <Text style={[styles.hint, { fontStyle: 'italic', marginTop: 8 }]}>
            No active listings yet. Add items in the My Items tab.
          </Text>
        ) : (
          <View style={styles.listingCards}>
            {myItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listingCard}
                onPress={() => navigation.navigate('ProfileItemDashboard', { itemId: item.id })}
                activeOpacity={0.75}
              >
                {item.photos?.[0] ? (
                  <Image source={{ uri: item.photos[0] }} style={styles.listingThumb} />
                ) : (
                  <View style={[styles.listingThumb, styles.listingThumbEmpty]}>
                    <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.listingInfo}>
                  <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.listingBadges}>
                    <View style={styles.tierBadge}>
                      <Text style={styles.tierText}>{item.valueTier}</Text>
                    </View>
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.swipeLeft} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  hint: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    alignSelf: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  email: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  bio: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  editProfileText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  listingCards: {
    gap: 10,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  listingThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
  },
  listingThumbEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingInfo: {
    flex: 1,
    gap: 6,
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  listingBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  categoryText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.swipeLeft,
  },
});