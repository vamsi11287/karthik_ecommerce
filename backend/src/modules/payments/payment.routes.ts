import { Router } from 'express';
import { PermissionKey } from '../../config/constants';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import {
  executeOrderRefund,
  handleRazorpayWebhook,
  verifyRazorpayPayment,
} from './payment.controller';

const router = Router();

// Verify client payment signature
router.post('/razorpay/verify', authenticate, verifyRazorpayPayment);

// Razorpay webhook endpoint (No authentication, verified via webhook signature)
router.post('/razorpay/webhook', handleRazorpayWebhook);

// Refund execution (Super Admin or authorized Admin with refunds.execute)
router.post(
  '/:orderId/refund',
  authenticate,
  requirePermission(PermissionKey.REFUNDS_EXECUTE),
  executeOrderRefund
);

export default router;
