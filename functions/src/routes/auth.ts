import { Router } from 'express';
import { AuthController } from '../controllers';

const router = Router();
const authController = new AuthController();

/**
 * POST /api/auth/phone/send-otp
 * PRD §9.1 — Request OTP to phone number
 */
router.post('/phone/send-otp', (req, res) => authController.sendOTP(req, res));

/**
 * POST /api/auth/phone/verify-otp
 * PRD §9.1 — Verify OTP and create session
 */
router.post('/phone/verify-otp', (req, res) => authController.verifyOTP(req, res));

/**
 * POST /api/auth/create-custom-token
 * Dev/testing helper — disabled in production
 */
router.post('/create-custom-token', (req, res) => authController.createCustomToken(req, res));

export default router;
