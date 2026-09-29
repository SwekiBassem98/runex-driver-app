import { Platform, ViewStyle } from 'react-native';

/**
 * RUNEX Elevation Shadows
 * Soft elevation shadow for cards, tuned for both mobile and web
 */

export const shadows = {
  // Primary soft elevation shadow for cards
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    }),
  } as ViewStyle,

  // Subtle border shadow for elevated items
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
    }),
  } as ViewStyle,

  // Floating elevated button / active scanner button
  floating: {
    shadowColor: '#E31E2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 6px 16px rgba(227, 30, 43, 0.28)',
    }),
  } as ViewStyle,

  // Dark header bottom shadow
  header: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
    }),
  } as ViewStyle,
} as const;

export type Shadows = typeof shadows;
