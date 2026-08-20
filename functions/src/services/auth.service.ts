import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { UserRepository, ArtisanRepository } from '../repositories';
import { ROLES, VERIFICATION_STATUS } from '../constants';
import { User } from '../models/user.model';
import { Trade } from '../constants/trades';
import { checkOTPRateLimit, recordOTPAttempt } from '../utils/rateLimit';
import * as crypto from 'crypto';

function hashPII(data: string): string {
  if (!data) return '';
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export class AuthService extends BaseService {
  private userRepo: UserRepository;
  private artisanRepo: ArtisanRepository;

  constructor() {
    super();
    this.userRepo = new UserRepository();
    this.artisanRepo = new ArtisanRepository();
  }

  async registerUser(data: {
    idToken: string;
    first_name: string;
    last_name: string;
    role: 'client' | 'artisan';
  }): Promise<User> {
    try {
      this.validateRequired(data, ['idToken', 'first_name', 'last_name', 'role']);
      const { idToken, first_name, last_name, role } = data;

      if (role !== ROLES.CLIENT && role !== ROLES.ARTISAN) {
        throw new Error(`Invalid role. Must be "${ROLES.CLIENT}" or "${ROLES.ARTISAN}"`);
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;
      const phone = decodedToken.phone_number;


      if (!email) {
        throw new Error('Email is missing from the verified ID token.');
      }

      const existingUser = await this.userRepo.findById(uid);
      if (existingUser) {
        this.logOperation('user-already-exists', { uid });
        return existingUser;
      }

      const emailExists = await this.userRepo.emailExists(email);
      if (emailExists) {
        throw new Error('Email already registered');
      }

      const newUser = await this.userRepo.createUser({
        uid,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : undefined,
        role,
        created_at: new Date()
      });

      if (role === ROLES.ARTISAN) {
        await this.createArtisanPlaceholder(uid);
      }

      this.logOperation('user-created', { uid, role });
      return newUser!;
    } catch (error) {
      this.handleError(error, 'Register user');
    }
  }

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

  async registerAdmin(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }): Promise<{ uid: string; email: string }> {
    try {
      this.validateRequired(data, ['email', 'password', 'first_name', 'last_name']);
      const { email, password, first_name, last_name } = data;

      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${first_name} ${last_name}`
      });

      await this.userRepo.createUser({
        uid: userRecord.uid,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: '',
        role: ROLES.ADMIN,
        email: email.trim(),
        created_at: new Date()
      });

      this.logOperation('admin-registered', { uid: userRecord.uid, email: hashPII(email) });

      return {
        uid: userRecord.uid,
        email: userRecord.email!
      };
    } catch (error) {
      this.handleError(error, 'Register admin');
    }
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    try {
      await admin.auth().generatePasswordResetLink(email);
      this.logOperation('password-reset-requested', { email: hashPII(email) });
      return { message: 'If this email exists, a reset link has been sent' };
    } catch (error) {
      this.logger.warn('Password reset attempted for non-existent email', { email: hashPII(email) });
      return { message: 'If this email exists, a reset link has been sent' };
    }
  }

  async createCustomToken(phone: string): Promise<{ customToken: string; uid: string }> {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Custom tokens not allowed in production');
      }

      const existingUser = await this.userRepo.findByPhone(phone);
      let uid: string;

      if (existingUser) {
        uid = existingUser.uid;
      } else {
        const userRecord = await admin.auth().createUser({ phoneNumber: phone });
        uid = userRecord.uid;
      }

      const customToken = await admin.auth().createCustomToken(uid);
      this.logOperation('custom-token-created', { uid });

      return { customToken, uid };
    } catch (error) {
      this.handleError(error, 'Create custom token');
    }
  }

  async verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      this.handleError(error, 'Verify token');
    }
  }

  async sendOTP(phone: string): Promise<{ message: string }> {
    try {
      this.validateRequired({ phone }, ['phone']);
      const formattedPhone = phone.trim();

      const rateLimitResult = await checkOTPRateLimit(formattedPhone);
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.reason || 'Too many OTP requests. Please try again later.');
      }

      // In development/mock mode, we'll just log the OTP. 
      // In production, this would integrate with Termii/Twilio.
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiration = new Date();
      expiration.setMinutes(expiration.getMinutes() + 15);

      await admin.firestore().collection('otps').doc(formattedPhone).set({
        otp,
        expiresAt: admin.firestore.Timestamp.fromDate(expiration),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await recordOTPAttempt(formattedPhone, true);
      this.logger.info(`[MOCK SMS] To: ${formattedPhone}, Body: Your Artiva Login Code is ${otp}`);
      return { message: 'OTP sent successfully' };
    } catch (error) {
      this.handleError(error, 'Send OTP');
    }
  }

  async verifyOTP(phone: string, otp: string, role: string): Promise<{ token: string, user: User }> {
    try {
      this.validateRequired({ phone, otp, role }, ['phone', 'otp', 'role']);
      const formattedPhone = phone.trim();

      const rateLimitResult = await checkOTPRateLimit(formattedPhone);
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.reason || 'Too many failed attempts. Account temporarily locked.');
      }

      const otpDoc = await admin.firestore().collection('otps').doc(formattedPhone).get();
      if (!otpDoc.exists) {
        await recordOTPAttempt(formattedPhone, false);
        throw new Error('Invalid or expired OTP');
      }

      const otpData = otpDoc.data();
      if (otpData?.otp !== otp) {
        await recordOTPAttempt(formattedPhone, false);
        throw new Error('Invalid OTP');
      }

      if (otpData?.expiresAt.toDate() < new Date()) {
        await recordOTPAttempt(formattedPhone, false);
        throw new Error('OTP has expired');
      }

      await admin.firestore().collection('otps').doc(formattedPhone).delete();
      await recordOTPAttempt(formattedPhone, true);

      let uid: string;
      try {
        const userRecord = await admin.auth().getUserByPhoneNumber(formattedPhone);
        uid = userRecord.uid;
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          const newUserRecord = await admin.auth().createUser({ phoneNumber: formattedPhone });
          uid = newUserRecord.uid;
        } else {
          throw err;
        }
      }

      let user = await this.userRepo.findByPhone(formattedPhone);
      if (!user) {
        user = await this.userRepo.createUser({
          uid,
          first_name: '',
          last_name: '',
          phone: formattedPhone,
          email: '',
          role: role as "client" | "artisan" | "admin",
          created_at: new Date()
        });
        
        if (role === ROLES.ARTISAN) {
          await this.createArtisanPlaceholder(uid);
        }
      }

      const token = await admin.auth().createCustomToken(uid);
      this.logOperation('otp-verified-login', { uid, role: user?.role });

      return { token, user: user! };
    } catch (error) {
      this.handleError(error, 'Verify OTP Login');
    }
  }

  async verifyEmailLogin(idToken: string, role: string): Promise<{ token: string, user: User }> {
    try {
      this.validateRequired({ idToken, role }, ['idToken', 'role']);

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;

      if (!email) {
        throw new Error('Email is missing from the verified ID token.');
      }

      let user = await this.userRepo.findByEmail(email);
      if (!user) {
        user = await this.userRepo.createUser({
          uid,
          first_name: decodedToken.name?.split(' ')[0] || '',
          last_name: decodedToken.name?.split(' ').slice(1).join(' ') || '',
          email: email,
          role: role as "client" | "artisan" | "admin",
          created_at: new Date()
        });

        if (role === ROLES.ARTISAN) {
          await this.createArtisanPlaceholder(uid);
        }
      }

      const token = await admin.auth().createCustomToken(uid);
      this.logOperation('email-password-login-verified', { uid, role: user?.role });

      return { token, user: user! };
    } catch (error) {
      this.handleError(error, 'Verify Email Login');
    }
  }
}
