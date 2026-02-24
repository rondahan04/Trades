/**
 * Trades – "Nano Banana" theme.
 * Playful, rounded, clean, bright. Soft edges and a modern, trustworthy feel.
 */

export const colors = {
  // Primary palette – lively and bright
  primary: '#FFD93D',       // Banana yellow
  primaryDark: '#E6C235',
  primaryLight: '#FFE566',

  // Backgrounds – soft and clean
  background: '#FFFEF7',    // Warm off-white
  surface: '#FFFFFF',
  surfaceElevated: '#FFFEF2',

  // Swipe feedback – distinct but friendly
  swipeRight: '#6BCB77',    // Soft green (TRADE)
  swipeRightOverlay: 'rgba(107, 203, 119, 0.75)',
  swipeLeft: '#FF6B6B',    // Soft red (PASS)
  swipeLeftOverlay: 'rgba(255, 107, 107, 0.75)',

  // Text
  text: '#2D3436',
  textSecondary: '#636E72',
  textOnPrimary: '#2D3436',
  textOnSwipe: '#FFFFFF',

  // UI
  border: '#DFE6E9',
  borderLight: '#F1F3F4',
  tabActive: '#FFD93D',
  tabInactive: '#B2BEC3',

  // Value tier accents (optional use in cards)
  tierLow: '#81ECEC',      // $ – teal
  tierMid: '#FFD93D',      // $$ – yellow
  tierHigh: '#A29BFE',     // $$$ – soft purple
} as const;

export type ThemeColors = typeof colors;
