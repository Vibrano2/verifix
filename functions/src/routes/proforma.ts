import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin, requireRole } from '../middleware/auth';
import { validate } from '../middleware/zodValidation';
import { CreateProformaSchema } from '../models/proforma.model';
import { ProformaController } from '../controllers/proforma.controller';

const router = Router();
const proformaController = new ProformaController();
const reviewSchema = z.object({
  params: z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).strict(),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    reason: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(1000).optional(),
    supplier_recipient_code: z.string().regex(/^RCP_[A-Za-z0-9]+$/).optional()
  }).strict().superRefine((data, context) => {
    if (data.status === 'approved' && !data.supplier_recipient_code) {
      context.addIssue({ code: 'custom', path: ['supplier_recipient_code'], message: 'Supplier recipient code is required for approval' });
    }
    if (data.status === 'rejected' && !(data.reason || data.notes)) {
      context.addIssue({ code: 'custom', path: ['reason'], message: 'A rejection reason is required' });
    }
  })
});
const jobParamsSchema = z.object({
  params: z.object({ jobId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).strict()
});

router.post('/upload/:jobId', authenticate, requireRole('artisan'), validate(jobParamsSchema), (req, res) =>
  proformaController.uploadInvoice(req, res)
);

/**
 * @swagger
 * /api/proforma/submit:
 *   post:
 *     summary: Submit a proforma invoice (Artisan only)
 *     tags: [Proforma]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, requireRole('artisan'), validate(CreateProformaSchema), (req, res) =>
  proformaController.submitProforma(req, res)
);
router.post('/submit', authenticate, requireRole('artisan'), validate(CreateProformaSchema), (req, res) =>
  proformaController.submitProforma(req, res)
);

/**
 * @swagger
 * /api/proforma/job/{jobId}:
 *   get:
 *     summary: Get proforma invoices for a specific job
 *     tags: [Proforma]
 *     security:
 *       - bearerAuth: []
 */
router.get('/job/:jobId', authenticate, validate(jobParamsSchema), (req, res) =>
  proformaController.getJobProformas(req, res)
);

/**
 * @swagger
 * /api/proforma/{id}/status:
 *   put:
 *     summary: Update proforma status
 *     tags: [Proforma]
 *     security:
 *       - bearerAuth: []
 */
router.put(['/:id/status', '/:id/review'], authenticate, requireAdmin, validate(reviewSchema), async (req: any, res) => {
  const { status, reason, notes } = req.body;
  const { AdminController } = require('../controllers');
  const adminController = new AdminController();
  if (status === 'approved') {
    return adminController.approveProforma(req, res);
  } else {
    req.body.reason = reason || notes || 'Rejected';
    return adminController.rejectProforma(req, res);
  }
});

export default router;
