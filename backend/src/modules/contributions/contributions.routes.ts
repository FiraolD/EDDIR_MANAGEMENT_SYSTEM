import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import {
  getContributions,
  getContributionById,
  createContribution,
  updateContribution,
  deleteContribution,
  getContributionStats,
  reconcileContributions,
  exportContributions,
} from './contributions.controller';

const router = Router();

router.get('/', authenticate, authorize('admin', 'org_admin', 'edir_leader'), getContributions);
router.get('/stats', authenticate, authorize('admin', 'org_admin', 'leader'), getContributionStats);
router.get('/export', authenticate, authorize('admin', 'org_admin', 'leader'), exportContributions);
router.get('/:id', authenticate, getContributionById);
router.post('/', authenticate, authorize('admin', 'org_admin', 'leader'), createContribution);
router.put('/:id', authenticate, authorize('admin', 'org_admin', 'leader'), updateContribution);
router.delete('/:id', authenticate, authorize('admin', 'org_admin'), deleteContribution);
router.post('/reconcile', authenticate, authorize('finance', 'super_admin'), reconcileContributions);

export default router;