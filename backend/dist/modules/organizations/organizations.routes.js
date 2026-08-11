"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const organizations_controller_1 = require("./organizations.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Organization management routes (super admin only, except for assigned orgs)
router.get('/', (0, auth_1.authorize)('super_admin', 'org_admin'), organizations_controller_1.getOrganizations);
router.get('/:id', (0, auth_1.authorize)('super_admin', 'org_admin'), organizations_controller_1.getOrganizationById);
router.post('/', (0, auth_1.authorize)('super_admin'), organizations_controller_1.createOrganization);
router.put('/:id', (0, auth_1.authorize)('super_admin', 'org_admin'), organizations_controller_1.updateOrganization);
router.delete('/:id', (0, auth_1.authorize)('super_admin'), organizations_controller_1.deleteOrganization);
router.put('/:id/status', (0, auth_1.authorize)('super_admin'), organizations_controller_1.updateOrganizationStatus);
router.post('/:id/assign-leader', (0, auth_1.authorize)('super_admin', 'org_admin'), organizations_controller_1.assignLeader);
router.get('/:id/stats', (0, auth_1.authorize)('super_admin', 'org_admin'), organizations_controller_1.getOrganizationStats);
router.get('/:id/members', (0, auth_1.authorize)('super_admin', 'org_admin'), organizations_controller_1.getOrganizationMembers);
exports.default = router;
