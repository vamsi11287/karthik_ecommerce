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
  Link as MuiLink,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { themeColors } from '../../theme/theme';
import useAuth from '../../hooks/useAuth';
import AppButton from '../../components/common/AppButton';
import { storeApi } from '../../hooks/useApi';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';

export const AuthModal: React.FC = () => {
  const dispatch = useAppDispatch();
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

  // Forgot password flow state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1); // 1 = Enter email, 2 = Enter OTP + New Password
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

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

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }

    try {
      setResetLoading(true);
      const res = await storeApi.forgotPassword(resetEmail.trim().toLowerCase());
      dispatch(
        showToast({
          message: res.data?.message || 'Verification OTP sent to your email!',
          severity: 'success',
        })
      );
      setResetStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send verification code. Please check your email.';
      setResetError(msg);
      dispatch(showToast({ message: msg, severity: 'error' }));
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (resetOtp.trim().length !== 6) {
      setResetError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please verify.');
      return;
    }

    try {
      setResetLoading(true);
      const res = await storeApi.resetPassword({
        email: resetEmail.trim().toLowerCase(),
        otp: resetOtp.trim(),
        newPassword,
      });
      dispatch(
        showToast({
          message: res.data?.message || 'Password reset successfully! Please sign in with your new password.',
          severity: 'success',
        })
      );
      // Return to login screen with email filled
      setLoginEmail(resetEmail);
      setIsForgotPassword(false);
      setResetStep(1);
      setResetOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setResetError('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reset password. Please check the code.';
      setResetError(msg);
      dispatch(showToast({ message: msg, severity: 'error' }));
    } finally {
      setResetLoading(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(loginEmail);
    setResetStep(1);
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setIsForgotPassword(true);
  };

  const closeForgotPassword = () => {
    setIsForgotPassword(false);
    setResetStep(1);
    setResetError('');
  };

  // Quick switch credentials helper for evaluation
  const setDemoSuperAdmin = () => {
    setLoginEmail('vamsikommanapalli51@gmail.com');
    setLoginPassword('SuperAdmin@2026!');
  };

  const setDemoAdmin = () => {
    setLoginEmail('vamsikommanapalli5@gmail.com');
    setLoginPassword('Admin@2026!');
  };

  const setDemoCustomer = () => {
    setLoginEmail('vamsi11287@gmail.com');
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isForgotPassword && (
            <IconButton onClick={closeForgotPassword} size="small" sx={{ color: themeColors.black, p: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {isForgotPassword
              ? resetStep === 1
                ? 'Recover Password'
                : 'Enter OTP Code'
              : tabIndex === 0
              ? 'Member Access'
              : 'Create Account'}
          </Typography>
        </Box>
        <IconButton onClick={closeAuthModal} size="small" sx={{ color: themeColors.black }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {!isForgotPassword && (
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
      )}

      <DialogContent sx={{ p: 0 }}>
        {pendingCheckoutAfterAuth && !isForgotPassword && (
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 0, fontSize: '0.8rem' }}>
            Please sign in or register to complete your order. Your selected items in the bag are safely preserved!
          </Alert>
        )}

        {isForgotPassword ? (
          /* Forgot Password / OTP Flow */
          <Box>
            {resetError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 0, fontSize: '0.82rem' }}>
                {resetError}
              </Alert>
            )}

            {resetStep === 1 ? (
              /* Step 1: Send OTP to Email */
              <Box component="form" onSubmit={handleSendResetOtp}>
                <Typography variant="body2" sx={{ color: themeColors.textMuted, mb: 2.5, fontSize: '0.85rem' }}>
                  Enter your registered email address. We will send a secure 6-digit verification code to reset your password.
                </Typography>
                <TextField
                  required
                  fullWidth
                  label="Registered Email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  size="small"
                  sx={{ mb: 3 }}
                  autoFocus
                />
                <AppButton type="submit" fullWidth loading={resetLoading} sx={{ py: 1.5, mb: 2 }}>
                  Send Verification Code
                </AppButton>
                <Box sx={{ textAlign: 'center' }}>
                  <MuiLink
                    component="button"
                    type="button"
                    variant="caption"
                    onClick={closeForgotPassword}
                    sx={{ color: themeColors.textMuted, textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Remember your password? Back to Sign In
                  </MuiLink>
                </Box>
              </Box>
            ) : (
              /* Step 2: Verify OTP and Set New Password */
              <Box component="form" onSubmit={handleResetPasswordSubmit}>
                <Typography variant="body2" sx={{ color: themeColors.textMuted, mb: 2, fontSize: '0.85rem' }}>
                  A 6-digit code was sent to <strong>{resetEmail}</strong>. (Code is valid for 10 minutes)
                </Typography>
                <TextField
                  required
                  fullWidth
                  label="6-Digit OTP Code"
                  placeholder="123456"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  size="small"
                  sx={{ mb: 2 }}
                  slotProps={{
                    htmlInput: {
                      maxLength: 6,
                      style: { letterSpacing: '0.3em', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' },
                    },
                  }}
                  autoFocus
                />
                <TextField
                  required
                  fullWidth
                  label="New Password (min 6 characters)"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  required
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  size="small"
                  sx={{ mb: 3 }}
                />
                <AppButton type="submit" fullWidth loading={resetLoading} sx={{ py: 1.5, mb: 2 }}>
                  Reset Password
                </AppButton>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <MuiLink
                    component="button"
                    type="button"
                    variant="caption"
                    onClick={() => setResetStep(1)}
                    sx={{ color: themeColors.textMuted, cursor: 'pointer' }}
                  >
                    Change Email
                  </MuiLink>
                  <MuiLink
                    component="button"
                    type="button"
                    variant="caption"
                    onClick={handleSendResetOtp}
                    sx={{ color: themeColors.black, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Resend Code
                  </MuiLink>
                </Box>
              </Box>
            )}
          </Box>
        ) : tabIndex === 0 ? (
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
              sx={{ mb: 1 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5 }}>
              <MuiLink
                component="button"
                type="button"
                variant="caption"
                onClick={openForgotPassword}
                sx={{
                  color: themeColors.textMuted,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { color: themeColors.black, textDecoration: 'underline' },
                }}
              >
                Forgot Password?
              </MuiLink>
            </Box>

            <AppButton type="submit" fullWidth loading={isLoading} sx={{ py: 1.5 }}>
              Sign In to Account
            </AppButton>

            {/* Quick Demo Access Bar — Development Only */}
            {import.meta.env.DEV && (
              <>
                <Divider sx={{ my: 3 }}>
                  <Typography variant="caption" sx={{ color: themeColors.textMuted, px: 1 }}>
                    Dev: Quick Test Credentials
                  </Typography>
                </Divider>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                  <AppButton type="button" inverted size="small" onClick={setDemoSuperAdmin} sx={{ fontSize: '0.68rem', py: 0.8, px: 0.5 }}>
                    Super Admin
                  </AppButton>
                  <AppButton type="button" inverted size="small" onClick={setDemoAdmin} sx={{ fontSize: '0.68rem', py: 0.8, px: 0.5 }}>
                    Admin
                  </AppButton>
                  <AppButton type="button" inverted size="small" onClick={setDemoCustomer} sx={{ fontSize: '0.68rem', py: 0.8, px: 0.5 }}>
                    Customer
                  </AppButton>
                </Box>
              </>
            )}
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
