import { Router } from 'express';
import { PermissionKey } from '../../config/constants';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import {
  createCategory,
  deleteCategory,
  getCategoryBySlug,
  getCategoryTree,
  listCategories,
  updateCategory,
} from './category.controller';

const router = Router();

// Public routes
router.get('/', optionalAuthenticate, listCategories);
router.get('/tree', getCategoryTree);
router.get('/:slug', getCategoryBySlug);

// Admin routes
router.post('/', authenticate, requirePermission(PermissionKey.CATEGORIES_MANAGE), createCategory);
router.patch('/:id', authenticate, requirePermission(PermissionKey.CATEGORIES_MANAGE), updateCategory);
router.delete('/:id', authenticate, requirePermission(PermissionKey.CATEGORIES_MANAGE), deleteCategory);

export default router;
