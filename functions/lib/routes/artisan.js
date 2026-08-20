"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const zodValidation_1 = require("../middleware/zodValidation");
const artisan_model_1 = require("../models/artisan.model");
const controllers_1 = require("../controllers");
const router = (0, express_1.Router)();
const artisanController = new controllers_1.ArtisanController();
/**
 * @swagger
 * /api/artisans/signup:
 *   post:
 *     summary: Complete artisan profile after initial auth
 *     tags: [Artisans]
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
 *               - tagline
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
 *               tagline:
 *                 type: string
 *               id_document_url:
 *                 type: string
 *               work_photos:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Artisan profile created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/signup', auth_1.authenticate, (0, zodValidation_1.validate)(artisan_model_1.CreateArtisanSchema), (req, res) => artisanController.completeProfile(req, res));
/**
 * @swagger
 * /api/artisans/{uid}/availability:
 *   patch:
 *     summary: Toggle artisan availability
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
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
 *               - available
 *             properties:
 *               available:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (IDOR)
 */
router.patch('/:uid/availability', auth_1.authenticate, auth_1.requireOwnership, (req, res) => artisanController.updateAvailability(req, res));
/**
 * @swagger
 * /api/artisans/{uid}/profile:
 *   patch:
 *     summary: Update artisan profile (location, tagline, etc.)
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
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
 *               trade:
 *                 type: string
 *               location:
 *                 type: object
 *               tagline:
 *                 type: string
 *               bio:
 *                 type: string
 *               experience_years:
 *                 type: number
 *               hourly_rate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.patch('/:uid/profile', auth_1.authenticate, auth_1.requireOwnership, (0, zodValidation_1.validate)(artisan_model_1.UpdateArtisanSchema), (req, res) => artisanController.updateProfile(req, res));
/**
 * @swagger
 * /api/artisans/{uid}:
 *   get:
 *     summary: Get artisan profile details
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Artisan profile
 *       404:
 *         description: Not found
 */
router.get('/:uid', auth_1.authenticate, (req, res) => artisanController.getProfile(req, res));
/**
 * @swagger
 * /api/artisans/{uid}/dashboard:
 *   get:
 *     summary: Get artisan dashboard data
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard data
 *       403:
 *         description: Forbidden
 */
router.get('/:uid/dashboard', auth_1.authenticate, auth_1.requireOwnership, (req, res) => artisanController.getDashboard(req, res));
/**
 * @swagger
 * /api/artisans/{uid}/photo:
 *   post:
 *     summary: Upload work photo for artisan
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo uploaded
 */
router.post('/:uid/photo', auth_1.authenticate, auth_1.requireOwnership, (req, res) => artisanController.addWorkPhoto(req, res));
/**
 * @swagger
 * /api/artisans/{uid}/id-document:
 *   post:
 *     summary: Upload ID document for verification
 *     tags: [Artisans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: ID document uploaded
 */
router.post('/:uid/id-document', auth_1.authenticate, auth_1.requireOwnership, (req, res) => artisanController.uploadIDDocument(req, res));
exports.default = router;
//# sourceMappingURL=artisan.js.map