import { Router } from 'express';
import { PermissionKey } from '../../config/constants';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { listAuditLogs } from './audit.controller';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(PermissionKey.AUDIT_LOGS_READ), listAuditLogs);

export default router;
