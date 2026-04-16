/**
 * Unified Design System for MedRemind Mobile App
 * Aligned with the Web Dashboard Tailwind palette and Accessibility guidelines.
 */

import { Platform } from 'react-native';

// Web Dashboard Color Palette mapping
const palette = {
  blue: {
    50: '#eff6ff',
    600: '#2563eb', // Primary Brand Color
    700: '#1d4ed8',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    800: '#1f2937',
    900: '#111827',
  },
  green: { 50: '#f0fdf4', 600: '#16a34a' },
  amber: { 50: '#fffbeb', 600: '#d97706' },
  red: { 50: '#fef2f2', 600: '#dc2626' },
};

export const Colors = {
  light: {
    text: palette.gray[900],
    background: '#ffffff',
    tint: palette.blue[600],
    icon: palette.gray[500],
    tabIconDefault: palette.gray[500],
    tabIconSelected: palette.blue[600],
    
    // Semantic colors matching web adherence badges
    success: palette.green[600],
    successBg: palette.green[50],
    warning: palette.amber[600],
    warningBg: palette.amber[50],
    danger: palette.red[600],
    dangerBg: palette.red[50],
    
    // Structural
    cardBg: '#ffffff',
    border: palette.gray[100],
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#ffffff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#ffffff',
    
    // Dark mode semantic adjustments (if needed later, currently using defaults)
    success: '#22c55e',
    successBg: '#14532d',
    warning: '#f59e0b',
    warningBg: '#78350f',
    danger: '#ef4444',
    dangerBg: '#7f1d1d',
    
    cardBg: '#1f2937',
    border: '#374151',
  },
};

// Accessibility Typography & Layout Settings
export const Typography = {
  // Minimum sizes for elderly users
  body: 18,        
  header: 22,      
  action: 36,      
};

export const Layout = {
  // Touch target sizes for accessibility
  buttonHeight: 64, 
  gutter: 20,
  borderRadius: 12,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});