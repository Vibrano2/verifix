import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/zodValidation';
import { CreateProformaSchema } from '../models/proforma.model';
import { ProformaController } from '../controllers/proforma.controller';

const router = Router();
const proformaController = new ProformaController();

/**
 * @swagger
 * /api/proforma:
 *   post:
 *     summary: Submit a proforma invoice (Artisan only)
 *     tags: [Proforma]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProformaDTO'
 *     responses:
 *       201:
 *         description: Proforma submitted
 *       403:
 *         description: Forbidden (Not artisan or not matched to job)
 */
router.post('/', authenticate, validate(CreateProformaSchema), (req, res) => 
  proformaController.submitProforma(req, res)
);

/**
 * @swagger
 * /api/proforma/job/{jobId}:
 *   get:
 *     summary: Get all proforma invoices for a job
 *     tags: [Proforma]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of proforma invoices
 *       403:
 *         description: Forbidden
 */
router.get('/job/:jobId', authenticate, (req, res) => 
  proformaController.getJobProformas(req, res)
);

export default router;
