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

export default router;
