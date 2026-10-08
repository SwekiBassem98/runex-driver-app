import { Platform, TextStyle } from 'react-native';

/**
 * RUNEX Typography Scale
 * Headings: Poppins (geometric, aggressive/sporty, matches logo energy)
 * Body: Inter (clean, high-legibility geometric sans)
 *
 * Noms natifs = clés passées à useFonts() dans app/_layout.tsx
 * (@expo-google-fonts), identiques sur iOS et Android.
 */

export const fontFamilies = {
  heading: Platform.select({
    web: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ios: 'Poppins_700Bold',
    android: 'Poppins_700Bold',
    default: 'System',
  }),
  headingSemiBold: Platform.select({
    web: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ios: 'Poppins_600SemiBold',
    android: 'Poppins_600SemiBold',
    default: 'System',
  }),
  body: Platform.select({
    web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ios: 'Inter_400Regular',
    android: 'Inter_400Regular',
    default: 'System',
  }),
  bodyMedium: Platform.select({
    web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ios: 'Inter_500Medium',
    android: 'Inter_500Medium',
    default: 'System',
  }),
  bodySemiBold: Platform.select({
    web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ios: 'Inter_600SemiBold',
    android: 'Inter_600SemiBold',
    default: 'System',
  }),
};

export const typography = {
  // Headings (Poppins)
  display: {
    fontFamily: fontFamilies.heading,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: fontFamilies.heading,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fontFamilies.heading,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fontFamilies.headingSemiBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
  },

  // Body & Captions (Inter)
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  caption: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
  },

  // Stat Numbers (Dashboard Counters: 32-36px, bold/heavy)
  statNumber: {
    fontFamily: fontFamilies.heading,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
  },

  // Scales for manual composition
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    stat: 34,
    display: 36,
  },
  fontWeight: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semiBold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    heavy: '800' as TextStyle['fontWeight'],
  },
} as const;

export type Typography = typeof typography;
