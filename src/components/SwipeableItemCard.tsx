import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../theme';
import type { Item } from '../utils/mockData';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_ASPECT = 1.1;
const CARD_HEIGHT = CARD_WIDTH / CARD_ASPECT;
const SWIPE_THRESHOLD = CARD_WIDTH * 0.25;
const ROTATION_RANGE = 12;
const FLY_OFF_DISTANCE = SCREEN_WIDTH * 1.2;

const springConfig = { damping: 15, stiffness: 150 };

export type SwipeDirection = 'left' | 'right';

interface SwipeableItemCardProps {
  item: Item;
  onSwipeComplete: (direction: SwipeDirection) => void;
  onPressDetail?: () => void;
}

export function SwipeableItemCard({ item, onSwipeComplete, onPressDetail }: SwipeableItemCardProps) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const x = translateX.value;
      const velocity = e.velocityX;
      const shouldSwipeRight = x > SWIPE_THRESHOLD || (x > 0 && velocity > 300);
      const shouldSwipeLeft = x < -SWIPE_THRESHOLD || (x < 0 && velocity < -300);

      if (shouldSwipeRight) {
        translateX.value = withTiming(
          FLY_OFF_DISTANCE,
          { duration: 200 },
          () => runOnJS(onSwipeComplete)('right')
        );
      } else if (shouldSwipeLeft) {
        translateX.value = withTiming(
          -FLY_OFF_DISTANCE,
          { duration: 200 },
          () => runOnJS(onSwipeComplete)('left')
        );
      } else {
        translateX.value = withSpring(0, springConfig);
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-CARD_WIDTH / 2, CARD_WIDTH / 2],
      [-ROTATION_RANGE, ROTATION_RANGE]
    );
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  const overlayRightStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      'clamp'
    );
    return { opacity };
  });

  const overlayLeftStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      'clamp'
    );
    return { opacity };
  });

  const photoUri = item.photos[0]?.trim() || 'https://images.unsplash.com/photo-1588979353373-340e129bb785?w=600';

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photoUri }}
            style={styles.image}
            resizeMode="cover"
          />
          {onPressDetail && (
            <Pressable style={styles.detailButton} onPress={onPressDetail} hitSlop={12}>
              <Ionicons name="information-circle" size={28} color="#fff" />
            </Pressable>
          )}
          <Animated.View style={[styles.overlay, styles.overlayRight, overlayRightStyle]} />
          <Animated.View style={[styles.overlay, styles.overlayLeft, overlayLeftStyle]} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.tier}>{item.valueTier}</Text>
          <Text style={styles.location} numberOfLines={1}>{item.pickupLocation}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT + 80,
    borderRadius: 24,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  imageContainer: {
    width: '100%',
    height: CARD_HEIGHT,
    position: 'relative',
    backgroundColor: colors.borderLight,
  },
  detailButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayRight: {
    backgroundColor: colors.swipeRightOverlay,
  },
  overlayLeft: {
    backgroundColor: colors.swipeLeftOverlay,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tier: {
    fontSize: 14,
    color: colors.primaryDark,
    marginTop: 2,
  },
  location: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
