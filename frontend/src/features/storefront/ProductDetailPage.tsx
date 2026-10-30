import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Chip,
  Button,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  CircularProgress,
  Tooltip,
  Rating,
  LinearProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { useParams, useNavigate } from 'react-router-dom';
import { themeColors } from '../../theme/theme';
import { storeApi } from '../../hooks/useApi';
import type { Product, ProductVariant, Review } from '../../types';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import useWishlist from '../../hooks/useWishlist';
import { useAppDispatch } from '../../app/store';
import { setPendingCheckoutAfterAuth } from '../../app/cartSlice';
import { getAllProductImages } from '../../utils/imageUtils';
import AppButton from '../../components/common/AppButton';
import WriteReviewModal from '../../components/reviews/WriteReviewModal';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { addProductToCart, startCheckout } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);

  // Review states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [hasDeliveredOrder, setHasDeliveredOrder] = useState<boolean>(false);
  const [deliveredOrderId, setDeliveredOrderId] = useState<string | undefined>(undefined);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);

  const loadProductReviews = (productId: string) => {
    setReviewsLoading(true);
    storeApi
      .getProductReviews(productId)
      .then((res) => {
        const data = res.data?.data || res.data || {};
        const revList = data.reviews || (Array.isArray(data) ? data : []);
        setReviews(revList);
        if (data.distribution) {
          setRatingDistribution(data.distribution);
        }
        setTotalReviews(data.total || revList.length);
      })
      .catch(() => {
        setReviews([]);
      })
      .finally(() => {
        setReviewsLoading(false);
      });
  };

  const checkUserReviewEligibility = (productId: string) => {
    if (!isAuthenticated) {
      setHasDeliveredOrder(false);
      setUserReview(null);
      return;
    }

    // Check user's own review
    storeApi.getMyReviews().then((res) => {
      const list: Review[] = res.data?.data || res.data || [];
      const myReview = list.find((r) => (r.product || r.productId) === productId);
      setUserReview(myReview || null);
    });

    // Check if user has a delivered order containing this product
    storeApi.getMyOrders().then((res) => {
      const ordersList: any[] = res.data?.data || res.data || [];
      const deliveredOrder = ordersList.find(
        (o) =>
          o.fulfillmentStatus === 'DELIVERED' &&
          o.items &&
          o.items.some((i: any) => i.productId === productId)
      );
      if (deliveredOrder) {
        setHasDeliveredOrder(true);
        setDeliveredOrderId(deliveredOrder._id);
      } else {
        setHasDeliveredOrder(false);
      }
    });
  };

  useEffect(() => {
    if (slug) {
      setLoading(true);
      storeApi
        .getProductBySlug(slug)
        .then((res) => {
          const payload = res.data?.data || res.data;
          // Backend returns { product, relatedProducts }
          const prod = payload?.product || payload;
          setProduct(prod);
          if (prod?._id) {
            loadProductReviews(prod._id);
            checkUserReviewEligibility(prod._id);
          }
          if (prod?.variants && prod.variants.length > 0) {
            setSelectedVariant(prod.variants[0]);
          }
        })
        .catch(() => {
          // If slug lookup fails, fetch all products and find matching
          storeApi.getProducts().then((res) => {
            const payload = res.data?.data || res.data;
            const list = Array.isArray(payload) ? payload : payload?.products || [];
            const found = list.find((p: any) => p.slug === slug || p._id === slug);
            setProduct(found || null);
            if (found?._id) {
              loadProductReviews(found._id);
              checkUserReviewEligibility(found._id);
            }
            if (found?.variants && found.variants.length > 0) {
              setSelectedVariant(found.variants[0]);
            }
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [slug, isAuthenticated]);

  const handleReviewSuccess = (savedReview: Review) => {
    setUserReview(savedReview);
    if (product?._id) {
      loadProductReviews(product._id);
      // Re-fetch product to get refreshed ratingsAverage & ratingsCount
      if (slug) {
        storeApi.getProductBySlug(slug).then((res) => {
          const p = res.data?.data?.product || res.data?.data || res.data;
          if (p) setProduct(p);
        });
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={40} color="inherit" />
      </Box>
    );
  }

  if (!product) {
    return (
      <Container sx={{ py: 12, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, mb: 2 }}>
          Product Not Found
        </Typography>
        <AppButton onClick={() => navigate('/catalog')}>Return to Catalog</AppButton>
      </Container>
    );
  }

  const currentPrice = selectedVariant?.price ?? product.sellingPrice;
  const currentStock = selectedVariant
    ? selectedVariant.stock - selectedVariant.reservedStock
    : product.totalStock;
  const isOutOfStock = currentStock <= 0;

  const images = getAllProductImages(product.images);

  const handleAddToCart = () => {
    addProductToCart(product, selectedVariant || undefined, quantity);
  };

  const handleBuyNow = () => {
    addProductToCart(product, selectedVariant || undefined, quantity);
    if (!isAuthenticated) {
      dispatch(setPendingCheckoutAfterAuth(true));
      openAuthModal();
    } else {
      startCheckout();
    }
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode.trim() || pincode.length !== 6) {
      setPincodeStatus('Please enter a valid 6-digit Indian postal code');
      return;
    }
    setPincodeStatus('Standard Express delivery available (2-4 business days)');
  };

  return (
    <Box sx={{ py: 6, minHeight: '80vh' }}>
      <Container maxWidth="xl">
        <Grid container spacing={{ xs: 4, md: 8 }}>
          {/* Left Column: Image Gallery */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 2 }}>
              {/* Thumbnails */}
              {images.length > 1 && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'row', sm: 'column' },
                    gap: 1.5,
                    overflowX: 'auto',
                  }}
                >
                  {images.map((img, idx) => (
                    <Box
                      key={idx}
                      component="img"
                      src={img}
                      alt={`Thumbnail ${idx}`}
                      onClick={() => setActiveImageIndex(idx)}
                      sx={{
                        width: { xs: 70, sm: 85 },
                        height: { xs: 85, sm: 105 },
                        objectFit: 'cover',
                        cursor: 'pointer',
                        border: `2px solid ${activeImageIndex === idx ? themeColors.black : themeColors.border
                          }`,
                        transition: 'border-color 0.2s',
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Main Feature Image */}
              <Box
                sx={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${themeColors.border}`,
                  overflow: 'hidden',
                  position: 'relative',
                  paddingTop: { xs: '110%', sm: '120%' },
                }}
              >
                <Box
                  component="img"
                  src={images[activeImageIndex] || images[0]}
                  alt={product.name}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 20%',
                  }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Right Column: Product Detail Information & Purchase Actions */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* Category & SKU */}
              <Typography
                variant="caption"
                sx={{
                  color: themeColors.textMuted,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mb: 1,
                }}
              >
                {typeof product.category === 'object' ? product.category?.name : 'Collection'} • SKU:{' '}
                {selectedVariant?.sku || product.sku}
              </Typography>

              {/* Product Title */}
              <Typography
                variant="h3"
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  fontSize: { xs: '1.8rem', md: '2.4rem' },
                  color: themeColors.textPrimary,
                  lineHeight: 1.1,
                  mb: 2,
                }}
              >
                {product.name}
              </Typography>

              {/* Star Rating Badge / Summary */}
              <Box
                onClick={() => {
                  const el = document.getElementById('customer-reviews');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2.5,
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                <Rating
                  value={product.ratingsAverage || 5}
                  precision={0.1}
                  size="small"
                  readOnly
                  sx={{ color: '#F59E0B' }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: themeColors.textPrimary,
                    fontSize: '0.8rem',
                  }}
                >
                  {product.ratingsAverage ? product.ratingsAverage.toFixed(1) : '5.0'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: themeColors.textMuted,
                    textDecoration: 'underline',
                    fontSize: '0.8rem',
                  }}
                >
                  ({totalReviews || product.ratingsCount || 0}{' '}
                  {(totalReviews || product.ratingsCount) === 1 ? 'review' : 'reviews'})
                </Typography>
              </Box>

              {/* Price & Discount */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 3 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 800,
                    fontSize: '1.8rem',
                  }}
                >
                  ₹{currentPrice}
                </Typography>

                {product.originalPrice && product.originalPrice > currentPrice && (
                  <>
                    <Typography
                      variant="body1"
                      sx={{
                        color: themeColors.textMuted,
                        textDecoration: 'line-through',
                      }}
                    >
                      ₹{product.originalPrice}
                    </Typography>
                    <Chip
                      label={`${Math.round(
                        ((product.originalPrice - currentPrice) / product.originalPrice) * 100
                      )}% OFF`}
                      size="small"
                      sx={{
                        backgroundColor: '#DC2626',
                        color: '#FFF',
                        borderRadius: 0,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                      }}
                    />
                  </>
                )}
              </Box>

              {/* Stock Indicator */}
              <Box sx={{ mb: 3 }}>
                {isOutOfStock ? (
                  <Chip
                    label="Out of Stock"
                    sx={{ backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: 700 }}
                  />
                ) : currentStock <= 5 ? (
                  <Chip
                    label={`Low Stock — Only ${currentStock} pieces remaining`}
                    sx={{ backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 700 }}
                  />
                ) : (
                  <Chip
                    label={`In Stock (${currentStock} available)`}
                    sx={{ backgroundColor: '#ECFDF5', color: '#065F46', fontWeight: 700 }}
                  />
                )}
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Variant Selector: Sizes & Colors */}
              {product.variants && product.variants.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontFamily: '"Syne", sans-serif',
                      fontWeight: 700,
                      mb: 1.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Select Size
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {product.variants.map((v) => {
                      const selected = selectedVariant?.sku === v.sku;
                      return (
                        <Box
                          key={v.sku}
                          onClick={() => setSelectedVariant(v)}
                          sx={{
                            border: `1px solid ${selected ? themeColors.black : themeColors.border}`,
                            backgroundColor: selected ? themeColors.black : '#FFFFFF',
                            color: selected ? themeColors.white : themeColors.textPrimary,
                            minWidth: 46,
                            height: 46,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: '"Syne", sans-serif',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: themeColors.black,
                            },
                          }}
                        >
                          {v.size || v.color || 'Standard'}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Quantity Selector */}
              <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700 }}
                >
                  Quantity:
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    border: `1px solid ${themeColors.border}`,
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    sx={{ borderRadius: 0, p: 0.8 }}
                  >
                    <RemoveIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                  <Typography
                    sx={{
                      fontFamily: '"Syne", sans-serif',
                      fontWeight: 700,
                      px: 2,
                      fontSize: '0.9rem',
                    }}
                  >
                    {quantity}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    disabled={quantity >= currentStock}
                    sx={{ borderRadius: 0, p: 0.8 }}
                  >
                    <AddIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Action Buttons: Add to Bag, Wishlist & Buy Now */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <AppButton
                    fullWidth
                    disabled={isOutOfStock}
                    onClick={handleAddToCart}
                    sx={{ py: 1.8, flex: 1 }}
                  >
                    Add to Bag
                  </AppButton>
                  <Tooltip
                    title={
                      product && isInWishlist(product._id)
                        ? 'Remove from Wishlist'
                        : 'Add to Wishlist'
                    }
                  >
                    <IconButton
                      onClick={() => product && toggleWishlist(product)}
                      sx={{
                        border: `1px solid ${
                          product && isInWishlist(product._id) ? '#E11D48' : themeColors.border
                        }`,
                        borderRadius: 0,
                        width: 58,
                        height: 58,
                        backgroundColor:
                          product && isInWishlist(product._id) ? '#FFF1F2' : '#FFFFFF',
                        color:
                          product && isInWishlist(product._id) ? '#E11D48' : themeColors.black,
                        '&:hover': {
                          backgroundColor:
                            product && isInWishlist(product._id) ? '#FFE4E6' : '#F5F5F0',
                        },
                      }}
                    >
                      {product && isInWishlist(product._id) ? (
                        <FavoriteIcon sx={{ color: '#E11D48' }} />
                      ) : (
                        <FavoriteBorderIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
                <AppButton
                  fullWidth
                  inverted
                  disabled={isOutOfStock}
                  onClick={handleBuyNow}
                  sx={{ py: 1.8 }}
                >
                  Buy Now
                </AppButton>
              </Box>

              {/* Pincode Serviceability Check */}
              {/* <Box
                component="form"
                onSubmit={handleCheckPincode}
                sx={{
                  backgroundColor: themeColors.paperSurface,
                  p: 2,
                  border: `1px solid ${themeColors.border}`,
                  mb: 4,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Check Pincode Serviceability
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    placeholder="Enter 6-digit Pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    size="small"
                    sx={{ flex: 1, backgroundColor: '#FFFFFF' }}
                  />
                  <AppButton type="submit" size="small" sx={{ px: 2 }}>
                    Check
                  </AppButton>
                </Box>
                {pincodeStatus && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 1,
                      fontWeight: 600,
                      color: pincodeStatus.includes('available') ? '#065F46' : '#DC2626',
                    }}
                  >
                    {pincodeStatus}
                  </Typography>
                )}
              </Box> */}

              {/* Informative Accordions */}
              <Box>
                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{
                    borderTop: `1px solid ${themeColors.border}`,
                    '&::before': { display: 'none' },
                    backgroundColor: 'transparent',
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700 }}
                    >
                      Description & Fit Specifications
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, mb: 1.5 }}>
                      {product.description}
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{
                    borderTop: `1px solid ${themeColors.border}`,
                    borderBottom: `1px solid ${themeColors.border}`,
                    '&::before': { display: 'none' },
                    backgroundColor: 'transparent',
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700 }}
                    >
                      Delivery & 7-Day Return Policy
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalShippingOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                        <Typography variant="body2">Complimentary express shipping on orders over ₹200</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ReplayOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                        <Typography variant="body2">Hassle-free 7-day returns for unworn pieces with tags intact</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VerifiedOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                        <Typography variant="body2">Authoritative Razorpay secured online checkout</Typography>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Customer Reviews & Ratings Section */}
        <Box id="customer-reviews" sx={{ mt: 10, pt: 8, borderTop: `1px solid ${themeColors.border}` }}>
          {/* Section Header */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'flex-end' },
              gap: 2,
              mb: 5,
            }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: themeColors.textMuted,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                Verified Buyer Feedback
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  fontSize: { xs: '1.6rem', md: '2.2rem' },
                  textTransform: 'uppercase',
                }}
              >
                Customer Reviews
              </Typography>
            </Box>

            {/* Write Review CTA */}
            {hasDeliveredOrder ? (
              <AppButton
                onClick={() => setReviewModalOpen(true)}
                sx={{ px: 3, py: 1.2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <StarIcon sx={{ fontSize: '1rem', color: '#F59E0B' }} />
                {userReview ? 'Edit Your Review' : 'Write a Review'}
              </AppButton>
            ) : !isAuthenticated ? (
              <AppButton
                inverted
                onClick={openAuthModal}
                sx={{ px: 3, py: 1.2 }}
              >
                Sign In to Review
              </AppButton>
            ) : (
              <Tooltip title="Reviews are only enabled for customers with completed delivered orders for this piece.">
                <span>
                  <AppButton
                    disabled
                    sx={{ px: 3, py: 1.2, backgroundColor: '#E5E7EB', color: '#6B7280' }}
                  >
                    Verified Buyers Only
                  </AppButton>
                </span>
              </Tooltip>
            )}
          </Box>

          <Grid container spacing={6}>
            {/* Left Column: Overall Rating Score & Star Distribution Bars */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  backgroundColor: themeColors.paperSurface,
                  p: 3.5,
                  border: `1px solid ${themeColors.border}`,
                  position: 'sticky',
                  top: 100,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    mb: 2,
                  }}
                >
                  Rating Summary
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 1 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: '"Syne", sans-serif',
                      fontWeight: 800,
                      fontSize: '3rem',
                      lineHeight: 1,
                    }}
                  >
                    {product.ratingsAverage ? product.ratingsAverage.toFixed(1) : '5.0'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: themeColors.textMuted }}>
                    out of 5.0
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Rating
                    value={product.ratingsAverage || 5}
                    precision={0.1}
                    size="medium"
                    readOnly
                    sx={{ color: '#F59E0B' }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {totalReviews || product.ratingsCount || 0}{' '}
                    {(totalReviews || product.ratingsCount) === 1 ? 'review' : 'reviews'}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2.5 }} />

                {/* Star Distribution Breakdown (5 to 1) */}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'block',
                    mb: 1.5,
                  }}
                >
                  Rating Breakdown
                </Typography>

                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingDistribution[stars] || 0;
                  const total = totalReviews || 1;
                  const percentage = totalReviews > 0 ? Math.round((count / total) * 100) : 0;

                  return (
                    <Box key={stars} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          width: 32,
                          fontWeight: 700,
                          color: themeColors.textSecondary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.3,
                        }}
                      >
                        {stars} <StarIcon sx={{ fontSize: '0.75rem', color: '#F59E0B' }} />
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{
                            height: 6,
                            borderRadius: 0,
                            backgroundColor: '#E5E7EB',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: stars >= 4 ? '#F59E0B' : stars === 3 ? '#FBBF24' : '#9CA3AF',
                            },
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          width: 44,
                          textAlign: 'right',
                          color: themeColors.textMuted,
                          fontSize: '0.75rem',
                        }}
                      >
                        {percentage}%
                      </Typography>
                    </Box>
                  );
                })}

                {hasDeliveredOrder && !userReview && (
                  <Box sx={{ mt: 3, pt: 2, borderTop: `1px dashed ${themeColors.border}` }}>
                    <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, display: 'block', mb: 1 }}>
                      You purchased this piece! Share your thoughts.
                    </Typography>
                    <AppButton fullWidth size="small" onClick={() => setReviewModalOpen(true)}>
                      Write a Review
                    </AppButton>
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Right Column: Customer Reviews List */}
            <Grid size={{ xs: 12, md: 8 }}>
              {reviewsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress size={32} color="inherit" />
                </Box>
              ) : reviews.length === 0 ? (
                <Box
                  sx={{
                    p: 5,
                    textAlign: 'center',
                    border: `1px dashed ${themeColors.border}`,
                    backgroundColor: themeColors.paperSurface,
                  }}
                >
                  <StarIcon sx={{ fontSize: 44, color: '#D1D5DB', mb: 1.5 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: '"Syne", sans-serif',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      mb: 1,
                    }}
                  >
                    No Reviews Yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: themeColors.textMuted, maxWidth: 380, mx: 'auto', mb: 2 }}>
                    Be the first verified customer to share thoughts on the craftsmanship, fit, and aesthetic of this piece.
                  </Typography>
                  {hasDeliveredOrder && (
                    <AppButton onClick={() => setReviewModalOpen(true)}>
                      Leave the First Review
                    </AppButton>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {reviews.map((rev) => {
                    const isMyReview = userReview && userReview._id === rev._id;

                    return (
                      <Box
                        key={rev._id}
                        sx={{
                          p: 3,
                          backgroundColor: isMyReview ? '#FAFAF9' : '#FFFFFF',
                          border: `1px solid ${isMyReview ? themeColors.black : themeColors.border}`,
                        }}
                      >
                        {/* Review Header: User Name + Verified Badge + Date */}
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: 1,
                            mb: 1.5,
                          }}
                        >
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {rev.userName || 'Verified Buyer'}
                              </Typography>
                              {isMyReview && (
                                <Chip
                                  label="Your Review"
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    borderRadius: 0,
                                    backgroundColor: themeColors.black,
                                    color: themeColors.white,
                                  }}
                                />
                              )}
                            </Box>
                            {rev.isVerifiedPurchase && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                                <VerifiedIcon sx={{ fontSize: '0.85rem', color: '#059669' }} />
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#059669', fontWeight: 600, fontSize: '0.72rem' }}
                                >
                                  Verified Purchase
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                              {new Date(rev.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Typography>
                            {isMyReview && (
                              <Button
                                size="small"
                                onClick={() => setReviewModalOpen(true)}
                                sx={{
                                  fontSize: '0.7rem',
                                  p: 0,
                                  minWidth: 'auto',
                                  textDecoration: 'underline',
                                  color: themeColors.black,
                                  textTransform: 'none',
                                  fontWeight: 700,
                                }}
                              >
                                Edit
                              </Button>
                            )}
                          </Box>
                        </Box>

                        {/* Stars */}
                        <Box sx={{ mb: 1 }}>
                          <Rating
                            value={rev.rating}
                            size="small"
                            readOnly
                            sx={{ color: '#F59E0B' }}
                          />
                        </Box>

                        {/* Title */}
                        {rev.title && (
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: themeColors.textPrimary, mb: 1 }}
                          >
                            {rev.title}
                          </Typography>
                        )}

                        {/* Message */}
                        <Typography
                          variant="body2"
                          sx={{ color: themeColors.textSecondary, lineHeight: 1.6, whiteSpace: 'pre-line' }}
                        >
                          {rev.comment}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* Review Modal */}
      {product && (
        <WriteReviewModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          productId={product._id}
          productName={product.name}
          productImage={product.images && product.images[0] ? (typeof product.images[0] === 'string' ? product.images[0] : (product.images[0] as any).url) : undefined}
          orderId={deliveredOrderId}
          initialReview={userReview}
          onSuccess={handleReviewSuccess}
        />
      )}
    </Box>
  );
};

export default ProductDetailPage;
