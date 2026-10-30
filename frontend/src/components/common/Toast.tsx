import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { hideToast } from '../../app/uiSlice';
import { themeColors } from '../../theme/theme';

export const Toast: React.FC = () => {
  const dispatch = useAppDispatch();
  const { open, message, severity } = useAppSelector((state) => state.ui.toast);

  const handleClose = (_event?: any, reason?: string) => {
    if (reason === 'clickaway') return;
    dispatch(hideToast());
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ zIndex: 999999 }}
    >
      <Alert
        onClose={() => dispatch(hideToast())}
        severity={severity}
        variant="filled"
        sx={{
          borderRadius: 0,
          fontFamily: '"Inter", sans-serif',
          fontWeight: 600,
          fontSize: '0.85rem',
          backgroundColor:
            severity === 'success'
              ? themeColors.black
              : severity === 'error'
              ? '#B91C1C'
              : '#27272A',
          color: '#FFFFFF',
          border: `1px solid ${themeColors.border}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Toast;
