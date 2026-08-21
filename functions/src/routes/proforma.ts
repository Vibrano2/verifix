import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/zodValidation';
import { CreateProformaSchema } from '../models/proforma.model';
import { ProformaController } from '../controllers/proforma.controller';

const router = Router();
const proformaController = new ProformaController();

/**
 * @swagger
 * /api/proforma/submit:
 *   post:
 *     summary: Submit a proforma invoice (Artisan only)
 *     tags: [Proforma]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, validate(CreateProformaSchema), (req, res) => 
  proformaController.submitProforma(req, res)
);
router.post('/submit', authenticate, validate(CreateProformaSchema), (req, res) => 
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
router.get('/job/:jobId', authenticate, (req, res) => 
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
router.put(['/:id/status', '/:id/review'], authenticate, async (req: any, res) => {
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
