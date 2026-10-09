export const colors = {
  background: '#FFFFFF',
  text: '#1A1A1A',
  primary: '#1E5EFF',
  border: '#D0D5DD',
  muted: '#5F6B7A',
  surface: '#F4F6F8',
  highlight: '#FFE08A',
  // Verdict colors, used by the Result screen.
  scam: '#C62828',
  suspicious: '#B26A00',
  lowRisk: '#2E7D32',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
} as const;

export const fontSize = {
  // SRS 4.1 minimum body size.
  body: 16,
  small: 13,
  verdict: 40,
} as const;
