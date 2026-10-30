import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import { themeColors } from '../../theme/theme';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import { getFirstProductImage } from '../../utils/imageUtils';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, compact = false }) => {
  const navigate = useNavigate();
  const { addProductToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const inWishlist = isInWishlist(product._id);

  const handleCardClick = () => {
    navigate(`/products/${product.slug}`);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addProductToCart(product);
  };

  const mainImage = getFirstProductImage(product.images);

  const categoryName =
    typeof product.category === 'object' && product.category?.name
      ? product.category.name
      : 'Collection';

  const isOutOfStock = product.totalStock <= 0;

  return (
    <Box
      onClick={handleCardClick}
      sx={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.3s ease',
        '&:hover .product-img': {
          transform: 'scale(1.05)',
        },
        '&:hover .quick-add-btn': {
          opacity: 1,
          transform: 'translateY(0)',
        },
      }}
    >
      {/* Product Image Frame */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingTop: compact ? '110%' : '125%', // High-fashion editorial ratio
          backgroundColor: '#FFFFFF',
          border: `1px solid ${themeColors.border}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {mainImage ? (
          <Box
            component="img"
            className="product-img"
            src={mainImage}
            alt={product.name}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            loading="lazy"
          />
        ) : (
          <Box
            className="product-img"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: '#F0F0EC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        )}

        {/* Badges */}
        {product.isFeatured && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: themeColors.black,
              color: themeColors.white,
              fontSize: '0.65rem',
              fontWeight: 700,
              fontFamily: '"Syne", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              px: 1,
              py: 0.4,
            }}
          >
            Drop
          </Box>
        )}

        {isOutOfStock && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: '#991B1B',
              color: '#FFF',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              px: 1,
              py: 0.4,
            }}
          >
            Sold Out
          </Box>
        )}

        {/* Quick Actions overlay */}
        <Box
          className="quick-add-btn"
          sx={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            display: 'flex',
            gap: 1,
            opacity: { xs: 1, md: 0 },
            transform: { xs: 'none', md: 'translateY(6px)' },
            transition: 'all 0.25s ease',
          }}
        >
          <Tooltip title={inWishlist ? 'Remove from Wishlist' : 'Save to Wishlist'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(product);
              }}
              sx={{
                backgroundColor: inWishlist ? '#E11D48' : themeColors.white,
                color: inWishlist ? '#FFFFFF' : themeColors.black,
                borderRadius: 0,
                width: 36,
                height: 36,
                border: `1px solid ${inWishlist ? '#E11D48' : themeColors.border}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                '&:hover': {
                  backgroundColor: inWishlist ? '#BE123C' : '#F4F4F5',
                },
              }}
            >
              {inWishlist ? (
                <FavoriteIcon fontSize="small" sx={{ color: '#FFFFFF' }} />
              ) : (
                <FavoriteBorderIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="Quick Add to Bag">
            <IconButton
              size="small"
              onClick={handleQuickAdd}
              disabled={isOutOfStock}
              sx={{
                backgroundColor: themeColors.black,
                color: themeColors.white,
                borderRadius: 0,
                width: 36,
                height: 36,
                border: `1px solid ${themeColors.black}`,
                '&:hover': {
                  backgroundColor: themeColors.white,
                  color: themeColors.black,
                },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Product Information */}
      <Box sx={{ pt: 1.5, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ pr: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: themeColors.textMuted,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: '0.68rem',
              display: 'block',
              mb: 0.4,
            }}
          >
            {categoryName}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: themeColors.textPrimary,
              fontSize: '0.85rem',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.name}
          </Typography>

          {/* Rating Badge */}
          {product.ratingsCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.3,
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  px: 0.6,
                  py: 0.1,
                  borderRadius: '2px',
                }}
              >
                <StarIcon sx={{ fontSize: '0.72rem', color: '#D97706' }} />
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    fontFamily: '"Syne", sans-serif',
                    color: '#92400E',
                    lineHeight: 1,
                  }}
                >
                  {product.ratingsAverage.toFixed(1)}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: themeColors.textMuted,
                  fontSize: '0.68rem',
                  fontWeight: 500,
                }}
              >
                ({product.ratingsCount})
              </Typography>
            </Box>
          )}
        </Box>

        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            fontFamily: '"Syne", sans-serif',
            fontSize: '0.95rem',
            color: themeColors.textPrimary,
            whiteSpace: 'nowrap',
          }}
        >
          ₹{product.sellingPrice}
        </Typography>
      </Box>
    </Box>
  );
};

export default ProductCard;
