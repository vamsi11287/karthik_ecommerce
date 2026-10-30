import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '../../theme/theme';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import { storeApi } from '../../hooks/useApi';
import AppButton from '../common/AppButton';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';
import { loadRazorpayScript } from '../../utils/loadRazorpay';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const CheckoutModal: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { items, couponCode, isCheckingOut, endCheckout, clearCart } = useCart();

  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });

  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [storeSettings, setStoreSettings] = useState<{ codEnabled: boolean; onlineEnabled: boolean }>({
    codEnabled: true,
    onlineEnabled: true,
  });

  const [calculating, setCalculating] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [calculation, setCalculation] = useState<any>(null);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch store payment settings on modal open
  useEffect(() => {
    if (isCheckingOut) {
      storeApi
        .getPublicSettings()
        .then((res) => {
          const s = res.data?.data || res.data;
          const cod = s?.paymentMethods?.cod?.enabled ?? true;
          const online = s?.paymentMethods?.online?.enabled ?? true;
          setStoreSettings({ codEnabled: cod, onlineEnabled: online });
          if (!online && cod) {
            setPaymentMethod('COD');
          }
        })
        .catch(() => {
          setStoreSettings({ codEnabled: true, onlineEnabled: true });
        });
    }
  }, [isCheckingOut]);

  // Server-side authoritative calculation
  useEffect(() => {
    if (isCheckingOut && items.length > 0) {
      setCalculating(true);
      setErrorMessage(null);
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          variantSku: i.variantSku,
          quantity: i.quantity,
        })),
        couponCode: couponCode,
        paymentMethod: paymentMethod,
      };

      storeApi
        .calculateCheckout(payload)
        .then((res) => {
          const data = res.data?.data || res.data;
          setCalculation(data);
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Failed to calculate checkout totals');
        })
        .finally(() => {
          setCalculating(false);
        });
    }
  }, [isCheckingOut, items, couponCode, paymentMethod]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingAddress({ ...shippingAddress, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      dispatch(showToast({ message: 'Please sign in to complete checkout', severity: 'warning' }));
      openAuthModal();
      return;
    }

    // Validation
    if (
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.addressLine1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postalCode
    ) {
      setErrorMessage('Please fill in all required shipping address fields');
      return;
    }

    setPlacingOrder(true);
    setErrorMessage(null);

    try {
      const orderPayload = {
        items: items.map((i) => ({
          productId: i.productId,
          variantSku: i.variantSku,
          quantity: i.quantity,
        })),
        shippingAddress,
        paymentMethod,
        couponCode,
      };

      const res = await storeApi.createCheckout(orderPayload);
      const checkoutData = res.data?.data || res.data;

      // Handle Razorpay Online Payment
      if (paymentMethod === 'RAZORPAY' && checkoutData.razorpay) {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded || !window.Razorpay) {
          throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
        }

        const options = {
          key: checkoutData.razorpay.keyId,
          amount: checkoutData.razorpay.amount,
          currency: checkoutData.razorpay.currency || 'INR',
          name: 'XIV QR Streetwear',
          description: `Order #${checkoutData.order.orderNumber}`,
          order_id: checkoutData.razorpay.orderId,
          prefill: {
            name: shippingAddress.fullName,
            email: user?.email || '',
            contact: shippingAddress.phone,
          },
          theme: {
            color: '#121212',
          },
          handler: async (response: any) => {
            try {
              // Authoritative backend verification
              const verifyRes = await storeApi.verifyPayment({
                orderId: checkoutData.order._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              const confirmedOrder = verifyRes.data?.data || checkoutData.order;
              setCompletedOrder(confirmedOrder);
              clearCart();
              dispatch(showToast({ message: 'Payment successful! Order confirmed.', severity: 'success' }));
            } catch (vErr: any) {
              setErrorMessage(vErr.message || 'Payment verification failed');
            }
          },
          modal: {
            ondismiss: async () => {
              setPlacingOrder(false);
              try {
                await storeApi.cancelOrder(checkoutData.order._id, 'Customer closed payment gateway modal');
              } catch {
                // Handled by automatic background sweep
              }
              dispatch(showToast({ message: 'Payment window closed. Temporary reservation released.', severity: 'info' }));
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // COD or Direct Confirmation
        setCompletedOrder(checkoutData.order);
        clearCart();
        dispatch(showToast({ message: 'Order placed successfully!', severity: 'success' }));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleClose = () => {
    endCheckout();
    setCompletedOrder(null);
    setErrorMessage(null);
  };

  return (
    <Dialog
      open={isCheckingOut}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 0,
            backgroundColor: '#FFFFFF',
            p: { xs: 2, sm: 3 },
            maxHeight: '92vh',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1,
          fontFamily: '"Syne", sans-serif',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontSize: '1.25rem',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockOutlinedIcon sx={{ fontSize: '1.2rem' }} />
          Secure Checkout
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>
        {completedOrder ? (
          /* Order Confirmation Screen */
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#16A34A', mb: 2 }} />
            <Typography
              variant="h4"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 800,
                textTransform: 'uppercase',
                mb: 1,
              }}
            >
              Order Confirmed
            </Typography>
            <Typography variant="body1" sx={{ color: themeColors.textSecondary, mb: 1 }}>
              Thank you for shopping with XIV QR.
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                backgroundColor: themeColors.paperSurface,
                p: 1.5,
                border: `1px solid ${themeColors.border}`,
                display: 'inline-block',
                mb: 3,
              }}
            >
              Order #{completedOrder.orderNumber || completedOrder._id}
            </Typography>

            <Box sx={{ maxWidth: 460, mx: 'auto', mb: 4, textAlign: 'left' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Fulfillment Status: {completedOrder.fulfillmentStatus || 'CONFIRMED'}
              </Typography>
              <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                Payment Method: {completedOrder.paymentMethod} • Amount: ₹
                {completedOrder.pricing?.grandTotal || completedOrder.grandTotal}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <AppButton
                onClick={() => {
                  handleClose();
                  navigate('/orders');
                }}
              >
                View Order History
              </AppButton>
              <AppButton
                inverted
                onClick={() => {
                  handleClose();
                  navigate('/catalog');
                }}
              >
                Continue Shopping
              </AppButton>
            </Box>
          </Box>
        ) : (
          /* Checkout Form */
          <Box component="form" onSubmit={handlePlaceOrder}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 0 }}>
                {errorMessage}
              </Alert>
            )}

            {!isAuthenticated && (
              <Alert
                severity="info"
                action={
                  <AppButton size="small" onClick={openAuthModal}>
                    Sign In
                  </AppButton>
                }
                sx={{ mb: 3, borderRadius: 0, alignItems: 'center' }}
              >
                Sign in to your account for fast checkout, saved addresses, and order tracking.
              </Alert>
            )}

            {/* 10-Minute Cart Lock Banner (Amazon / Flipkart Model) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                mb: 3,
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
              }}
            >
              <AccessTimeIcon sx={{ fontSize: '1.3rem', color: '#2563EB' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.82rem' }}>
                  10-Minute Cart Hold Active
                </Typography>
                <Typography variant="caption" sx={{ color: '#2563EB', display: 'block', fontSize: '0.74rem' }}>
                  Your selected items are temporarily reserved during checkout. If cancelled, stock immediately releases to other shoppers.
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
                gap: 4,
              }}
            >
              {/* Left Column: Shipping Address & Payment Selection */}
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    mb: 2,
                  }}
                >
                  1. Delivery Details
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    required
                    fullWidth
                    label="Full Name"
                    name="fullName"
                    value={shippingAddress.fullName}
                    onChange={handleInputChange}
                    size="small"
                  />
                  <TextField
                    required
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={shippingAddress.phone}
                    onChange={handleInputChange}
                    size="small"
                  />
                  <TextField
                    required
                    fullWidth
                    label="Street Address / Flat No"
                    name="addressLine1"
                    value={shippingAddress.addressLine1}
                    onChange={handleInputChange}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Apartment, Suite, Landmark (Optional)"
                    name="addressLine2"
                    value={shippingAddress.addressLine2}
                    onChange={handleInputChange}
                    size="small"
                  />

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      required
                      label="City"
                      name="city"
                      value={shippingAddress.city}
                      onChange={handleInputChange}
                      size="small"
                    />
                    <TextField
                      required
                      label="State"
                      name="state"
                      value={shippingAddress.state}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      required
                      label="Postal Pincode"
                      name="postalCode"
                      value={shippingAddress.postalCode}
                      onChange={handleInputChange}
                      size="small"
                    />
                    <TextField
                      disabled
                      label="Country"
                      name="country"
                      value={shippingAddress.country}
                      size="small"
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Payment Method Selector */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    mb: 1.5,
                  }}
                >
                  2. Payment Method
                </Typography>

                <RadioGroup
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <FormControlLabel
                    value="RAZORPAY"
                    control={<Radio size="small" />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Online Payment (Razorpay — Cards, UPI, NetBanking)
                        </Typography>
                        <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                          Fast, safe, instant authorization with 100% purchase protection.
                        </Typography>
                      </Box>
                    }
                    disabled={!storeSettings.onlineEnabled}
                    sx={{
                      mb: 1.5,
                      border: `1px solid ${
                        paymentMethod === 'RAZORPAY' ? themeColors.black : themeColors.border
                      }`,
                      p: 1.5,
                      m: 0,
                    }}
                  />

                  {/* Cash on Delivery (Strictly guarded by backend storeSettings) */}
                  <FormControlLabel
                    value="COD"
                    control={<Radio size="small" />}
                    disabled={!storeSettings.codEnabled}
                    label={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Cash on Delivery (COD)
                          </Typography>
                          {!storeSettings.codEnabled && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#991B1B',
                                backgroundColor: '#FEE2E2',
                                px: 0.8,
                                py: 0.2,
                                fontWeight: 700,
                              }}
                            >
                              DISABLED BY STORE
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                          {storeSettings.codEnabled
                            ? 'Pay with cash upon package arrival.'
                            : 'COD is disabled by store policy. Please choose Online Payment.'}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      border: `1px solid ${
                        paymentMethod === 'COD' ? themeColors.black : themeColors.border
                      }`,
                      p: 1.5,
                      m: 0,
                      opacity: storeSettings.codEnabled ? 1 : 0.6,
                    }}
                  />
                </RadioGroup>
              </Box>

              {/* Right Column: Order Items & Authoritative Total */}
              <Box
                sx={{
                  backgroundColor: themeColors.paperSurface,
                  p: 2.5,
                  border: `1px solid ${themeColors.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    mb: 2,
                  }}
                >
                  Order Summary ({items.length})
                </Typography>

                <Box sx={{ maxHeight: 220, overflowY: 'auto', mb: 2 }}>
                  {items.map((item) => (
                    <Box
                      key={item.variantSku}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        borderBottom: `1px solid ${themeColors.border}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          component="img"
                          src={item.image}
                          alt={item.name}
                          sx={{ width: 42, height: 50, objectFit: 'cover' }}
                        />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                            Qty: {item.quantity} {item.size ? `• Size: ${item.size}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        ₹{item.subtotal}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Calculation breakdown */}
                {calculating ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} color="inherit" />
                  </Box>
                ) : (
                  calculation && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 'auto', pt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                          Subtotal
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ₹{calculation.subtotal}
                        </Typography>
                      </Box>

                      {calculation.discountTotal > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: '#059669' }}>
                            Discount ({couponCode})
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#059669' }}>
                            -₹{calculation.discountTotal}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                          Shipping
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {calculation.shippingFee === 0 ? 'FREE' : `₹${calculation.shippingFee}`}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                          Taxes
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ₹{calculation.taxTotal}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}
                        >
                          Total Due
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            fontFamily: '"Syne", sans-serif',
                            fontWeight: 800,
                            color: themeColors.textPrimary,
                          }}
                        >
                          ₹{calculation.grandTotal}
                        </Typography>
                      </Box>
                    </Box>
                  )
                )}

                <AppButton
                  type="submit"
                  fullWidth
                  loading={placingOrder}
                  sx={{ mt: 3, py: 1.6 }}
                >
                  {paymentMethod === 'RAZORPAY'
                    ? `Pay ₹${calculation?.grandTotal || '...'} via Razorpay`
                    : 'Confirm Cash on Delivery'}
                </AppButton>

                <Typography
                  variant="caption"
                  sx={{
                    textAlign: 'center',
                    mt: 1.5,
                    color: themeColors.textMuted,
                    fontSize: '0.7rem',
                  }}
                >
                  By placing your order, you agree to XIV QR's Terms of Sale and Privacy Policy.
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
