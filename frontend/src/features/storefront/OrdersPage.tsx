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
                order.fulfillmentStatus === 'CONFIRMED' ||
                order.fulfillmentStatus === 'PROCESSING';

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
                              <Typography variant="caption" sx={{ color: themeColors.textMuted, display: 'block', mt: 0.5 }}>
                                SKU: {item.variantSku} • Qty: {item.quantity}
                              </Typography>
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
                      <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                        Method: {order.paymentMethod} • Total Paid: ₹{order.pricing?.grandTotal}
                      </Typography>
                    </Box>

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
                          '&:hover': {
                            backgroundColor: '#DC2626',
                            color: '#FFF',
                            borderColor: '#DC2626',
                          },
                        }}
                      >
                        Request Cancellation
                      </Button>
                    )}
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
