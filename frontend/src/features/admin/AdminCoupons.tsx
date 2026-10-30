import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { themeColors } from '../../theme/theme';
import { storeApi } from '../../hooks/useApi';
import type { Coupon } from '../../types';
import AppButton from '../../components/common/AppButton';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';

export const AdminCoupons: React.FC = () => {
  const dispatch = useAppDispatch();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    endDate: '',
  });

  const fetchCoupons = () => {
    setLoading(true);
    storeApi
      .getAdminCoupons()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setCoupons(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        setCoupons([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: Number(formData.minOrderAmount),
        maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
        startDate: new Date().toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        isActive: true,
      };

      await storeApi.createCoupon(payload);
      dispatch(showToast({ message: `Coupon "${payload.code}" created!`, severity: 'success' }));
      setOpenCreate(false);
      fetchCoupons();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to create coupon', severity: 'error' }));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          pb: 2,
          borderBottom: `1px solid ${themeColors.border}`,
        }}
      >
        <Box>
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
            Promotions & Coupons
          </Typography>
          <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
            Atomic coupon redemption limits and promotional discount codes.
          </Typography>
        </Box>

        <AppButton onClick={() => setOpenCreate(true)}>
          <AddIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} /> Create Code
        </AppButton>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={36} color="inherit" />
        </Box>
      ) : coupons.length === 0 ? (
        <Box sx={{ p: 6, textAlign: 'center', backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}` }}>
          <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, mb: 1 }}>
            No Active Coupons
          </Typography>
          <Typography variant="body2" sx={{ color: themeColors.textMuted, mb: 3 }}>
            Create promotional codes like LUX15 or WELCOME20 to drive storefront conversions.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}`, overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.85rem',
            }}
          >
            <Box component="thead">
              <Box component="tr" sx={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: '#FAFAFA' }}>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Coupon Code</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Discount</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Min Order</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Max Cap</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Times Redeemed</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Status</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {coupons.map((c) => (
                <Box
                  component="tr"
                  key={c._id}
                  sx={{
                    borderBottom: `1px solid ${themeColors.border}`,
                    '&:hover': { backgroundColor: '#F9F9F7' },
                  }}
                >
                  <Box component="td" sx={{ py: 1.5, px: 2, fontFamily: 'monospace', fontWeight: 800 }}>
                    {c.code}
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>
                    {c.discountValue}%
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    ₹{c.minOrderAmount}
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    {c.maxDiscountAmount ? `₹${c.maxDiscountAmount}` : 'Unlimited'}
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    {c.timesUsed || 0} orders
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    <Chip
                      label={c.isActive ? 'ACTIVE' : 'EXPIRED'}
                      size="small"
                      sx={{
                        borderRadius: 0,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        backgroundColor: c.isActive ? '#ECFDF5' : '#FEE2E2',
                        color: c.isActive ? '#065F46' : '#991B1B',
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Create Coupon Modal */}
      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0, p: 2 } } }}
      >
        <DialogTitle sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
          New Promotional Coupon
        </DialogTitle>
        <Box component="form" onSubmit={handleCreateCoupon}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              required
              label="Promo Code (e.g. DROP20)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              size="small"
            />
            <TextField
              required
              type="number"
              label="Discount Percentage (%)"
              value={formData.discountValue}
              onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
              size="small"
            />
            <TextField
              required
              type="number"
              label="Minimum Order Amount (₹)"
              value={formData.minOrderAmount}
              onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
              size="small"
            />
            <TextField
              type="number"
              label="Max Discount Cap (₹)"
              value={formData.maxDiscountAmount}
              onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
              size="small"
            />
            <TextField
              required
              type="date"
              label="Expiry Date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenCreate(false)} sx={{ borderRadius: 0 }}>
              Cancel
            </Button>
            <AppButton type="submit" loading={creating}>
              Create Coupon
            </AppButton>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default AdminCoupons;
