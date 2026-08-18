import { Router } from 'express';
import { AuthController } from '../controllers';
import { validate } from '../middleware/zodValidation';
import { CreateUserSchema } from '../models/user.model';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /api/auth/phone/send-otp:
 *   post:
 *     summary: Send OTP to phone number using Firebase Auth
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number in E.164 format (e.g. +2348012345678)
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Bad request
 */
router.post('/phone/send-otp', (req, res) => authController.sendOTP(req, res));

/**
 * @swagger
 * /api/auth/phone/verify-otp:
 *   post:
 *     summary: Verify OTP and create/update user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *               - first_name
 *               - last_name
 *               - role
 *             properties:
 *               idToken:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [client, artisan, admin]
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User verified and created/updated
 *       400:
 *         description: Bad request
 */
router.post('/phone/verify-otp', validate(CreateUserSchema), (req, res) => authController.verifyOTP(req, res));

/**
 * @swagger
 * /api/auth/create-custom-token:
 *   post:
 *     summary: Helper endpoint for development/testing
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Custom token created
 */
router.post('/create-custom-token', (req, res) => authController.createCustomToken(req, res));

export default router;
