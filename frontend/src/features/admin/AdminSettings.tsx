import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { themeColors } from '../../theme/theme';
import { storeApi } from '../../hooks/useApi';
import useAuth from '../../hooks/useAuth';
import AppButton from '../../components/common/AppButton';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';

export const AdminSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isSuperAdmin } = useAuth();
  const canManagePayment = Boolean(isSuperAdmin || user?.permissions?.includes('settings.payment_methods.manage'));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Form states
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [codEnabled, setCodEnabled] = useState(false);

  const fetchSettings = () => {
    setLoading(true);
    storeApi
      .getAdminSettings()
      .then((res) => {
        const s = res.data?.data || res.data;
        setSettings(s);
        setOnlineEnabled(s?.paymentMethods?.online?.enabled ?? true);
        setCodEnabled(s?.paymentMethods?.cod?.enabled ?? false);
      })
      .catch(() => {
        // Fallback to public settings
        storeApi.getPublicSettings().then((pRes) => {
          const s = pRes.data?.data || pRes.data;
          setSettings(s);
          setOnlineEnabled(s?.paymentMethods?.online?.enabled ?? true);
          setCodEnabled(s?.paymentMethods?.cod?.enabled ?? false);
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSavePaymentSettings = async () => {
    if (!onlineEnabled && !codEnabled) {
      dispatch(showToast({ message: 'At least one payment method must remain active', severity: 'error' }));
      return;
    }

    setSaving(true);
    try {
      const updatedMethods = {
        online: {
          enabled: onlineEnabled,
          isDefault: onlineEnabled,
          provider: 'razorpay',
        },
        cod: {
          enabled: codEnabled,
        },
      };

      const res = await storeApi.updatePaymentSettings(updatedMethods);
      const resData = res.data?.data || res.data;
      if (resData?.cod) {
        setCodEnabled(Boolean(resData.cod.enabled));
      }
      if (resData?.online) {
        setOnlineEnabled(Boolean(resData.online.enabled));
      }
      dispatch(showToast({ message: 'Payment settings successfully saved!', severity: 'success' }));
      fetchSettings();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to update payment settings', severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box >
      {/* Header */}
      <Box sx={{ mb: 4, pb: 2, borderBottom: `1px solid ${themeColors.border}` }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            textTransform: 'uppercase',
            fontSize: { xs: '1.8rem', md: '2.4rem' },
            mb: 0.5,
          }}
        >
          Store & Payment Configuration
        </Typography>
        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
          Manage gateway toggles, Cash on Delivery availability, and fulfillment policies.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={36} color="inherit" />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* RBAC notice */}
          {!canManagePayment && (
            <Alert severity="warning" sx={{ borderRadius: 0 }}>
              You are signed in as an <strong>ADMIN</strong> without payment method permissions. Only authorized
              staff can reconfigure payment gateway credentials and toggle store-wide Cash on Delivery.
            </Alert>
          )}

          {/* Payment Methods Card */}
          <Card>
            <CardContent sx={{ p: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <PaymentOutlinedIcon sx={{ fontSize: 24, color: themeColors.black }} />
                <Typography
                  variant="h5"
                  sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, textTransform: 'uppercase' }}
                >
                  Payment Methods & Gateway Settings
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: themeColors.textSecondary, mb: 3 }}>
                Configure available checkout methods for shoppers. In single-vendor architecture, Razorpay
                is the primary default gateway.
              </Typography>

              <Divider sx={{ mb: 3 }} />

              {/* Online Payment (Razorpay) Toggle */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${themeColors.border}`,
                  mb: 2.5,
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Online Payment (Razorpay)
                  </Typography>
                  <Typography variant="body2" sx={{ color: themeColors.textMuted, maxWidth: 500 }}>
                    Enables Card, UPI, NetBanking, and Wallet checkouts with cryptographic SHA-256 webhook
                    verification.
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={onlineEnabled}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setOnlineEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={onlineEnabled ? 'ACTIVE (DEFAULT)' : 'INACTIVE'}
                  sx={{ '& .MuiTypography-root': { fontWeight: 700, fontSize: '0.75rem' } }}
                />
              </Box>

              {/* Cash on Delivery (COD) Toggle */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${themeColors.border}`,
                  mb: 3,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Cash on Delivery (COD)
                    </Typography>
                    {!codEnabled && (
                      <Typography
                        variant="caption"
                        sx={{
                          backgroundColor: '#FEE2E2',
                          color: '#991B1B',
                          px: 0.8,
                          py: 0.2,
                          fontWeight: 700,
                          fontSize: '0.65rem',
                        }}
                      >
                        DISABLED BY DEFAULT
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ color: themeColors.textMuted, maxWidth: 500 }}>
                    When disabled, COD is strictly rejected by the backend checkout service and hidden on the
                    customer storefront.
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={codEnabled}
                      disabled={!canManagePayment}
                      onChange={(e) => setCodEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={codEnabled ? 'ENABLED' : 'DISABLED'}
                  sx={{ '& .MuiTypography-root': { fontWeight: 700, fontSize: '0.75rem' } }}
                />
              </Box>

              {canManagePayment && (
                <AppButton loading={saving} onClick={handleSavePaymentSettings}>
                  Save Payment Settings
                </AppButton>
              )}
            </CardContent>
          </Card>

          {/* Shipping Policy & Return Window */}
          <Card>
            <CardContent sx={{ p: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <LocalShippingOutlinedIcon sx={{ fontSize: 24, color: themeColors.black }} />
                <Typography
                  variant="h5"
                  sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, textTransform: 'uppercase' }}
                >
                  Fulfillment & Return Standards
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}` }}>
                    <Typography variant="caption" sx={{ color: themeColors.textMuted, fontWeight: 700 }}>
                      FREE SHIPPING THRESHOLD
                    </Typography>
                    <Typography variant="h5" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, mt: 0.5 }}>
                      ₹{settings?.shipping?.freeShippingThreshold || 200}
                    </Typography>
                    <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                      Orders above this amount qualify for zero freight fees.
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}` }}>
                    <Typography variant="caption" sx={{ color: themeColors.textMuted, fontWeight: 700 }}>
                      RETURNS WINDOW
                    </Typography>
                    <Typography variant="h5" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, mt: 0.5 }}>
                      {settings?.returns?.windowDays || 7} Days
                    </Typography>
                    <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                      Eligible return policy window from date of delivery.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default AdminSettings;
