import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { UserRepository, ArtisanRepository } from '../repositories';
import { ResponseUtil } from '../utils/response';
import { Logger } from '../utils/logger';
import { ROLES, VERIFICATION_STATUS } from '../constants';

const router = Router();
const userRepo = new UserRepository();
const artisanRepo = new ArtisanRepository();

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number using Firebase Auth
 */
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone || typeof phone !== 'string') {
      return ResponseUtil.badRequest(res, 'Phone number is required');
    }

    // Validate phone format (basic check - should start with +)
    if (!phone.startsWith('+')) {
      return ResponseUtil.badRequest(res, 'Phone number must be in international format (e.g., +2348012345678)');
    }

    // Firebase Admin SDK doesn't directly send OTP
    // In production, you would:
    // 1. Use Firebase Client SDK on frontend to trigger phone auth
    // 2. Or use a third-party SMS service (Twilio, etc.)
    // 3. Or use Firebase Auth REST API
    
    Logger.info('OTP request received', { phone });

    return ResponseUtil.success(res, 'OTP sent successfully', {
      phone,
      note: 'Use Firebase Client SDK signInWithPhoneNumber() on frontend'
    });
  } catch (error: any) {
    Logger.error('Send OTP error', error);
    return ResponseUtil.serverError(res, 'Failed to send OTP');
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and create/update user
 * 
 * In production, the frontend uses Firebase Client SDK to verify OTP
 * and gets an ID token, which is then sent to this endpoint to create user profile
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { 
      phone, 
      first_name, 
      last_name, 
      role,
      uid // From Firebase Auth after client-side OTP verification
    } = req.body;

    // Validate required fields
    if (!phone || !first_name || !last_name || !role || !uid) {
      return ResponseUtil.badRequest(res, 'Missing required fields: phone, first_name, last_name, role, uid');
    }

    // Validate role
    if (role !== ROLES.CLIENT && role !== ROLES.ARTISAN) {
      return ResponseUtil.badRequest(res, `Role must be either "${ROLES.CLIENT}" or "${ROLES.ARTISAN}"`);
    }

    // Check if user already exists
    const existingUser = await userRepo.findById(uid);
    if (existingUser) {
      Logger.info('User already exists', { uid });
      return ResponseUtil.success(res, 'User already exists', existingUser);
    }

    // Check if phone number already registered
    const phoneExists = await userRepo.phoneExists(phone);
    if (phoneExists) {
      return ResponseUtil.conflict(res, 'Phone number already registered');
    }

    // Create new user using repository
    const newUser = await userRepo.createUser({
      uid,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: phone.trim(),
      role,
      created_at: new Date()
    });

    // If artisan, create a placeholder profile (to be completed later)
    if (role === ROLES.ARTISAN) {
      await artisanRepo.create(uid, {
        uid,
        trade: 'plumber', // Default trade, to be updated during profile completion
        location: {
          city: '',
          state: '',
          lga: ''
        },
        tagline: 'Profile setup in progress',
        is_available: false,
        is_verified: false,
        verification_status: VERIFICATION_STATUS.PENDING,
        work_photos: [],
        completed_jobs: 0,
        created_at: new Date()
      } as any);
    }

    Logger.info('User created successfully', { uid, role });

    return ResponseUtil.created(res, 'User created successfully', newUser);

  } catch (error: any) {
    Logger.error('Verify OTP error', error);
    return ResponseUtil.serverError(res, 'Failed to verify OTP and create user');
  }
});

/**
 * POST /api/auth/create-custom-token
 * Helper endpoint for development/testing
 * Creates a custom token for a phone number (bypassing OTP in dev)
 */
router.post('/create-custom-token', async (req: Request, res: Response) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return ResponseUtil.forbidden(res, 'This endpoint is only available in development mode');
    }

    const { phone } = req.body;

    if (!phone) {
      return ResponseUtil.badRequest(res, 'Phone number is required');
    }

    // Check if user exists with this phone
    const existingUser = await userRepo.findByPhone(phone);

    let uid: string;

    if (existingUser) {
      // User exists
      uid = existingUser.uid;
    } else {
      // Create a new user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        phoneNumber: phone
      });
      uid = userRecord.uid;
    }

    // Create custom token
    const customToken = await admin.auth().createCustomToken(uid);

    Logger.info('Custom token created for development', { uid });

    return ResponseUtil.success(res, 'Custom token created. Use this to sign in on the client.', {
      customToken,
      uid
    });

  } catch (error: any) {
    Logger.error('Create custom token error', error);
    return ResponseUtil.serverError(res, 'Failed to create custom token');
  }
});

export default router;
