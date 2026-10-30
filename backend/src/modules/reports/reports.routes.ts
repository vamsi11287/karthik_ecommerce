import { Router } from 'express';
import { PermissionKey } from '../../config/constants';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { getDashboardMetrics, getSalesReport } from './reports.controller';

const router = Router();

router.use(authenticate);

router.get('/dashboard', requirePermission(PermissionKey.REPORTS_READ), getDashboardMetrics);
router.get('/sales', requirePermission(PermissionKey.REPORTS_FINANCIAL_READ), getSalesReport);

export default router;
