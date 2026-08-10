import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import {
    getUsers,
    getUserById,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    getUserPermissions,
} from './users.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get current user's permissions
router.get('/me/permissions', getUserPermissions);

// User management routes (admin only)
router.get('/', authorize('super_admin', 'org_admin'), getUsers);
router.get('/:id', authorize('super_admin', 'org_admin'), getUserById);
router.put('/:id/role', authorize('super_admin'), updateUserRole);
router.put('/:id/status', authorize('super_admin', 'org_admin'), updateUserStatus);
router.delete('/:id', authorize('super_admin', 'org_admin'), deleteUser);

export default router;