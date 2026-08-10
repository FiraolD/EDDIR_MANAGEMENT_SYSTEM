import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import {
    getOrganizations,
    getOrganizationById,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    updateOrganizationStatus,
    assignLeader,
    getOrganizationStats,
    getOrganizationMembers,
} from './organizations.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Organization management routes (super admin only, except for assigned orgs)
router.get('/', authorize('super_admin', 'org_admin'), getOrganizations);
router.get('/:id', authorize('super_admin', 'org_admin'), getOrganizationById);
router.post('/', authorize('super_admin'), createOrganization);
router.put('/:id', authorize('super_admin', 'org_admin'), updateOrganization);
router.delete('/:id', authorize('super_admin'), deleteOrganization);
router.put('/:id/status', authorize('super_admin'), updateOrganizationStatus);
router.post('/:id/assign-leader', authorize('super_admin', 'org_admin'), assignLeader);
router.get('/:id/stats', authorize('super_admin', 'org_admin'), getOrganizationStats);
router.get('/:id/members', authorize('super_admin', 'org_admin'), getOrganizationMembers);

export default router;