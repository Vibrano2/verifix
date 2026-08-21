import { Router } from 'express';
import { authenticate, requireOwnership } from '../middleware/auth';
import { ArtisanController } from '../controllers';

const router = Router();
const artisanController = new ArtisanController();

/**
 * @swagger
 * /api/artisans:
 *   post:
 *     summary: Create artisan profile
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, (req, res) => artisanController.registerArtisan(req as any, res));

/**
 * @swagger
 * /api/artisans:
 *   get:
 *     summary: List artisans with filters (trade, location, available)
 *     tags: [Artisans]
 */
router.get('/', (req, res) => artisanController.listArtisans(req, res));

/**
 * @swagger
 * /api/artisans/me:
 *   get:
 *     summary: Get current artisan profile
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authenticate, (req: any, res) => {
  req.params = { ...req.params, uid: req.user.uid };
  return artisanController.getProfile(req, res);
});

/**
 * @swagger
 * /api/artisans/me:
 *   put:
 *     summary: Update current artisan profile
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 */
router.put('/me', authenticate, (req: any, res) => {
  req.params = { ...req.params, uid: req.user.uid };
  return artisanController.updateProfile(req, res);
});
router.patch('/me', authenticate, (req: any, res) => {
  req.params = { ...req.params, uid: req.user.uid };
  return artisanController.updateProfile(req, res);
});

/**
 * @swagger
 * /api/artisans/{uid}/availability:
 *   patch:
 *     summary: Toggle artisan availability
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:uid/availability', authenticate, requireOwnership, (req, res) => 
  artisanController.updateAvailability(req, res)
);

/**
 * @swagger
 * /api/artisans/match:
 *   post:
 *     summary: Auto-match best artisans for criteria
 *     tags: [Artisans]
 */
router.post('/match', authenticate, (req: any, res) => {
  const { JobController } = require('../controllers');
  const jobController = new JobController();
  const jobId = req.body.job_id || req.body.jobId;
  if (jobId) {
    req.params = { ...req.params, id: jobId };
    return jobController.matchArtisans(req, res);
  }
  return artisanController.listArtisans(req, res);
});

/**
 * @swagger
 * /api/artisans/{uid}:
 *   get:
 *     summary: Get artisan profile detail (excludes nin, id_document_url for non-admin)
 *     tags: [Artisans]
 */
router.get('/:uid', authenticate, (req, res) => 
  artisanController.getProfile(req, res)
);

/**
 * @swagger
 * /api/artisans/{uid}/reviews:
 *   get:
 *     summary: Get reviews for an artisan
 *     tags: [Artisans]
 */
router.get(['/:uid/reviews', '/:id/reviews'], authenticate, (req, res) => {
  const { RatingController } = require('../controllers/rating.controller');
  const ratingController = new RatingController();
  return ratingController.getArtisanRatings(req, res);
});

/**
 * @swagger
 * /api/artisans/{uid}/dashboard:
 *   get:
 *     summary: Get artisan dashboard data
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:uid/dashboard', authenticate, requireOwnership, (req, res) => 
  artisanController.getDashboard(req, res)
);

/**
 * @swagger
 * /api/artisans/{uid}/profile:
 *   patch:
 *     summary: Update artisan profile
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:uid/profile', authenticate, requireOwnership, (req, res) => 
  artisanController.updateProfile(req, res)
);

/**
 * @swagger
 * /api/artisans/{uid}/photo:
 *   post:
 *     summary: Upload a work photo
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:uid/photo', authenticate, requireOwnership, (req, res) => 
  artisanController.addWorkPhoto(req, res)
);

/**
 * @swagger
 * /api/artisans/{uid}/id-document:
 *   post:
 *     summary: Upload an ID document
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:uid/id-document', authenticate, requireOwnership, (req, res) => 
  artisanController.uploadIDDocument(req, res)
);

export default router;
