export const colors = {
  background: '#0B0B0F',
  surface: '#14141F',
  surfaceElevated: '#1C1C28',
  card: '#1A1A24',
  border: '#2A2A38',
  text: '#FFFFFF',
  textSecondary: '#B3B3C0',
  textMuted: '#6E6E7A',
  netflixRed: '#E50914',
  netflixRedDark: '#B20710',
  primeBlue: '#00A8E1',
  primeBlueDark: '#0077A8',
  success: '#46D369',
  warning: '#F5C518',
  overlay: 'rgba(0, 0, 0, 0.65)',
  gradientStart: 'rgba(11, 11, 15, 0)',
  gradientEnd: 'rgba(11, 11, 15, 0.95)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const typography = {
  hero: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8 },
} as const;

export const poster = {
  width: 120,
  height: 180,
  heroHeight: 480,
  borderRadius: radius.md,
} as const;
