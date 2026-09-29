/**
 * RUNEX Border Radii
 * Card: 16, Button: 12, Pill: 999
 */

export const radii = {
  card: 16,
  button: 12,
  pill: 999,

  // Granular helpers
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export type Radii = typeof radii;
