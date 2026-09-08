import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { UserRepository, ArtisanRepository } from '../repositories';
import { ROLES, VERIFICATION_STATUS } from '../constants';
import { User } from '../models/user.model';
import { Trade } from '../constants/trades';
import { checkOTPRateLimit, recordOTPAttempt } from '../utils/rateLimit';
import * as crypto from 'crypto';
import axios from 'axios';
import { defineString } from 'firebase-functions/params';
import { hashData } from '../utils/encryption';

const firebaseWebApiKey = defineString('FIREBASE_WEB_API_KEY');

function hashPII(data: string): string {
  if (!data) return '';
  return hashData(data.trim().toLowerCase()).substring(0, 16);
}

export class AuthService extends BaseService {
  private userRepo: UserRepository;
  private artisanRepo: ArtisanRepository;

  constructor() {
    super();
    this.userRepo = new UserRepository();
    this.artisanRepo = new ArtisanRepository();
  }

  private withEffectiveRole(user: User): User {
    return process.env.ADMIN_UID?.trim() === user.uid
      ? { ...user, role: 'admin' }
      : user;
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

      const decodedToken = await admin.auth().verifyIdToken(
        idToken,
        process.env.FUNCTIONS_EMULATOR !== 'true'
      );
      const uid = decodedToken.uid;
      const email = decodedToken.email;
      const phone = decodedToken.phone_number;

      if (!email && !phone) {
        throw new Error('The verified Firebase token must contain an email address or phone number.');
      }
      if (first_name.trim().length < 1 || first_name.trim().length > 80) {
        throw new Error('Invalid first name');
      }
      if (last_name.trim().length < 1 || last_name.trim().length > 80) {
        throw new Error('Invalid last name');
      }

      const existingUser = await this.userRepo.findById(uid);
      if (existingUser) {
        if (existingUser.role !== role) {
          throw new Error(`This account is already registered as ${existingUser.role}`);
        }
        if (role === ROLES.ARTISAN && !(await this.artisanRepo.exists(uid))) {
          await this.createArtisanPlaceholder(uid);
        }
        this.logOperation('user-already-exists', { uid });
        return existingUser;
      }

      const emailExists = email ? await this.userRepo.emailExists(email) : false;
      if (emailExists) {
        throw new Error('Email already registered');
      }

      const newUser = await this.userRepo.createUser({
        uid,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email?.trim() || '',
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

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    try {
      await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(firebaseWebApiKey.value())}`,
        { requestType: 'PASSWORD_RESET', email: email.trim().toLowerCase() },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15_000 }
      );
      this.logOperation('password-reset-requested', { email: hashPII(email) });
      return { message: 'If this email exists, a reset link has been sent' };
    } catch (error: any) {
      this.logger.warn('Password reset request was not delivered', {
        email: hashPII(email),
        providerCode: error?.response?.data?.error?.message || error?.code || 'unknown'
      });
      return { message: 'If this email exists, a reset link has been sent' };
    }
  }

  async createCustomToken(phone: string): Promise<{ customToken: string; uid: string }> {
    try {
      if (process.env.FUNCTIONS_EMULATOR !== 'true' || process.env.ENABLE_DEV_AUTH !== 'true') {
        throw new Error('Development authentication helpers are disabled');
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
      return await admin.auth().verifyIdToken(idToken, process.env.FUNCTIONS_EMULATOR !== 'true');
    } catch (error) {
      this.handleError(error, 'Verify token');
    }
  }

  async sendOTP(phone: string): Promise<{ message: string }> {
    try {
      if (process.env.FUNCTIONS_EMULATOR !== 'true' || process.env.ENABLE_DEV_AUTH !== 'true') {
        throw new Error('Development authentication helpers are disabled');
      }
      this.validateRequired({ phone }, ['phone']);
      const formattedPhone = phone.trim();

      const rateLimitResult = await checkOTPRateLimit(formattedPhone);
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.reason || 'Too many OTP requests. Please try again later.');
      }

      const otp = crypto.randomInt(100000, 1000000).toString();
      const expiration = new Date();
      expiration.setMinutes(expiration.getMinutes() + 15);
      const otpDocumentId = crypto.createHash('sha256').update(formattedPhone).digest('hex');
      const otpHash = crypto.createHash('sha256').update(`${otp}:${formattedPhone}`).digest('hex');

      await admin.firestore().collection('otps').doc(otpDocumentId).set({
        otpHash,
        expiresAt: admin.firestore.Timestamp.fromDate(expiration),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await recordOTPAttempt(formattedPhone, true);
      this.logger.info(`[EMULATOR OTP] Phone hash: ${hashPII(formattedPhone)}, code: ${otp}`);
      return { message: 'OTP sent successfully' };
    } catch (error) {
      this.handleError(error, 'Send OTP');
    }
  }

  async verifyOTP(phone: string, otp: string, role: string): Promise<{ token: string, user: User }> {
    try {
      if (process.env.FUNCTIONS_EMULATOR !== 'true' || process.env.ENABLE_DEV_AUTH !== 'true') {
        throw new Error('Development authentication helpers are disabled');
      }
      this.validateRequired({ phone, otp, role }, ['phone', 'otp', 'role']);

      // PRD §7.1 / security: clamp role to prevent privilege escalation via public OTP endpoint
      const allowedRoles = [ROLES.CLIENT, ROLES.ARTISAN];
      if (!allowedRoles.includes(role as any)) {
        throw new Error(`Invalid role. Must be one of: ${allowedRoles.join(', ')}`);
      }
      const formattedPhone = phone.trim();

      const rateLimitResult = await checkOTPRateLimit(formattedPhone);
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.reason || 'Too many failed attempts. Account temporarily locked.');
      }

      const otpDocumentId = crypto.createHash('sha256').update(formattedPhone).digest('hex');
      const otpRef = admin.firestore().collection('otps').doc(otpDocumentId);
      const otpDoc = await otpRef.get();
      if (!otpDoc.exists) {
        await recordOTPAttempt(formattedPhone, false);
        throw new Error('Invalid or expired OTP');
      }

      const otpData = otpDoc.data();
      const candidateHash = crypto.createHash('sha256').update(`${otp}:${formattedPhone}`).digest();
      const storedHash = Buffer.from(String(otpData?.otpHash || ''), 'hex');
      if (storedHash.length !== candidateHash.length || !crypto.timingSafeEqual(storedHash, candidateHash)) {
        await recordOTPAttempt(formattedPhone, false);
        throw new Error('Invalid OTP');
      }

      if (!otpData?.expiresAt || otpData.expiresAt.toDate() < new Date()) {
        await recordOTPAttempt(formattedPhone, false);
        await otpRef.delete();
        throw new Error('OTP has expired');
      }

      await otpRef.delete();
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

  async verifyFirebaseLogin(idToken: string, role: string): Promise<{ token: string, user: User }> {
    try {
      this.validateRequired({ idToken, role }, ['idToken', 'role']);

      if (![ROLES.CLIENT, ROLES.ARTISAN].includes(role as any)) {
        throw new Error(`Invalid role. Must be "${ROLES.CLIENT}" or "${ROLES.ARTISAN}"`);
      }

      const decodedToken = await admin.auth().verifyIdToken(
        idToken,
        process.env.FUNCTIONS_EMULATOR !== 'true'
      );
      const uid = decodedToken.uid;
      const email = decodedToken.email;
      const phone = decodedToken.phone_number;

      if (!email && !phone) {
        throw new Error('The verified Firebase token must contain an email address or phone number.');
      }

      let user = await this.userRepo.findById(uid);
      if (!user) {
        user = await this.userRepo.createUser({
          uid,
          first_name: decodedToken.name?.split(' ')[0] || '',
          last_name: decodedToken.name?.split(' ').slice(1).join(' ') || '',
          email: email || '',
          phone: phone || '',
          role: role as 'client' | 'artisan',
          created_at: new Date()
        });

        if (role === ROLES.ARTISAN) {
          await this.createArtisanPlaceholder(uid);
        }
      } else if (user.role !== role) {
        throw new Error(`This account is registered as ${user.role}`);
      } else if (role === ROLES.ARTISAN && !(await this.artisanRepo.exists(uid))) {
        await this.createArtisanPlaceholder(uid);
      }

      this.logOperation('firebase-login-verified', { uid, role: user?.role });

      return { token: idToken, user: this.withEffectiveRole(user!) };
    } catch (error) {
      this.handleError(error, 'Verify Firebase Login');
    }
  }
}
