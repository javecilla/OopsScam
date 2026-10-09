export const colors = {
  background: '#F8FAF8',
  surface: '#FFFFFF',
  text: '#2B2F2C',
  muted: '#555C57',
  primary: '#D21F3C',
  onPrimary: '#FFFFFF',
  ink: '#111111',
  frame: '#2B2F2C',
  onFrame: '#FFFFFF',
  frameMuted: '#BAC0B9',
  border: '#747B75',
  softBorder: '#DADFDA',
  highlight: '#FFEBEB',
  scam: '#D21F3C',
  suspicious: '#C8B46A',
  lowRisk: '#2B2F2C',
  lowRiskMuted: '#8E928C',
} as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const fontSize = { small: 14, body: 16, section: 20, headline: 28, verdict: 32 } as const;
export const shape = { control: 8, panel: 12 } as const;
export const fonts = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semibold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
} as const;
export const brutalist = {
  borderWidth: 2,
  borderColor: colors.ink,
  offset: 3,
} as const;
