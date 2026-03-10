import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH / 1.1;
const COUNTDOWN_SECS = 5;

export interface AdDeckItem {
  id: string; // must start with 'ad-'
  isAd: true;
  adTitle: string;
  adBody: string;
}

interface AdCardProps {
  ad: AdDeckItem;
  onDismiss: () => void;
}

export function AdCard({ ad, onDismiss }: AdCardProps) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECS);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const progress = 1 - remaining / COUNTDOWN_SECS;

  return (
    <View style={styles.card}>
      {/* Sponsored badge */}
      <View style={styles.sponsoredBadge}>
        <Text style={styles.sponsoredText}>Sponsored</Text>
      </View>

      {/* Brand logo area */}
      <View style={styles.brandSection}>
        <View style={styles.logoCircle}>
          <Ionicons name="scale-outline" size={38} color="#C9A227" />
        </View>
        <Text style={styles.brandName}>TRADES</Text>
        <Text style={styles.brandTagline}>Fair &amp; Balanced</Text>
      </View>

      {/* Ad copy */}
      <View style={styles.copySection}>
        <Text style={styles.adTitle}>{ad.adTitle}</Text>
        <Text style={styles.adBody}>{ad.adBody}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>

      {/* Dismiss / countdown */}
      {remaining > 0 ? (
        <View style={styles.countdownRow}>
          <Text style={styles.countdownText}>Skip in {remaining}s</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.continueBtn} onPress={onDismiss} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT + 80,
    borderRadius: 20,
    backgroundColor: '#0D1B3E',
    overflow: 'hidden',
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  sponsoredBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(201,162,39,0.2)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#C9A227',
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C9A227',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  brandSection: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201,162,39,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(201,162,39,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 6,
  },
  brandTagline: {
    fontSize: 12,
    color: '#C9A227',
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  copySection: {
    gap: 8,
    paddingVertical: 12,
  },
  adTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  adBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 20,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C9A227',
    borderRadius: 2,
  },
  countdownRow: {
    alignItems: 'center',
    paddingTop: 8,
  },
  countdownText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#C9A227',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
