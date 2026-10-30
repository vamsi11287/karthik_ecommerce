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
  InputBase,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useSearchParams } from 'react-router-dom';
import { themeColors } from '../../theme/theme';
import ProductCard from '../../components/common/ProductCard';
import { storeApi } from '../../hooks/useApi';
import type { Product } from '../../types';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'newest';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [searchFilter, setSearchFilter] = useState(initialSearch);
  const [sortBy, setSortBy] = useState(initialSort);
  const [onlyInStock, setOnlyInStock] = useState(false);

  useEffect(() => {
    setLoading(true);
    storeApi
      .getProducts({ limit: 40 })
      .then((res) => {
        const prodList = res.data?.data?.products || res.data?.products || res.data?.data || [];
        setProducts(prodList);
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Update query params
  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    const newParams = new URLSearchParams(searchParams);
    if (cat === 'all') newParams.delete('category');
    else newParams.set('category', cat);
    setSearchParams(newParams);
  };

  // Filtered & Sorted results
  const filteredProducts = products.filter((p) => {
    // Category check
    if (categoryFilter !== 'all') {
      const catSlug = typeof p.category === 'object' ? p.category?.slug : '';
      const catName = typeof p.category === 'object' ? p.category?.name : '';
      const match =
        catSlug.toLowerCase().includes(categoryFilter.toLowerCase()) ||
        catName.toLowerCase().includes(categoryFilter.toLowerCase());
      if (!match) return false;
    }

    // Search query check
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // In-stock check
    if (onlyInStock && p.totalStock <= 0) {
      return false;
    }

    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
    if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Box sx={{ py: 6, minHeight: '80vh' }}>
      <Container maxWidth="xl">
        {/* Header Banner */}
        <Box sx={{ mb: 5, pb: 3, borderBottom: `1px solid ${themeColors.border}` }}>
          <Typography
            variant="h2"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '3rem' },
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              mb: 1,
            }}
          >
            Collections & Catalog
          </Typography>
          <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
            Showing {sortedProducts.length} archival pieces and contemporary essentials.
          </Typography>
        </Box>

        {/* Filter Controls Bar */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            mb: 5,
            gap: 2.5,
          }}
        >
          {/* Categories Pill Bar */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'all', label: 'All Items' },
              { id: 'men', label: 'Men' },
              { id: 'women', label: 'Women' },
              { id: 'collections', label: 'Capsules' },
              { id: 'accessories', label: 'Accessories' },
            ].map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <Chip
                  key={cat.id}
                  label={cat.label}
                  onClick={() => handleCategoryChange(cat.id)}
                  sx={{
                    backgroundColor: active ? themeColors.black : '#FFFFFF',
                    color: active ? themeColors.white : themeColors.textPrimary,
                    border: `1px solid ${active ? themeColors.black : themeColors.border}`,
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    borderRadius: 0,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: active ? themeColors.black : '#F0F0EC' },
                  }}
                />
              );
            })}
          </Box>

          {/* Search, In-stock & Sort Controls */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                border: `1px solid ${themeColors.border}`,
                px: 1.5,
                py: 0.6,
                minWidth: 200,
              }}
            >
              <SearchIcon sx={{ color: themeColors.textMuted, fontSize: '1rem', mr: 1 }} />
              <InputBase
                placeholder="Search..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                sx={{ fontFamily: '"Inter", sans-serif', fontSize: '0.8rem', width: '100%' }}
              />
            </Box>

            {/* In-Stock Filter */}
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                />
              }
              label={
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  In Stock Only
                </Typography>
              }
              sx={{ m: 0 }}
            />

            {/* Sort Dropdown */}
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
                <MenuItem value="newest">Latest Drops</MenuItem>
                <MenuItem value="price-asc">Price: Low to High</MenuItem>
                <MenuItem value="price-desc">Price: High to Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Product Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress size={36} color="inherit" />
          </Box>
        ) : sortedProducts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <Typography variant="h5" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, mb: 1 }}>
              No Pieces Found
            </Typography>
            <Typography variant="body2" sx={{ color: themeColors.textMuted }}>
              Try adjusting your search criteria or clearing filters.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 2.5, sm: 3, md: 3.5 }}>
            {sortedProducts.map((prod) => (
              <Grid key={prod._id} size={{ xs: 6, sm: 6, md: 4, lg: 3 }}>
                <ProductCard product={prod} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default CatalogPage;
