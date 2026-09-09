import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { hasPermission, checkOrganizationAccess } from '../../middleware/rbac';
import {
    getMembers,
    getMemberById,
    createMember,
    updateMember,
    deleteMember,
    updateMemberStatus,
    updateMemberRole,
} from './members.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(checkOrganizationAccess);

// Member routes with permission checks - hasPermission takes 2 arguments: resource and action
router.get('/', hasPermission('member', 'read'), getMembers);
router.get('/:id', hasPermission('member', 'read'), getMemberById);
router.post('/', hasPermission('member', 'create'), createMember);
router.put('/:id', hasPermission('member', 'update'), updateMember);
router.put('/:id/status', hasPermission('member', 'activate'), updateMemberStatus);
router.put('/:id/role', hasPermission('member', 'update'), updateMemberRole);
router.delete('/:id', hasPermission('member', 'delete'), deleteMember);

export default router;