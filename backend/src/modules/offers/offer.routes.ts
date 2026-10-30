import { Router } from 'express';
import { PermissionKey } from '../../config/constants';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import {
  createOffer,
  deleteOffer,
  getActiveOffers,
  listAllOffers,
  updateOffer,
} from './offer.controller';

const router = Router();

// Public active banners
router.get('/active', getActiveOffers);

// Admin management
router.get('/', authenticate, requirePermission(PermissionKey.OFFERS_MANAGE), listAllOffers);
router.post('/', authenticate, requirePermission(PermissionKey.OFFERS_MANAGE), createOffer);
router.patch('/:id', authenticate, requirePermission(PermissionKey.OFFERS_MANAGE), updateOffer);
router.delete('/:id', authenticate, requirePermission(PermissionKey.OFFERS_MANAGE), deleteOffer);

export default router;
