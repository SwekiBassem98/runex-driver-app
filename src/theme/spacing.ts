/**
 * RUNEX Spacing Scale (4px-based)
 * Scale: 4, 8, 12, 16, 20, 24, 32, 40
 */

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,

  // Direct numeric indexing support (e.g. spacing[16])
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
} as const;

export type Spacing = typeof spacing;
