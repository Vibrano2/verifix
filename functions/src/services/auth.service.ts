/**
 * Auth Service
 * Business logic for authentication operations
 */

import * as admin from 'firebase-admin';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { BaseService } from './base.service';
import { UserRepository, ArtisanRepository } from '../repositories';
import { ROLES, VERIFICATION_STATUS } from '../constants';
import { User, RegisterUserDTO, LoginUserDTO, ResetPasswordDTO } from '../models/user.model';
import { Trade } from '../constants/trades';
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

  /**
   * Helper to generate JWT
   */
  private generateToken(user: User): string {
    const secret = process.env.JWT_SECRET;
    const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as any;
    
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    // Include uid and role in token payload
    const payload = {
      uid: user.uid,
      role: user.role,
      email: user.email
    };

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Register new user
   */
  async register(data: RegisterUserDTO): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    try {
      this.validateRequired(data, ['email', 'password', 'first_name', 'last_name', 'role']);

      const { email, password, first_name, last_name, role } = data;

      // Validate role
      if (role !== ROLES.CLIENT && role !== ROLES.ARTISAN && role !== ROLES.ADMIN) {
        throw new Error(`Invalid role.`);
      }

      const emailExists = await this.userRepo.emailExists(email);
      if (emailExists) {
        throw new Error('Email is already registered');
      }

      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const uid = uuidv4();

      // Create new user
      const newUser = await this.userRepo.createUser({
        uid,
        email: email.trim(),
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        role,
        password_hash,
        email_verified: false,
        created_at: new Date()
      } as User);

      // If artisan, create placeholder profile
      if (role === ROLES.ARTISAN) {
        await this.createArtisanPlaceholder(uid);
      }

      this.logOperation('user-registered', { uid, role, email: hashPII(email) });

      const token = this.generateToken(newUser!);

      // Strip sensitive data before returning
      const { password_hash: _ph, reset_token_hash: _rth, ...safeUser } = newUser!;

      return { user: safeUser, token };
    } catch (error) {
      this.handleError(error, 'Register User');
    }
  }

  /**
   * Login user
   */
  async login(data: LoginUserDTO): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    try {
      this.validateRequired(data, ['email', 'password']);
      const { email, password } = data;

      const user = await this.userRepo.findByEmail(email);
      if (!user || !user.password_hash) {
        throw new Error('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      this.logOperation('user-login-success', { uid: user.uid });

      const token = this.generateToken(user);
      
      const { password_hash: _ph, reset_token_hash: _rth, ...safeUser } = user;

      return { user: safeUser, token };
    } catch (error) {
      this.handleError(error, 'Login User');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    try {
      const user = await this.userRepo.findByEmail(email);
      if (user) {
        // Use a signed JWT as the reset token
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET environment variable is not set');

        const token = jwt.sign({ uid: user.uid, reset: true }, secret, { expiresIn: '1h' });
        
        // Hash token for database storage
        const tokenHash = await bcrypt.hash(token, 10);
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        await this.userRepo.updateResetToken(user.uid, tokenHash, expires);

        // TODO: Email Delivery - e.g., sendEmail(user.email, `https://artiva.app/reset?token=${token}`)
        this.logOperation('password-reset-requested', { uid: user.uid, email: hashPII(email) });
      }

      // Always return success to avoid enumeration
      return {
        message: 'If this email exists, a reset link has been sent.'
      };
    } catch (error) {
      this.logger.warn('Password reset attempted and failed', { email: hashPII(email) });
      return {
        message: 'If this email exists, a reset link has been sent.'
      };
    }
  }

  /**
   * Reset Password
   */
  async resetPassword(data: ResetPasswordDTO): Promise<{ message: string }> {
    try {
      this.validateRequired(data, ['token', 'newPassword']);
      const { token, newPassword } = data;

      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET not set');

      // 1. Verify token signature and expiration
      let decoded: any;
      try {
        decoded = jwt.verify(token, secret);
      } catch (e) {
        throw new Error('Invalid or expired reset token');
      }

      if (!decoded.uid || !decoded.reset) {
        throw new Error('Invalid reset token payload');
      }

      // 2. Look up user
      const user = await this.userRepo.findById(decoded.uid);
      if (!user || !user.reset_token_hash || !user.reset_token_expires) {
        throw new Error('Invalid or expired reset token');
      }

      // 3. Verify expiry in DB
      const now = Date.now();
      let expiresTime: number;
      if (user.reset_token_expires instanceof admin.firestore.Timestamp) {
        expiresTime = user.reset_token_expires.toMillis();
      } else {
        expiresTime = new Date(user.reset_token_expires).getTime();
      }

      if (now > expiresTime) {
        throw new Error('Invalid or expired reset token');
      }

      // 4. Validate hash
      const isValid = await bcrypt.compare(token, user.reset_token_hash);
      if (!isValid) {
        throw new Error('Invalid or expired reset token');
      }

      // 5. Hash new password & update
      const password_hash = await bcrypt.hash(newPassword, 12);
      await this.userRepo.updatePassword(user.uid, password_hash);

      this.logOperation('password-reset-success', { uid: user.uid });

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      this.handleError(error, 'Reset Password');
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
}
