import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatchOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  onStartChat?: () => void;
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

  useEffect(() => {
    if (!visible) return;
    scale.value = 0.3;
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });

    if (!onStartChat) {
      const t = setTimeout(() => onDismiss(), autoDismissMs);
      return () => clearTimeout(t);
    }
  }, [visible, autoDismissMs, onDismiss, onStartChat]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
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
        <Animated.View style={[styles.card, cardStyle]}>
          {onStartChat ? (
            <>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={onStartChat}
                activeOpacity={0.85}
              >
                <Text style={styles.chatButtonText}>Start Chatting →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.laterButton} onPress={onDismiss}>
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: SCREEN_WIDTH - 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    gap: 10,
  },
  chatButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  laterButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
