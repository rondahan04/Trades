import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../contexts';
import { saveOnboardingProfile } from '../services/dbService';

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Furniture',
  'Books',
  'Vehicles',
  'Sports',
  'Home',
  'Art',
  'Music',
  'Other',
] as const;

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;

export function FirstTimeSetupScreen() {
  const { completeOnboarding } = useAuth();

  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [tradeRadius, setTradeRadius] = useState<number>(10);
  const [loading, setLoading] = useState(false);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async () => {
    if (!location.trim()) {
      Alert.alert('Missing location', 'Please enter your base city or neighbourhood.');
      return;
    }
    setLoading(true);
    try {
      await saveOnboardingProfile({
        bio,
        preferredCategories: selectedCategories,
        baseLocation: location,
        tradeRadius,
      });
    } catch (e) {
      if (__DEV__) console.warn('saveOnboardingProfile error:', e);
    } finally {
      setLoading(false);
      completeOnboarding();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>
          Help us personalise your trading experience
        </Text>
      </View>

      {/* About You */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About you</Text>

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell traders what you're about..."
          placeholderTextColor={colors.textSecondary}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          maxLength={200}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{bio.length}/200</Text>

        <Text style={styles.label}>Base location *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Brooklyn, NY"
          placeholderTextColor={colors.textSecondary}
          value={location}
          onChangeText={setLocation}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      {/* Trading Interests */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trading interests</Text>
        <Text style={styles.sectionSubtitle}>Select all that apply</Text>
        <View style={styles.chipGrid}>
          {CATEGORIES.map((cat) => {
            const selected = selectedCategories.includes(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Trade Radius */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trade radius</Text>
        <Text style={styles.sectionSubtitle}>
          How far are you willing to travel?
        </Text>
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((km) => {
            const selected = tradeRadius === km;
            return (
              <TouchableOpacity
                key={km}
                style={[styles.radiusChip, selected && styles.radiusChipSelected]}
                onPress={() => setTradeRadius(km)}
                activeOpacity={0.7}
              >
                <Text style={[styles.radiusText, selected && styles.radiusTextSelected]}>
                  {km} km
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.buttonText}>Get trading</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={completeOnboarding}
        disabled={loading}
      >
        <Text style={styles.skipText}>Skip for now</Text>
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
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 4,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 13,
  },
  charCount: {
    fontSize: 12,
    color: colors.tabInactive,
    textAlign: 'right',
    marginBottom: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  radiusChip: {
    flex: 1,
    minWidth: 56,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  radiusChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  radiusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  radiusTextSelected: {
    color: colors.textOnPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textOnPrimary,
    letterSpacing: 0.3,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
