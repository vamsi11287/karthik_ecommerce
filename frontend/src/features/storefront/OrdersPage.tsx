import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Chip,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Checkbox,
  Alert,
} from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '../../theme/theme';
import { storeApi } from '../../hooks/useApi';
import useAuth from '../../hooks/useAuth';
import type { Order, Review } from '../../types';
import AppButton from '../../components/common/AppButton';
import WriteReviewModal from '../../components/reviews/WriteReviewModal';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, openAuthModal } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [myReviewsMap, setMyReviewsMap] = useState<Record<string, Review>>({});

  // Review Modal state
  const [reviewModalState, setReviewModalState] = useState<{
    open: boolean;
    productId: string;
    productName: string;
    productImage?: string;
    orderId?: string;
    initialReview?: Review | null;
  }>({
    open: false,
    productId: '',
    productName: '',
  });

  // Cancellation / Return dialog
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [selectedReturnSkus, setSelectedReturnSkus] = useState<string[]>([]);
  const [returnReason, setReturnReason] = useState('');

  const handleOpenReturn = (order: Order) => {
    setReturnOrder(order);
    setReturnReason('');
    // By default, pre-select all items so user can uncheck the ones they keep, or select only one
    setSelectedReturnSkus(order.items.map((it) => it.variantSku));
    setReturnModalOpen(true);
  };

  const handleToggleReturnSku = (sku: string) => {
    setSelectedReturnSkus((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    );
  };

  const handleSubmitReturn = async () => {
    if (!returnOrder || !returnReason.trim()) return;

    const deliveredDate = returnOrder.shippingDetails?.deliveredAt || returnOrder.updatedAt;
    const daysSinceDelivery = Math.floor(
      (Date.now() - new Date(deliveredDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceDelivery > 7) {
      dispatch(showToast({ message: 'The 7-day return window for this order has expired', severity: 'error' }));
      return;
    }

    if (returnOrder.items.length > 1 && selectedReturnSkus.length === 0) {
      dispatch(showToast({ message: 'Please select at least 1 item to return', severity: 'error' }));
      return;
    }

    const itemsToReturn =
      returnOrder.items.length > 1
        ? returnOrder.items
            .filter((it) => selectedReturnSkus.includes(it.variantSku))
            .map((it) => ({
              variantSku: it.variantSku,
              productId: it.productId,
              name: it.name,
              quantity: it.quantity,
              price: it.price,
            }))
        : returnOrder.items.map((it) => ({
            variantSku: it.variantSku,
            productId: it.productId,
            name: it.name,
            quantity: it.quantity,
            price: it.price,
          }));

    setActionLoading(true);
    try {
      await storeApi.requestReturn(returnOrder._id, {
        reason: returnReason.trim(),
        items: itemsToReturn,
      });
      dispatch(showToast({ message: 'Return request submitted. We will review shortly.', severity: 'success' }));
      setReturnModalOpen(false);
      setReturnOrder(null);
      fetchOrdersAndReviews();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to submit return request', severity: 'error' }));
    } finally {
      setActionLoading(false);
    }
  };

  const fetchOrdersAndReviews = () => {
    if (!isAuthenticated) return;
    setLoading(true);

    Promise.all([storeApi.getMyOrders(), storeApi.getMyReviews()])
      .then(([ordersRes, reviewsRes]) => {
        const orderList = ordersRes.data?.data || ordersRes.data || [];
        setOrders(orderList);

        const reviewsList: Review[] = reviewsRes.data?.data || reviewsRes.data || [];
        const map: Record<string, Review> = {};
        reviewsList.forEach((r) => {
          const pId = r.product || r.productId;
          if (pId) {
            map[pId] = r;
          }
        });
        setMyReviewsMap(map);
      })
      .catch(() => {
        setOrders([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrdersAndReviews();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleOpenReviewModal = (item: any, orderId: string, existingReview?: Review | null) => {
    setReviewModalState({
      open: true,
      productId: item.productId,
      productName: item.name,
      productImage: item.image,
      orderId,
      initialReview: existingReview,
    });
  };

  const handleReviewSuccess = (savedReview: Review) => {
    const pId = savedReview.product || savedReview.productId;
    if (pId) {
      setMyReviewsMap((prev) => ({
        ...prev,
        [pId]: savedReview,
      }));
    }
    // Also re-fetch orders and reviews
    storeApi.getMyReviews().then((res) => {
      const list: Review[] = res.data?.data || res.data || [];
      const map: Record<string, Review> = {};
      list.forEach((r) => {
        const id = r.product || r.productId;
        if (id) map[id] = r;
      });
      setMyReviewsMap(map);
    });
  };

  const handleOpenCancel = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleSubmitCancel = async () => {
    if (!selectedOrderId || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      await storeApi.cancelOrder(selectedOrderId, cancelReason);
      dispatch(showToast({ message: 'Cancellation request submitted', severity: 'success' }));
      setCancelModalOpen(false);
      fetchOrdersAndReviews();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to submit cancellation', severity: 'error' }));
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Container sx={{ py: 12, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, mb: 2 }}>
          Customer Orders
        </Typography>
        <Typography variant="body2" sx={{ color: themeColors.textMuted, mb: 4 }}>
          Please sign in to view your orders, shipments, and return requests.
        </Typography>
        <AppButton onClick={openAuthModal}>Sign In</AppButton>
      </Container>
    );
  }

  return (
    <Box sx={{ py: 6, minHeight: '80vh' }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 5, pb: 3, borderBottom: `1px solid ${themeColors.border}` }}>
          <Typography
            variant="h2"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '2.8rem' },
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              mb: 1,
            }}
          >
            My Orders & Tracking
          </Typography>
          <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
            Review order progress, shipment tracking, and initiate eligible returns.
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={36} color="inherit" />
          </Box>
        ) : orders.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 10,
              backgroundColor: '#FFFFFF',
              border: `1px solid ${themeColors.border}`,
              p: 4,
            }}
          >
            <LocalShippingOutlinedIcon sx={{ fontSize: 56, color: themeColors.textMuted, mb: 2 }} />
            <Typography
              variant="h5"
              sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, mb: 1, textTransform: 'uppercase' }}
            >
              No Orders Found
            </Typography>
            <Typography variant="body2" sx={{ color: themeColors.textMuted, mb: 3 }}>
              You haven't placed any orders yet.
            </Typography>
            <AppButton onClick={() => navigate('/catalog')}>Explore Catalog</AppButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {orders.map((order) => {
              const isCancellable =
                order.fulfillmentStatus === 'PENDING_PAYMENT' ||
                order.fulfillmentStatus === 'CONFIRMED';

              return (
                <Box
                  key={order._id}
                  sx={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${themeColors.border}`,
                    p: { xs: 2.5, sm: 3.5 },
                  }}
                >
                  {/* Top Bar */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      pb: 2,
                      mb: 2,
                      borderBottom: `1px solid ${themeColors.border}`,
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontFamily: '"Syne", sans-serif',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                        }}
                      >
                        Order #{order.orderNumber}
                      </Typography>
                      <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={order.fulfillmentStatus}
                        size="small"
                        sx={{
                          backgroundColor:
                            order.fulfillmentStatus === 'DELIVERED'
                              ? '#ECFDF5'
                              : order.fulfillmentStatus === 'CANCELLED'
                              ? '#FEE2E2'
                              : '#EFF6FF',
                          color:
                            order.fulfillmentStatus === 'DELIVERED'
                              ? '#065F46'
                              : order.fulfillmentStatus === 'CANCELLED'
                              ? '#991B1B'
                              : '#1E40AF',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          borderRadius: 0,
                        }}
                      />
                      <Chip
                        label={`PAYMENT: ${order.paymentStatus}`}
                        size="small"
                        sx={{
                          backgroundColor: themeColors.paperSurface,
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          borderRadius: 0,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Items List */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                    {order.items.map((item, idx) => {
                      const isDelivered = order.fulfillmentStatus === 'DELIVERED';
                      const existingReview = myReviewsMap[item.productId];

                      return (
                        <Box
                          key={idx}
                          sx={{
                            display: 'flex',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            justifyContent: 'space-between',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: 2,
                            p: 2,
                            backgroundColor: '#FFFFFF',
                            border: `1px solid ${themeColors.border}`,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              component="img"
                              src={item.image}
                              alt={item.name}
                              sx={{
                                width: 64,
                                height: 76,
                                objectFit: 'cover',
                                border: `1px solid ${themeColors.border}`,
                                flexShrink: 0,
                              }}
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                                {item.name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                                  SKU: {item.variantSku} • Qty: {item.quantity}
                                </Typography>
                                {(order as any).returnedItems?.some((ri: any) => ri.variantSku === item.variantSku || ri.productId === item.productId) && (
                                  <Chip
                                    label="RETURNED"
                                    size="small"
                                    sx={{
                                      borderRadius: 0,
                                      fontSize: '0.6rem',
                                      fontWeight: 800,
                                      height: 16,
                                      backgroundColor: '#FEE2E2',
                                      color: '#991B1B',
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
                                ₹{item.subtotal}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Action: Rate & Review (Available for Delivered Orders) */}
                          {isDelivered && (
                            <Box sx={{ alignSelf: { xs: 'stretch', sm: 'auto' }, pt: { xs: 1, sm: 0 } }}>
                              {existingReview ? (
                                <Button
                                  size="small"
                                  onClick={() => handleOpenReviewModal(item, order._id, existingReview)}
                                  sx={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#B45309',
                                    backgroundColor: '#FEF3C7',
                                    border: '1px solid #FCD34D',
                                    borderRadius: 0,
                                    px: 2,
                                    py: 0.8,
                                    textTransform: 'uppercase',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.8,
                                    width: { xs: '100%', sm: 'auto' },
                                    '&:hover': {
                                      backgroundColor: '#FDE68A',
                                    },
                                  }}
                                >
                                  <StarIcon sx={{ fontSize: '0.95rem', color: '#F59E0B' }} />
                                  ★ {existingReview.rating} Edit Review
                                </Button>
                              ) : (
                                <Button
                                  size="small"
                                  onClick={() => handleOpenReviewModal(item, order._id, null)}
                                  sx={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: themeColors.black,
                                    border: `1px solid ${themeColors.black}`,
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 0,
                                    px: 2,
                                    py: 0.8,
                                    textTransform: 'uppercase',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.8,
                                    width: { xs: '100%', sm: 'auto' },
                                    '&:hover': {
                                      backgroundColor: themeColors.black,
                                      color: themeColors.white,
                                    },
                                  }}
                                >
                                  <StarBorderIcon sx={{ fontSize: '0.95rem' }} />
                                  Write Review
                                </Button>
                              )}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Tracking Info */}
                  {order.shippingDetails?.trackingNumber && (
                    <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#1E40AF', display: 'block' }}>
                        📦 Shipment Tracking
                      </Typography>
                      {(order.shippingDetails.courierName || order.shippingDetails.carrier) && (
                        <Typography variant="caption" sx={{ color: '#2563EB', display: 'block' }}>
                          Courier: {order.shippingDetails.courierName || order.shippingDetails.carrier}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: '#2563EB', display: 'block' }}>
                        Tracking #: {order.shippingDetails.trackingNumber}
                      </Typography>
                      {order.shippingDetails.trackingUrl && (
                        <a href={order.shippingDetails.trackingUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#1D4ED8', fontWeight: 700 }}>
                          Track Package →
                        </a>
                      )}
                    </Box>
                  )}

                  {/* Return Status Badge */}
                  {(order as any).returnStatus && (order as any).returnStatus !== 'NOT_REQUESTED' && (
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`Return: ${(order as any).returnStatus}`}
                        size="small"
                        sx={{
                          borderRadius: 0,
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          backgroundColor: (order as any).returnStatus === 'APPROVED' ? '#ECFDF5' : (order as any).returnStatus === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                          color: (order as any).returnStatus === 'APPROVED' ? '#065F46' : (order as any).returnStatus === 'REJECTED' ? '#991B1B' : '#92400E',
                        }}
                      />
                      {(order as any).returnedItems && (order as any).returnedItems.length > 0 && (
                        <Typography variant="caption" sx={{ color: themeColors.textMuted, fontStyle: 'italic' }}>
                          Piece(s) for return: {(order as any).returnedItems.map((it: any) => it.name).join(', ')}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Bottom details & Actions */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ color: themeColors.textMuted, display: 'block' }}>
                        Shipping to: {order.shippingAddress?.fullName}, {order.shippingAddress?.city} (
                        {order.shippingAddress?.postalCode})
                      </Typography>
                      {(() => {
                        const isApprovedOrCompleted = (order as any).returnStatus === 'APPROVED' || (order as any).returnStatus === 'COMPLETED';
                        const retItems = (order as any).returnedItems || [];
                        const retAmt = isApprovedOrCompleted
                          ? (retItems.length > 0
                              ? retItems.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0)
                              : (order.pricing?.grandTotal || 0))
                          : 0;
                        const netTotal = Math.max(0, (order.pricing?.grandTotal || 0) - retAmt);

                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.3 }}>
                            <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                              Method: {order.paymentMethod} • Total Paid: ₹{order.pricing?.grandTotal}
                            </Typography>
                            {isApprovedOrCompleted && retAmt > 0 && (
                              <Chip
                                label={`-₹${retAmt} Refunded (Net: ₹${netTotal})`}
                                size="small"
                                sx={{
                                  borderRadius: 0,
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  height: 18,
                                  backgroundColor: '#ECFDF5',
                                  color: '#065F46',
                                  border: '1px solid #A7F3D0',
                                }}
                              />
                            )}
                          </Box>
                        );
                      })()}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {isCancellable && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenCancel(order._id)}
                          sx={{
                            borderColor: '#DC2626',
                            color: '#DC2626',
                            borderRadius: 0,
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            fontFamily: '"Syne", sans-serif',
                            '&:hover': { backgroundColor: '#DC2626', color: '#FFF', borderColor: '#DC2626' },
                          }}
                        >
                          Request Cancellation
                        </Button>
                      )}
                      {order.fulfillmentStatus === 'DELIVERED' &&
                        (!order.returnStatus || (order as any).returnStatus === 'NOT_REQUESTED') && (() => {
                          const deliveredDate = order.shippingDetails?.deliveredAt || order.updatedAt;
                          const daysSinceDelivery = Math.floor(
                            (Date.now() - new Date(deliveredDate).getTime()) / (1000 * 60 * 60 * 24)
                          );
                          const isExpired = daysSinceDelivery > 7;
                          const daysRemaining = Math.max(0, 7 - daysSinceDelivery);

                          if (isExpired) {
                            return (
                              <Chip
                                label="Return window closed (7 days exceeded)"
                                size="small"
                                sx={{
                                  borderRadius: 0,
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  backgroundColor: '#F3F4F6',
                                  color: '#6B7280',
                                  border: '1px solid #E5E7EB',
                                }}
                              />
                            );
                          }

                          return (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleOpenReturn(order)}
                              sx={{
                                borderColor: '#F59E0B',
                                color: '#92400E',
                                borderRadius: 0,
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                fontFamily: '"Syne", sans-serif',
                                '&:hover': { backgroundColor: '#FEF3C7' },
                              }}
                            >
                              Request Return ({daysRemaining === 0 ? 'Last day' : `${daysRemaining}d left`})
                            </Button>
                          );
                        })()}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Container>

      {/* Cancellation Dialog */}
      <Dialog
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0, p: 2 } } }}
      >
        <DialogTitle sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
          Cancel Order
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: themeColors.textSecondary, mb: 2 }}>
            Please state the reason for cancellation. Any processed payment will be refunded according
            to store policy.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelModalOpen(false)} sx={{ borderRadius: 0 }}>
            Dismiss
          </Button>
          <AppButton
            loading={actionLoading}
            onClick={handleSubmitCancel}
            sx={{ backgroundColor: '#DC2626', borderColor: '#DC2626', '&:hover': { backgroundColor: '#B91C1C' } }}
          >
            Confirm Cancel
          </AppButton>
        </DialogActions>
      </Dialog>

      {/* Return Request Dialog */}
      <Dialog
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0, p: { xs: 2, sm: 3 } } } }}
      >
        <DialogTitle sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, px: 0, pt: 0, pb: 1.5, fontSize: '1.3rem' }}>
          Request Return
        </DialogTitle>
        <DialogContent sx={{ px: 0, py: 1 }}>
          <Alert severity="info" sx={{ borderRadius: 0, mb: 2, fontSize: '0.8rem' }}>
            Returns are accepted within <strong>7 days</strong> of delivery.
            {returnOrder && (
              <span> Delivered on {new Date(returnOrder.shippingDetails?.deliveredAt || returnOrder.updatedAt).toLocaleDateString()}.</span>
            )}
          </Alert>
          <Typography variant="body2" sx={{ color: themeColors.textSecondary, mb: 2.5 }}>
            Please select the item(s) you wish to return and describe the reason. Our atelier team will review it within 1–2 business days.
          </Typography>

          {/* Multiple Products: Show checkbox per product */}
          {returnOrder && returnOrder.items.length > 1 ? (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select Item(s) to Return ({selectedReturnSkus.length} of {returnOrder.items.length} selected)
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    if (selectedReturnSkus.length === returnOrder.items.length) {
                      setSelectedReturnSkus([]);
                    } else {
                      setSelectedReturnSkus(returnOrder.items.map((it) => it.variantSku));
                    }
                  }}
                  sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0, px: 1, color: themeColors.black, fontWeight: 700 }}
                >
                  {selectedReturnSkus.length === returnOrder.items.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {returnOrder.items.map((item) => {
                  const isChecked = selectedReturnSkus.includes(item.variantSku);
                  return (
                    <Box
                      key={item.variantSku}
                      onClick={() => handleToggleReturnSku(item.variantSku)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        border: `1px solid ${isChecked ? themeColors.black : themeColors.border}`,
                        backgroundColor: isChecked ? '#FAFAF7' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: themeColors.black,
                          backgroundColor: '#F9F9F5',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleToggleReturnSku(item.variantSku)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                          sx={{
                            color: themeColors.border,
                            '&.Mui-checked': { color: themeColors.black },
                            p: 0.5,
                          }}
                        />
                        <Box
                          component="img"
                          src={item.image || '/logo.png'}
                          alt={item.name}
                          sx={{ width: 44, height: 52, objectFit: 'cover', border: `1px solid ${themeColors.border}` }}
                        />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
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
                  );
                })}
              </Box>
              {selectedReturnSkus.length === 0 && (
                <Typography variant="caption" sx={{ color: '#DC2626', mt: 0.8, display: 'block', fontWeight: 600 }}>
                  Please check at least 1 item to return.
                </Typography>
              )}
            </Box>
          ) : returnOrder && returnOrder.items.length === 1 ? (
            /* Single Product: No checkbox, just clean product info */
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                mb: 3,
                border: `1px solid ${themeColors.border}`,
                backgroundColor: '#FAFAF8',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  component="img"
                  src={returnOrder.items[0].image || '/logo.png'}
                  alt={returnOrder.items[0].name}
                  sx={{ width: 44, height: 52, objectFit: 'cover', border: `1px solid ${themeColors.border}` }}
                />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {returnOrder.items[0].name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                    SKU: {returnOrder.items[0].variantSku} • Qty: {returnOrder.items[0].quantity}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                ₹{returnOrder.items[0].price * returnOrder.items[0].quantity}
              </Typography>
            </Box>
          ) : null}

          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Return Reason *"
            placeholder="e.g. Size was too loose, not fitting properly, defect..."
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 0, pb: 0, pt: 2, gap: 1 }}>
          <Button onClick={() => setReturnModalOpen(false)} sx={{ borderRadius: 0 }}>
            Cancel
          </Button>
          <AppButton
            loading={actionLoading}
            onClick={handleSubmitReturn}
            disabled={!returnReason.trim() || (Boolean(returnOrder && returnOrder.items.length > 1) && selectedReturnSkus.length === 0)}
          >
            Submit Return Request
          </AppButton>
        </DialogActions>
      </Dialog>

      {/* Write / Edit Product Review Modal */}
      <WriteReviewModal
        open={reviewModalState.open}
        onClose={() => setReviewModalState((prev) => ({ ...prev, open: false }))}
        productId={reviewModalState.productId}
        productName={reviewModalState.productName}
        productImage={reviewModalState.productImage}
        orderId={reviewModalState.orderId}
        initialReview={reviewModalState.initialReview}
        onSuccess={handleReviewSuccess}
      />
    </Box>
  );
};

export default OrdersPage;
