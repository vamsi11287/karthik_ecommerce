import { Router } from 'express';
import { PermissionKey } from '../../config/constants';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import {
  adjustStock,
  getInventoryTransactions,
  listInventory,
} from './inventory.controller';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(PermissionKey.INVENTORY_READ), listInventory);
router.post('/adjust', requirePermission(PermissionKey.INVENTORY_ADJUST), adjustStock);
router.get('/transactions', requirePermission(PermissionKey.INVENTORY_READ), getInventoryTransactions);

export default router;
