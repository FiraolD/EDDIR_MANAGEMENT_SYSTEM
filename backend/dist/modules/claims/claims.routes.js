"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../../middleware/auth");
const claims_controller_1 = require("../../modules/claims/claims.controller");
const router = (0, express_1.Router)();
// Configure multer for file upload
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/claims/');
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
        }
    }
});
// All claim routes require authentication
router.use(auth_1.authenticate);
// Get claims with filters
router.get('/', (0, auth_1.authorize)('super_admin', 'org_admin', 'edir_leader', 'finance_approver', 'finance_processor', 'finance_recon', 'finance_auditor'), claims_controller_1.getClaims);
// Get claim statistics
router.get('/stats', (0, auth_1.authorize)('super_admin', 'org_admin', 'finance_approver', 'finance_processor', 'finance_recon', 'finance_auditor'), claims_controller_1.getClaimStats);
// Export claims as CSV
router.get('/export', (0, auth_1.authorize)('super_admin', 'org_admin', 'finance'), claims_controller_1.exportClaims);
// Get a single claim by ID
router.get('/:id', (0, auth_1.authorize)('super_admin', 'org_admin', 'edir_leader', 'finance_approver', 'finance_processor', 'finance_recon', 'finance_auditor'), claims_controller_1.getClaimById);
// Create a new claim with file upload – only Edir Leaders and above
router.post('/', (0, auth_1.authorize)('super_admin', 'org_admin', 'edir_leader'), upload.single('death_certificate'), claims_controller_1.createClaim);
// Advance a claim to the next status
router.put('/:id/advance', (0, auth_1.authorize)('super_admin', 'org_admin', 'edir_leader', 'claims_manager', 'finance_approver', 'finance_processor', 'finance_recon', 'finance_auditor'), claims_controller_1.advanceClaim);
// Mark a claim as paid (Finance or Org Admin)
router.put('/:id/pay', (0, auth_1.authorize)('finance', 'super_admin', 'org_admin'), claims_controller_1.payClaim);
// Update claim status (admin only)
router.put('/:id/status', (0, auth_1.authorize)('super_admin', 'org_admin'), claims_controller_1.updateClaimStatus);
// Delete a claim (admin only)
router.delete('/:id', (0, auth_1.authorize)('super_admin', 'org_admin'), claims_controller_1.deleteClaim);
// Default export
exports.default = router;
