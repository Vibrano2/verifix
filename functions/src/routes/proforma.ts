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

export default router;
