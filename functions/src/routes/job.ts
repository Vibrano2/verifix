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
 * /api/jobs:
 *   get:
 *     summary: List jobs
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, (req, res) => 
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
router.get('/:id', authenticate, (req, res) => 
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
router.patch('/:id', authenticate, (req, res) => 
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
router.post(['/:id/complete', '/:id/reviews'], authenticate, (req, res) => 
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
router.put('/:id/status', authenticate, (req, res) => 
  jobController.updateJob(req, res)
);

/**
 * @swagger
 * /api/jobs/{id}/proforma:
 *   post:
 *     summary: Submit a proforma for this job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/proforma', authenticate, (req: any, res) => {
  req.body.job_id = req.params.id;
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
router.post('/:id/dispute', authenticate, (req, res) => 
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
router.post('/:id/match', authenticate, (req, res) => 
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
router.post('/:id/select-artisan', authenticate, (req, res) => 
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
router.post('/:id/tracking/start', authenticate, (req, res) => 
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
router.post('/:id/tracking/arrive', authenticate, (req, res) => 
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
router.post('/:id/notify-me', authenticate, async (req: any, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id: jobId } = req.params;
    const db = require('firebase-admin').firestore();

    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) { res.status(404).json({ error: 'Job not found' }); return; }
    if (jobDoc.data().client_uid !== req.user.uid) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    await db.collection('notify_me_requests').add({
      job_id: jobId,
      client_uid: req.user.uid,
      trade: jobDoc.data().trade_needed || jobDoc.data().trade,
      created_at: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    });

    // PRD §5.1: notify_me_registered analytics
    const { AnalyticsService } = require('../services/analytics.service');
    await new AnalyticsService().trackEvent('notify_me_registered', req.user.uid, { job_id: jobId }).catch(() => {});

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
router.post('/:id/cancel', authenticate, (req, res) =>
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
router.get('/client/:clientUid', authenticate, (req, res) => 
  jobController.getClientJobs(req, res)
);

export default router;
