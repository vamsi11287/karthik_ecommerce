import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '../../theme/theme';
import { AppButton } from '../common/AppButton';
import useWishlist from '../../hooks/useWishlist';
import useCart from '../../hooks/useCart';
import { getFirstProductImage } from '../../utils/imageUtils';
import { Product } from '../../types';

export const WishlistDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { wishlistItems, wishlistCount, isWishlistDrawerOpen, closeWishlist, removeFromWishlist } =
    useWishlist();
  const { addProductToCart, openDrawer: openCartDrawer } = useCart();

  const handleMoveToCart = (product: Product) => {
    // Add product to cart
    addProductToCart(product);
    // Remove from wishlist
    removeFromWishlist(product._id);
    // Switch to cart drawer
    closeWishlist();
    openCartDrawer();
  };

  const handleNavigateToProduct = (slug: string) => {
    closeWishlist();
    navigate(`/products/${slug}`);
  };

  const handleExploreCatalog = () => {
    closeWishlist();
    navigate('/catalog');
  };

  return (
    <Drawer
      anchor="right"
      open={isWishlistDrawerOpen}
      onClose={closeWishlist}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 460 },
            backgroundColor: '#FFFFFF',
            p: 0,
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Drawer Header */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${themeColors.border}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontSize: '1.1rem',
            }}
          >
            Wishlist
          </Typography>
          <Chip
            label={`${wishlistCount} ${wishlistCount === 1 ? 'item' : 'items'}`}
            size="small"
            sx={{
              backgroundColor: themeColors.paperSurface,
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              fontSize: '0.72rem',
              borderRadius: 0,
              border: `1px solid ${themeColors.border}`,
            }}
          />
        </Box>
        <IconButton onClick={closeWishlist} size="small" sx={{ color: themeColors.black }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Wishlist Items List or Empty State */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {wishlistItems.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: 380,
              textAlign: 'center',
              px: 2,
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                border: `1px dashed ${themeColors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2.5,
                color: themeColors.textMuted,
              }}
            >
              <FavoriteBorderIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                textTransform: 'uppercase',
                mb: 1,
              }}
            >
              Your Wishlist is Empty
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: themeColors.textMuted,
                maxWidth: 280,
                mb: 3,
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
            >
              Save pieces you love to your personal wishlist to revisit or purchase anytime.
            </Typography>
            <AppButton onClick={handleExploreCatalog} sx={{ px: 4, py: 1.4 }}>
              Explore Collection
            </AppButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {wishlistItems.map((product) => {
              const image = getFirstProductImage(product.images);
              const isOutOfStock = product.totalStock <= 0;

              return (
                <Box
                  key={product._id}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    pb: 2.5,
                    borderBottom: `1px solid ${themeColors.border}`,
                    position: 'relative',
                  }}
                >
                  {/* Thumbnail */}
                  <Box
                    onClick={() => handleNavigateToProduct(product.slug)}
                    sx={{
                      width: 90,
                      height: 110,
                      cursor: 'pointer',
                      border: `1px solid ${themeColors.border}`,
                      overflow: 'hidden',
                      backgroundColor: '#F9F9F8',
                      flexShrink: 0,
                    }}
                  >
                    {image ? (
                      <Box
                        component="img"
                        src={image}
                        alt={product.name}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.3s ease',
                          '&:hover': { transform: 'scale(1.05)' },
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#EAEAE6',
                        }}
                      />
                    )}
                  </Box>

                  {/* Product Details & Actions */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        {product.brand && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: themeColors.textMuted,
                              textTransform: 'uppercase',
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                              fontSize: '0.68rem',
                            }}
                          >
                            {product.brand}
                          </Typography>
                        )}
                        <Typography
                          variant="body2"
                          onClick={() => handleNavigateToProduct(product.slug)}
                          sx={{
                            fontWeight: 700,
                            color: themeColors.textPrimary,
                            cursor: 'pointer',
                            lineHeight: 1.3,
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {product.name}
                        </Typography>
                      </Box>

                      <Tooltip title="Remove from Wishlist">
                        <IconButton
                          size="small"
                          onClick={() => removeFromWishlist(product._id, product.name)}
                          sx={{
                            color: themeColors.textMuted,
                            p: 0.5,
                            '&:hover': { color: '#DC2626' },
                          }}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* Price and Stock Status */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, my: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontFamily: '"Syne", sans-serif',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                        }}
                      >
                        ₹{product.sellingPrice}
                      </Typography>
                      {product.originalPrice && product.originalPrice > product.sellingPrice && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: themeColors.textMuted,
                            textDecoration: 'line-through',
                            fontSize: '0.78rem',
                          }}
                        >
                          ₹{product.originalPrice}
                        </Typography>
                      )}
                      {isOutOfStock ? (
                        <Chip
                          label="Out of Stock"
                          size="small"
                          sx={{
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            fontWeight: 700,
                            borderRadius: 0,
                            fontSize: '0.65rem',
                            height: 18,
                          }}
                        />
                      ) : (
                        <Chip
                          label="In Stock"
                          size="small"
                          sx={{
                            backgroundColor: '#ECFDF5',
                            color: '#065F46',
                            fontWeight: 700,
                            borderRadius: 0,
                            fontSize: '0.65rem',
                            height: 18,
                          }}
                        />
                      )}
                    </Box>

                    {/* Move to Bag CTA */}
                    <Box sx={{ mt: 'auto', pt: 1 }}>
                      <AppButton
                        size="small"
                        disabled={isOutOfStock}
                        onClick={() => handleMoveToCart(product)}
                        sx={{
                          fontSize: '0.75rem',
                          py: 0.8,
                          px: 2,
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                        }}
                      >
                        <ShoppingBagOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                        {isOutOfStock ? 'Sold Out' : 'Move to Bag'}
                      </AppButton>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Bottom Footer if has items */}
      {wishlistItems.length > 0 && (
        <Box sx={{ p: 2.5, borderTop: `1px solid ${themeColors.border}`, backgroundColor: '#FFFFFF' }}>
          <AppButton fullWidth inverted onClick={handleExploreCatalog} sx={{ py: 1.4 }}>
            Continue Shopping
          </AppButton>
        </Box>
      )}
    </Drawer>
  );
};

export default WishlistDrawer;
