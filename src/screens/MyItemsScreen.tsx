import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts';
import { getItemsByOwnerId } from '../utils/mockData';
import { colors } from '../theme';
import type { MyItemsStackParamList } from '../navigation/MyItemsStack';

export function MyItemsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MyItemsStackParamList, 'MyItemsList'>>();
  const myItems = user ? getItemsByOwnerId(user.id) : [];

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>Sign in to see your items.</Text>
      </View>
    );
  }

  if (myItems.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>My Items</Text>
        <Text style={styles.subtitle}>You haven’t listed any items yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>{myItems.length} listed</Text>
      {myItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => navigation.navigate('MyItemsItemDetail', { itemId: item.id })}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: item.photos[0] || 'https://images.unsplash.com/photo-1588979353373-340e129bb785?w=200' }}
            style={styles.thumb}
          />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardMeta}>{item.valueTier} · {item.pickupLocation}</Text>
          </View>
          <Text style={styles.tierBadge}>{item.valueTier}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  thumb: {
    width: 80,
    height: 80,
    backgroundColor: colors.borderLight,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  tierBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginRight: 14,
  },
});
