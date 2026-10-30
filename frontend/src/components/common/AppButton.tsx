import React from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { themeColors } from '../../theme/theme';

interface AppButtonProps extends ButtonProps {
  loading?: boolean;
  withArrow?: boolean;
  inverted?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
  children,
  loading = false,
  withArrow = false,
  inverted = false,
  sx,
  disabled,
  ...props
}) => {
  return (
    <Button
      disabled={disabled || loading}
      sx={{
        fontFamily: '"Syne", sans-serif',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        borderRadius: 0,
        padding: '12px 28px',
        fontSize: '0.85rem',
        border: `1px solid ${inverted ? themeColors.white : themeColors.black}`,
        backgroundColor: inverted ? themeColors.white : themeColors.black,
        color: inverted ? themeColors.black : themeColors.white,
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.2,
        '&:hover': {
          backgroundColor: inverted ? themeColors.black : themeColors.white,
          color: inverted ? themeColors.white : themeColors.black,
          borderColor: themeColors.black,
        },
        '&.Mui-disabled': {
          opacity: 0.6,
          borderColor: '#CCC',
        },
        ...sx,
      }}
      {...props}
    >
      {loading ? (
        <CircularProgress size={18} color="inherit" />
      ) : (
        <>
          {children}
          {withArrow && <ArrowForwardIcon sx={{ fontSize: '1.05rem', ml: 0.5 }} />}
        </>
      )}
    </Button>
  );
};

export default AppButton;
