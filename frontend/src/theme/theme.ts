import { createTheme, responsiveFontSizes, type ThemeOptions } from '@mui/material/styles';

/**
 * Editorial Luxury Streetwear Theme
 * Matches the reference aesthetic (XIV QR):
 * - Textured sand/paper linen palette (#ECECE8, #F4F4F0)
 * - Jet black (#111111) high-contrast brutalist typography
 * - Syne display font for bold headlines & Inter for body
 * - Editorial electric blue accent (#2563EB)
 * - Clean 1px borders (#E2E2DE)
 */
export const themeColors = {
  paperBase: '#ECECE8',
  paperSurface: '#F6F6F2',
  paperCard: '#FFFFFF',
  textPrimary: '#121212',
  textSecondary: '#666662',
  textMuted: '#94948E',
  border: '#DFDFDA',
  borderDark: '#1E1E1E',
  black: '#101010',
  white: '#FFFFFF',
  accentBlue: '#2563EB',
  accentGreen: '#16A34A',
  accentRed: '#DC2626',
  darkBg: '#121212',
  darkCard: '#1C1C1C',
};

const baseThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: themeColors.black,
      contrastText: themeColors.white,
    },
    secondary: {
      main: themeColors.accentBlue,
      contrastText: themeColors.white,
    },
    background: {
      default: themeColors.paperBase,
      paper: themeColors.paperSurface,
    },
    text: {
      primary: themeColors.textPrimary,
      secondary: themeColors.textSecondary,
    },
    divider: themeColors.border,
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
    },
    h2: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '-0.025em',
      lineHeight: 1.1,
    },
    h3: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
    },
    h4: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '-0.015em',
      lineHeight: 1.2,
    },
    h5: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 600,
      letterSpacing: '0em',
    },
    subtitle1: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
    subtitle2: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontSize: '0.75rem',
    },
    button: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    },
    body1: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.9375rem',
      lineHeight: 1.6,
      color: themeColors.textPrimary,
    },
    body2: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.84rem',
      lineHeight: 1.55,
      color: themeColors.textSecondary,
    },
  },
  shape: {
    borderRadius: 2, // Minimalist sharp brutalist radii
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: themeColors.paperBase,
          color: themeColors.textPrimary,
          overflowX: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 0,
          padding: '10px 22px',
          fontWeight: 700,
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: 'none',
          border: `1px solid ${themeColors.border}`,
          backgroundColor: themeColors.paperCard,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundColor: '#FFFFFF',
          '& fieldset': {
            borderColor: themeColors.border,
          },
          '&:hover fieldset': {
            borderColor: themeColors.black,
          },
          '&.Mui-focused fieldset': {
            borderColor: themeColors.black,
            borderWidth: 1,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontFamily: '"Inter", sans-serif',
          fontWeight: 600,
          textTransform: 'uppercase',
          fontSize: '0.7rem',
          letterSpacing: '0.05em',
        },
      },
    },
  },
};

export const appTheme = responsiveFontSizes(createTheme(baseThemeOptions));
export default appTheme;
