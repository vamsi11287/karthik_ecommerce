import { Router } from 'express';
import { PermissionKey, UserRole } from '../../config/constants';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission, requireRole } from '../../middleware/rbac.middleware';
import {
  getAdminSettings,
  getPublicSettings,
  updatePaymentSettings,
  updateStorePolicies,
} from './settings.controller';

const router = Router();

// Public store settings
router.get('/', getPublicSettings);
router.get('/public', getPublicSettings);

// Admin view settings
router.get(
  '/admin',
  authenticate,
  requirePermission(PermissionKey.SETTINGS_PAYMENT_METHODS_READ),
  getAdminSettings
);

// Update payment settings (Super Admin or authorized Admin)
router.patch(
  '/admin/payments',
  authenticate,
  requirePermission(PermissionKey.SETTINGS_PAYMENT_METHODS_MANAGE),
  updatePaymentSettings
);

// Update store policies (Super Admin only)
router.patch(
  '/admin/policies',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN),
  updateStorePolicies
);

export default router;
