/**
 * Auth Service
 * Business logic for authentication operations
 */

import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { UserRepository, ArtisanRepository } from '../repositories';
import { ROLES, VERIFICATION_STATUS } from '../constants';
import { checkOTPRateLimit, recordOTPAttempt } from '../utils/rateLimit';
import { User } from '../models/user.model';
import { Trade } from '../constants/trades';

export class AuthService extends BaseService {
  private userRepo: UserRepository;
  private artisanRepo: ArtisanRepository;

  constructor() {
    super();
    this.userRepo = new UserRepository();
    this.artisanRepo = new ArtisanRepository();
  }

  /**
   * Send OTP to phone number
   * Enforces rate limiting: 3 requests/hour, 24h lockout after 5 failures
   */
  async sendOTP(phone: string): Promise<{
    success: boolean;
    message: string;
    resetAt?: Date;
  }> {
    try {
      // Check rate limit
      const rateLimitCheck = await checkOTPRateLimit(phone);
      
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          message: rateLimitCheck.reason || 'Rate limit exceeded',
          resetAt: rateLimitCheck.resetAt
        };
      }

      // In production, integrate with SMS provider (Twilio, etc.)
      // For now, Firebase Client SDK handles OTP on frontend
      
      this.logOperation('send-otp', { phone });

      return {
        success: true,
        message: 'OTP sent successfully. Use Firebase Client SDK signInWithPhoneNumber() on frontend'
      };
    } catch (error) {
      this.handleError(error, 'Send OTP');
    }
  }

  /**
   * Verify OTP and create/update user
   */
  async verifyOTPAndCreateUser(data: {
    phone: string;
    first_name: string;
    last_name: string;
    role: 'client' | 'artisan';
    uid: string;
  }): Promise<User> {
    try {
      this.validateRequired(data, ['phone', 'first_name', 'last_name', 'role', 'uid']);

      const { phone, first_name, last_name, role, uid } = data;

      // Validate role
      if (role !== ROLES.CLIENT && role !== ROLES.ARTISAN) {
        throw new Error(`Invalid role. Must be "${ROLES.CLIENT}" or "${ROLES.ARTISAN}"`);
      }

      // Check if user already exists
      const existingUser = await this.userRepo.findById(uid);
      if (existingUser) {
        this.logOperation('user-already-exists', { uid });
        return existingUser;
      }

      // Check if phone already registered
      const phoneExists = await this.userRepo.phoneExists(phone);
      if (phoneExists) {
        throw new Error('Phone number already registered');
      }

      // Record successful OTP verification
      await recordOTPAttempt(phone, true);

      // Create new user
      const newUser = await this.userRepo.createUser({
        uid,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
        role,
        created_at: new Date()
      });

      // If artisan, create placeholder profile
      if (role === ROLES.ARTISAN) {
        await this.createArtisanPlaceholder(uid);
      }

      this.logOperation('user-created', { uid, role });

      return newUser!;
    } catch (error) {
      // Record failed OTP attempt
      await recordOTPAttempt(data.phone, false);
      this.handleError(error, 'Verify OTP');
    }
  }

  /**
   * Create placeholder artisan profile
   */
  private async createArtisanPlaceholder(uid: string): Promise<void> {
    await this.artisanRepo.create(uid, {
      uid,
      trade: 'Plumber' as Trade,
      category: 'Home Maintenance & Repair' as any,
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

  /**
   * Register admin user (email/password)
   */
  async registerAdmin(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }): Promise<{ uid: string; email: string }> {
    try {
      this.validateRequired(data, ['email', 'password', 'first_name', 'last_name']);

      const { email, password, first_name, last_name } = data;

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${first_name} ${last_name}`
      });

      // Create user document
      await this.userRepo.createUser({
        uid: userRecord.uid,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: '', // Admin doesn't need phone
        role: ROLES.ADMIN,
        email: email.trim(),
        created_at: new Date()
      });

      this.logOperation('admin-registered', { uid: userRecord.uid, email });

      return {
        uid: userRecord.uid,
        email: userRecord.email!
      };
    } catch (error) {
      this.handleError(error, 'Register admin');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    try {
      // Generate password reset link
      await admin.auth().generatePasswordResetLink(email);

      // In production, send email via SendGrid, Mailgun, etc.
      this.logOperation('password-reset-requested', { email });

      // Always return success to avoid email enumeration
      return {
        message: 'If this email exists, a reset link has been sent'
      };
    } catch (error) {
      // Still return success message for security
      this.logger.warn('Password reset attempted for non-existent email', { email });
      return {
        message: 'If this email exists, a reset link has been sent'
      };
    }
  }

  /**
   * Create custom token (dev only)
   */
  async createCustomToken(phone: string): Promise<{ customToken: string; uid: string }> {
    try {
      // Check if in production
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Custom tokens not allowed in production');
      }

      // Find or create user
      const existingUser = await this.userRepo.findByPhone(phone);
      
      let uid: string;

      if (existingUser) {
        uid = existingUser.uid;
      } else {
        const userRecord = await admin.auth().createUser({ phoneNumber: phone });
        uid = userRecord.uid;
      }

      // Create custom token
      const customToken = await admin.auth().createCustomToken(uid);

      this.logOperation('custom-token-created', { uid });

      return { customToken, uid };
    } catch (error) {
      this.handleError(error, 'Create custom token');
    }
  }

  /**
   * Verify Firebase ID token
   */
  async verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      this.handleError(error, 'Verify token');
    }
  }
}
