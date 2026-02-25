/**
 * Leave Review screen – post-trade review (1–5 stars + text).
 * Only valid when match exists, user is participant, and match.status === 'completed'.
 * Receives matchId and revieweeId as route params.
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { submitReview } from '../services/dbService';
import { isFirebaseEnabled } from '../config/firebase';

export type LeaveReviewParams = {
  matchId: string;
  revieweeId: string;
  revieweeName?: string;
};

export function LeaveReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params ?? {}) as LeaveReviewParams;
  const { matchId, revieweeId, revieweeName } = params;
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!matchId || !revieweeId) {
      Alert.alert('Error', 'Missing match or reviewee information.');
      return;
    }
    if (rating < 1 || rating > 5) {
      Alert.alert('Select a rating', 'Please choose 1 to 5 stars.');
      return;
    }
    if (!isFirebaseEnabled()) {
      Alert.alert('Firebase not configured', 'Reviews require Firebase.');
      return;
    }
    setSubmitting(true);
    try {
      await submitReview(matchId, revieweeId, rating, reviewText.trim());
      Alert.alert('Thank you', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to submit review';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!matchId || !revieweeId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invalid navigation params.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Leave a review</Text>
      {revieweeName ? (
        <Text style={styles.subtitle}>How was trading with {revieweeName}?</Text>
      ) : (
        <Text style={styles.subtitle}>How did this trade go?</Text>
      )}

      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={40}
              color={star <= rating ? colors.primary : colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.starHint}>{rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Tap to rate'}</Text>

      <Text style={styles.label}>Your review (optional)</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Share your experience..."
        placeholderTextColor={colors.textSecondary}
        value={reviewText}
        onChangeText={setReviewText}
        multiline
        numberOfLines={4}
        maxLength={500}
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.submitButtonText}>Submit review</Text>
        )}
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
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starBtn: {
    padding: 4,
  },
  starHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
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
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
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
