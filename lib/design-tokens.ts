export const HDY_DESIGN_TOKENS = {
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
  },
  typography: {
    ui: 'Inter, Arial, sans-serif',
    display: 'Inter, Arial, sans-serif',
  },
  status: {
    available: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
    neutral: '#9CA3AF',
  },
  environments: {
    diambars: {
      id: 'd3136b7f-ef28-43e8-af53-30fa6de70c62',
      label: 'DIAMBARS FC',
      background: '#080808',
      surface: '#111111',
      surfaceElevated: '#171717',
      text: '#FFFFFF',
      muted: '#A3A3A3',
      accent: '#E31E24',
      border: '#2A2A2A',
      colorMode: 'dark' as const,
    },
    hdyElite: {
      id: '5454ad8f-8f2b-4812-9923-ab7d0b1f8748',
      label: 'HDY ELITE',
      background: '#F5F5F5',
      surface: '#FFFFFF',
      surfaceElevated: '#FAFAFA',
      text: '#111111',
      muted: '#737373',
      accent: '#111111',
      border: '#E5E5E5',
      colorMode: 'light' as const,
    },
  },
} as const;

export type HdyEnvironmentKey = keyof typeof HDY_DESIGN_TOKENS.environments;
