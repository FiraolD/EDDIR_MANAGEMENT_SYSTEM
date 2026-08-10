// backend/src/api/v1/transactions.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import {
    getTransactions,
    getTransactionById,
    getTransactionStats,
    exportTransactions,
    reconcileTransactions,
} from '../../modules/transactions/transactions.controller';

const router = Router();

// All transaction routes require authentication
router.use(authenticate);

// Get transactions (with optional filters)
router.get(
    '/',
    authorize('super_admin', 'org_admin', 'finance'),
    getTransactions
);

// Get transaction statistics
router.get(
    '/stats',
    authorize('super_admin', 'org_admin', 'finance'),
    getTransactionStats
);

// Export transactions as CSV
router.get(
    '/export',
    authorize('super_admin', 'org_admin', 'finance'),
    exportTransactions
);

// Get a single transaction by ID
router.get(
    '/:id',
    authorize('super_admin', 'org_admin', 'finance'),
    getTransactionById
);

// Reconcile transactions (finance only)
router.post(
    '/reconcile',
    authorize('finance', 'super_admin'),
    reconcileTransactions
);

export default router;