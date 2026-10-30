import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  InputBase,
  Button,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '../../theme/theme';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import useWishlist from '../../hooks/useWishlist';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';
import { setPendingCheckoutAfterAuth } from '../../app/cartSlice';
import AppButton from '../common/AppButton';
import { storeApi } from '../../hooks/useApi';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, openAuthModal } = useAuth();
  const {
    items,
    subtotal,
    discountTotal,
    couponCode,
    shippingFee,
    grandTotal,
    isDrawerOpen,
    totalItemCount,
    closeDrawer,
    updateQuantity,
    removeCartItem,
    applyCouponCode,
    clearCoupon,
    startCheckout,
  } = useCart();

  const [inputCoupon, setInputCoupon] = useState('');
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, { isAvailable: boolean; availableStock: number; reason?: string }>
  >({});

  // Real-time server revalidation whenever the cart drawer opens or items change
  useEffect(() => {
    if (isDrawerOpen && items.length > 0) {
      storeApi
        .validateCart(
          items.map((i) => ({
            productId: i.productId,
            variantSku: i.variantSku,
            quantity: i.quantity,
            name: i.name,
          }))
        )
        .then((res) => {
          const data = res.data?.data || res.data;
          const map: Record<string, { isAvailable: boolean; availableStock: number; reason?: string }> = {};
          if (Array.isArray(data?.items)) {
            data.items.forEach((itemRes: any) => {
              map[itemRes.variantSku] = {
                isAvailable: itemRes.isAvailable,
                availableStock: itemRes.availableStock,
                reason: itemRes.reason,
              };
            });
          }
          setAvailabilityMap(map);
        })
        .catch(() => {
          // Keep current state on network disconnect
        });
    } else {
      setAvailabilityMap({});
    }
  }, [isDrawerOpen, items]);

  const hasUnavailableItems = Object.values(availabilityMap).some(
    (v: { isAvailable: boolean; availableStock: number; reason?: string }) => !v.isAvailable
  );

  const handleRemoveAllUnavailable = () => {
    items.forEach((i) => {
      if (availabilityMap[i.variantSku] && !availabilityMap[i.variantSku].isAvailable) {
        removeCartItem(i.variantSku);
      }
    });
  };

  const { toggleWishlist } = useWishlist();

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCoupon.trim()) {
      applyCouponCode(inputCoupon.trim());
      setInputCoupon('');
    }
  };

  const handleMoveToWishlist = (item: any) => {
    if (!isAuthenticated) {
      dispatch(
        showToast({
          message: 'Please sign in to move pieces to your wishlist',
          severity: 'warning',
        })
      );
      openAuthModal();
      return;
    }

    toggleWishlist({
      _id: item.productId,
      name: item.name,
      slug: item.productId,
      sku: item.variantSku,
      sellingPrice: item.price,
      totalStock: item.availableStock || 1,
      images: item.image ? [{ url: item.image, isPrimary: true }] : [],
    } as any);

    removeCartItem(item.variantSku);
    dispatch(showToast({ message: `Moved "${item.name}" to wishlist`, severity: 'success' }));
  };

  const handleProceedToCheckout = () => {
    if (hasUnavailableItems) return;
    closeDrawer();
    if (!isAuthenticated) {
      dispatch(setPendingCheckoutAfterAuth(true));
      openAuthModal();
    } else {
      startCheckout();
    }
  };

  return (
    <Drawer
      anchor="right"
      open={isDrawerOpen}
      onClose={closeDrawer}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 460 },
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 2.5, sm: 3.5 },
            boxShadow: '-8px 0 35px rgba(0,0,0,0.1)',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: '1.05rem',
          }}
        >
          Shopping Bag ({totalItemCount})
        </Typography>
        <IconButton onClick={closeDrawer} size="small" sx={{ color: themeColors.black }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2.5 }} />

      {/* Cart Items List */}
      {items.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            px: 2,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              mb: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Your Bag is Empty
          </Typography>
          <Typography variant="body2" sx={{ color: themeColors.textMuted, mb: 3 }}>
            Discover the latest drops, oversized silhouettes, and runway essentials.
          </Typography>
          <AppButton
            onClick={() => {
              closeDrawer();
              navigate('/catalog');
            }}
            withArrow
          >
            Explore Catalog
          </AppButton>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
          {hasUnavailableItems && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: 0,
                fontSize: '0.8rem',
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                border: '1px solid #FCA5A5',
                '& .MuiAlert-message': { width: '100%' },
              }}
              action={
                <Button
                  size="small"
                  onClick={handleRemoveAllUnavailable}
                  sx={{
                    color: '#991B1B',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textDecoration: 'underline',
                    textTransform: 'none',
                    p: 0,
                  }}
                >
                  Remove All
                </Button>
              }
            >
              Some pieces in your bag are out of stock or archived. Remove them to proceed.
            </Alert>
          )}

          {items.map((item) => {
            const avail = availabilityMap[item.variantSku];
            const isUnavailable = avail && !avail.isAvailable;

            return (
              <Box
                key={item.variantSku}
                sx={{
                  display: 'flex',
                  gap: 2,
                  pb: 2.5,
                  mb: 2.5,
                  borderBottom: `1px solid ${themeColors.border}`,
                  p: isUnavailable ? 1.5 : 0,
                  backgroundColor: isUnavailable ? '#FFF5F5' : 'transparent',
                  border: isUnavailable ? '1px solid #FECACA' : undefined,
                  opacity: isUnavailable ? 0.85 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Product Thumbnail */}
                <Box
                  component="img"
                  src={item.image}
                  alt={item.name}
                  sx={{
                    width: 80,
                    height: 96,
                    objectFit: 'cover',
                    border: `1px solid ${themeColors.border}`,
                    filter: isUnavailable ? 'grayscale(80%)' : 'none',
                  }}
                />

                {/* Info & Quantity Adjuster */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: themeColors.textPrimary,
                        lineHeight: 1.3,
                        maxWidth: 200,
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontFamily: '"Syne", sans-serif',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                      }}
                    >
                      ₹{item.subtotal}
                    </Typography>
                  </Box>

                  {(item.size || item.color) && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: themeColors.textMuted,
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        mt: 0.5,
                      }}
                    >
                      {item.size ? `Size: ${item.size}` : ''} {item.color ? `| Color: ${item.color}` : ''}
                    </Typography>
                  )}

                  {isUnavailable && (
                    <Box sx={{ mt: 0.8 }}>
                      <Chip
                        label={avail?.reason || 'UNAVAILABLE'}
                        size="small"
                        sx={{
                          borderRadius: 0,
                          backgroundColor: '#FEE2E2',
                          color: '#991B1B',
                          fontWeight: 800,
                          fontSize: '0.65rem',
                          height: 20,
                        }}
                      />
                    </Box>
                  )}

                  {/* Counter & Delete */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 1.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        border: `1px solid ${themeColors.border}`,
                        backgroundColor: themeColors.paperSurface,
                        opacity: isUnavailable ? 0.5 : 1,
                      }}
                    >
                      <IconButton
                        size="small"
                        disabled={isUnavailable}
                        onClick={() => updateQuantity(item.variantSku, item.quantity - 1)}
                        sx={{ p: 0.5, borderRadius: 0 }}
                      >
                        <RemoveIcon sx={{ fontSize: '0.85rem' }} />
                      </IconButton>
                      <Typography
                        sx={{
                          fontFamily: '"Syne", sans-serif',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          px: 1.5,
                        }}
                      >
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        disabled={isUnavailable}
                        onClick={() => updateQuantity(item.variantSku, item.quantity + 1)}
                        sx={{ p: 0.5, borderRadius: 0 }}
                      >
                        <AddIcon sx={{ fontSize: '0.85rem' }} />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Tooltip title="Move to Wishlist">
                        <IconButton
                          size="small"
                          onClick={() => handleMoveToWishlist(item)}
                          sx={{ color: themeColors.textMuted, '&:hover': { color: '#E11D48' } }}
                        >
                          <FavoriteBorderOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove from bag">
                        <IconButton
                          size="small"
                          onClick={() => removeCartItem(item.variantSku)}
                          sx={{ color: themeColors.textMuted, '&:hover': { color: '#DC2626' } }}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
              </Box>
            </Box>
          );
        })}
        </Box>
      )}

      {/* Footer / Summary if items present */}
      {items.length > 0 && (
        <Box sx={{ pt: 2, borderTop: `1px solid ${themeColors.border}` }}>
          {/* Coupon Code Input */}
          <Box component="form" onSubmit={handleApplyCoupon} sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Box
              sx={{
                flex: 1,
                border: `1px solid ${themeColors.border}`,
                px: 1.5,
                py: 0.8,
                backgroundColor: themeColors.paperSurface,
              }}
            >
              <InputBase
                value={inputCoupon}
                onChange={(e) => setInputCoupon(e.target.value)}
                placeholder="Enter promo code (e.g. LUX15)"
                sx={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  width: '100%',
                }}
              />
            </Box>
            <Button
              type="submit"
              variant="outlined"
              sx={{
                borderRadius: 0,
                borderColor: themeColors.black,
                color: themeColors.black,
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                px: 2,
                '&:hover': { backgroundColor: themeColors.black, color: themeColors.white },
              }}
            >
              Apply
            </Button>
          </Box>

          {couponCode && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                px: 1.5,
                py: 0.6,
                mb: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 600 }}>
                Code applied: <strong>{couponCode}</strong> (-₹{discountTotal})
              </Typography>
              <Typography
                variant="caption"
                onClick={clearCoupon}
                sx={{ color: '#991B1B', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Remove
              </Typography>
            </Box>
          )}

          {/* Pricing Breakdown */}
          <Box sx={{ mb: 2.5, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                Subtotal
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ₹{subtotal}
              </Typography>
            </Box>

            {discountTotal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#059669' }}>
                  Discount
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#059669' }}>
                  -₹{discountTotal}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                Shipping (Free over ₹200)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}
              </Typography>
            </Box>

            <Divider sx={{ my: 0.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                Estimated Total
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                }}
              >
                ₹{grandTotal}
              </Typography>
            </Box>
          </Box>

          {/* Checkout CTA */}
          <AppButton
            fullWidth
            onClick={handleProceedToCheckout}
            disabled={hasUnavailableItems}
            withArrow={!hasUnavailableItems}
            sx={{
              py: 1.6,
              backgroundColor: hasUnavailableItems ? '#9CA3AF' : themeColors.black,
              color: themeColors.white,
              cursor: hasUnavailableItems ? 'not-allowed' : 'pointer',
              '&:hover': {
                backgroundColor: hasUnavailableItems ? '#9CA3AF' : '#2A2A2A',
              },
            }}
          >
            {hasUnavailableItems ? 'Remove Unavailable Pieces to Checkout' : 'Proceed to Checkout'}
          </AppButton>
        </Box>
      )}
    </Drawer>
  );
};

export default CartDrawer;
