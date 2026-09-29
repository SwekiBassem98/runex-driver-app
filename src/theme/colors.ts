export const colors = {
  // Brand
  primary: '#0C1829', // Dark navy brand background
  primaryDark: '#070F1A',
  primaryLight: '#14253D',
  accent: '#E50914', // RUNEX red accent
  accentDark: '#B80710',
  accentLight: '#FF334B',

  // Status Colors (from Runsheet mockups)
  status: {
    inDelivery: '#0F2B48', // En livraison
    delivered: '#10B981', // Livrés (emerald green)
    postponed: '#F97316', // Reportés (orange)
    returned: '#EF4444', // Retours (red)
    relanced: '#8B5CF6', // Relances (purple)
    pending: '#64748B', // En attente
  },

  // Status Badge Backgrounds (soft tint)
  badge: {
    inDeliveryBg: '#EFF6FF',
    inDeliveryText: '#1D4ED8',
    deliveredBg: '#ECFDF5',
    deliveredText: '#059669',
    postponedBg: '#FFF7ED',
    postponedText: '#C2410C',
    returnedBg: '#FEF2F2',
    returnedText: '#DC2626',
    relancedBg: '#F5F3FF',
    relancedText: '#7C3AED',
  },

  // Base & Neutrals
  background: '#F7F9FC', // Screen background
  card: '#FFFFFF', // Card surface
  cardBorder: '#E2E8F0', // Card subtle border
  border: '#E2E8F0',
  divider: '#EEF2F6',

  // Text
  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
    accent: '#E50914',
  },

  // Currency / Money indicator
  money: {
    text: '#10B981',
    bg: '#0F2D25',
    card: '#081E19',
  },
} as const;

export type ColorTheme = typeof colors;
