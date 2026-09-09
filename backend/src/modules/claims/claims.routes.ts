import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../../middleware/auth';
import {
    getClaims,
    getClaimById,
    createClaim,
    advanceClaim,
    payClaim,
    updateClaimStatus,
    deleteClaim,
    getClaimStats,
    exportClaims,
} from '../../modules/claims/claims.controller';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/claims/');
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
        }
    }
});

// All claim routes require authentication
router.use(authenticate);

// Get claims with filters
router.get(
    '/',
    authorize('super_admin', 'org_admin', 'edir_leader', 'finance_approver', 'finance_processor', 'finance_recon', 'finance_auditor'),
    getClaims
);

// Get claim statistics
router.get(
    '/stats',
    authorize('super_admin', 'org_admin', 'finance_approver', 'finance_processor', 'finance_recon', 'finance_auditor'),
    getClaimStats
);

// Export claims as CSV
router.get(
    '/export',
    authorize('super_admin', 'org_admin', 'finance'),
    exportClaims
);

// Get a single claim by ID
router.get(
    '/:id',
    authorize('super_admin', 'org_admin', 'edir_leader', 'finance_approver', 'finance_processor', 'finance_recon', 'finance_auditor'),
    getClaimById
);

// Create a new claim with file upload – only Edir Leaders and above
router.post(
    '/',
    authorize('super_admin', 'org_admin', 'edir_leader'),
    upload.single('death_certificate') as any,
    createClaim
);

// Advance a claim to the next status
router.put(
    '/:id/advance',
    authorize('super_admin', 'org_admin', 'edir_leader', 'claims_manager', 'finance_approver', 'finance_processor', 'finance_recon', 'finance_auditor'),
    advanceClaim
);

// Mark a claim as paid (Finance or Org Admin)
router.put(
    '/:id/pay',
    authorize('finance', 'super_admin', 'org_admin'),
    payClaim
);

// Update claim status (admin only)
router.put(
    '/:id/status',
    authorize('super_admin', 'org_admin'),
    updateClaimStatus
);

// Delete a claim (admin only)
router.delete(
    '/:id',
    authorize('super_admin', 'org_admin'),
    deleteClaim
);

// Default export
export default router;