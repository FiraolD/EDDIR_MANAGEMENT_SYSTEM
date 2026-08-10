import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { getDashboardStats } from './dashboard.controller';

const router = Router();

// ✅ Allow all authenticated roles that need dashboard access
router.get(
    '/stats',
    authenticate,
    authorize('super_admin', 'org_admin', 'edir_leader', 'finance'),
    getDashboardStats
);

export default router;