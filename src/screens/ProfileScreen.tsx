import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../contexts';
import { useAppData } from '../contexts';
import { getItemById } from '../utils/mockData';
import { getItemsByOwnerId } from '../utils/mockData';
import type { ProfileStackParamList } from '../navigation/ProfileStack';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const { matchIds } = useAppData();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>>();

  const myItems = user ? getItemsByOwnerId(user.id) : [];
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={40} color={colors.textSecondary} />
          </View>
        )}
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        {(user as { bio?: string }).bio ? (
          <Text style={styles.bio}>{(user as { bio?: string }).bio}</Text>
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
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
