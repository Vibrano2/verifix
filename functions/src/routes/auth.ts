import { Router } from 'express';
import { AuthController } from '../controllers';

const router = Router();
const authController = new AuthController();

/**
 * POST /api/auth/phone/send-otp
 * Send OTP to phone number using Firebase Auth
 */
router.post('/phone/send-otp', (req, res) => authController.sendOTP(req, res));

/**
 * POST /api/auth/phone/verify-otp
 * Verify OTP and create/update user
 */
router.post('/phone/verify-otp', (req, res) => authController.verifyOTP(req, res));

/**
 * POST /api/auth/create-custom-token
 * Helper endpoint for development/testing
 */
router.post('/create-custom-token', (req, res) => authController.createCustomToken(req, res));

export default router;
