import { Router } from 'express';
import { AuthController } from '../controllers';
import { validate } from '../middleware/zodValidation';
import { CreateUserSchema } from '../models/user.model';

const router = Router();
const authController = new AuthController();


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register user after Firebase Email Auth
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
 *               - email
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Firebase ID Token (JWT)
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
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
router.post('/register', validate(CreateUserSchema), (req, res) => authController.registerUser(req, res));

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

// OTP Auth Endpoints
router.post('/send-otp', (req, res) => authController.sendOTP(req, res));
router.post('/verify-otp', (req, res) => authController.verifyOTP(req, res));

// Email Login Verification Endpoint
router.post('/email/verify', (req, res) => authController.verifyEmailLogin(req, res));

// Firebase Phone Auth Verification Endpoint
router.post('/firebase/verify', (req, res) => authController.verifyFirebaseLogin(req, res));

export default router;
