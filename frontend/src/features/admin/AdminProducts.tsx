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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
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
  const [editSizingMode, setEditSizingMode] = useState<'tshirt' | 'bottoms' | 'single'>('tshirt');
  const [editTshirtSizes, setEditTshirtSizes] = useState<Record<string, string>>({
    XS: '0',
    S: '0',
    M: '0',
    L: '0',
    XL: '0',
    XXL: '0',
  });
  const [editBottomSizes, setEditBottomSizes] = useState<Record<string, string>>({
    '28': '0',
    '30': '0',
    '32': '0',
    '34': '0',
    '36': '0',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    brand: 'SPUN',
    sellingPrice: '',
    originalPrice: '',
    totalStock: '',
    isPublished: true,
  });
  const [editImages, setEditImages] = useState<ManagedProductImage[]>([]);

  // Categories & Subcategories State
  const [categories, setCategories] = useState<Array<{ _id: string; name: string; slug: string; parentCategory?: any }>>([]);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [openAddCategoryDialog, setOpenAddCategoryDialog] = useState(false);
  const [newCatType, setNewCatType] = useState<'main' | 'sub'>('sub');
  const [newCatParentId, setNewCatParentId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Edit / Delete Category State
  const [editCatCandidate, setEditCatCandidate] = useState<any | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatSubcategories, setEditCatSubcategories] = useState<Array<{ _id: string; name: string; slug: string }>>([]);
  const [newSubcatInput, setNewSubcatInput] = useState('');
  const [savingCatEdit, setSavingCatEdit] = useState(false);
  const [deleteCatCandidate, setDeleteCatCandidate] = useState<{ id: string; name: string; isSub: boolean; subCount?: number } | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  // Derived category lists
  const parentCategories = categories.filter((c: any) => !c.parentCategory);
  const allSubcategories = categories.filter((c: any) => Boolean(c.parentCategory));

  const getSubcategoriesForParent = (parentId: string) => {
    return allSubcategories.filter((c: any) => {
      const pId = typeof c.parentCategory === 'object' ? c.parentCategory?._id : c.parentCategory;
      return pId === parentId;
    });
  };

  const adjustSizingModeForCategory = (catId: string, subId: string, isEdit = false) => {
    const cat = categories.find((c) => c._id === catId);
    const sub = categories.find((c) => c._id === subId);
    const subName = (sub?.name || '').toLowerCase();
    const catSlug = (cat?.slug || '').toLowerCase();

    const targetSetter = isEdit ? setEditSizingMode : setSizingMode;

    if (subName.includes('pant') || subName.includes('trouser') || subName.includes('bottom')) {
      targetSetter('bottoms');
    } else if (
      catSlug === 'others' ||
      subName.includes('electronic') ||
      subName.includes('accessori') ||
      subName.includes('lifestyle') ||
      subName.includes('bag') ||
      subName.includes('cap')
    ) {
      targetSetter('single');
    } else {
      targetSetter('tshirt');
    }
  };

  const handleCategorySelectChange = (newCatId: string, isEdit = false) => {
    const subs = getSubcategoriesForParent(newCatId);
    const newSubId = subs.length > 0 ? subs[0]._id : '';
    if (isEdit) {
      setEditFormData((prev) => ({
        ...prev,
        categoryId: newCatId,
        subcategoryId: newSubId,
      }));
      adjustSizingModeForCategory(newCatId, newSubId, true);
    } else {
      setFormData((prev) => ({
        ...prev,
        categoryId: newCatId,
        subcategoryId: newSubId,
      }));
      adjustSizingModeForCategory(newCatId, newSubId, false);
    }
  };

  const handleSubcategorySelectChange = (newSubId: string, isEdit = false) => {
    if (isEdit) {
      setEditFormData((prev) => ({ ...prev, subcategoryId: newSubId }));
      adjustSizingModeForCategory(editFormData.categoryId, newSubId, true);
    } else {
      setFormData((prev) => ({ ...prev, subcategoryId: newSubId }));
      adjustSizingModeForCategory(formData.categoryId, newSubId);
    }
  };

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
    subcategoryId: '',
    brand: 'SPUN',
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

  const loadCategories = async () => {
    try {
      const res = await storeApi.getCategories();
      const catList = res.data?.data || res.data || [];
      if (Array.isArray(catList)) {
        setCategories(catList);
        const parents = catList.filter((c: any) => !c.parentCategory);
        if (parents.length > 0) {
          const firstParentId = parents[0]._id;
          const subs = catList.filter((c: any) => {
            const pId = typeof c.parentCategory === 'object' ? c.parentCategory?._id : c.parentCategory;
            return pId === firstParentId;
          });
          setFormData((prev) => ({
            ...prev,
            categoryId: prev.categoryId || firstParentId,
            subcategoryId: prev.subcategoryId || (subs.length > 0 ? subs[0]._id : ''),
          }));
          if (!newCatParentId) {
            setNewCatParentId(firstParentId);
          }
        }
      }
    } catch { }
  };

  useEffect(() => {
    fetchProducts();
    loadCategories();
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
    if (uploadingImages) return;
    const originalPublicIds = new Set(
      normalizeProductImages(editProductCandidate?.images).map((image) => image.publicId).filter(Boolean)
    );
    try {
      await deleteCloudinaryImages(
        editImages.filter((image) => image.publicId && !originalPublicIds.has(image.publicId))
      );
      setEditImages([]);
      setEditProductCandidate(null);
      setEditing(false);
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

  const calculateEditTshirtTotal = () => {
    return TSHIRT_SIZES.reduce(
      (sum, s) => sum + Math.max(0, parseInt(editTshirtSizes[s]) || 0),
      0
    );
  };

  const calculateEditBottomTotal = () => {
    return BOTTOM_SIZES.reduce(
      (sum, s) => sum + Math.max(0, parseInt(editBottomSizes[s]) || 0),
      0
    );
  };

  const handleEditTshirtSizeChange = (size: string, val: string) => {
    setEditTshirtSizes((prev) => ({ ...prev, [size]: val }));
  };

  const handleFillAllEditTshirt = (count: number) => {
    const next: Record<string, string> = {};
    TSHIRT_SIZES.forEach((s) => {
      next[s] = count.toString();
    });
    setEditTshirtSizes(next);
  };

  const handleEditBottomSizeChange = (size: string, val: string) => {
    setEditBottomSizes((prev) => ({ ...prev, [size]: val }));
  };

  const handleFillAllEditBottoms = (count: number) => {
    const next: Record<string, string> = {};
    BOTTOM_SIZES.forEach((s) => {
      next[s] = count.toString();
    });
    setEditBottomSizes(next);
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
        formData.categoryId || (parentCategories.length > 0 ? parentCategories[0]._id : undefined);

      const payload = {
        name: formData.name.trim(),
        slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sku: cleanSku,
        description: formData.description.trim(),
        category: activeCategoryId,
        subcategory: formData.subcategoryId || undefined,
        brand: formData.brand.trim() || 'SPUN',
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
      const firstParent = parentCategories[0]?._id || '';
      const firstSubs = getSubcategoriesForParent(firstParent);
      setFormData({
        name: '',
        sku: '',
        description: '',
        categoryId: firstParent,
        subcategoryId: firstSubs[0]?._id || '',
        brand: 'SPUN',
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

    const catId = typeof p.category === 'object' ? (p.category as any)?._id : p.category || '';
    const subCatId = typeof (p as any).subcategory === 'object' ? (p as any).subcategory?._id : (p as any).subcategory || '';

    // Detect sizing mode from existing variants
    const variantSizes = (p.variants || []).map((v) => (v.size || '').trim());
    const isBottom = variantSizes.some((s) => BOTTOM_SIZES.includes(s));
    const isTshirt = variantSizes.some((s) => TSHIRT_SIZES.includes(s.toUpperCase()));

    let mode: 'tshirt' | 'bottoms' | 'single' = 'single';
    if (isBottom) {
      mode = 'bottoms';
    } else if (isTshirt || p.hasVariants) {
      mode = 'tshirt';
    }

    setEditSizingMode(mode);

    // Populate tshirt sizes
    const tSizes: Record<string, string> = { XS: '0', S: '0', M: '0', L: '0', XL: '0', XXL: '0' };
    (p.variants || []).forEach((v) => {
      const s = (v.size || '').toUpperCase().trim();
      if (tSizes[s] !== undefined) {
        tSizes[s] = (v.stock || 0).toString();
      }
    });
    setEditTshirtSizes(tSizes);

    // Populate bottom sizes
    const bSizes: Record<string, string> = { '28': '0', '30': '0', '32': '0', '34': '0', '36': '0' };
    (p.variants || []).forEach((v) => {
      const s = (v.size || '').trim();
      if (bSizes[s] !== undefined) {
        bSizes[s] = (v.stock || 0).toString();
      }
    });
    setEditBottomSizes(bSizes);

    setEditFormData({
      name: p.name,
      sku: p.sku || '',
      description: p.description || '',
      categoryId: catId,
      subcategoryId: subCatId,
      brand: p.brand || 'SPUN',
      sellingPrice: p.sellingPrice.toString(),
      originalPrice: p.originalPrice ? p.originalPrice.toString() : '',
      totalStock: p.totalStock.toString(),
      isPublished: p.isPublished,
    });
    setEditImages(normalizeProductImages(p.images));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProductCandidate) return;
    setEditing(true);
    try {
      const cleanSku = (editFormData.sku || editProductCandidate.sku || '').trim().toUpperCase();
      let variantsPayload: any[] = [];
      let calculatedTotal = 0;

      if (editSizingMode === 'tshirt') {
        calculatedTotal = calculateEditTshirtTotal();
        variantsPayload = TSHIRT_SIZES.map((size) => ({
          sku: `${cleanSku}-${size}`,
          size,
          price: Number(editFormData.sellingPrice),
          originalPrice: editFormData.originalPrice ? Number(editFormData.originalPrice) : undefined,
          stock: Math.max(0, parseInt(editTshirtSizes[size]) || 0),
        }));
      } else if (editSizingMode === 'bottoms') {
        calculatedTotal = calculateEditBottomTotal();
        variantsPayload = BOTTOM_SIZES.map((size) => ({
          sku: `${cleanSku}-${size}`,
          size,
          price: Number(editFormData.sellingPrice),
          originalPrice: editFormData.originalPrice ? Number(editFormData.originalPrice) : undefined,
          stock: Math.max(0, parseInt(editBottomSizes[size]) || 0),
        }));
      } else {
        calculatedTotal = Number(editFormData.totalStock) || 0;
      }

      const payload: any = {
        name: editFormData.name.trim(),
        sku: cleanSku,
        description: editFormData.description.trim(),
        category: editFormData.categoryId || undefined,
        subcategory: editFormData.subcategoryId || undefined,
        brand: editFormData.brand.trim() || 'SPUN',
        sellingPrice: Number(editFormData.sellingPrice),
        originalPrice: editFormData.originalPrice ? Number(editFormData.originalPrice) : undefined,
        totalStock: calculatedTotal,
        hasVariants: editSizingMode !== 'single',
        variants: variantsPayload,
        isPublished: editFormData.isPublished,
        images: editImages.map((image, index) => ({
          ...image,
          alt: image.alt || editFormData.name.trim(),
          isDefault: index === 0,
        })),
      };

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

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCreatingCategory(true);
    try {
      const isSub = newCatType === 'sub';
      const parentId = isSub ? (newCatParentId || (parentCategories[0]?._id)) : null;
      const parentCat = categories.find((c) => c._id === parentId);
      const parentPrefix = isSub && parentCat ? `${parentCat.slug}-` : '';
      const cleanSlug = `${parentPrefix}${newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

      const res = await storeApi.createCategory({
        name: newCatName.trim(),
        slug: cleanSlug,
        description: newCatDesc.trim() || undefined,
        parentCategory: isSub ? parentId : null,
      });

      const created = res.data?.data || res.data;
      dispatch(showToast({ message: `${isSub ? 'Subcategory' : 'Category'} "${newCatName}" created successfully!`, severity: 'success' }));

      await loadCategories();

      if (isSub) {
        setFormData((prev) => ({
          ...prev,
          categoryId: parentId || prev.categoryId,
          subcategoryId: created?._id || prev.subcategoryId,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          categoryId: created?._id || prev.categoryId,
        }));
      }

      setOpenAddCategoryDialog(false);
      setNewCatName('');
      setNewCatDesc('');
      setCategoriesExpanded(true);
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to create category', severity: 'error' }));
    } finally {
      setCreatingCategory(false);
    }
  };

  // Open Category Edit Dialog with Subcategory Management
  const handleOpenEditCategory = (cat: any) => {
    setEditCatCandidate(cat);
    setEditCatName(cat.name);
    setEditCatSubcategories(getSubcategoriesForParent(cat._id));
    setNewSubcatInput('');
  };

  // Remove a subcategory during edit
  const handleRemoveSubcategoryFromEdit = async (subId: string, subName: string) => {
    try {
      await storeApi.deleteCategory(subId);
      setEditCatSubcategories((prev) => prev.filter((s) => s._id !== subId));
      await loadCategories();
      dispatch(showToast({ message: `Subcategory "${subName}" deleted successfully`, severity: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to delete subcategory', severity: 'error' }));
    }
  };

  // Add a new subcategory during edit
  const handleAddSubcategoryInEdit = async () => {
    if (!newSubcatInput.trim() || !editCatCandidate) return;
    const name = newSubcatInput.trim();
    const parentCat = editCatCandidate;
    const cleanSlug = `${parentCat.slug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

    try {
      const res = await storeApi.createCategory({
        name,
        slug: cleanSlug,
        parentCategory: parentCat._id,
      });
      const created = res.data?.data || res.data;
      setEditCatSubcategories((prev) => [...prev, created]);
      setNewSubcatInput('');
      await loadCategories();
      dispatch(showToast({ message: `Subcategory "${name}" added to ${parentCat.name}!`, severity: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to add subcategory', severity: 'error' }));
    }
  };

  // Save changes to Category Name
  const handleSaveEditCategory = async () => {
    if (!editCatCandidate || !editCatName.trim()) return;
    setSavingCatEdit(true);
    try {
      await storeApi.updateCategory(editCatCandidate._id, {
        name: editCatName.trim(),
      });
      dispatch(showToast({ message: `Category "${editCatName}" updated successfully!`, severity: 'success' }));
      await loadCategories();
      setEditCatCandidate(null);
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to update category', severity: 'error' }));
    } finally {
      setSavingCatEdit(false);
    }
  };

  // Confirm delete category
  const handleConfirmDeleteCategory = async () => {
    if (!deleteCatCandidate) return;
    setDeletingCat(true);
    try {
      await storeApi.deleteCategory(deleteCatCandidate.id);
      dispatch(showToast({ message: `Deleted category "${deleteCatCandidate.name}" and all subcategories!`, severity: 'success' }));
      await loadCategories();
      setDeleteCatCandidate(null);
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Failed to delete category', severity: 'error' }));
    } finally {
      setDeletingCat(false);
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

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            onClick={() => setOpenAddCategoryDialog(true)}
            variant="outlined"
            startIcon={<CategoryOutlinedIcon sx={{ fontSize: '1.1rem' }} />}
            sx={{
              borderRadius: 0,
              borderColor: themeColors.black,
              color: themeColors.black,
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              px: 2,
              py: 1.8,
              '&:hover': {
                backgroundColor: '#F5F5F0',
                borderColor: themeColors.black,
              },
            }}
          >
            + Create Category (or) Subcategory
          </Button>

          <AppButton onClick={() => setOpenCreate(true)}>
            <AddIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} /> Add Product
          </AppButton>
        </Box>
      </Box>

      {/* Collapsible Categories & Subcategories Directory Table */}
      <Accordion
        expanded={categoriesExpanded}
        onChange={(_, exp) => setCategoriesExpanded(exp)}
        sx={{
          mb: 4,
          borderRadius: '0 !important',
          border: `1px solid ${themeColors.border}`,
          boxShadow: 'none',
          '&:before': { display: 'none' },
          backgroundColor: '#FFFFFF',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            backgroundColor: '#F9F9F6',
            borderBottom: categoriesExpanded ? `1px solid ${themeColors.border}` : 'none',
            py: 1,
            px: 2.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CategoryOutlinedIcon sx={{ fontSize: '1.2rem', color: themeColors.black }} />
              <Typography
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  fontSize: '0.88rem',
                  letterSpacing: '0.04em',
                }}
              >
                Categories & Subcategories Directory ({parentCategories.length} Main Departments, {allSubcategories.length} Subcategories)
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: themeColors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>
              {categoriesExpanded ? 'Hide Directory ▲' : 'View / Manage Categories ▼'}
            </Typography>
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
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
                <Box
                  component="tr"
                  sx={{
                    borderBottom: `2px solid ${themeColors.border}`,
                    backgroundColor: '#FAFAF8',
                    '& th': {
                      py: 1.5,
                      px: 2,
                      fontFamily: '"Syne", sans-serif',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontSize: '0.75rem',
                      color: themeColors.textPrimary,
                    },
                  }}
                >
                  <Box component="th" sx={{ width: '8%' }}>S.No</Box>
                  <Box component="th" sx={{ width: '22%' }}>Category</Box>
                  <Box component="th" sx={{ width: '52%' }}>Subcategories</Box>
                  <Box component="th" sx={{ width: '18%', textAlign: 'right' }}>Actions</Box>
                </Box>
              </Box>

              <Box component="tbody">
                {parentCategories.length === 0 ? (
                  <Box component="tr">
                    <Box component="td" colSpan={4} sx={{ textAlign: 'center', py: 4, color: themeColors.textMuted }}>
                      No categories found. Click "+ Create Category (or) Subcategory" above to add your first category!
                    </Box>
                  </Box>
                ) : (
                  parentCategories.map((cat, idx) => {
                    const subs = getSubcategoriesForParent(cat._id);
                    return (
                      <Box
                        component="tr"
                        key={cat._id}
                        sx={{
                          borderBottom: `1px solid ${themeColors.border}`,
                          '&:hover': { backgroundColor: '#F9F9F7' },
                        }}
                      >
                        <Box component="td" sx={{ py: 1.5, px: 2, fontWeight: 700, color: themeColors.textMuted }}>
                          {idx + 1}
                        </Box>

                        <Box component="td" sx={{ py: 1.5, px: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: themeColors.black }}>
                            {cat.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: themeColors.textMuted, fontFamily: 'monospace' }}>
                            slug: {cat.slug}
                          </Typography>
                        </Box>

                        <Box component="td" sx={{ py: 1.5, px: 2 }}>
                          {subs.length === 0 ? (
                            <Typography variant="caption" sx={{ color: themeColors.textMuted, fontStyle: 'italic' }}>
                              No subcategories yet
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', alignItems: 'center' }}>
                              {subs.map((sub) => (
                                <Chip
                                  key={sub._id}
                                  label={sub.name}
                                  size="small"
                                  onDelete={() =>
                                    setDeleteCatCandidate({
                                      id: sub._id,
                                      name: sub.name,
                                      isSub: true,
                                    })
                                  }
                                  sx={{
                                    borderRadius: 0,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    backgroundColor: '#F3F4F6',
                                    color: '#1F2937',
                                    border: '1px solid #E5E7EB',
                                    '& .MuiChip-deleteIcon': {
                                      fontSize: '0.9rem',
                                      color: '#9CA3AF',
                                      '&:hover': { color: '#EF4444' },
                                    },
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>

                        <Box component="td" sx={{ py: 1.5, px: 2, textAlign: 'right' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <Tooltip title="Edit Category & Manage Subcategories">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditCategory(cat)}
                                sx={{ color: themeColors.black }}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Category & All Subcategories">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setDeleteCatCandidate({
                                    id: cat._id,
                                    name: cat.name,
                                    isSub: false,
                                    subCount: subs.length,
                                  })
                                }
                                sx={{ color: '#DC2626' }}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

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
                          {typeof (p as any).subcategory === 'object' && (p as any).subcategory?.name
                            ? ` • ${(p as any).subcategory.name}`
                            : ''}
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
                label="Piece Name"
                placeholder="e.g. Boxy Oversized Tee"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                size="small"
              />
              <TextField
                required
                label="SKU Identifier"
                placeholder="e.g. BOXY-123"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                size="small"
              />
            </Box>

            {/* Category, Subcategory & Brand Selection */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
              <TextField
                select
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                required
                label="Department / Category"
                value={formData.categoryId}
                onChange={(e) => handleCategorySelectChange(e.target.value)}
                size="small"
                helperText="Men, Women, Others..."
              >
                {parentCategories.length === 0 && <option value="">Loading categories...</option>}
                {parentCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </TextField>

              <TextField
                select
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                required
                label="Subcategory"
                value={formData.subcategoryId}
                onChange={(e) => handleSubcategorySelectChange(e.target.value)}
                size="small"
                helperText="e.g. Shirt, Pant, Kurta"
              >
                {getSubcategoriesForParent(formData.categoryId).length === 0 ? (
                  <option value="">No subcategories available</option>
                ) : (
                  getSubcategoriesForParent(formData.categoryId).map((sc) => (
                    <option key={sc._id} value={sc._id}>
                      {sc.name}
                    </option>
                  ))
                )}
              </TextField>

              <TextField
                label="Brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                size="small"
                placeholder="SPUN"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            {/* Description */}
            <TextField
              required
              multiline
              rows={2}
              label="Product Description"
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
                label="Selling Price (₹)"
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
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 0, p: { xs: 2, sm: 3 } } } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: `1px solid ${themeColors.border}` }}>
          <DialogTitle sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, p: 0, fontSize: '1.4rem' }}>
            Edit Piece: {editProductCandidate?.name}
          </DialogTitle>
          <FormControlLabel
            control={
              <Switch
                checked={editFormData.isPublished}
                onChange={(e) => setEditFormData({ ...editFormData, isPublished: e.target.checked })}
                color="primary"
              />
            }
            label={editFormData.isPublished ? 'PUBLISHED (LIVE)' : 'DRAFT (HIDDEN)'}
            sx={{
              m: 0,
              '& .MuiTypography-root': {
                fontFamily: '"Syne", sans-serif',
                fontWeight: 800,
                fontSize: '0.8rem',
                color: editFormData.isPublished ? '#16A34A' : themeColors.textMuted,
              },
            }}
          />
        </Box>
        <Box component="form" onSubmit={handleEditSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, px: 0, pt: 2.5 }}>
            {/* Name & SKU */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
              <TextField
                required
                label="Piece Name"
                placeholder="e.g. Boxy Oversized Tee"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                size="small"
              />
              <TextField
                required
                disabled
                label="SKU Identifier"
                placeholder="e.g. BOXY-123"
                value={editFormData.sku}
                size="small"
                helperText="SKU identifier cannot be changed"
              />
            </Box>

            {/* Category, Subcategory & Brand Selection */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
              <TextField
                select
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                required
                label="Department / Category"
                value={editFormData.categoryId}
                onChange={(e) => handleCategorySelectChange(e.target.value, true)}
                size="small"
                helperText="Men, Women, Others..."
              >
                {parentCategories.length === 0 && <option value="">Loading categories...</option>}
                {parentCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </TextField>

              <TextField
                select
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                required
                label="Subcategory"
                value={editFormData.subcategoryId}
                onChange={(e) => handleSubcategorySelectChange(e.target.value, true)}
                size="small"
                helperText="e.g. Shirt, Pant, Kurta"
              >
                {getSubcategoriesForParent(editFormData.categoryId).length === 0 ? (
                  <option value="">No subcategories available</option>
                ) : (
                  getSubcategoriesForParent(editFormData.categoryId).map((sc) => (
                    <option key={sc._id} value={sc._id}>
                      {sc.name}
                    </option>
                  ))
                )}
              </TextField>

              <TextField
                label="Brand"
                value={editFormData.brand}
                onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                size="small"
                placeholder="SPUN"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            {/* Description */}
            <TextField
              required
              multiline
              rows={2}
              label="Product Description"
              placeholder="Crafted with 280 GSM heavy loopback cotton, raw seam accents..."
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              size="small"
            />

            {/* Pricing */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                required
                type="number"
                label="Selling Price (₹)"
                placeholder="1200"
                value={editFormData.sellingPrice}
                onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: e.target.value })}
                size="small"
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                type="number"
                label="Compare At / Original Price (₹)"
                placeholder="1300"
                value={editFormData.originalPrice}
                onChange={(e) => setEditFormData({ ...editFormData, originalPrice: e.target.value })}
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
                    onClick={() => setEditSizingMode('tshirt')}
                    sx={{
                      borderRadius: 0,
                      px: 1.2,
                      py: 0.4,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      backgroundColor: editSizingMode === 'tshirt' ? '#121212' : 'transparent',
                      color: editSizingMode === 'tshirt' ? '#FFFFFF' : '#666666',
                      '&:hover': { backgroundColor: editSizingMode === 'tshirt' ? '#121212' : '#F3F4F6' },
                    }}
                  >
                    T-Shirt (XS - XXL)
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setEditSizingMode('bottoms')}
                    sx={{
                      borderRadius: 0,
                      px: 1.2,
                      py: 0.4,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      backgroundColor: editSizingMode === 'bottoms' ? '#121212' : 'transparent',
                      color: editSizingMode === 'bottoms' ? '#FFFFFF' : '#666666',
                      '&:hover': { backgroundColor: editSizingMode === 'bottoms' ? '#121212' : '#F3F4F6' },
                    }}
                  >
                    Pants (28 - 36)
                  </Button>
                </Box>
              </Box>

              {/* T-Shirt XS, S, M, L, XL, XXL Mode */}
              {editSizingMode === 'tshirt' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: themeColors.textMuted, fontWeight: 600 }}>
                      Enter unit stock per size. Set 0 for out-of-stock sizes.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.8 }}>
                      <Button size="small" onClick={() => handleFillAllEditTshirt(2)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +2 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllEditTshirt(5)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +5 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllEditTshirt(10)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +10 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllEditTshirt(0)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, color: '#DC2626' }}>
                        Clear
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, gap: 1.5 }}>
                    {TSHIRT_SIZES.map((size) => (
                      <Box
                        key={size}
                        sx={{
                          p: 1.5,
                          border: '1px solid #E5E5E0',
                          backgroundColor: '#FFFFFF',
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.8 }}>
                          Size {size}
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={editTshirtSizes[size]}
                          onChange={(e) => handleEditTshirtSizeChange(size, e.target.value)}
                          slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', fontWeight: 700 } } }}
                          sx={{ width: '100%' }}
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
                      {calculateEditTshirtTotal()} units
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Pants Mode */}
              {editSizingMode === 'bottoms' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: themeColors.textMuted, fontWeight: 600 }}>
                      Enter unit stock per waist size (inches). Set 0 for out-of-stock sizes.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.8 }}>
                      <Button size="small" onClick={() => handleFillAllEditBottoms(2)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +2 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllEditBottoms(5)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +5 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllEditBottoms(10)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, border: '1px solid #E5E5E0' }}>
                        +10 each
                      </Button>
                      <Button size="small" onClick={() => handleFillAllEditBottoms(0)} sx={{ fontSize: '0.68rem', py: 0.2, px: 0.8, borderRadius: 0, color: '#DC2626' }}>
                        Clear
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1.5 }}>
                    {BOTTOM_SIZES.map((size) => (
                      <Box
                        key={size}
                        sx={{
                          p: 1.5,
                          border: '1px solid #E5E5E0',
                          backgroundColor: '#FFFFFF',
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.8 }}>
                          Size {size}
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={editBottomSizes[size]}
                          onChange={(e) => handleEditBottomSizeChange(size, e.target.value)}
                          slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', fontWeight: 700 } } }}
                          sx={{ width: '100%' }}
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
                      {calculateEditBottomTotal()} units
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Single Size Mode */}
              {editSizingMode === 'single' && (
                <TextField
                  required
                  type="number"
                  label="Initial Stock Inventory Units"
                  value={editFormData.totalStock}
                  onChange={(e) => setEditFormData({ ...editFormData, totalStock: e.target.value })}
                  size="small"
                  slotProps={{ htmlInput: { min: 0 } }}
                  helperText="Total units available for this standalone item"
                />
              )}
            </Box>

            {renderImagePicker(editImages, 'edit', editing)}
          </DialogContent>
          <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
            <Button
              onClick={() => void handleCloseEdit()}
              disabled={editing || uploadingImages}
              sx={{ borderRadius: 0, px: 3 }}
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

      {/* Add New Category / Subcategory Dialog */}
      <Dialog
        open={openAddCategoryDialog}
        onClose={() => setOpenAddCategoryDialog(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              backgroundColor: '#FFFFFF',
              p: 3,
            },
          },
        }}
      >
        <DialogTitle sx={{ p: 0, mb: 2, fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
          CREATE NEW CATEGORY / SUBCATEGORY
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box component="form" onSubmit={handleCreateCategorySubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant={newCatType === 'main' ? 'contained' : 'outlined'}
                onClick={() => setNewCatType('main')}
                size="small"
                sx={{
                  flex: 1,
                  borderRadius: 0,
                  backgroundColor: newCatType === 'main' ? themeColors.black : 'transparent',
                  color: newCatType === 'main' ? '#FFFFFF' : themeColors.black,
                  borderColor: themeColors.black,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                Main Category
              </Button>
              <Button
                variant={newCatType === 'sub' ? 'contained' : 'outlined'}
                onClick={() => setNewCatType('sub')}
                size="small"
                sx={{
                  flex: 1,
                  borderRadius: 0,
                  backgroundColor: newCatType === 'sub' ? themeColors.black : 'transparent',
                  color: newCatType === 'sub' ? '#FFFFFF' : themeColors.black,
                  borderColor: themeColors.black,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                Subcategory
              </Button>
            </Box>

            {newCatType === 'sub' && (
              <TextField
                select
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                required
                label="Parent Main Category"
                value={newCatParentId || (parentCategories[0]?._id || '')}
                onChange={(e) => setNewCatParentId(e.target.value)}
                size="small"
                helperText="Which department does this subcategory belong to?"
              >
                {parentCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </TextField>
            )}

            <TextField
              required
              label={newCatType === 'sub' ? 'Subcategory Name (e.g. Pant, Kurta, Dress)' : 'Main Category Name (e.g. Men, Kids)'}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              size="small"
              autoFocus
              slotProps={{ inputLabel: { shrink: true } }}
              helperText={newCatType === 'sub' ? 'e.g. Pant, Shirt, Kurta, Blazer, Audio' : 'e.g. Men, Women, Others, Unisex'}
            />

            <TextField
              multiline
              rows={2}
              label="Description (Optional)"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <DialogActions sx={{ p: 0, pt: 1, gap: 1 }}>
              <Button
                onClick={() => setOpenAddCategoryDialog(false)}
                sx={{ borderRadius: 0, color: themeColors.textMuted, fontWeight: 700 }}
              >
                Cancel
              </Button>
              <AppButton type="submit" loading={creatingCategory}>
                Save Category
              </AppButton>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Edit Category & Manage Subcategories Dialog */}
      <Dialog
        open={Boolean(editCatCandidate)}
        onClose={() => setEditCatCandidate(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              backgroundColor: '#FFFFFF',
              p: 3,
            },
          },
        }}
      >
        <DialogTitle sx={{ p: 0, mb: 2, fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
          EDIT CATEGORY & MANAGE SUBCATEGORIES
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              required
              fullWidth
              label="Main Category Name"
              value={editCatName}
              onChange={(e) => setEditCatName(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {/* Subcategories Management Section */}
            <Box sx={{ p: 2, border: `1px solid ${themeColors.border}`, backgroundColor: '#FAFAF8' }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  fontSize: '0.8rem',
                  mb: 1.5,
                }}
              >
                Subcategories ({editCatSubcategories.length})
              </Typography>

              {/* Current Subcategory Chips with Remove Option */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, minHeight: 32 }}>
                {editCatSubcategories.length === 0 ? (
                  <Typography variant="caption" sx={{ color: themeColors.textMuted, fontStyle: 'italic' }}>
                    No subcategories currently attached. Add below:
                  </Typography>
                ) : (
                  editCatSubcategories.map((sub) => (
                    <Chip
                      key={sub._id}
                      label={sub.name}
                      onDelete={() => handleRemoveSubcategoryFromEdit(sub._id, sub.name)}
                      sx={{
                        borderRadius: 0,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D5DB',
                        color: '#111827',
                        '& .MuiChip-deleteIcon': {
                          color: '#EF4444',
                          '&:hover': { color: '#B91C1C' },
                        },
                      }}
                    />
                  ))
                )}
              </Box>

              {/* Add New Subcategory Input Row */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Type new subcategory (e.g. Pant, Kurta, Dress, Blazer)..."
                  value={newSubcatInput}
                  onChange={(e) => setNewSubcatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubcategoryInEdit();
                    }
                  }}
                  size="small"
                  sx={{ backgroundColor: '#FFFFFF' }}
                />
                <Button
                  onClick={handleAddSubcategoryInEdit}
                  variant="contained"
                  disabled={!newSubcatInput.trim()}
                  sx={{
                    borderRadius: 0,
                    backgroundColor: themeColors.black,
                    color: '#FFFFFF',
                    fontWeight: 700,
                    px: 1,
                    py:0,
                    textTransform: 'none',
                    '&:hover': { backgroundColor: '#333' },
                  }}
                >
                  + Add
                </Button>
              </Box>
            </Box>

            <DialogActions sx={{ p: 0, pt: 1, gap: 1 }}>
              <Button
                onClick={() => setEditCatCandidate(null)}
                sx={{ borderRadius: 0, color: themeColors.textMuted, fontWeight: 700 }}
              >
                Close
              </Button>
              <AppButton onClick={handleSaveEditCategory} loading={savingCatEdit}>
                Save Changes
              </AppButton>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Category / Subcategory Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteCatCandidate)}
        onClose={() => setDeleteCatCandidate(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              backgroundColor: '#FFFFFF',
              p: 3,
            },
          },
        }}
      >
        <DialogTitle sx={{ p: 0, mb: 1.5, fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
          {deleteCatCandidate?.isSub ? 'DELETE SUBCATEGORY' : 'DELETE CATEGORY'}
        </DialogTitle>
        <DialogContent sx={{ p: 0, mb: 3 }}>
          <Typography variant="body2" sx={{ color: themeColors.textSecondary, lineHeight: 1.6 }}>
            {deleteCatCandidate?.isSub
              ? `Are you sure you want to permanently delete the subcategory "${deleteCatCandidate?.name}"?`
              : `Are you sure you want to permanently delete the category "${deleteCatCandidate?.name}" and all of its ${deleteCatCandidate?.subCount || 0} subcategories? Products assigned to this category will be preserved.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 0, gap: 1 }}>
          <Button
            onClick={() => setDeleteCatCandidate(null)}
            disabled={deletingCat}
            sx={{ borderRadius: 0, color: themeColors.textMuted, fontWeight: 700 }}
          >
            Cancel
          </Button>
          <AppButton
            onClick={handleConfirmDeleteCategory}
            loading={deletingCat}
            sx={{ backgroundColor: '#DC2626', '&:hover': { backgroundColor: '#B91C1C' } }}
          >
            Delete Permanently
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminProducts;
