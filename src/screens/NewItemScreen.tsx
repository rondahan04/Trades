/**
 * New Item screen – create a listing.
 * Form: title, description, valueTier, placeholder for photos. Submit calls createItem (Firebase).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../contexts';
import { createItem } from '../services/dbService';
import { isFirebaseEnabled } from '../config/firebase';
import type { ValueTier, ItemCategory } from '../utils/mockData';

const VALUE_TIERS: ValueTier[] = ['$', '$$', '$$$'];
const CATEGORIES: ItemCategory[] = [
  'Electronics', 'Clothing', 'Home', 'Sports', 'Books', 'Toys', 'Music', 'Art', 'Other',
];
const MAX_PHOTOS = 5;

export function NewItemScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [valueTier, setValueTier] = useState<ValueTier>('$$');
  const [category, setCategory] = useState<ItemCategory>('Other');
  const [pickupLocation, setPickupLocation] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSelectPhotos = () => {
    Alert.alert(
      'Select Photos',
      'Photo picker will be wired in a later phase. You can submit without photos for now.',
      [{ text: 'OK' }]
    );
  };

  const handleSubmit = async () => {
    const t = title.trim();
    const d = description.trim();
    const loc = pickupLocation.trim();
    if (!t) {
      Alert.alert('Missing title', 'Please enter a title.');
      return;
    }
    if (!user) {
      Alert.alert('Not signed in', 'You must be signed in to create an item.');
      return;
    }
    if (!isFirebaseEnabled()) {
      Alert.alert(
        'Firebase not configured',
        'Add Firebase env vars to create real items. Mock data is used for testing.'
      );
      return;
    }
    setSubmitting(true);
    try {
      await createItem(
        {
          title: t,
          description: d,
          valueTier,
          pickupLocation: loc || 'Not specified',
          category,
          ownerId: user.id,
        },
        photoUris
      );
      Alert.alert('Item created', 'Your item is now listed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create item';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Vintage Record Player"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Describe your item..."
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        <Text style={styles.label}>Value tier</Text>
        <View style={styles.tierRow}>
          {VALUE_TIERS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tierChip, valueTier === t && styles.tierChipActive]}
              onPress={() => setValueTier(t)}
            >
              <Text style={[styles.tierChipText, valueTier === t && styles.tierChipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, category === c && styles.catChipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Pickup location (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Tel Aviv"
          placeholderTextColor={colors.textSecondary}
          value={pickupLocation}
          onChangeText={setPickupLocation}
          maxLength={80}
        />

        <Text style={styles.label}>Photos (up to {MAX_PHOTOS})</Text>
        <TouchableOpacity style={styles.photoButton} onPress={handleSelectPhotos}>
          <Ionicons name="images-outline" size={28} color={colors.textSecondary} />
          <Text style={styles.photoButtonText}>Select Photos</Text>
          {photoUris.length > 0 && (
            <Text style={styles.photoCount}>{photoUris.length} selected</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tierRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tierChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tierChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tierChipText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  tierChipTextActive: {
    color: colors.textOnPrimary,
  },
  catScroll: {
    marginHorizontal: -16,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  catChipTextActive: {
    color: colors.text,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  photoButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  photoCount: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.primaryDark,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});
