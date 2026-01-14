/**
 * Theme configuration for the app
 * Matches the glassmorphic design from the web version
 */

export const colors = {
  // Primary
  primary: '#6366f1',
  primaryLight: '#e0e7ff',
  primaryDark: '#4f46e5',

  // Backgrounds
  background: '#f9fafb',
  surface: '#ffffff',
  surfaceVariant: '#f3f4f6',

  // Text
  text: '#1f2937',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',

  // Status
  success: '#10b981',
  successLight: '#d1fae5',
  error: '#ef4444',
  errorLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#3b82f6',
  infoLight: '#dbeafe',

  // Borders
  border: '#e5e7eb',
  borderLight: '#f3f4f6',

  // Upgrade/Premium
  premium: '#f59e0b',
  premiumLight: '#fef3c7',
  premiumDark: '#92400e',

  // Categories (matching web version)
  categoryColors: {
    work: '#3b82f6',
    personal: '#8b5cf6',
    social: '#ec4899',
    travel: '#f59e0b',
    health: '#10b981',
    learning: '#6366f1',
    creative: '#f43f5e',
    finance: '#059669',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
};

export type Theme = typeof theme;
