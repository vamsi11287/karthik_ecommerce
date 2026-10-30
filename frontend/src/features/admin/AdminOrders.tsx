import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Divider,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { themeColors } from '../../theme/theme';
import { storeApi } from '../../hooks/useApi';
import type { Order } from '../../types';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';

const FULFILLMENT_STAGES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

export const AdminOrders: React.FC = () => {
  const dispatch = useAppDispatch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    storeApi
      .getAdminOrders()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setOrders(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        setOrders([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await storeApi.updateOrderStatus(orderId, newStatus);
      dispatch(showToast({ message: `Order status transitioned to ${newStatus}`, severity: 'success' }));
      fetchOrders();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to update order status', severity: 'error' }));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Box>
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
          Fulfillment & Order Operations
        </Typography>
        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
          Advance order lifecycle states, inspect delivery manifests, and review payments.
        </Typography>
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={36} color="inherit" />
        </Box>
      ) : orders.length === 0 ? (
        <Box sx={{ p: 6, textAlign: 'center', backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}` }}>
          <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, mb: 1 }}>
            No Orders Received
          </Typography>
          <Typography variant="body2" sx={{ color: themeColors.textMuted }}>
            Customer orders will stream here with real-time status management.
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
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Order ID</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Customer</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Total (₹)</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Payment Method</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Payment State</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Fulfillment Progression</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700, textAlign: 'right' }}>Inspect</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {orders.map((o) => (
                <Box
                  component="tr"
                  key={o._id}
                  sx={{
                    borderBottom: `1px solid ${themeColors.border}`,
                    '&:hover': { backgroundColor: '#F9F9F7' },
                  }}
                >
                  <Box component="td" sx={{ py: 1.5, px: 2, fontFamily: 'monospace', fontWeight: 700 }}>
                    #{o.orderNumber}
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {o.shippingAddress?.fullName || 'Customer'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                      {o.shippingAddress?.phone}
                    </Typography>
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>
                    ₹{o.pricing?.grandTotal || (o as any).grandTotal}
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    <Chip
                      label={o.paymentMethod}
                      size="small"
                      sx={{ borderRadius: 0, fontWeight: 700, fontSize: '0.65rem' }}
                    />
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    <Chip
                      label={o.paymentStatus}
                      size="small"
                      sx={{
                        borderRadius: 0,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        backgroundColor: o.paymentStatus === 'PAID' ? '#ECFDF5' : '#FEF3C7',
                        color: o.paymentStatus === 'PAID' ? '#065F46' : '#92400E',
                      }}
                    />
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    <FormControl size="small">
                      <Select
                        disabled={updatingId === o._id}
                        value={o.fulfillmentStatus}
                        onChange={(e) => handleStatusChange(o._id, e.target.value)}
                        sx={{
                          borderRadius: 0,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          fontFamily: '"Syne", sans-serif',
                          height: 32,
                          backgroundColor:
                            o.fulfillmentStatus === 'DELIVERED'
                              ? '#ECFDF5'
                              : o.fulfillmentStatus === 'CANCELLED'
                              ? '#FEE2E2'
                              : '#FFF',
                        }}
                      >
                        {FULFILLMENT_STAGES.map((st) => (
                          <MenuItem key={st} value={st}>
                            {st}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2, textAlign: 'right' }}>
                    <IconButton size="small" onClick={() => setSelectedOrder(o)}>
                      <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Inspect Order Dialog */}
      <Dialog
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0, p: 2 } } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
          }}
        >
          Order #{selectedOrder?.orderNumber}
          <IconButton onClick={() => setSelectedOrder(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {selectedOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Customer Manifest & Delivery Address:
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  {selectedOrder.shippingAddress?.fullName} ({selectedOrder.shippingAddress?.phone})
                  <br />
                  {selectedOrder.shippingAddress?.addressLine1} {selectedOrder.shippingAddress?.addressLine2}
                  <br />
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} -{' '}
                  {selectedOrder.shippingAddress?.postalCode}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Ordered Items ({selectedOrder.items?.length}):
                </Typography>
                {selectedOrder.items?.map((item, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.8,
                    }}
                  >
                    <Typography variant="body2">
                      {item.name} (SKU: {item.variantSku}) × {item.quantity}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      ₹{item.subtotal}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography variant="subtitle1" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
                  Grand Total
                </Typography>
                <Typography variant="h5" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
                  ₹{selectedOrder.pricing?.grandTotal || (selectedOrder as any).grandTotal}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdminOrders;
