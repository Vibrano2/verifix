import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireOwnership, requireRole } from '../middleware/auth';
import { ArtisanController } from '../controllers';
import { CreateArtisanSchema, UpdateArtisanSchema } from '../models/artisan.model';
import { validate } from '../middleware/zodValidation';

const router = Router();
const artisanController = new ArtisanController();
const availabilitySchema = z.object({
  body: z.object({
    available: z.boolean().optional(),
    is_available: z.boolean().optional()
  }).strict().refine(data => data.available !== undefined || data.is_available !== undefined, {
    message: 'Availability is required'
  })
});
const matchSchema = z.object({
  body: z.object({
    job_id: z.string().min(1).max(128).optional(),
    jobId: z.string().min(1).max(128).optional()
  }).strict().refine(data => Boolean(data.job_id || data.jobId), { message: 'Job ID is required' })
});
const listSchema = z.object({
  query: z.object({
    trade: z.string().trim().min(1).max(100).optional(),
    location: z.string().trim().min(1).max(100).optional(),
    available: z.enum(['true', 'false']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  }).strict()
});
const uidParamsSchema = z.object({
  params: z.object({ uid: z.string().min(1).max(128) }).strict()
});

/**
 * @swagger
 * /api/artisans:
 *   post:
 *     summary: Create artisan profile
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, requireRole('artisan'), validate(CreateArtisanSchema), (req, res) => artisanController.registerArtisan(req as any, res));

/**
 * @swagger
 * /api/artisans:
 *   get:
 *     summary: List artisans with filters (trade, location, available)
 *     tags: [Artisans]
 */
router.get('/', validate(listSchema), (req, res) => artisanController.listArtisans(req, res));

/**
 * @swagger
 * /api/artisans/me:
 *   get:
 *     summary: Get current artisan profile
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authenticate, requireRole('artisan'), (req: any, res) => {
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
router.put('/me', authenticate, requireRole('artisan'), validate(UpdateArtisanSchema), (req: any, res) => {
  req.params = { ...req.params, uid: req.user.uid };
  return artisanController.updateProfile(req, res);
});
router.patch('/me', authenticate, requireRole('artisan'), validate(UpdateArtisanSchema), (req: any, res) => {
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
router.patch('/:uid/availability', authenticate, requireRole('artisan'), requireOwnership, validate(uidParamsSchema), validate(availabilitySchema), (req, res) =>
  artisanController.updateAvailability(req, res)
);

/**
 * @swagger
 * /api/artisans/match:
 *   post:
 *     summary: Auto-match best artisans for criteria
 *     tags: [Artisans]
 */
router.post('/match', authenticate, requireRole('client'), validate(matchSchema), (req: any, res) => {
  const { JobController } = require('../controllers');
  const jobController = new JobController();
  const jobId = req.body.job_id || req.body.jobId;
  if (jobId) {
    req.params = { ...req.params, id: jobId };
    return jobController.matchArtisans(req, res);
  }
  return res.status(400).json({ error: 'Job ID is required' });
});

/**
 * @swagger
 * /api/artisans/{uid}:
 *   get:
 *     summary: Get artisan profile detail (excludes nin, id_document_url for non-admin)
 *     tags: [Artisans]
 */
router.get('/:uid', authenticate, validate(uidParamsSchema), (req, res) =>
  artisanController.getProfile(req, res)
);

/**
 * @swagger
 * /api/artisans/{uid}/reviews:
 *   get:
 *     summary: Get reviews for an artisan
 *     tags: [Artisans]
 */
router.get('/:uid/reviews', authenticate, validate(uidParamsSchema), (req, res) => {
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
router.get('/:uid/dashboard', authenticate, requireOwnership, validate(uidParamsSchema), (req, res) =>
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
router.patch('/:uid/profile', authenticate, requireRole('artisan'), requireOwnership, validate(uidParamsSchema), validate(UpdateArtisanSchema), (req, res) =>
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
router.post('/:uid/photo', authenticate, requireRole('artisan'), requireOwnership, validate(uidParamsSchema), (req, res) =>
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
router.post('/:uid/id-document', authenticate, requireRole('artisan'), requireOwnership, validate(uidParamsSchema), (req, res) =>
  artisanController.uploadIDDocument(req, res)
);

export default router;
