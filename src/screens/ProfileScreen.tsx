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
import { useAppData } from '../contexts';
import { getItemById } from '../utils/mockData';
import { getItemsByOwnerId } from '../utils/mockData';
import type { ProfileStackParamList } from '../navigation/ProfileStack';
import { db, isFirebaseEnabled } from '../config/firebase';

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
  const { matchIds } = useAppData();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>>();
  const [userData, setUserData] = useState<ProfileUserData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Safely grab the correct ID
  const currentUserId = (user as any)?.uid || (user as any)?.id;

  useFocusEffect(
    useCallback(() => {
      if (!user || !currentUserId || !isFirebaseEnabled() || !db) {
        setUserData(user ? { 
          displayName: user.displayName ?? null, 
          email: user.email, 
          bio: (user as any).bio ?? null, 
          location: (user as any).location ?? null, 
          profilePictureUrl: (user as any).avatarUrl ?? null 
        } : null);
        setProfileLoading(false);
        return;
      }
      
      let cancelled = false;
      setProfileLoading(true);
      const userRef = doc(db, USERS_COLLECTION, currentUserId);
      
      getDoc(userRef)
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
          console.error("Error fetching user profile:", err);
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
        .finally(() => {
          if (!cancelled) setProfileLoading(false);
        });
        
      return () => { cancelled = true; };
    }, [user, currentUserId])
  );

  const myItems = currentUserId ? getItemsByOwnerId(currentUserId) : [];
  const matchItems = matchIds
    .map((id) => getItemById(id))
    .filter((i): i is NonNullable<typeof i> => i != null);

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
        <Text style={styles.sectionTitle}>My listed items</Text>
        <Text style={styles.count}>{myItems.length} items</Text>
        {myItems.length > 0 && (
          <View style={styles.itemList}>
            {myItems.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => navigation.navigate('ProfileItemDetail', { itemId: item.id })}
              >
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
            {myItems.length > 5 && (
              <Text style={styles.moreText}>+{myItems.length - 5} more</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Want to trade (matches)</Text>
        <Text style={styles.count}>{matchItems.length} items</Text>
        {matchItems.length === 0 ? (
          <Text style={[styles.hint, { fontStyle: 'italic' }]}>Swipe right on items to add them here.</Text>
        ) : (
          <View style={styles.itemList}>
            {matchItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => navigation.navigate('ProfileItemDetail', { itemId: item.id })}
              >
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  count: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  itemList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemTitle: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  moreText: {
    padding: 12,
    fontSize: 14,
    color: colors.textSecondary,
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