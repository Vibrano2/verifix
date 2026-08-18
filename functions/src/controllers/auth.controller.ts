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
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.register(req.body);
      this.sendCreated(res, 'User registered successfully', result);
    } catch (error) {
      this.handleError(error, res, 'Register');
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.login(req.body);
      this.sendSuccess(res, 'Login successful', result);
    } catch (error) {
      this.handleError(error, res, 'Login');
    }
  }

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const result = await this.authService.requestPasswordReset(email);
      this.sendSuccess(res, result.message);
    } catch (error) {
      this.handleError(error, res, 'Forgot password');
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.resetPassword(req.body);
      this.sendSuccess(res, result.message);
    } catch (error) {
      this.handleError(error, res, 'Reset password');
    }
  }
}
