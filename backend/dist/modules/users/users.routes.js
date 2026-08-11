"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const users_controller_1 = require("./users.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Get current user's permissions
router.get('/me/permissions', users_controller_1.getUserPermissions);
// User management routes (admin only)
router.get('/', (0, auth_1.authorize)('super_admin', 'org_admin'), users_controller_1.getUsers);
router.get('/:id', (0, auth_1.authorize)('super_admin', 'org_admin'), users_controller_1.getUserById);
router.put('/:id/role', (0, auth_1.authorize)('super_admin'), users_controller_1.updateUserRole);
router.put('/:id/status', (0, auth_1.authorize)('super_admin', 'org_admin'), users_controller_1.updateUserStatus);
router.delete('/:id', (0, auth_1.authorize)('super_admin', 'org_admin'), users_controller_1.deleteUser);
exports.default = router;
