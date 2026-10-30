import { Router } from 'express';
import { PermissionKey, UserRole } from '../../config/constants';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission, requireRole } from '../../middleware/rbac.middleware';
import {
  createAdminUser,
  listAdminUsers,
  listCustomers,
  updateAdminPermissions,
} from './user.controller';

const router = Router();

router.use(authenticate);

// Super Admin only routes for managing admins
router.get('/admins', requireRole(UserRole.SUPER_ADMIN), listAdminUsers);
router.post('/admins', requireRole(UserRole.SUPER_ADMIN), createAdminUser);
router.patch('/admins/:id/permissions', requireRole(UserRole.SUPER_ADMIN), updateAdminPermissions);

// Customer list for operational staff (Admin with customers.read permission or Super Admin)
router.get('/customers', requirePermission(PermissionKey.CUSTOMERS_READ), listCustomers);

export default router;
