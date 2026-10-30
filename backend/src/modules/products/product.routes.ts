import { Router } from 'express';
import { PermissionKey } from '../../config/constants';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import {
  archiveProduct,
  createProduct,
  getAdminProducts,
  getProductBySlug,
  listProducts,
  updateProduct,
} from './product.controller';

const router = Router();

// Public catalog routes
router.get('/', listProducts);
router.get('/:slug', getProductBySlug);

// Admin catalog routes
router.get(
  '/admin/all',
  authenticate,
  requirePermission(PermissionKey.PRODUCTS_READ),
  getAdminProducts
);

// Create product (both POST / and POST /admin/create)
router.post(
  '/',
  authenticate,
  requirePermission(PermissionKey.PRODUCTS_CREATE),
  createProduct
);
router.post(
  '/admin/create',
  authenticate,
  requirePermission(PermissionKey.PRODUCTS_CREATE),
  createProduct
);

// Update product (both PATCH /:id and PATCH /admin/:id)
router.patch(
  '/:id',
  authenticate,
  requirePermission(PermissionKey.PRODUCTS_UPDATE),
  updateProduct
);
router.patch(
  '/admin/:id',
  authenticate,
  requirePermission(PermissionKey.PRODUCTS_UPDATE),
  updateProduct
);

// Archive / Delete product (DELETE /:id, DELETE /admin/:id, DELETE /admin/:id/archive)
router.delete(
  '/:id',
  authenticate,
  requirePermission(PermissionKey.PRODUCTS_ARCHIVE),
  archiveProduct
);
router.delete(
  '/admin/:id',
  authenticate,
  requirePermission(PermissionKey.PRODUCTS_ARCHIVE),
  archiveProduct
);
router.delete(
  '/admin/:id/archive',
  authenticate,
  requirePermission(PermissionKey.PRODUCTS_ARCHIVE),
  archiveProduct
);

export default router;
