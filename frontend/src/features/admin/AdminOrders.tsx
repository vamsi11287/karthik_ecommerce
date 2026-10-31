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
  DialogActions,
  IconButton,
  Divider,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { themeColors } from '../../theme/theme';
import { storeApi } from '../../hooks/useApi';
import type { Order } from '../../types';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';
import useAuth from '../../hooks/useAuth';

// ✅ Matches backend OrderFulfillmentStatus enum exactly
const FULFILLMENT_STAGES = [
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'CONFIRMED',       label: 'Confirmed' },
  { value: 'PACKING',         label: 'Packing' },
  { value: 'SHIPPING',        label: 'Shipping' },
  { value: 'DELIVERED',       label: 'Delivered' },
  { value: 'CANCELLED',       label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING_PAYMENT: { bg: '#FEF9C3', color: '#854D0E' },
  CONFIRMED:       { bg: '#DBEAFE', color: '#1E40AF' },
  PACKING:         { bg: '#EDE9FE', color: '#5B21B6' },
  SHIPPING:        { bg: '#FEF3C7', color: '#92400E' },
  DELIVERED:       { bg: '#ECFDF5', color: '#065F46' },
  CANCELLED:       { bg: '#FEE2E2', color: '#991B1B' },
};

export const AdminOrders: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isSuperAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Inspect modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Tracking modal
  const [trackingModal, setTrackingModal] = useState<{ open: boolean; orderId: string; currentStatus: string }>({
    open: false, orderId: '', currentStatus: '',
  });
  const [trackingForm, setTrackingForm] = useState({
    status: '',
    courierName: '',
    trackingNumber: '',
    trackingUrl: '',
  });
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Return review modal
  const [returnModal, setReturnModal] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });
  const [returnLoading, setReturnLoading] = useState(false);

  const fetchOrders = () => {
    setLoading(true);
    storeApi
      .getAdminOrders()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setOrders(Array.isArray(list) ? list : []);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const openTrackingModal = (order: Order) => {
    setTrackingForm({
      status: order.fulfillmentStatus,
      courierName: order.shippingDetails?.courierName || order.shippingDetails?.carrier || '',
      trackingNumber: order.shippingDetails?.trackingNumber || '',
      trackingUrl: order.shippingDetails?.trackingUrl || '',
    });
    setTrackingModal({ open: true, orderId: order._id, currentStatus: order.fulfillmentStatus });
  };

  const handleStatusUpdate = async () => {
    if (!trackingForm.status) return;
    setTrackingLoading(true);
    try {
      await storeApi.updateOrderStatus(trackingModal.orderId, trackingForm.status, {
        courierName: trackingForm.courierName,
        trackingNumber: trackingForm.trackingNumber,
        trackingUrl: trackingForm.trackingUrl,
      });
      dispatch(showToast({ message: `Order updated to ${trackingForm.status}`, severity: 'success' }));
      setTrackingModal({ open: false, orderId: '', currentStatus: '' });
      fetchOrders();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to update status', severity: 'error' }));
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleReturnDecision = async (decision: 'APPROVE' | 'REJECT' | 'COMPLETE') => {
    if (!returnModal.order) return;
    setReturnLoading(true);
    try {
      await storeApi.reviewReturnRequest(returnModal.order._id, decision);
      dispatch(showToast({ message: `Return ${decision.toLowerCase()}d`, severity: 'success' }));
      setReturnModal({ open: false, order: null });
      fetchOrders();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to process return', severity: 'error' }));
    } finally {
      setReturnLoading(false);
    }
  };

  const statusColors = (status: string) =>
    STATUS_COLORS[status] || { bg: '#F3F4F6', color: '#374151' };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, pb: 2, borderBottom: `1px solid ${themeColors.border}` }}>
        <Typography variant="h3" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, textTransform: 'uppercase', fontSize: { xs: '1.8rem', md: '2.4rem' }, mb: 0.5 }}>
          Orders & Fulfillment
        </Typography>
        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
          Manage order lifecycle, update shipment tracking, and review return requests.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={36} color="inherit" />
        </Box>
      ) : orders.length === 0 ? (
        <Box sx={{ p: 6, textAlign: 'center', backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}` }}>
          <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, mb: 1 }}>No Orders Yet</Typography>
          <Typography variant="body2" sx={{ color: themeColors.textMuted }}>Customer orders will appear here.</Typography>
        </Box>
      ) : (
        <Box sx={{ backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}`, overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: '"Inter", sans-serif', fontSize: '0.85rem' }}>
            <Box component="thead">
              <Box component="tr" sx={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: '#FAFAFA' }}>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Order</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Customer</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Items</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Total</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Payment</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Status</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Return</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700, textAlign: 'center' }}>Actions</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {orders.map((o) => {
                const sc = statusColors(o.fulfillmentStatus);
                const hasReturnRequest = (o as any).returnStatus === 'REQUESTED';
                const isReturnApprovedOrCompleted = (o as any).returnStatus === 'APPROVED' || (o as any).returnStatus === 'COMPLETED';
                const returnedItemsCount = (o as any).returnedItems?.reduce((acc: number, it: any) => acc + it.quantity, 0) || 0;
                const orderGrandTotal = o.pricing?.grandTotal || (o as any).grandTotal || 0;
                const returnedAmount = isReturnApprovedOrCompleted
                  ? ((o as any).returnedItems && (o as any).returnedItems.length > 0
                      ? (o as any).returnedItems.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0)
                      : orderGrandTotal)
                  : 0;
                const netOrderTotal = Math.max(0, orderGrandTotal - returnedAmount);

                return (
                  <Box component="tr" key={o._id} sx={{ borderBottom: `1px solid ${themeColors.border}`, '&:hover': { backgroundColor: '#F9F9F7' } }}>
                    <Box component="td" sx={{ py: 1.5, px: 2, fontFamily: 'monospace', fontWeight: 700 }}>
                      #{o.orderNumber}
                      <Typography variant="caption" sx={{ display: 'block', color: themeColors.textMuted, fontFamily: 'inherit' }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ py: 1.5, px: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.shippingAddress?.fullName || 'Customer'}</Typography>
                      <Typography variant="caption" sx={{ color: themeColors.textMuted }}>{o.shippingAddress?.phone}</Typography>
                    </Box>
                    <Box component="td" sx={{ py: 1.5, px: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <span>{o.items?.length || 0} pcs</span>
                        {isReturnApprovedOrCompleted && returnedItemsCount > 0 && (
                          <Chip
                            label={`${returnedItemsCount} RETURNED`}
                            size="small"
                            sx={{
                              borderRadius: 0,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              height: 18,
                              backgroundColor: '#FEE2E2',
                              color: '#991B1B',
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box component="td" sx={{ py: 1.5, px: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                            ₹{netOrderTotal}
                          </Typography>
                          {isReturnApprovedOrCompleted && returnedAmount > 0 && (
                            <Typography
                              variant="caption"
                              sx={{ textDecoration: 'line-through', color: themeColors.textMuted, fontSize: '0.72rem' }}
                            >
                              ₹{orderGrandTotal}
                            </Typography>
                          )}
                        </Box>
                        {isReturnApprovedOrCompleted && returnedAmount > 0 && (
                          <Chip
                            label={`-₹${returnedAmount} RETURNED`}
                            size="small"
                            sx={{
                              borderRadius: 0,
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              height: 16,
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              width: 'fit-content',
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box component="td" sx={{ py: 1.5, px: 2 }}>
                      <Chip label={o.paymentMethod} size="small" sx={{ borderRadius: 0, fontWeight: 700, fontSize: '0.65rem', mr: 0.5 }} />
                      <Chip label={o.paymentStatus} size="small" sx={{ borderRadius: 0, fontWeight: 700, fontSize: '0.65rem', backgroundColor: o.paymentStatus === 'PAID' ? '#ECFDF5' : '#FEF3C7', color: o.paymentStatus === 'PAID' ? '#065F46' : '#92400E' }} />
                    </Box>
                    <Box component="td" sx={{ py: 1.5, px: 2 }}>
                      <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip label={o.fulfillmentStatus} size="small" sx={{ borderRadius: 0, fontWeight: 700, fontSize: '0.68rem', backgroundColor: sc.bg, color: sc.color }} />
                        {o.returnStatus && o.returnStatus !== 'NOT_REQUESTED' && (
                          <Chip
                            label={`RETURN: ${o.returnStatus}`}
                            size="small"
                            sx={{
                              borderRadius: 0,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              backgroundColor:
                                o.returnStatus === 'APPROVED' || o.returnStatus === 'COMPLETED'
                                  ? '#FEF3C7'
                                  : o.returnStatus === 'REJECTED'
                                  ? '#FEE2E2'
                                  : '#E0E7FF',
                              color:
                                o.returnStatus === 'APPROVED' || o.returnStatus === 'COMPLETED'
                                  ? '#92400E'
                                  : o.returnStatus === 'REJECTED'
                                  ? '#991B1B'
                                  : '#3730A3',
                              border: '1px solid',
                              borderColor:
                                o.returnStatus === 'APPROVED' || o.returnStatus === 'COMPLETED'
                                  ? '#FDE68A'
                                  : o.returnStatus === 'REJECTED'
                                  ? '#FECACA'
                                  : '#C7D2FE',
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box component="td" sx={{ py: 1.5, px: 2 }}>
                      {hasReturnRequest ? (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => setReturnModal({ open: true, order: o })}
                          sx={{
                            borderRadius: 0,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            backgroundColor: '#D97706',
                            color: '#FFF',
                            '&:hover': { backgroundColor: '#B45309' },
                          }}
                        >
                          Review
                        </Button>
                      ) : isReturnApprovedOrCompleted ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setReturnModal({ open: true, order: o })}
                          sx={{
                            borderRadius: 0,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            borderColor: '#F59E0B',
                            color: '#92400E',
                          }}
                        >
                          Details
                        </Button>
                      ) : (
                        <Typography variant="caption" sx={{ color: themeColors.textMuted }}>{(o as any).returnStatus || '—'}</Typography>
                      )}
                    </Box>
                    <Box component="td" sx={{ py: 1.5, px: 2, textAlign: 'center' }}>
                      <Box sx={{ display: 'inline-flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
                        <IconButton size="small" title="Update Status & Tracking" onClick={() => openTrackingModal(o)}>
                          <LocalShippingOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" title="Inspect Order" onClick={() => setSelectedOrder(o)}>
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {/* Status Update + Tracking Modal */}
      <Dialog open={trackingModal.open} onClose={() => setTrackingModal({ open: false, orderId: '', currentStatus: '' })} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 0 } } }}>
        <DialogTitle sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Update Order Status
          <IconButton size="small" onClick={() => setTrackingModal({ open: false, orderId: '', currentStatus: '' })}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 700 }}>Fulfillment Status</Typography>
            <Select value={trackingForm.status} onChange={(e) => setTrackingForm(f => ({ ...f, status: e.target.value }))} sx={{ borderRadius: 0 }}>
              {FULFILLMENT_STAGES.map(s => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {(trackingForm.status === 'SHIPPING' || trackingForm.status === 'DELIVERED') && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField size="small" fullWidth label="Courier Name" value={trackingForm.courierName} onChange={e => setTrackingForm(f => ({ ...f, courierName: e.target.value }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
              <TextField size="small" fullWidth label="Tracking Number" value={trackingForm.trackingNumber} onChange={e => setTrackingForm(f => ({ ...f, trackingNumber: e.target.value }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
              <TextField size="small" fullWidth label="Tracking URL (optional)" value={trackingForm.trackingUrl} onChange={e => setTrackingForm(f => ({ ...f, trackingUrl: e.target.value }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setTrackingModal({ open: false, orderId: '', currentStatus: '' })} sx={{ borderRadius: 0 }}>Cancel</Button>
          <Button variant="contained" disabled={trackingLoading} onClick={handleStatusUpdate} sx={{ borderRadius: 0, backgroundColor: themeColors.black, '&:hover': { backgroundColor: '#333' } }}>
            {trackingLoading ? <CircularProgress size={18} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Review Modal */}
      <Dialog
        open={returnModal.open}
        onClose={() => setReturnModal({ open: false, order: null })}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0, p: { xs: 2, sm: 3 } } } }}
      >
        <DialogTitle sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0, pb: 1.5, fontSize: '1.25rem' }}>
          Return Request — #{returnModal.order?.orderNumber}
          <IconButton size="small" onClick={() => setReturnModal({ open: false, order: null })}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 0, py: 1 }}>
          <Alert severity="info" sx={{ borderRadius: 0, mb: 2.5, fontSize: '0.82rem' }}>
            Customer reason: <strong>{(returnModal.order as any)?.returnReason || 'No reason provided'}</strong>
          </Alert>

          {/* Items requested for return */}
          {(() => {
            const returnedItemsList =
              (returnModal.order as any)?.returnedItems && (returnModal.order as any).returnedItems.length > 0
                ? (returnModal.order as any).returnedItems
                : returnModal.order?.items || [];
            const isPartial = returnModal.order?.items && returnedItemsList.length < returnModal.order.items.length;

            return (
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Items Requested for Return ({returnedItemsList.length} {returnedItemsList.length === 1 ? 'item' : 'items'})
                  </Typography>
                  {isPartial && (
                    <Chip
                      label={`Partial Return (${returnedItemsList.length} of ${returnModal.order?.items.length})`}
                      size="small"
                      sx={{ borderRadius: 0, fontSize: '0.68rem', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#92400E' }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, border: `1px solid ${themeColors.border}`, p: 1.5, backgroundColor: '#FAFAF8' }}>
                  {returnedItemsList.map((item: any, idx: number) => (
                    <Box
                      key={`${item.variantSku || item.productId}-${idx}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pb: idx !== returnedItemsList.length - 1 ? 1 : 0,
                        borderBottom: idx !== returnedItemsList.length - 1 ? '1px solid #ECECE8' : 'none',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          component="img"
                          src={item.image || '/logo.png'}
                          alt={item.name}
                          sx={{ width: 42, height: 50, objectFit: 'cover', border: `1px solid ${themeColors.border}` }}
                        />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                            SKU: {item.variantSku} • Qty: {item.quantity}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        ₹{item.price * item.quantity}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })()}

          <Typography variant="body2" sx={{ color: themeColors.textSecondary, fontSize: '0.82rem' }}>
            Review the items and customer reason above to make your decision. Approved returns should be refunded separately via the payment panel once the piece is inspected.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 0, pb: 0, pt: 2, gap: 1 }}>
          {returnModal.order?.returnStatus === 'REQUESTED' ? (
            <>
              <Button disabled={returnLoading} onClick={() => handleReturnDecision('REJECT')} sx={{ borderRadius: 0, borderColor: '#DC2626', color: '#DC2626', border: '1px solid' }}>Reject</Button>
              <Button disabled={returnLoading} onClick={() => handleReturnDecision('APPROVE')} sx={{ borderRadius: 0, backgroundColor: '#059669', color: '#FFF', '&:hover': { backgroundColor: '#047857' } }}>Approve</Button>
              {isSuperAdmin && (
                <Button disabled={returnLoading} onClick={() => handleReturnDecision('COMPLETE')} sx={{ borderRadius: 0, backgroundColor: '#2563EB', color: '#FFF', '&:hover': { backgroundColor: '#1D4ED8' } }}>Mark Complete</Button>
              )}
            </>
          ) : (
            <>
              {isSuperAdmin && returnModal.order?.returnStatus === 'APPROVED' && (
                <Button disabled={returnLoading} onClick={() => handleReturnDecision('COMPLETE')} sx={{ borderRadius: 0, backgroundColor: '#2563EB', color: '#FFF', '&:hover': { backgroundColor: '#1D4ED8' } }}>Mark Complete</Button>
              )}
              <Button onClick={() => setReturnModal({ open: false, order: null })} sx={{ borderRadius: 0, backgroundColor: themeColors.black, color: '#FFF' }}>Close</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Inspect Order Detail Modal */}
      <Dialog open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 0, p: 2 } } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
          Order #{selectedOrder?.orderNumber}
          <IconButton onClick={() => setSelectedOrder(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {selectedOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Shipping Address</Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  {selectedOrder.shippingAddress?.fullName} ({selectedOrder.shippingAddress?.phone})<br />
                  {selectedOrder.shippingAddress?.addressLine1} {selectedOrder.shippingAddress?.addressLine2}<br />
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} — {selectedOrder.shippingAddress?.postalCode}
                </Typography>
              </Box>

              {/* Tracking Info */}
              {selectedOrder.shippingDetails?.trackingNumber && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Shipment Tracking</Typography>
                    <Typography variant="body2">Courier: {selectedOrder.shippingDetails.courierName || selectedOrder.shippingDetails.carrier || '—'}</Typography>
                    <Typography variant="body2">Tracking #: {selectedOrder.shippingDetails.trackingNumber}</Typography>
                    {selectedOrder.shippingDetails.trackingUrl && (
                      <Typography variant="body2">
                        <a href={selectedOrder.shippingDetails.trackingUrl} target="_blank" rel="noreferrer" style={{ color: '#2563EB' }}>
                          Track Package →
                        </a>
                      </Typography>
                    )}
                  </Box>
                </>
              )}

              <Divider />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Items ({selectedOrder.items?.length})</Typography>
                {selectedOrder.items?.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8 }}>
                    <Typography variant="body2">{item.name} (SKU: {item.variantSku}) × {item.quantity}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{item.subtotal}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Return Request Details */}
              {selectedOrder.returnStatus && selectedOrder.returnStatus !== 'NOT_REQUESTED' && (
                <>
                  <Divider />
                  <Box sx={{ p: 1.5, backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#92400E', mb: 0.5 }}>
                      Return Request: {selectedOrder.returnStatus}
                    </Typography>
                    {selectedOrder.returnReason && (
                      <Typography variant="body2" sx={{ color: '#78350F', mb: 1, fontSize: '0.82rem' }}>
                        Reason: <strong>{selectedOrder.returnReason}</strong>
                      </Typography>
                    )}
                    {selectedOrder.returnedItems && selectedOrder.returnedItems.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#92400E', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                          Item(s) Selected for Return ({selectedOrder.returnedItems.length}):
                        </Typography>
                        {selectedOrder.returnedItems.map((rit, i) => (
                          <Typography key={i} variant="caption" sx={{ color: '#78350F', display: 'block' }}>
                            • {rit.name} (SKU: {rit.variantSku}) × {rit.quantity} — ₹{rit.price * rit.quantity}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                </>
              )}

              <Divider />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2">₹{selectedOrder.pricing?.subtotal}</Typography>
                </Box>
                {(selectedOrder.pricing?.discountTotal ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="success.main">Discount</Typography>
                    <Typography variant="body2" color="success.main">-₹{selectedOrder.pricing?.discountTotal}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Shipping</Typography>
                  <Typography variant="body2">{selectedOrder.pricing?.shippingFee === 0 ? 'FREE' : `₹${selectedOrder.pricing?.shippingFee}`}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Tax</Typography>
                  <Typography variant="body2">₹{selectedOrder.pricing?.taxTotal}</Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                {selectedOrder.returnStatus && (selectedOrder.returnStatus === 'APPROVED' || selectedOrder.returnStatus === 'COMPLETED') ? (() => {
                  const retItems = selectedOrder.returnedItems || [];
                  const retAmt = retItems.length > 0
                    ? retItems.reduce((acc, it) => acc + (it.price * it.quantity), 0)
                    : (selectedOrder.pricing?.grandTotal || 0);
                  const netAmt = Math.max(0, (selectedOrder.pricing?.grandTotal || 0) - retAmt);

                  return (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Returned Items Deduction</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>-₹{retAmt}</Typography>
                      </Box>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography variant="subtitle1" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>Net Retained Total</Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h5" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, color: '#059669' }}>
                            ₹{netAmt}
                          </Typography>
                          <Typography variant="caption" sx={{ textDecoration: 'line-through', color: themeColors.textMuted }}>
                            Original: ₹{selectedOrder.pricing?.grandTotal}
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  );
                })() : (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="subtitle1" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>Grand Total</Typography>
                    <Typography variant="h5" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>₹{selectedOrder.pricing?.grandTotal}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdminOrders;
