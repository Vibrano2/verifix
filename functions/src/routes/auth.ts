import { Router } from 'express';
import { AuthController } from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

/**
 * POST /api/auth/register
 * POST /api/auth/register/client
 * Register a client user
 */
router.post('/register', (req, res) => authController.registerUser(req, res));
router.post('/register/client', (req, res) => {
  req.body.role = 'client';
  return authController.registerUser(req, res);
});

/**
 * POST /api/auth/register/artisan
 * Register an artisan
 */
router.post('/register/artisan', (req, res) => {
  req.body.role = 'artisan';
  return authController.registerUser(req, res);
});

/**
 * POST /api/auth/admin/register
 * Register an admin user
 */
router.post('/admin/register', (req, res) => authController.registerAdmin(req, res));

/**
 * POST /api/auth/login
 * POST /api/auth/firebase/verify
 * Authenticate and verify Firebase ID token
 */
router.post('/login', (req, res) => authController.verifyFirebaseLogin(req, res));
router.post('/firebase/verify', (req, res) => authController.verifyFirebaseLogin(req, res));

/**
 * POST /api/auth/reset-password
 * Password reset recovery
 */
router.post('/reset-password', (req, res) => authController.requestPasswordReset(req, res));

/**
 * POST /api/auth/phone/send-otp
 * Request OTP to phone number
 */
router.post('/phone/send-otp', (req, res) => authController.sendOTP(req, res));

/**
 * POST /api/auth/phone/verify-otp
 * Verify OTP and create session
 */
router.post('/phone/verify-otp', (req, res) => authController.verifyOTP(req, res));

/**
 * GET /api/auth/me
 * GET /api/auth/session
 * Get authenticated user profile & claims
 */
router.get('/me', authenticate, (req: any, res) => {
  res.json({ success: true, user: req.user });
});
router.get('/session', authenticate, (req: any, res) => {
  res.json({ success: true, user: req.user });
});

/**
 * POST /api/auth/create-custom-token
 * Dev/testing helper — disabled in production
 */
router.post('/create-custom-token', (req, res) => authController.createCustomToken(req, res));

export default router;
