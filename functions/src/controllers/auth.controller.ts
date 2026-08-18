/**
 * Auth Controller
 * Handles HTTP requests for authentication
 */

import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService();
  }



  /**
   * POST /api/auth/register
   */
  async registerUser(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, first_name, last_name, role } = req.body;

      const user = await this.authService.registerUser({
        idToken,
        first_name,
        last_name,
        role
      });

      this.sendCreated(res, 'User created successfully', user);
    } catch (error) {
      this.handleError(error, res, 'Register user');
    }
  }

  /**
   * POST /api/auth/register
   */
  async registerAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, first_name, last_name } = req.body;

      const result = await this.authService.registerAdmin({
        email,
        password,
        first_name,
        last_name
      });

      this.sendCreated(res, 'Admin registered successfully', result);
    } catch (error) {
      this.handleError(error, res, 'Register admin');
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const result = await this.authService.requestPasswordReset(email);

      this.sendSuccess(res, result.message);
    } catch (error) {
      this.handleError(error, res, 'Request password reset');
    }
  }

  /**
   * POST /api/auth/create-custom-token (dev only)
   */
  async createCustomToken(req: Request, res: Response): Promise<void> {
    try {
      // Check environment
      if (process.env.NODE_ENV === 'production') {
        return this.sendForbidden(res, 'This endpoint is only available in development mode');
      }

      const { phone } = req.body;

      const result = await this.authService.createCustomToken(phone);

      this.sendSuccess(res, 'Custom token created. Use this to sign in on the client.', result);
    } catch (error) {
      this.handleError(error, res, 'Create custom token');
    }
  }

  /**
   * POST /v1/auth/send-otp
   */
  async sendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const result = await this.authService.sendOTP(email);
      this.sendSuccess(res, result.message);
    } catch (error) {
      this.handleError(error, res, 'Send OTP');
    }
  }

  /**
   * POST /v1/auth/verify-otp
   */
  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, role } = req.body;
      const result = await this.authService.verifyOTP(email, otp, role);
      res.status(200).json(result);
    } catch (error) {
      this.handleError(error, res, 'Verify OTP');
    }
  }

  /**
   * POST /v1/auth/email/verify
   */
  async verifyEmailLogin(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, role } = req.body;
      const result = await this.authService.verifyEmailLogin(idToken, role);
      res.status(200).json(result);
    } catch (error) {
      this.handleError(error, res, 'Verify Email Login');
    }
  }

  /**
   * POST /v1/auth/firebase/verify
   */
  async verifyFirebaseLogin(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, role } = req.body;
      const result = await this.authService.verifyFirebaseLogin(idToken, role);
      res.status(200).json(result);
    } catch (error) {
      this.handleError(error, res, 'Verify Firebase Login');
    }
  }
}
