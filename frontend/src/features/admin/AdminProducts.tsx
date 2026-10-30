import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Tooltip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { themeColors } from '../../theme/theme';
import { storeApi } from '../../hooks/useApi';
import type { Product } from '../../types';
import AppButton from '../../components/common/AppButton';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';
import { getFirstProductImage } from '../../utils/imageUtils';

interface ManagedProductImage {
  url: string;
  publicId?: string;
  alt?: string;
  isDefault?: boolean;
}

const normalizeProductImages = (images: Product['images'] = []): ManagedProductImage[] =>
  images.map((image) => (typeof image === 'string' ? { url: image } : image));

export const AdminProducts: React.FC = () => {
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Archive Confirmation Modal
  const [archiveCandidate, setArchiveCandidate] = useState<{ id: string; name: string } | null>(null);
  const [archiving, setArchiving] = useState(false);

  // Edit Product Modal
  const [editProductCandidate, setEditProductCandidate] = useState<Product | null>(null);
  const [editing, setEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    sellingPrice: '',
    originalPrice: '',
    totalStock: '',
    isPublished: true,
    variants: [] as Array<{ sku: string; size?: string; stock: number; price: number }>,
  });
  const [editImages, setEditImages] = useState<ManagedProductImage[]>([]);

  // Categories
  const [categories, setCategories] = useState<Array<{ _id: string; name: string; slug: string }>>([]);

  // Create Product Dialog State
  const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const BOTTOM_SIZES = ['28', '30', '32', '34', '36'];

  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [sizingMode, setSizingMode] = useState<'tshirt' | 'bottoms' | 'single'>('tshirt');
  const [tshirtSizes, setTshirtSizes] = useState<Record<string, string>>({
    XS: '0',
    S: '0',
    M: '0',
    L: '0',
    XL: '0',
    XXL: '0',
  });
  const [bottomSizes, setBottomSizes] = useState<Record<string, string>>({
    '28': '0',
    '30': '0',
    '32': '0',
    '34': '0',
    '36': '0',
  });
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    brand: 'LUXWEAR',
    sellingPrice: '',
    originalPrice: '',
    totalStock: '',
  });
  const [createImages, setCreateImages] = useState<ManagedProductImage[]>([]);

  const fetchProducts = () => {
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
    fetchProducts();
    // Load categories for product creation & filtering
    storeApi
      .getCategories()
      .then((res) => {
        const catList = res.data?.data || res.data || [];
        if (Array.isArray(catList)) {
          setCategories(catList);
          if (catList.length > 0) {
            setFormData((prev) => ({
              ...prev,
              categoryId: prev.categoryId || catList[0]._id,
            }));
          }
        }
      })
      .catch(() => { });
  }, []);

  const uploadImages = async (files: FileList, target: 'create' | 'edit') => {
    const selectedFiles = Array.from(files);
    const currentImages = target === 'create' ? createImages : editImages;
    const maxFileSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];

    if (currentImages.length + selectedFiles.length > 10) {
      dispatch(showToast({ message: 'A product can have up to 10 images', severity: 'error' }));
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !allowedTypes.includes(file.type) || file.size > maxFileSize
    );
    if (invalidFile) {
      dispatch(
        showToast({
          message: invalidFile.size > maxFileSize
            ? `${invalidFile.name} exceeds the 5 MB image limit`
            : `${invalidFile.name} is not a supported image format`,
          severity: 'error',
        })
      );
      return;
    }

    setUploadingImages(true);
    try {
      for (const file of selectedFiles) {
        const body = new FormData();
        body.append('images', file);
        const response = await storeApi.uploadProductImages(body);
        const image = response.data?.data?.[0];
        const publicId = image?.publicId || image?.public_id;
        if (typeof image?.url !== 'string' || typeof publicId !== 'string') {
          throw new Error('Image upload did not return a Cloudinary URL and public ID');
        }

        const uploadedImage: ManagedProductImage = {
          url: image.url,
          publicId,
          alt: file.name,
        };
        if (target === 'create') {
          setCreateImages((previous) => [...previous, uploadedImage]);
        } else {
          setEditImages((previous) => [...previous, uploadedImage]);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload product images';
      dispatch(showToast({ message, severity: 'error' }));
    } finally {
      setUploadingImages(false);
    }
  };

  const deleteCloudinaryImages = async (images: ManagedProductImage[]) => {
    const publicIds = [...new Set(images.map((image) => image.publicId).filter((id): id is string => !!id))];
    for (const publicId of publicIds) {
      await storeApi.deleteProductImage(publicId);
    }
  };

  const handleRemoveImage = async (image: ManagedProductImage, target: 'create' | 'edit') => {
    if (target === 'create') {
      try {
        if (image.publicId) await storeApi.deleteProductImage(image.publicId);
        setCreateImages((previous) => previous.filter((item) => item !== image));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove image from Cloudinary';
        dispatch(showToast({ message, severity: 'error' }));
      }
      return;
    }

    const originalPublicIds = new Set(
      normalizeProductImages(editProductCandidate?.images).map((item) => item.publicId).filter(Boolean)
    );
    try {
      if (image.publicId && !originalPublicIds.has(image.publicId)) {
        await storeApi.deleteProductImage(image.publicId);
      }
      setEditImages((previous) => previous.filter((item) => item !== image));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove image from Cloudinary';
      dispatch(showToast({ message, severity: 'error' }));
    }
  };

  const handleCloseCreate = async () => {
    if (creating || uploadingImages) return;
    try {
      await deleteCloudinaryImages(createImages);
      setCreateImages([]);
      setOpenCreate(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clean up uploaded images';
      dispatch(showToast({ message, severity: 'error' }));
    }
  };

  const handleCloseEdit = async () => {
    if (editing || uploadingImages) return;
    const originalPublicIds = new Set(
      normalizeProductImages(editProductCandidate?.images).map((image) => image.publicId).filter(Boolean)
    );
    try {
      await deleteCloudinaryImages(
        editImages.filter((image) => image.publicId && !originalPublicIds.has(image.publicId))
      );
      setEditImages([]);
      setEditProductCandidate(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clean up uploaded images';
      dispatch(showToast({ message, severity: 'error' }));
    }
  };

  const renderImagePicker = (
    images: ManagedProductImage[],
    target: 'create' | 'edit',
    disabled: boolean
  ) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          component="label"
          variant="outlined"
          disabled={disabled || uploadingImages || images.length >= 10}
          sx={{ borderRadius: 0, textTransform: 'none' }}
        >
          Upload product images
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={(event) => {
              if (event.target.files?.length) {
                void uploadImages(event.target.files, target);
              }
              event.target.value = '';
            }}
          />
        </Button>
        {uploadingImages && <CircularProgress size={20} />}
        <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
          {images.length}/10 images · JPG, PNG, WEBP or AVIF · 5 MB max each
        </Typography>
      </Box>
      {images.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {images.map((image, index) => (
            <Box key={`${image.publicId || image.url}-${index}`} sx={{ position: 'relative' }}>
              <Box
                component="img"
                src={image.url}
                alt={image.alt || `Product image ${index + 1}`}
                sx={{
                  display: 'block',
                  width: 92,
                  height: 110,
                  objectFit: 'cover',
                  border: `1px solid ${themeColors.border}`,
                }}
              />
              <IconButton
                aria-label="Remove product image"
                size="small"
                disabled={disabled || uploadingImages}
                onClick={() => void handleRemoveImage(image, target)}
                sx={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  color: '#FFFFFF',
                  backgroundColor: 'rgba(0, 0, 0, 0.68)',
                  '&:hover': { backgroundColor: '#DC2626' },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );

  const calculateTshirtTotal = () => {
    return TSHIRT_SIZES.reduce(
      (sum, s) => sum + Math.max(0, parseInt(tshirtSizes[s]) || 0),
      0
    );
  };

  const calculateBottomTotal = () => {
    return BOTTOM_SIZES.reduce(
      (sum, s) => sum + Math.max(0, parseInt(bottomSizes[s]) || 0),
      0
    );
  };

  const handleTshirtSizeChange = (size: string, val: string) => {
    setTshirtSizes((prev) => ({ ...prev, [size]: val }));
  };

  const handleFillAllTshirt = (count: number) => {
    const next: Record<string, string> = {};
    TSHIRT_SIZES.forEach((s) => {
      next[s] = count.toString();
    });
    setTshirtSizes(next);
  };

  const handleBottomSizeChange = (size: string, val: string) => {
    setBottomSizes((prev) => ({ ...prev, [size]: val }));
  };

  const handleFillAllBottoms = (count: number) => {
    const next: Record<string, string> = {};
    BOTTOM_SIZES.forEach((s) => {
      next[s] = count.toString();
    });
    setBottomSizes(next);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const cleanSku = formData.sku.trim().toUpperCase();
      let variantsPayload: any[] = [];
      let calculatedTotal = 0;

      if (sizingMode === 'tshirt') {
        calculatedTotal = calculateTshirtTotal();
        variantsPayload = TSHIRT_SIZES.map((size) => ({
          sku: `${cleanSku}-${size}`,
          size,
          price: Number(formData.sellingPrice),
          originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
          stock: Math.max(0, parseInt(tshirtSizes[size]) || 0),
        }));
      } else if (sizingMode === 'bottoms') {
        calculatedTotal = calculateBottomTotal();
        variantsPayload = BOTTOM_SIZES.map((size) => ({
          sku: `${cleanSku}-${size}`,
          size,
          price: Number(formData.sellingPrice),
          originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
          stock: Math.max(0, parseInt(bottomSizes[size]) || 0),
        }));
      } else {
        calculatedTotal = Number(formData.totalStock) || 0;
      }

      // Default to first available category if not set
      const activeCategoryId =
        formData.categoryId || (categories.length > 0 ? categories[0]._id : undefined);

      const payload = {
        name: formData.name.trim(),
        slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sku: cleanSku,
        description: formData.description.trim(),
        category: activeCategoryId,
        brand: formData.brand.trim() || 'LUXWEAR',
        sellingPrice: Number(formData.sellingPrice),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
        totalStock: calculatedTotal,
        hasVariants: sizingMode !== 'single',
        variants: variantsPayload,
        images: createImages.map((image, index) => ({
          ...image,
          alt: image.alt || formData.name.trim(),
          isDefault: index === 0,
        })),
        isPublished: true,
      };

      await storeApi.createProduct(payload);
      dispatch(
        showToast({
          message: `Product "${formData.name}" created and published!`,
          severity: 'success',
        })
      );
      setOpenCreate(false);
      setCreateImages([]);
      setFormData({
        name: '',
        sku: '',
        description: '',
        categoryId: categories.length > 0 ? categories[0]._id : '',
        brand: 'LUXWEAR',
        sellingPrice: '',
        originalPrice: '',
        totalStock: '',
      });
      setTshirtSizes({ XS: '0', S: '0', M: '0', L: '0', XL: '0', XXL: '0' });
      fetchProducts();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to create product', severity: 'error' }));
    } finally {
      setCreating(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveCandidate) return;
    setArchiving(true);
    try {
      await storeApi.archiveProduct(archiveCandidate.id);
      dispatch(showToast({ message: `Archived "${archiveCandidate.name}"`, severity: 'info' }));
      setArchiveCandidate(null);
      fetchProducts();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to archive', severity: 'error' }));
    } finally {
      setArchiving(false);
    }
  };

  // 1-Click Publish / Unpublish Toggle
  const handleTogglePublish = async (p: Product) => {
    try {
      const nextStatus = !p.isPublished;
      await storeApi.updateProduct(p._id, { isPublished: nextStatus });
      dispatch(
        showToast({
          message: nextStatus ? `Published "${p.name}" to storefront` : `Unpublished "${p.name}" (moved to draft)`,
          severity: nextStatus ? 'success' : 'info',
        })
      );
      fetchProducts();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to update publish status', severity: 'error' }));
    }
  };

  // Open Edit Modal with pre-filled product details
  const handleOpenEdit = (p: Product) => {
    setEditProductCandidate(p);
    const existingVariants = (p.variants || []).map((v) => ({
      sku: v.sku,
      size: v.size,
      stock: v.stock,
      price: v.price || p.sellingPrice,
    }));

    setEditFormData({
      name: p.name,
      description: p.description || '',
      sellingPrice: p.sellingPrice.toString(),
      originalPrice: p.originalPrice ? p.originalPrice.toString() : '',
      totalStock: p.totalStock.toString(),
      isPublished: p.isPublished,
      variants: existingVariants,
    });
    setEditImages(normalizeProductImages(p.images));
  };

  const handleEditVariantChange = (index: number, field: 'stock' | 'price', val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setEditFormData((prev) => {
      const updatedVariants = [...prev.variants];
      updatedVariants[index] = { ...updatedVariants[index], [field]: num };
      const calculatedTotal = updatedVariants.reduce((sum, v) => sum + v.stock, 0);
      return {
        ...prev,
        variants: updatedVariants,
        totalStock: calculatedTotal.toString(),
      };
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProductCandidate) return;
    setEditing(true);
    try {
      let finalStock = Number(editFormData.totalStock);
      if (editFormData.variants.length > 0) {
        finalStock = editFormData.variants.reduce((sum, v) => sum + Number(v.stock), 0);
      }

      const payload: any = {
        name: editFormData.name,
        description: editFormData.description,
        sellingPrice: Number(editFormData.sellingPrice),
        originalPrice: editFormData.originalPrice ? Number(editFormData.originalPrice) : undefined,
        totalStock: finalStock,
        isPublished: editFormData.isPublished,
        images: editImages.map((image, index) => ({
          ...image,
          alt: image.alt || editFormData.name,
          isDefault: index === 0,
        })),
      };

      if (editFormData.variants.length > 0) {
        payload.hasVariants = true;
        payload.variants = editFormData.variants.map((v) => ({
          sku: v.sku,
          size: v.size,
          stock: Number(v.stock),
          price: Number(v.price) || Number(editFormData.sellingPrice),
        }));
      }

      await storeApi.updateProduct(editProductCandidate._id, payload);
      dispatch(showToast({ message: `Successfully updated "${editFormData.name}"`, severity: 'success' }));
      setEditProductCandidate(null);
      setEditImages([]);
      fetchProducts();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to update product', severity: 'error' }));
    } finally {
      setEditing(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          pb: 2,
          borderBottom: `1px solid ${themeColors.border}`,
        }}
      >
        <Box>
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
            Catalog Management
          </Typography>
          <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
            {products.length} products listed in active single-vendor inventory.
          </Typography>
        </Box>

        <AppButton onClick={() => setOpenCreate(true)}>
          <AddIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} /> Add Product
        </AppButton>
      </Box>

      {/* Table */}
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
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Price</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Stock</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Variants</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Status</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700, textAlign: 'right' }}>Actions</Box>
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
                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        component="img"
                        src={getFirstProductImage(p.images)}
                        alt={p.name}
                        sx={{ width: 44, height: 54, objectFit: 'cover' }}
                      />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {p.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                          {typeof p.category === 'object' ? p.category?.name : 'Collection'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2, fontFamily: 'monospace', fontWeight: 600 }}>
                    {p.sku}
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>
                    ₹{p.sellingPrice}
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    <Chip
                      label={`${p.totalStock} units`}
                      size="small"
                      sx={{
                        borderRadius: 0,
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        backgroundColor: p.totalStock <= 5 ? '#FEE2E2' : '#ECFDF5',
                        color: p.totalStock <= 5 ? '#991B1B' : '#065F46',
                      }}
                    />
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    {p.variants?.length ? `${p.variants.length} sizes` : 'Single'}
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    <Chip
                      label={p.isPublished ? 'PUBLISHED' : 'DRAFT'}
                      size="small"
                      sx={{
                        borderRadius: 0,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        backgroundColor: p.isPublished ? '#111' : '#E5E5E0',
                        color: p.isPublished ? '#FFF' : '#333',
                      }}
                    />
                  </Box>

                  <Box component="td" sx={{ py: 1.5, px: 2, textAlign: 'right' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <Tooltip title={p.isPublished ? 'Unpublish (Move to Draft)' : 'Publish to Storefront'}>
                        <IconButton
                          size="small"
                          onClick={() => handleTogglePublish(p)}
                          sx={{
                            color: p.isPublished ? '#16A34A' : '#9CA3AF',
                            '&:hover': { backgroundColor: p.isPublished ? '#ECFDF5' : '#F3F4F6' },
                          }}
                        >
                          {p.isPublished ? <VisibilityOutlinedIcon fontSize="small" /> : <VisibilityOffOutlinedIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Edit Piece (Price, Stock & Details)">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(p)}
                          sx={{
                            color: '#111827',
                            '&:hover': { backgroundColor: '#F3F4F6' },
                          }}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* <Tooltip title="Archive Piece">
                        <IconButton
                          size="small"
                          onClick={() => setArchiveCandidate({ id: p._id, name: p.name })}
                          sx={{
                            color: '#DC2626',
                            '&:hover': { backgroundColor: '#FEE2E2' },
                          }}
                        >
                          <ArchiveOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip> */}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Add Product Dialog */}
      <Dialog
        open={openCreate}
        onClose={() => void handleCloseCreate()}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0, p: { xs: 2, sm: 3 } } } }}
      >
        <DialogTitle sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, px: 0, pt: 0, pb: 2, fontSize: '1.4rem' }}>
          New Catalog Piece
        </DialogTitle>
        <Box component="form" onSubmit={handleCreateSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, px: 0 }}>
            {/* Name & SKU */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
              <TextField
                required
                label="Piece Name *"
                placeholder="e.g. Boxy Oversized Tee"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                size="small"
              />
              <TextField
                required
                label="SKU Identifier *"
                placeholder="e.g. BOXY-123"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                size="small"
              />
            </Box>

            {/* Category & Brand */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                select
                slotProps={{ select: { native: true } }}
                required
                label="Department / Category *"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                size="small"
                helperText="Select storefront category for customer browsing"
              >
                {categories.length === 0 && <option value="">Loading categories...</option>}
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </TextField>

              <TextField
                label="Brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                size="small"
                placeholder="LUXWEAR"
              />
            </Box>

            {/* Description */}
            <TextField
              required
              multiline
              rows={2}
              label="Product Description *"
              placeholder="Crafted with 280 GSM heavy loopback cotton, raw seam accents..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              size="small"
            />

            {/* Pricing */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                required
                type="number"
                label="Selling Price (₹) *"
                placeholder="1200"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                size="small"
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                type="number"
                label="Compare At / Original Price (₹)"
                placeholder="1300"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                size="small"
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Box>

            {/* Sizing & Stock Configuration */}
            <Box sx={{ p: 2, border: `1px solid ${themeColors.border}`, backgroundColor: '#FAFAF8' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.82rem' }}>
                  Sizing & Stock Inventory Breakdown
                </Typography>

                {/* Sizing Mode Toggles */}
                <Box sx={{ display: 'flex', gap: 0.5, border: `1px solid ${themeColors.border}`, p: 0.3, backgroundColor: '#FFFFFF' }}>
                  <Button
                    size="small"
                    onClick={() => setSizingMode('tshirt')}
                    sx={{
                      borderRadius: 0,
                      px: 1.2,
                      py: 0.4,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      backgroundColor: sizingMode === 'tshirt' ? '#121212' : 'transparent',
                      color: sizingMode === 'tshirt' ? '#FFFFFF' : '#666666',
                      '&:hover': { backgroundColor: sizingMode === 'tshirt' ? '#121212' : '#F3F4F6' },
                    }}
                  >
                    T-Shirt (XS - XXL)
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setSizingMode('bottoms')}
                    sx={{
                      borderRadius: 0,
                      px: 1.2,
                      py: 0.4,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      backgroundColor: sizingMode === 'bottoms' ? '#121212' : 'transparent',
                      color: sizingMode === 'bottoms' ? '#FFFFFF' : '#666666',
                      '&:hover': { backgroundColor: sizingMode === 'bottoms' ? '#121212' : '#F3F4F6' },
                    }}
                  >
                    Pants (28 - 36)
                  </Button>
                  {/* <Button
                    size="small"
                    onClick={() => setSizingMode('single')}
                    sx={{
                      borderRadius: 0,
                      px: 1.2,
                      py: 0.4,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      backgroundColor: sizingMode === 'single' ? '#121212' : 'transparent',
                      color: sizingMode === 'single' ? '#FFFFFF' : '#666666',
                      '&:hover': { backgroundColor: sizingMode === 'single' ? '#121212' : '#F3F4F6' },
                    }}
                  >
                    Single Free Size
                  </Button> */}
                </Box>
              </Box>

              {/* T-Shirt XS, S, M, L, XL, XXL Mode */}
              {sizingMode === 'tshirt' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: themeColors.textMuted, fontWeight: 600 }}>
                      Enter unit stock per size. Set 0 for out-of-stock sizes.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.8 }}>
                      <Button size="small" onClick={() => handleFillAllTshirt(2)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +2 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllTshirt(5)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +5 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllTshirt(10)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +10 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllTshirt(0)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, color: '#DC2626' }}>
                        Clear
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, gap: 1.5 }}>
                    {TSHIRT_SIZES.map((size) => (
                      <Box
                        key={size}
                        sx={{
                          border: `1px solid ${themeColors.border}`,
                          backgroundColor: '#FFFFFF',
                          p: 1.2,
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.8,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: '"Syne", sans-serif',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Size {size}
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          placeholder="0"
                          value={tshirtSizes[size]}
                          onChange={(e) => handleTshirtSizeChange(size, e.target.value)}
                          slotProps={{
                            htmlInput: {
                              min: 0,
                              style: { textAlign: 'center', fontWeight: 700, padding: '4px 6px' },
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>

                  {/* Calculated Total Bar */}
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 0.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#065F46', fontWeight: 600 }}>
                      Total Calculated Stock Across Sizes:
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: '#065F46', fontWeight: 800 }}>
                      {calculateTshirtTotal()} units
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Bottoms Mode */}
              {sizingMode === 'bottoms' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: themeColors.textMuted, fontWeight: 600 }}>
                      Enter unit stock per waist size.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.8 }}>
                      <Button size="small" onClick={() => handleFillAllBottoms(5)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +5 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllBottoms(10)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +10 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllBottoms(0)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, color: '#DC2626' }}>
                        Clear
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1.5 }}>
                    {BOTTOM_SIZES.map((size) => (
                      <Box
                        key={size}
                        sx={{
                          border: `1px solid ${themeColors.border}`,
                          backgroundColor: '#FFFFFF',
                          p: 1.2,
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.8,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: '"Syne", sans-serif',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Size {size}
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          placeholder="0"
                          value={bottomSizes[size]}
                          onChange={(e) => handleBottomSizeChange(size, e.target.value)}
                          slotProps={{
                            htmlInput: {
                              min: 0,
                              style: { textAlign: 'center', fontWeight: 700, padding: '4px 6px' },
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>

                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 0.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#065F46', fontWeight: 600 }}>
                      Total Calculated Stock Across Sizes:
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: '#065F46', fontWeight: 800 }}>
                      {calculateBottomTotal()} units
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Single Size Mode */}
              {sizingMode === 'single' && (
                <TextField
                  required
                  type="number"
                  label="Initial Stock Inventory Units *"
                  value={formData.totalStock}
                  onChange={(e) => setFormData({ ...formData, totalStock: e.target.value })}
                  size="small"
                  slotProps={{ htmlInput: { min: 0 } }}
                  helperText="Total units available for this standalone item"
                />
              )}
            </Box>

            {renderImagePicker(createImages, 'create', creating)}
          </DialogContent>
          <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
            <Button
              onClick={() => void handleCloseCreate()}
              disabled={creating || uploadingImages}
              sx={{ borderRadius: 0, px: 3 }}
            >
              Cancel
            </Button>
            <AppButton type="submit" loading={creating} disabled={uploadingImages}>
              Save & Publish Piece
            </AppButton>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog
        open={Boolean(editProductCandidate)}
        onClose={() => void handleCloseEdit()}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0, p: 2 } } }}
      >
        <DialogTitle sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
          Edit Piece: {editProductCandidate?.name}
        </DialogTitle>
        <Box component="form" onSubmit={handleEditSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #ECECE8' }}>
              <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                SKU Identifier: <strong>{editProductCandidate?.sku}</strong>
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={editFormData.isPublished}
                    onChange={(e) => setEditFormData({ ...editFormData, isPublished: e.target.checked })}
                    color="primary"
                  />
                }
                label={editFormData.isPublished ? 'PUBLISHED (LIVE)' : 'DRAFT (HIDDEN)'}
                sx={{ '& .MuiTypography-root': { fontWeight: 700, fontSize: '0.75rem' } }}
              />
            </Box>

            <TextField
              required
              label="Piece Name"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              size="small"
            />

            <TextField
              multiline
              rows={2}
              label="Product Description"
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              size="small"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                required
                type="number"
                label="Selling Price (₹)"
                value={editFormData.sellingPrice}
                onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: e.target.value })}
                size="small"
              />
              <TextField
                type="number"
                label="Compare At / Original Price (₹)"
                value={editFormData.originalPrice}
                onChange={(e) => setEditFormData({ ...editFormData, originalPrice: e.target.value })}
                size="small"
              />
            </Box>

            {editFormData.variants.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.78rem', color: '#111' }}>
                  Size Variants Inventory & Price
                </Typography>
                {editFormData.variants.map((v, idx) => (
                  <Box
                    key={v.sku}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      backgroundColor: '#FAFAF8',
                      border: '1px solid #E5E5E0',
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ minWidth: 100 }}>
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
                      label={`Price (₹)`}
                      value={v.price}
                      onChange={(e) => handleEditVariantChange(idx, 'price', e.target.value)}
                      sx={{ width: 120 }}
                      slotProps={{ htmlInput: { min: 0 } }}
                    />
                    <TextField
                      required
                      type="number"
                      size="small"
                      label={`Stock (${v.size || ''})`}
                      value={v.stock}
                      onChange={(e) => handleEditVariantChange(idx, 'stock', e.target.value)}
                      sx={{ width: 120 }}
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
                    Total Calculated Stock Across Sizes:
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: '#065F46', fontWeight: 800 }}>
                    {editFormData.totalStock} units
                  </Typography>
                </Box>
              </Box>
            ) : (
              <TextField
                required
                type="number"
                label="Total Stock Inventory"
                value={editFormData.totalStock}
                onChange={(e) => setEditFormData({ ...editFormData, totalStock: e.target.value })}
                size="small"
                slotProps={{ htmlInput: { min: 0 } }}
              />
            )}

            {renderImagePicker(editImages, 'edit', editing)}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => void handleCloseEdit()}
              disabled={editing || uploadingImages}
              sx={{ borderRadius: 0 }}
            >
              Cancel
            </Button>
            <AppButton type="submit" loading={editing} disabled={uploadingImages}>
              Save Changes
            </AppButton>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Custom Confirmation Modal for Archiving */}
      <Dialog
        open={Boolean(archiveCandidate)}
        onClose={() => !archiving && setArchiveCandidate(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              backgroundColor: '#FFFFFF',
              p: 2.5,
              boxShadow: '0 24px 50px rgba(0,0,0,0.22)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: '1.15rem',
            p: 0,
            mb: 1.5,
          }}
        >
          Archive Product
        </DialogTitle>
        <DialogContent sx={{ p: 0, mb: 3 }}>
          <Typography variant="body2" sx={{ color: themeColors.textPrimary, mb: 1, fontSize: '0.9rem' }}>
            Are you sure you want to archive <strong>"{archiveCandidate?.name}"</strong>?
          </Typography>
          <Typography variant="caption" sx={{ color: themeColors.textMuted, display: 'block', lineHeight: 1.4 }}>
            This piece will be unlisted and will no longer be visible to shoppers on the storefront catalog.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 0, gap: 1.5 }}>
          <Button
            onClick={() => setArchiveCandidate(null)}
            disabled={archiving}
            sx={{
              borderRadius: 0,
              color: themeColors.textPrimary,
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.78rem',
              px: 2,
            }}
          >
            Cancel
          </Button>
          <AppButton
            onClick={confirmArchive}
            loading={archiving}
            sx={{
              backgroundColor: '#DC2626',
              '&:hover': { backgroundColor: '#B91C1C' },
              fontSize: '0.78rem',
              px: 2.5,
            }}
          >
            Archive Piece
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminProducts;
