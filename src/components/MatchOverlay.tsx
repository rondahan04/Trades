import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
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
  /** Optional: show after this ms (default 1600) */
  autoDismissMs?: number;
}

export function MatchOverlay({
  visible,
  onDismiss,
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

    const t = setTimeout(() => onDismiss(), autoDismissMs);
    return () => clearTimeout(t);
  }, [visible, autoDismissMs, onDismiss]);

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
            <Text style={styles.subtitle}>You want to trade. Start a chat to arrange it.</Text>
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
});
