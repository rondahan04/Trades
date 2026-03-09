import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatchOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  /** When provided, shows "Start Chatting" + "Maybe Later" buttons instead of auto-dismissing */
  onStartChat?: () => void;
  /** Optional: auto-dismiss after this ms. Ignored when onStartChat is provided. (default 1600) */
  autoDismissMs?: number;
}

export function MatchOverlay({
  visible,
  onDismiss,
  onStartChat,
  autoDismissMs = 1600,
}: MatchOverlayProps) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const heartScale = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    scale.value = 0.3;
    opacity.value = 0;
    heartScale.value = 0;

    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    heartScale.value = withDelay(
      300,
      withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 12 })
      )
    );

    // Only auto-dismiss when there's no chat action to take
    if (!onStartChat) {
      const t = setTimeout(() => onDismiss(), autoDismissMs);
      return () => clearTimeout(t);
    }
  }, [visible, autoDismissMs, onDismiss, onStartChat]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <View style={styles.centered}>
          <Animated.View style={[styles.card, cardStyle]}>
            <Animated.View style={heartStyle}>
              <Ionicons name="heart" size={72} color={colors.swipeRight} />
            </Animated.View>
            <Text style={styles.title}>It's a match!</Text>
            <Text style={styles.subtitle}>You both want to trade. Start chatting to arrange it!</Text>
            {onStartChat && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.chatButton} onPress={onStartChat}>
                  <Text style={styles.chatButtonText}>Start Chatting →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.laterButton} onPress={onDismiss}>
                  <Text style={styles.laterButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH - 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  actions: {
    marginTop: 24,
    width: '100%',
    gap: 10,
  },
  chatButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  laterButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
