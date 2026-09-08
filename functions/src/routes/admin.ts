import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AdminController } from '../controllers';
import { validate } from '../middleware/zodValidation';

const router = Router();
const adminController = new AdminController();
const uidParamsSchema = z.object({
  params: z.object({ uid: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).strict()
});
const rejectArtisanSchema = z.object({
  params: z.object({ uid: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).strict(),
  body: z.object({ reason: z.string().trim().min(3).max(1000) }).strict()
});
const proformaApproveSchema = z.object({
  params: z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).strict(),
  body: z.object({
    supplier_recipient_code: z.string().regex(/^RCP_[A-Za-z0-9]+$/),
    notes: z.string().trim().max(1000).optional()
  }).strict()
});
const proformaRejectSchema = z.object({
  params: z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).strict(),
  body: z.object({ reason: z.string().trim().min(3).max(1000) }).strict()
});
const queueQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).max(10_000).optional()
  }).strict()
});

/**
 * GET /api/admin/stats
 * Dashboard summary statistics
 */
router.get('/stats', authenticate, requireAdmin, (req, res) => 
  adminController.getStatistics(req, res)
);

/**
 * GET /api/admin/analytics
 * Dashboard metrics: users, jobs, matches, revenue, no-response rate
 */
router.get('/analytics', authenticate, requireAdmin, (req, res) => 
  adminController.getAnalytics(req, res)
);

/**
 * GET /api/admin/verification-queue
 * GET /api/admin/queue/artisans
 * List all unverified artisans
 */
router.get('/verification-queue', authenticate, requireAdmin, validate(queueQuerySchema), (req, res) =>
  adminController.getVerificationQueue(req, res)
);
router.get('/queue/artisans', authenticate, requireAdmin, validate(queueQuerySchema), (req, res) =>
  adminController.getVerificationQueue(req, res)
);

/**
 * GET /api/admin/flags
 * List artisan profiles with no-response flags
 */
router.get('/flags', authenticate, requireAdmin, (req, res) => 
  adminController.getFlags(req, res)
);

/**
 * POST /api/admin/verify/:uid
 * PUT /api/admin/verify/artisan/:uid
 * Verify an artisan
 */
router.post('/verify/:uid', authenticate, requireAdmin, validate(uidParamsSchema), (req, res) =>
  adminController.verifyArtisan(req, res)
);
router.put('/verify/artisan/:uid', authenticate, requireAdmin, validate(uidParamsSchema), (req, res) =>
  adminController.verifyArtisan(req, res)
);
router.post('/verify/artisan/:uid', authenticate, requireAdmin, validate(uidParamsSchema), (req, res) =>
  adminController.verifyArtisan(req, res)
);

/**
 * POST /api/admin/reject/:uid
 * Reject an artisan verification
 */
router.post('/reject/:uid', authenticate, requireAdmin, validate(rejectArtisanSchema), (req, res) =>
  adminController.rejectArtisan(req, res)
);

/**
 * GET /api/admin/proforma-queue
 * GET /api/admin/queue/proformas
 * Get pending proforma invoices
 */
router.get('/proforma-queue', authenticate, requireAdmin, (req, res) => 
  adminController.getProformaQueue(req, res)
);
router.get('/queue/proformas', authenticate, requireAdmin, (req, res) => 
  adminController.getProformaQueue(req, res)
);

/**
 * POST /api/admin/proforma/:id/approve
 * Approve a proforma invoice and trigger partial escrow release
 */
router.post('/proforma/:id/approve', authenticate, requireAdmin, validate(proformaApproveSchema), (req, res) =>
  adminController.approveProforma(req, res)
);

/**
 * POST /api/admin/proforma/:id/reject
 * Reject a proforma invoice
 */
router.post('/proforma/:id/reject', authenticate, requireAdmin, validate(proformaRejectSchema), (req, res) =>
  adminController.rejectProforma(req, res)
);

export default router;
