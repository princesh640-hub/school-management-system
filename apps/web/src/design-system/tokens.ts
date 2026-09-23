/**
 * Enterprise School Management System — Centralized Design Tokens
 */

export const tokens = {
  colors: {
    brand: {
      primary: '#0284c7', // Sky 600
      primaryHover: '#0369a1', // Sky 700
      primaryLight: '#f0f9ff', // Sky 50
      secondary: '#0f172a', // Slate 900
      secondaryMuted: '#1e293b', // Slate 800
      accent: '#38bdf8', // Sky 400
    },
    surface: {
      canvas: '#f8fafc', // Slate 50
      card: '#ffffff', // White
      subtle: '#f1f5f9', // Slate 100
      border: '#e2e8f0', // Slate 200
      borderFocus: '#38bdf8', // Sky 400
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      muted: '#94a3b8',
      inverse: '#ffffff',
    },
    status: {
      success: '#15803d',
      successBg: '#dcfce7',
      warning: '#b45309',
      warningBg: '#fef3c7',
      danger: '#b91c1c',
      dangerBg: '#fee2e2',
      info: '#0369a1',
      infoBg: '#e0f2fe',
    },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    sizes: {
      display: '1.75rem', // 28px
      h1: '1.5rem', // 24px
      h2: '1.125rem', // 18px
      h3: '0.9375rem', // 15px
      body: '0.875rem', // 14px
      caption: '0.75rem', // 12px
      micro: '0.6875rem', // 11px
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    '2xs': '4px',
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    default: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type DesignTokens = typeof tokens;
