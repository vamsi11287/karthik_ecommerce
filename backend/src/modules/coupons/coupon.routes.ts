import { Router } from 'express';
import { PermissionKey } from '../../config/constants';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
  validateCoupon,
} from './coupon.controller';

const router = Router();

// Customer checkout coupon validation - requires authentication
router.post('/validate', authenticate, validateCoupon);

// Admin coupon management
router.get('/', authenticate, requirePermission(PermissionKey.COUPONS_MANAGE), listCoupons);
router.post('/', authenticate, requirePermission(PermissionKey.COUPONS_MANAGE), createCoupon);
router.patch('/:id', authenticate, requirePermission(PermissionKey.COUPONS_MANAGE), updateCoupon);
router.delete('/:id', authenticate, requirePermission(PermissionKey.COUPONS_MANAGE), deleteCoupon);

export default router;
