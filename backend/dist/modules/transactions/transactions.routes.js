"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/api/v1/transactions.routes.ts
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const transactions_controller_1 = require("../../modules/transactions/transactions.controller");
const router = (0, express_1.Router)();
// All transaction routes require authentication
router.use(auth_1.authenticate);
// Get transactions (with optional filters)
router.get('/', (0, auth_1.authorize)('super_admin', 'org_admin', 'finance'), transactions_controller_1.getTransactions);
// Get transaction statistics
router.get('/stats', (0, auth_1.authorize)('super_admin', 'org_admin', 'finance'), transactions_controller_1.getTransactionStats);
// Export transactions as CSV
router.get('/export', (0, auth_1.authorize)('super_admin', 'org_admin', 'finance'), transactions_controller_1.exportTransactions);
// Get a single transaction by ID
router.get('/:id', (0, auth_1.authorize)('super_admin', 'org_admin', 'finance'), transactions_controller_1.getTransactionById);
// Reconcile transactions (finance only)
router.post('/reconcile', (0, auth_1.authorize)('finance', 'super_admin'), transactions_controller_1.reconcileTransactions);
exports.default = router;
