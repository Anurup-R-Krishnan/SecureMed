export const tokens = {
  colors: {
    coolGrey: {
      50: '#F8F9FA',
      100: '#E9ECEF',
      200: '#DEE2E6',
    },
    precisionBlue: {
      DEFAULT: '#0055FF',
      dark: '#0044CC',
    },
    alertCrimson: {
      DEFAULT: '#D32F2F',
      dark: '#B71C1C',
    },
    steelContrast: '#212529',
  },
  fonts: {
    sans: ["'Inter'", "'Segoe UI'", 'system-ui', 'sans-serif'],
    mono: ["'JetBrains Mono'", "'Fira Code'", 'ui-monospace', 'monospace'],
  },
  radius: {
    sm: 'calc(var(--radius) - 4px)',
    md: 'calc(var(--radius) - 2px)',
    lg: 'var(--radius)',
    xl: 'calc(var(--radius) + 4px)',
  },
}
