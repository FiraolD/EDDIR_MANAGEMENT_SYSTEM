import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { hasPermission, checkOrganizationAccess } from '../../middleware/rbac';
import {
    getMembers,
    getMemberById,
    createMember,
    updateMember,
    deleteMember,
    updateMemberStatus,
    addMemberToOrganization,
    updateMemberRole,
} from './members.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(checkOrganizationAccess);

// Member routes with permission checks
router.get('/', hasPermission('member', 'read'), getMembers);
router.get('/:id', hasPermission('member', 'read'), getMemberById);
router.post('/', hasPermission('member', 'create'), createMember);
router.put('/:id', hasPermission('member', 'update'), updateMember);
router.put('/:id/status', hasPermission('member', 'activate'), updateMemberStatus);
router.delete('/:id', hasPermission('member', 'delete'), deleteMember);
router.post('/organization/:organizationId', authenticate, authorize('super_admin', 'org_admin'), addMemberToOrganization);
router.put('/:id/role', hasPermission('member', 'update'), updateMemberRole);  // Add this line
router.get('/', authorize('super_admin', 'org_admin', 'edir_leader'), getMembers);
router.get('/:id', authorize('super_admin', 'org_admin', 'edir_leader'), getMemberById);
router.post('/', authorize('super_admin', 'org_admin'), createMember);
router.put('/:id', authorize('super_admin', 'org_admin'), updateMember);
router.put('/:id/status', authorize('super_admin', 'org_admin'), updateMemberStatus);
router.put('/:id/role', authorize('super_admin'), updateMemberRole);  // Add this line
router.delete('/:id', authorize('super_admin', 'org_admin'), deleteMember);

export default router;