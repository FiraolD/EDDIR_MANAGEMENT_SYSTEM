"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const dashboard_controller_1 = require("./dashboard.controller");
const router = (0, express_1.Router)();
// ✅ Allow all authenticated roles that need dashboard access
router.get('/stats', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'org_admin', 'edir_leader', 'finance'), dashboard_controller_1.getDashboardStats);
exports.default = router;
