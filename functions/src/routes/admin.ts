import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AdminController } from '../controllers';

const router = Router();
const adminController = new AdminController();

/**
 * GET /api/admin/verification-queue
 * List all unverified artisans
 */
router.get('/verification-queue', authenticate, requireAdmin, (req, res) => 
  adminController.getVerificationQueue(req, res)
);
/**
 * POST /api/admin/artisans
 * Manually add and pre-verify an artisan
 */
router.post('/artisans', authenticate, requireAdmin, (req, res) => 
  adminController.createArtisan(req, res)
);

/**
 * POST /api/admin/verify/:uid
 * Verify an artisan
 */
router.post('/verify/:uid', authenticate, requireAdmin, (req, res) => 
  adminController.verifyArtisan(req, res)
);

/**
 * POST /api/admin/reject/:uid
 * Reject an artisan verification
 */
router.post('/reject/:uid', authenticate, requireAdmin, (req, res) => 
  adminController.rejectArtisan(req, res)
);

/**
 * GET /api/admin/stats
 * Get platform statistics
 */
router.get('/stats', authenticate, requireAdmin, (req, res) => 
  adminController.getStatistics(req, res)
);

/**
 * GET /api/admin/analytics
 * Get comprehensive analytics data
 */
router.get('/analytics', authenticate, requireAdmin, (req, res) => 
  adminController.getAnalytics(req, res)
);

/**
 * GET /api/admin/proforma-queue
 * Get pending proforma invoices
 */
router.get('/proforma-queue', authenticate, requireAdmin, (req, res) => 
  adminController.getProformaQueue(req, res)
);

/**
 * POST /api/admin/proforma/:id/approve
 * Approve a proforma invoice and trigger partial escrow release
 */
router.post('/proforma/:id/approve', authenticate, requireAdmin, (req, res) => 
  adminController.approveProforma(req, res)
);

/**
 * POST /api/admin/proforma/:id/reject
 * Reject a proforma invoice
 */
router.post('/proforma/:id/reject', authenticate, requireAdmin, (req, res) => 
  adminController.rejectProforma(req, res)
);

export default router;
