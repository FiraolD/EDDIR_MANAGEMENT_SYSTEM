"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const members_controller_1 = require("./members.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
router.use(rbac_1.checkOrganizationAccess);
// Member routes with permission checks - hasPermission takes 2 arguments: resource and action
router.get('/', (0, rbac_1.hasPermission)('member', 'read'), members_controller_1.getMembers);
router.get('/:id', (0, rbac_1.hasPermission)('member', 'read'), members_controller_1.getMemberById);
router.post('/', (0, rbac_1.hasPermission)('member', 'create'), members_controller_1.createMember);
router.put('/:id', (0, rbac_1.hasPermission)('member', 'update'), members_controller_1.updateMember);
router.put('/:id/status', (0, rbac_1.hasPermission)('member', 'activate'), members_controller_1.updateMemberStatus);
router.put('/:id/role', (0, rbac_1.hasPermission)('member', 'update'), members_controller_1.updateMemberRole);
router.delete('/:id', (0, rbac_1.hasPermission)('member', 'delete'), members_controller_1.deleteMember);
exports.default = router;
