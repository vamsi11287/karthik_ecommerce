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
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined';
import { useSearchParams } from 'react-router-dom';
import { themeColors } from '../../theme/theme';
import ProductCard from '../../components/common/ProductCard';
import AppButton from '../../components/common/AppButton';
import { storeApi } from '../../hooks/useApi';
import type { Product } from '../../types';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'newest';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainCategories, setMainCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [searchFilter, setSearchFilter] = useState(initialSearch);
  const [sortBy, setSortBy] = useState(initialSort);
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Load Main Categories dynamically from Backend API (no subcategories)
  useEffect(() => {
    storeApi
      .getCategories()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list)) {
          const parents = list.filter((c: any) => !c.parentCategory);
          setMainCategories(
            parents.map((c: any) => ({
              id: c.slug || c.name.toLowerCase(),
              label: c.name,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Sync category filter when URL search parameter changes
  useEffect(() => {
    const urlCategory = searchParams.get('category') || 'all';
    if (urlCategory !== categoryFilter) {
      setCategoryFilter(urlCategory);
    }
  }, [searchParams]);

  // Fetch products from API based on the selected category
  const fetchProductsByCategory = (cat: string) => {
    setLoading(true);
    const params: { limit: number; category?: string } = { limit: 40 };
    if (cat && cat !== 'all') {
      params.category = cat;
    }
    storeApi
      .getProducts(params)
      .then((res) => {
        const prodList = res.data?.data?.products || res.data?.products || res.data?.data || [];
        setProducts(Array.isArray(prodList) ? prodList : []);
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Trigger API call whenever categoryFilter changes
  useEffect(() => {
    fetchProductsByCategory(categoryFilter);
  }, [categoryFilter]);

  // Update category and query params on pill click
  const handleCategoryChange = (catId: string) => {
    setCategoryFilter(catId);
    const newParams = new URLSearchParams(searchParams);
    if (catId === 'all') newParams.delete('category');
    else newParams.set('category', catId);
    setSearchParams(newParams);
  };

  // Filtered & Sorted results
  const filteredProducts = products.filter((p) => {
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
              ...mainCategories,
            ].map((cat) => {
              const active = categoryFilter.toLowerCase() === cat.id.toLowerCase();
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
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    px: 0.5,
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
          <Box
            sx={{
              textAlign: 'center',
              py: 10,
              px: 3,
              backgroundColor: '#FFFFFF',
              border: `1px solid ${themeColors.border}`,
              maxWidth: 500,
              mx: 'auto',
              my: 4,
            }}
          >
            <CheckroomOutlinedIcon sx={{ fontSize: 48, color: themeColors.textMuted, mb: 1.5 }} />
            <Typography
              variant="h5"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 800,
                textTransform: 'uppercase',
                mb: 1,
              }}
            >
              Products Not Available
            </Typography>
            <Typography variant="body2" sx={{ color: themeColors.textMuted, mb: 3 }}>
              {categoryFilter && categoryFilter !== 'all'
                ? `There are currently no products available in the selected category.`
                : searchFilter
                ? `No products match your search for "${searchFilter}".`
                : 'No products are currently available in this section.'}
            </Typography>
            {(categoryFilter !== 'all' || searchFilter || onlyInStock) && (
              <AppButton
                size="small"
                onClick={() => {
                  handleCategoryChange('all');
                  setSearchFilter('');
                  setOnlyInStock(false);
                }}
              >
                Clear Filters & View All
              </AppButton>
            )}
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
