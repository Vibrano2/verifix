import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/zodValidation';
import { CreateJobSchema, UpdateJobSchema } from '../models/job.model';
import { CreateProformaSchema } from '../models/proforma.model';
import { JobController } from '../controllers';
import { createHash } from 'crypto';

const router = Router();
const jobController = new JobController();

const selectArtisanSchema = z.object({
  body: z.object({ artisan_id: z.string().min(1).max(128) }).strict()
});
const completeJobSchema = z.object({
  body: z.object({
    match_id: z.string().min(1).max(128).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    review: z.string().trim().max(1000).optional()
  }).strict()
});
const disputeSchema = z.object({
  body: z.object({ reason: z.string().trim().min(5).max(2000) }).strict()
});
const idParamsSchema = z.object({
  params: z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).strict()
});
const clientParamsSchema = z.object({
  params: z.object({ clientUid: z.string().min(1).max(128) }).strict()
});
const listJobsSchema = z.object({
  query: z.object({
    trade: z.string().trim().min(1).max(100).optional(),
    location: z.string().trim().min(1).max(100).optional(),
    status: z.enum(['open', 'matched', 'in_progress', 'completed', 'cancelled', 'refund_pending', 'refunded', 'disputed', 'payout_issue']).optional(),
    urgency: z.enum(['Today', 'This Week', 'Flexible']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).max(10_000).optional()
  }).strict()
});

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, requireRole('client'), validate(CreateJobSchema), (req, res) =>
  jobController.createJob(req, res)
);

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List jobs
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, validate(listJobsSchema), (req, res) =>
  jobController.listJobs(req, res)
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
router.get('/:id', authenticate, validate(idParamsSchema), (req, res) =>
  jobController.getJob(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}:
 *   patch:
 *     summary: Update job details
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', authenticate, requireRole('client'), validate(idParamsSchema), validate(UpdateJobSchema), (req, res) =>
  jobController.updateJob(req, res)
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
router.get('/:id/matches', authenticate, validate(idParamsSchema), (req, res) =>
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
router.post(['/:id/complete', '/:id/reviews'], authenticate, requireRole('client'), validate(idParamsSchema), validate(completeJobSchema), (req, res) =>
  jobController.markComplete(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}/status:
 *   put:
 *     summary: Update job status
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/proforma', authenticate, requireRole('artisan'), validate(idParamsSchema), (req: any, _res, next) => {
  req.body.job_id = req.params.id;
  next();
}, validate(CreateProformaSchema), (req: any, res) => {
  const { ProformaController } = require('../controllers/proforma.controller');
  const proformaController = new ProformaController();
  return proformaController.submitProforma(req, res);
});

/**
 * @swagger
 * /api/jobs/{id}/dispute:
 *   post:
 *     summary: Raise a dispute for a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/dispute', authenticate, validate(idParamsSchema), validate(disputeSchema), (req, res) =>
  jobController.disputeJob(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}/match:
 *   post:
 *     summary: Match artisans for a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/match', authenticate, requireRole('client'), validate(idParamsSchema), (req, res) =>
  jobController.matchArtisans(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}/select-artisan:
 *   post:
 *     summary: Select an artisan for a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/select-artisan', authenticate, requireRole('client'), validate(idParamsSchema), validate(selectArtisanSchema), (req, res) =>
  jobController.selectArtisan(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}/tracking/start:
 *   post:
 *     summary: Start live tracking for job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/tracking/start', authenticate, requireRole('artisan'), validate(idParamsSchema), (req, res) =>
  jobController.startTracking(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}/tracking/arrive:
 *   post:
 *     summary: Mark artisan arrived at job location
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/tracking/arrive', authenticate, requireRole('artisan'), validate(idParamsSchema), (req, res) =>
  jobController.arriveTracking(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}/notify-me:
 *   post:
 *     summary: Register client interest when no artisans available (C-007)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/notify-me', authenticate, requireRole('client'), validate(idParamsSchema), async (req: any, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id: jobId } = req.params;
    const db = require('firebase-admin').firestore();

    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) { res.status(404).json({ error: 'Job not found' }); return; }
    if (jobDoc.data().client_uid !== req.user.uid) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const requestId = createHash('sha256').update(`${jobId}:${req.user.uid}`).digest('hex');
    const requestRef = db.collection('notify_me_requests').doc(requestId);
    let created = false;
    await db.runTransaction(async (transaction: any) => {
      const existing = await transaction.get(requestRef);
      if (!existing.exists) {
        transaction.create(requestRef, {
          job_id: jobId,
          client_uid: req.user.uid,
          trade: jobDoc.data().trade_needed || jobDoc.data().trade,
          created_at: require('firebase-admin').firestore.FieldValue.serverTimestamp()
        });
        created = true;
      }
    });
    if (created) {
      const { AnalyticsService } = require('../services/analytics.service');
      await new AnalyticsService().trackEvent('notify_me_registered', req.user.uid, {
        job_id: jobId
      }).catch(() => {});
    }

    res.status(200).json({ success: true, message: 'You will be notified when an artisan becomes available' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to register notify me request' });
  }
});

/**
 * @swagger
 * /api/jobs/{id}/cancel:
 *   post:
 *     summary: Cancel a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/cancel', authenticate, requireRole('client'), validate(idParamsSchema), (req, res) =>
  jobController.cancelJob(req, res)
);

/**
 * @swagger
 * /api/jobs/client/{clientUid}:
 *   get:
 *     summary: Get jobs posted by client
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/client/:clientUid', authenticate, validate(clientParamsSchema), (req, res) =>
  jobController.getClientJobs(req, res)
);

export default router;
