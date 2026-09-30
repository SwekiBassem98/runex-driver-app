/**
 * RUNEX Design System - Colors
 * Brand: Modern, fast, professional, slightly aggressive/sporty (racing-inspired)
 */

export const colors = {
  // Brand Primary & Dark Surfaces
  primary: '#E31E2B', // RUNEX red — primary actions, active states, brand accent
  primaryDark: '#0A0A0A', // Near-black for secondary brand surfaces and gradients
  primaryHover: '#C81824',
  primaryMuted: 'rgba(227, 30, 43, 0.12)',

  // Two-tone Backgrounds (premium logistics driver style)
  background: {
    header: '#0A0E1A', // Near-black navy for top headers & status bar
    nav: '#0A0E1A', // Dark bottom navigation
    dark: '#0A0E1A',
    body: '#F5F6F8', // Light neutral gray for screen content bodies
    light: '#F5F6F8',
    default: '#F5F6F8',
  },
  headerBackground: '#0A0E1A',
  bodyBackground: '#F5F6F8',

  // Cards & Surfaces
  surface: '#FFFFFF', // White for cards & sheets
  card: '#FFFFFF', // Alias for surface
  cardBorder: '#E5E7EB',
  surfaceDark: '#121829', // Dark card alternative for header widgets
  surfaceMuted: '#F9FAFB',
  navyPill: '#0F2B48', // Navy pill button for header actions

  // Typography
  text: {
    primary: '#111827', // Dark charcoal/slate
    secondary: '#6B7280', // Cool gray
    muted: '#9CA3AF', // Light gray
    inverse: '#FFFFFF', // White for dark backgrounds/header
    accent: '#E31E2B', // RUNEX red
  },

  // Logistics Status Colors
  status: {
    success: '#16A34A', // Delivered (Livrés)
    warning: '#F59E0B', // Reported / Postponed (Reportés)
    danger: '#DC2626', // Return / Failed / 403 Permission Refused (Retours)
    info: '#2563EB', // In transit (En livraison)
    neutral: '#7C3AED', // Relaunch / Other (Relances)
  },

  // Direct status shortcuts
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#2563EB',
  neutral: '#7C3AED',

  // Status Soft Background Tints (for badges, pills, stat card icon circles)
  statusBg: {
    success: '#DCFCE7', // Emerald tint
    warning: '#FEF3C7', // Amber tint
    danger: '#FEE2E2', // Rose tint
    info: '#DBEAFE', // Blue tint
    neutral: '#F3E8FF', // Violet tint
  },

  // Borders & Dividers
  border: '#E5E7EB',
  borderDark: '#1F2937',
  divider: '#EFEFF2',

  // Cash / Money Highlight (Tunisian Dinar TND)
  cash: {
    green: '#10B981',
    cardBg: '#091A14',
    cardBorder: 'rgba(16, 185, 129, 0.2)',
  },
} as const;

/**
 * Gradients
 * primaryGradient: red → black diagonal matching the RUNEX logo's red-to-black "R"
 */
export const gradients = {
  primaryGradient: {
    colors: ['#E31E2B', '#0A0A0A'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: '135deg',
    css: 'linear-gradient(135deg, #E31E2B 0%, #0A0A0A 100%)',
  },
  headerGradient: {
    colors: ['#0A0E1A', '#111827'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    css: 'linear-gradient(180deg, #0A0E1A 0%, #111827 100%)',
  },
  accentGlow: {
    colors: ['#E31E2B', 'rgba(227, 30, 43, 0)'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(135deg, #E31E2B 0%, rgba(227, 30, 43, 0) 100%)',
  },
} as const;

export type Colors = typeof colors;
export type Gradients = typeof gradients;
