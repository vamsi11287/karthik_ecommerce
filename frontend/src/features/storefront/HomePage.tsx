import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Chip,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '../../theme/theme';
import SectionHeader from '../../components/common/SectionHeader';
import ProductCard from '../../components/common/ProductCard';
import AppButton from '../../components/common/AppButton';
import { storeApi } from '../../hooks/useApi';
import type { Product } from '../../types';

// Editorial lookbook image assets used in the homepage layout
const HERO_IMAGES = {
  lookbook1: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=1000',
  lookbook2: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1000',
};

const GALLERY_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800', alt: 'Urban Architecture Streetwear' },
  { src: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800', alt: 'Urban Streetwear Runway Look' },
  { src: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800', alt: 'Minimalist Footwear and Jogger' },
  { src: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800', alt: 'Raw Cotton Heavyweight Studio Detail' },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL');
  const [sortBy, setSortBy] = useState('price-asc');

  // Fetch live products from backend
  useEffect(() => {
    setLoading(true);
    storeApi
      .getProducts({ limit: 12 })
      .then((res) => {
        const prodList = res.data?.data?.products || res.data?.products || res.data?.data;
        if (Array.isArray(prodList) && prodList.length > 0) {
          setProducts(prodList);
        }
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Filter products for Section 3 (XIV Collections)
  const filteredProducts = products.filter((p) => {
    if (selectedCategoryTab === 'ALL') return true;
    const catSlug = typeof p.category === 'object' ? p.category?.slug : '';
    const catName = typeof p.category === 'object' ? p.category?.name : '';
    return (
      catSlug.toLowerCase().includes(selectedCategoryTab.toLowerCase()) ||
      catName.toLowerCase().includes(selectedCategoryTab.toLowerCase())
    );
  });

  // Sort
  const sortedCollection = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
    if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
    return 0;
  });

  return (
    <Box sx={{ pb: 12 }}>
      <Container maxWidth="xl">
        {/* ============================================================== */}
        {/* 1. HERO SECTION */}
        {/* ============================================================== */}
        <Box
          sx={{
            pt: { xs: 4, md: 6 },
            pb: { xs: 6, md: 9 },
            borderBottom: `1px solid ${themeColors.border}`,
          }}
        >
          <Grid container spacing={{ xs: 4, md: 4 }} sx={{ alignItems: 'stretch' }}>
            {/* Left Hero Column: Headline, Subtitle, and Action */}
            <Grid
              size={{ xs: 12, md: 5 }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                pr: { md: 4 },
              }}
            >
              <Typography
                variant="h1"
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  fontSize: { xs: '2.5rem', sm: '3.6rem', lg: '4.2rem' },
                  color: themeColors.textPrimary,
                  lineHeight: 0.95,
                  mb: 1.5,
                  letterSpacing: '-0.03em',
                }}
              >
                NEW
                <br />
                COLLECTION
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AppButton onClick={() => navigate('/catalog')} withArrow sx={{ px: 3.5, py: 1.5 }}>
                  Go To Shop
                </AppButton>
              </Box>
            </Grid>

            {/* Right Hero Column: Dual Editorial Lookbook Images */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Grid container spacing={2.5}>
                {/* Hero Editorial Card 1 */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      height: { xs: 340, sm: 460 },
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${themeColors.border}`,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <Box
                      component="img"
                      src={HERO_IMAGES.lookbook1}
                      alt="Summer Lookbook Sitting Model"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center 20%',
                        transition: 'transform 0.5s ease',
                        '&:hover': { transform: 'scale(1.03)' },
                      }}
                    />
                  </Box>
                </Grid>

                {/* Hero Editorial Card 2 */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      height: { xs: 340, sm: 460 },
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${themeColors.border}`,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <Box
                      component="img"
                      src={HERO_IMAGES.lookbook2}
                      alt="Summer Lookbook Standing Model"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center top',
                        transition: 'transform 0.5s ease',
                        '&:hover': { transform: 'scale(1.03)' },
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>

        {/* ============================================================== */}
        {/* 2. NEW THIS WEEK Carousel Section */}
        {/* ============================================================== */}
        <Box sx={{ py: { xs: 6, md: 9 }, borderBottom: `1px solid ${themeColors.border}` }}>
          <SectionHeader
            title="NEW THIS WEEK"
            badgeCount={products.length}
            actionText="Shop All"
            actionLink="/catalog?sort=newest"
            onPrev={() => {}}
            onNext={() => {}}
          />

          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {products.slice(0, 4).map((product) => (
              <Grid key={product._id} size={{ xs: 6, sm: 6, md: 3 }}>
                <ProductCard product={product} />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ============================================================== */}
        {/* 3. COLLECTIONS Grid Section */}
        {/* ============================================================== */}
        <Box sx={{ py: { xs: 6, md: 9 }, borderBottom: `1px solid ${themeColors.border}` }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'flex-end' },
              mb: 4,
              gap: 2,
            }}
          >
            {/* Title & Category Filter Pills */}
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  fontSize: { xs: '1.8rem', sm: '2.4rem', md: '2.8rem' },
                  letterSpacing: '-0.025em',
                  lineHeight: 1,
                  mb: 2.5,
                }}
              >
                SPUN
                <br />
                COLLECTIONS
                <br />
                23-24
              </Typography>

              {/* Tabs: ALL, Men, Women, Kids */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['ALL', 'Men', 'Women', 'Kids'].map((tab) => {
                  const active = selectedCategoryTab === tab;
                  return (
                    <Chip
                      key={tab}
                      label={tab}
                      onClick={() => setSelectedCategoryTab(tab)}
                      sx={{
                        backgroundColor: active ? themeColors.black : 'transparent',
                        color: active ? themeColors.white : themeColors.textPrimary,
                        border: `1px solid ${active ? themeColors.black : themeColors.border}`,
                        fontFamily: '"Syne", sans-serif',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        px: 1.2,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: active ? themeColors.black : '#FFFFFF',
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            {/* Sorting Dropdown */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: themeColors.textMuted }}>
                Sorting:
              </Typography>
              <FormControl size="small">
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  sx={{
                    borderRadius: 0,
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${themeColors.border}`,
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  }}
                >
                  <MenuItem value="price-asc">Price Low to High</MenuItem>
                  <MenuItem value="price-desc">Price High to Low</MenuItem>
                  <MenuItem value="newest">Latest Drops</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* 3-Column Product Grid */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} color="inherit" />
            </Box>
          ) : sortedCollection.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 3,
                backgroundColor: '#FFFFFF',
                border: `1px solid ${themeColors.border}`,
                my: 2,
              }}
            >
              <CheckroomOutlinedIcon sx={{ fontSize: 44, color: themeColors.textMuted, mb: 1.5 }} />
              <Typography
                variant="h5"
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  mb: 1,
                  letterSpacing: '0.02em',
                }}
              >
                Products Not Available
              </Typography>
              <Typography variant="body2" sx={{ color: themeColors.textMuted, mb: 3, maxWidth: 420, mx: 'auto' }}>
                There are currently no products available in the {selectedCategoryTab} collection. Check back soon for new drops!
              </Typography>
              {selectedCategoryTab !== 'ALL' && (
                <AppButton size="small" onClick={() => setSelectedCategoryTab('ALL')}>
                  Browse All Collections
                </AppButton>
              )}
            </Box>
          ) : (
            <Grid container spacing={{ xs: 2.5, sm: 3, md: 3.5 }}>
              {sortedCollection.slice(0, 3).map((product) => (
                <Grid key={product._id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <ProductCard product={product} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* "More" button with downward chevron - only show when products exist */}
          {sortedCollection.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
              <Box
                onClick={() => navigate('/catalog')}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(2px)' },
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    letterSpacing: '0.08em',
                    mb: 0.5,
                  }}
                >
                  More
                </Typography>
                <KeyboardArrowDownIcon sx={{ fontSize: '1.2rem', color: themeColors.black }} />
              </Box>
            </Box>
          )}
        </Box>

        {/* ============================================================== */}
        {/* 4. "OUR APPROACH TO FASHION DESIGN" Manifesto & Lookbook Gallery */}
        {/* ============================================================== */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Box sx={{ textAlign: 'center', maxWidth: 740, mx: 'auto', mb: 8 }}>
            <Typography
              variant="h2"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3rem' },
                color: themeColors.textPrimary,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                mb: 2.5,
              }}
            >
              OUR APPROACH TO FASHION DESIGN
            </Typography>

            <Typography
              variant="body1"
              sx={{
                fontFamily: '"Inter", sans-serif',
                color: themeColors.textSecondary,
                fontSize: { xs: '0.9rem', md: '1.05rem' },
                lineHeight: 1.8,
              }}
            >
              At the core of SPUN, we blend urban architecture and tailored minimalism to create
              apparel that transcends trend and season. Every silhouette is meticulously crafted,
              ensuring the highest quality heavyweight fabrics.
            </Typography>
          </Box>

          {/* 4-Column Editorial Lookbook Photography Row */}
          <Grid container spacing={2.5}>
            {GALLERY_IMAGES.map((img) => (
              <Grid key={img.src} size={{ xs: 12, sm: 6, md: 3 }}>
                <Box
                  sx={{
                    height: { xs: 360, md: 440 },
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${themeColors.border}`,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    component="img"
                    src={img.src}
                    alt={img.alt}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease',
                      '&:hover': { transform: 'scale(1.04)' },
                    }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;
