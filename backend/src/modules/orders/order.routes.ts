import { Router } from 'express';
import { PermissionKey } from '../../config/constants';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import {
  cancelOrder,
  getMyOrders,
  getOrderById,
  listAdminOrders,
  requestReturn,
  reviewReturnRequest,
  updateFulfillmentStatus,
} from './order.controller';

const router = Router();

router.use(authenticate);

// Customer endpoints
router.get('/my', getMyOrders);

// Admin endpoints (place before /:id so /admin/all is not matched as an order ID)
router.get('/admin/all', requirePermission(PermissionKey.ORDERS_READ_ALL), listAdminOrders);
router.get('/', requirePermission(PermissionKey.ORDERS_READ_ALL), listAdminOrders);
router.patch('/:id/status', requirePermission(PermissionKey.ORDERS_UPDATE_STATUS), updateFulfillmentStatus);
router.patch('/:id/return-review', requirePermission(PermissionKey.REFUNDS_REVIEW), reviewReturnRequest);

// Specific order by ID
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/return', requestReturn);

export default router;
