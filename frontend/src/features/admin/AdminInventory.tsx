import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { themeColors } from '../../theme/theme';
import { storeApi } from '../../hooks/useApi';
import type { Product } from '../../types';
import AppButton from '../../components/common/AppButton';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';

export const AdminInventory: React.FC = () => {
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Stock Adjustment Dialog
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState('');
  const [variantStocks, setVariantStocks] = useState<Array<{ sku: string; size?: string; stock: number }>>([]);
  const [adjustReason, setAdjustReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchInventory = () => {
    setLoading(true);
    storeApi
      .getAdminProducts()
      .then((res) => {
        const list = res.data?.data?.products || res.data?.products || res.data?.data || [];
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenAdjust = (p: Product) => {
    setSelectedProduct(p);
    setAdjustReason('');
    if (p.hasVariants && p.variants && p.variants.length > 0) {
      const vList = p.variants.map((v) => ({
        sku: v.sku,
        size: v.size,
        stock: v.stock,
      }));
      setVariantStocks(vList);
      setNewStock(p.totalStock.toString());
    } else {
      setVariantStocks([]);
      setNewStock(p.totalStock.toString());
    }
  };

  const handleVariantStockChange = (sku: string, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setVariantStocks((prev) => {
      const next = prev.map((item) => (item.sku === sku ? { ...item, stock: num } : item));
      const calculatedTotal = next.reduce((sum, item) => sum + item.stock, 0);
      setNewStock(calculatedTotal.toString());
      return next;
    });
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);
    try {
      if (variantStocks.length > 0) {
        await storeApi.adjustInventory({
          productId: selectedProduct._id,
          variants: variantStocks,
          reason: adjustReason || 'Batch size variant adjustment',
        });
      } else {
        await storeApi.adjustInventory({
          productId: selectedProduct._id,
          newStock: Number(newStock),
          reason: adjustReason || 'Standard stock adjustment',
        });
      }
      dispatch(showToast({ message: `Updated inventory for ${selectedProduct.name}`, severity: 'success' }));
      setSelectedProduct(null);
      fetchInventory();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to adjust stock', severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, pb: 2, borderBottom: `1px solid ${themeColors.border}` }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            textTransform: 'uppercase',
            fontSize: { xs: '1.8rem', md: '2.4rem' },
            mb: 0.5,
          }}
        >
          Inventory Control & Stock Levels
        </Typography>
        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
          Manage real-time available stock, reserved items during checkout, and adjustment logs.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={36} color="inherit" />
        </Box>
      ) : (
        <Box sx={{ backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}`, overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.85rem',
            }}
          >
            <Box component="thead">
              <Box component="tr" sx={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: '#FAFAFA' }}>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Piece</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>SKU</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Total Stock</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Stock Health</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700, textAlign: 'right' }}>Adjust</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {products.map((p) => (
                <Box
                  component="tr"
                  key={p._id}
                  sx={{
                    borderBottom: `1px solid ${themeColors.border}`,
                    '&:hover': { backgroundColor: '#F9F9F7' },
                  }}
                >
                  <Box component="td" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>
                    {p.name}
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2, fontFamily: 'monospace' }}>
                    {p.sku}
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>
                    {p.totalStock} units
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    <Chip
                      label={p.totalStock <= 0 ? 'OUT OF STOCK' : p.totalStock <= 5 ? 'CRITICAL LOW' : 'OPTIMAL'}
                      size="small"
                      sx={{
                        borderRadius: 0,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        backgroundColor:
                          p.totalStock <= 0 ? '#FEE2E2' : p.totalStock <= 5 ? '#FEF3C7' : '#ECFDF5',
                        color:
                          p.totalStock <= 0 ? '#991B1B' : p.totalStock <= 5 ? '#92400E' : '#065F46',
                      }}
                    />
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2, textAlign: 'right' }}>
                    <Button
                      size="small"
                      onClick={() => handleOpenAdjust(p)}
                      variant="outlined"
                      sx={{
                        borderRadius: 0,
                        borderColor: themeColors.black,
                        color: themeColors.black,
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        '&:hover': { backgroundColor: themeColors.black, color: '#FFF' },
                      }}
                    >
                      <TuneIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} /> Adjust
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Adjust Dialog */}
      <Dialog
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0, p: 2 } } }}
      >
        <DialogTitle sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
          Adjust Stock: {selectedProduct?.name}
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveAdjustment}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #ECECE8' }}>
              <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                Registered SKU: <strong>{selectedProduct?.sku}</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                Current Total: <strong>{selectedProduct?.totalStock} units</strong>
              </Typography>
            </Box>

            {variantStocks.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.78rem', color: '#111' }}>
                  Size / Variant Inventory Breakdown
                </Typography>
                {variantStocks.map((v) => (
                  <Box
                    key={v.sku}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      backgroundColor: '#FAFAF8',
                      border: '1px solid #E5E5E0',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Size {v.size}
                      </Typography>
                      <Typography variant="caption" sx={{ color: themeColors.textMuted, fontFamily: 'monospace' }}>
                        {v.sku}
                      </Typography>
                    </Box>
                    <TextField
                      required
                      type="number"
                      size="small"
                      label={`Units (${v.size || ''})`}
                      value={v.stock}
                      onChange={(e) => handleVariantStockChange(v.sku, e.target.value)}
                      sx={{ width: 140 }}
                      slotProps={{ htmlInput: { min: 0 } }}
                    />
                  </Box>
                ))}

                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#065F46', fontWeight: 600 }}>
                    New Total Calculated Stock:
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: '#065F46', fontWeight: 800 }}>
                    {newStock} units
                  </Typography>
                </Box>
              </Box>
            ) : (
              <TextField
                required
                type="number"
                label="New Stock Count"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                size="small"
                slotProps={{ htmlInput: { min: 0 } }}
              />
            )}

            <TextField
              required
              label="Adjustment Reason (Audited)"
              placeholder="e.g. Warehouse physical count / restocking"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              size="small"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setSelectedProduct(null)} sx={{ borderRadius: 0 }}>
              Cancel
            </Button>
            <AppButton type="submit" loading={saving}>
              Confirm Adjustment
            </AppButton>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default AdminInventory;
