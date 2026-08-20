import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/zodValidation';
import { CreateJobSchema } from '../models/job.model';
import { JobController } from '../controllers';

const router = Router();
const jobController = new JobController();

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, validate(CreateJobSchema), (req, res) => 
  jobController.createJob(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job details
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, (req, res) => 
  jobController.getJob(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}/matches:
 *   get:
 *     summary: Get matching artisans for a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/matches', authenticate, (req, res) => 
  jobController.getMatches(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}/complete:
 *   post:
 *     summary: Mark job complete + submit rating
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/complete', authenticate, (req, res) => 
  jobController.markComplete(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}/dispute:
 *   post:
 *     summary: Raise a dispute for a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/dispute', authenticate, (req, res) => 
  jobController.disputeJob(req, res)
);

export default router;
