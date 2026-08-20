"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const zodValidation_1 = require("../middleware/zodValidation");
const job_model_1 = require("../models/job.model");
const rating_model_1 = require("../models/rating.model");
const controllers_1 = require("../controllers");
const controllers_2 = require("../controllers");
const router = (0, express_1.Router)();
const jobController = new controllers_1.JobController();
const ratingController = new controllers_2.RatingController();
/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trade
 *               - location
 *               - urgency
 *               - title
 *             properties:
 *               trade:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   lga:
 *                     type: string
 *                   address:
 *                     type: string
 *               urgency:
 *                 type: string
 *                 enum: [low, medium, high, emergency]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *     responses:
 *       201:
 *         description: Job created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth_1.authenticate, (0, zodValidation_1.validate)(job_model_1.CreateJobSchema), (req, res) => jobController.createJob(req, res));
/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job details
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 */
router.get('/:id', auth_1.authenticate, (req, res) => jobController.getJob(req, res));
/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List jobs for authenticated user
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: trade
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.get('/', auth_1.authenticate, (req, res) => jobController.listJobs(req, res));
/**
 * @swagger
 * /api/jobs/{id}:
 *   patch:
 *     summary: Update job details (before matching)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               urgency:
 *                 type: string
 *               title:
 *                 type: string
 *               location:
 *                 type: object
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job updated
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 */
router.patch('/:id', auth_1.authenticate, (0, zodValidation_1.validate)(job_model_1.UpdateJobSchema), (req, res) => jobController.updateJob(req, res));
/**
 * @swagger
 * /api/jobs/{id}/match:
 *   post:
 *     summary: Find matching artisans for a job
 *     tags: [Jobs, Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Matches created successfully
 *       400:
 *         description: Job not open for matching
 *       403:
 *         description: Forbidden
 */
router.post('/:id/match', auth_1.authenticate, (req, res) => jobController.matchArtisans(req, res));
/**
 * @swagger
 * /api/jobs/{id}/matches:
 *   get:
 *     summary: Get matches for a specific job
 *     tags: [Jobs, Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matches
 *       403:
 *         description: Forbidden
 */
router.get('/:id/matches', auth_1.authenticate, (req, res) => jobController.getMatches(req, res));
/**
 * @swagger
 * /api/jobs/{id}/rating:
 *   post:
 *     summary: Submit rating for completed job
 *     tags: [Jobs, Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *             properties:
 *               score:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               review:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating submitted successfully
 *       409:
 *         description: Job already rated
 */
router.post('/:id/rating', auth_1.authenticate, (0, zodValidation_1.validate)(rating_model_1.RatingSchema), (req, res) => ratingController.submitRating(req, res));
/**
 * @swagger
 * /api/jobs/{id}/complete:
 *   post:
 *     summary: Mark job as complete and release escrow
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - match_id
 *             properties:
 *               match_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job marked complete and escrow released
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 */
router.post('/:id/complete', auth_1.authenticate, (req, res) => jobController.markComplete(req, res));
exports.default = router;
//# sourceMappingURL=job.js.map