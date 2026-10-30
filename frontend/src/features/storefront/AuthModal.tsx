import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { themeColors } from '../../theme/theme';
import useAuth from '../../hooks/useAuth';
import AppButton from '../../components/common/AppButton';

export const AuthModal: React.FC = () => {
  const { authModalOpen, closeAuthModal, login, register, isLoading, pendingCheckoutAfterAuth } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email: loginEmail, password: loginPassword });
    } catch {
      // Handled via toast
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
      });
    } catch {
      // Handled via toast
    }
  };

  // Quick switch credentials helper for evaluation
  const setDemoSuperAdmin = () => {
    setLoginEmail('superadmin@luxwear.com');
    setLoginPassword('SuperAdmin@2026!');
  };

  const setDemoAdmin = () => {
    setLoginEmail('admin@luxwear.com');
    setLoginPassword('Admin@2026!');
  };

  const setDemoCustomer = () => {
    setLoginEmail('customer@luxwear.com');
    setLoginPassword('Customer@2026!');
  };

  return (
    <Dialog
      open={authModalOpen}
      onClose={closeAuthModal}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 0,
            backgroundColor: '#FFFFFF',
            p: 3,
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 0,
          mb: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {tabIndex === 0 ? 'Member Access' : 'Create Account'}
        </Typography>
        <IconButton onClick={closeAuthModal} size="small" sx={{ color: themeColors.black }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Tabs
        value={tabIndex}
        onChange={(_, val) => setTabIndex(val)}
        sx={{
          mb: 3,
          borderBottom: `1px solid ${themeColors.border}`,
          '& .MuiTabs-indicator': { backgroundColor: themeColors.black, height: 2 },
        }}
      >
        <Tab
          label="Sign In"
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: themeColors.textMuted,
            '&.Mui-selected': { color: themeColors.black },
          }}
        />
        <Tab
          label="Register"
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: themeColors.textMuted,
            '&.Mui-selected': { color: themeColors.black },
          }}
        />
      </Tabs>

      <DialogContent sx={{ p: 0 }}>
        {pendingCheckoutAfterAuth && (
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 0, fontSize: '0.8rem' }}>
            Please sign in or register to complete your order. Your selected items in the bag are safely preserved!
          </Alert>
        )}

        {tabIndex === 0 ? (
          /* Login Form */
          <Box component="form" onSubmit={handleLoginSubmit}>
            <TextField
              required
              fullWidth
              label="Email Address"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              required
              fullWidth
              label="Password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              size="small"
              sx={{ mb: 3 }}
            />

            <AppButton type="submit" fullWidth loading={isLoading} sx={{ py: 1.5 }}>
              Sign In to Account
            </AppButton>

            {/* Quick Demo Access Bar */}
            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" sx={{ color: themeColors.textMuted, px: 1 }}>
                Quick Test Credentials
              </Typography>
            </Divider>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              <AppButton
                type="button"
                inverted
                size="small"
                onClick={setDemoSuperAdmin}
                sx={{ fontSize: '0.68rem', py: 0.8, px: 0.5 }}
              >
                Super Admin
              </AppButton>
              <AppButton
                type="button"
                inverted
                size="small"
                onClick={setDemoAdmin}
                sx={{ fontSize: '0.68rem', py: 0.8, px: 0.5 }}
              >
                Admin
              </AppButton>
              <AppButton
                type="button"
                inverted
                size="small"
                onClick={setDemoCustomer}
                sx={{ fontSize: '0.68rem', py: 0.8, px: 0.5 }}
              >
                Customer
              </AppButton>
            </Box>
          </Box>
        ) : (
          /* Registration Form */
          <Box component="form" onSubmit={handleRegisterSubmit}>
            <TextField
              required
              fullWidth
              label="Full Name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              required
              fullWidth
              label="Email Address"
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone Number (Optional)"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              required
              fullWidth
              label="Password (min 6 characters)"
              type="password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              size="small"
              sx={{ mb: 3 }}
            />

            <AppButton type="submit" fullWidth loading={isLoading} sx={{ py: 1.5 }}>
              Create Account
            </AppButton>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
