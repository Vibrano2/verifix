import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from '../controllers';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/zodValidation';
import { AuthenticatedRequest } from '../types';
import { rateLimit } from '../middleware/security';

const router = Router();
const authController = new AuthController();

const registerSchema = z.object({
  body: z.object({
    idToken: z.string().min(10).max(8192),
    first_name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(80),
    role: z.enum(['client', 'artisan'])
  }).strict()
});

const firebaseLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(10).max(8192),
    role: z.enum(['client', 'artisan'])
  }).strict()
});
const resetPasswordSchema = z.object({
  body: z.object({ email: z.string().trim().email().max(254) }).strict()
});
const sendOtpSchema = z.object({
  body: z.object({ phone: z.string().trim().regex(/^(?:\+234|0)[789]\d{9}$/) }).strict()
});
const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().trim().regex(/^(?:\+234|0)[789]\d{9}$/),
    otp: z.string().regex(/^\d{6}$/),
    role: z.enum(['client', 'artisan'])
  }).strict()
});

const devAuthEnabled = process.env.FUNCTIONS_EMULATOR === 'true'
  && process.env.ENABLE_DEV_AUTH === 'true';

/**
 * POST /api/auth/register
 * POST /api/auth/register/client
 * Register a client user
 */
router.post('/register', validate(registerSchema), (req, res) => authController.registerUser(req, res));
router.post('/register/client', (req, res, next) => {
  req.body.role = 'client';
  next();
}, validate(registerSchema), (req, res) => authController.registerUser(req, res));

/**
 * POST /api/auth/register/artisan
 * Register an artisan
 */
router.post('/register/artisan', (req, res, next) => {
  req.body.role = 'artisan';
  next();
}, validate(registerSchema), (req, res) => authController.registerUser(req, res));

/**
 * POST /api/auth/login
 * POST /api/auth/firebase/verify
 * Authenticate and verify Firebase ID token
 */
router.post('/login', validate(firebaseLoginSchema), (req, res) => authController.verifyFirebaseLogin(req, res));
router.post('/firebase/verify', validate(firebaseLoginSchema), (req, res) => authController.verifyFirebaseLogin(req, res));

/**
 * POST /api/auth/reset-password
 * Password reset recovery
 */
router.post('/reset-password', rateLimit(5, 60 * 60 * 1000), validate(resetPasswordSchema), (req, res) => authController.requestPasswordReset(req, res));

/**
 * POST /api/auth/phone/send-otp
 * Request OTP to phone number
 */
if (devAuthEnabled) {
  router.post('/phone/send-otp', validate(sendOtpSchema), (req, res) => authController.sendOTP(req, res));

/**
 * POST /api/auth/phone/verify-otp
 * Verify OTP and create session
 */
  router.post('/phone/verify-otp', validate(verifyOtpSchema), (req, res) => authController.verifyOTP(req, res));
  router.post('/verify', validate(verifyOtpSchema), (req, res) => authController.verifyOTP(req, res));
  router.post('/create-custom-token', validate(sendOtpSchema), (req, res) => authController.createCustomToken(req, res));
}

/**
 * GET /api/auth/me
 * GET /api/auth/session
 * Get authenticated user profile & claims
 */
const sessionHandler = async (req: AuthenticatedRequest, res: any) => {
  const user = req.user!;
  const userDoc = await require('firebase-admin').firestore().collection('users').doc(user.uid).get();
  const persisted = userDoc.data() || {};
  res.json({
    success: true,
    user: {
      uid: user.uid,
      first_name: persisted.first_name || '',
      last_name: persisted.last_name || '',
      email: user.email || null,
      phone_number: user.phone_number || null,
      role: user.role || null
    }
  });
};

router.get('/me', authenticate, (req, res) => void sessionHandler(req, res));
router.get('/session', authenticate, (req, res) => void sessionHandler(req, res));

export default router;
