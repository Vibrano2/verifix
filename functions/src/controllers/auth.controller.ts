import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService();
  }

  private publicUser(user: any): Record<string, unknown> {
    return {
      uid: user.uid,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role
    };
  }

  async registerUser(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, first_name, last_name, role } = req.body;
      const user = await this.authService.registerUser({ idToken, first_name, last_name, role });
      this.sendCreated(res, 'User created successfully', this.publicUser(user));
    } catch (error) {
      this.handleError(error, res, 'Register user');
    }
  }

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const result = await this.authService.requestPasswordReset(email);
      this.sendSuccess(res, result.message);
    } catch (error) {
      this.handleError(error, res, 'Request password reset');
    }
  }

  async createCustomToken(req: Request, res: Response): Promise<void> {
    try {
      if (process.env.FUNCTIONS_EMULATOR !== 'true' || process.env.ENABLE_DEV_AUTH !== 'true') {
        return this.sendForbidden(res, 'This endpoint is only available in development mode');
      }

      const { phone } = req.body;
      const result = await this.authService.createCustomToken(phone);
      this.sendSuccess(res, 'Custom token created. Use this to sign in on the client.', result);
    } catch (error) {
      this.handleError(error, res, 'Create custom token');
    }
  }

  async sendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.body;
      const result = await this.authService.sendOTP(phone);
      this.sendSuccess(res, result.message);
    } catch (error) {
      this.handleError(error, res, 'Send OTP');
    }
  }

  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phone, otp, role } = req.body;
      const result = await this.authService.verifyOTP(phone, otp, role);
      res.status(200).json({ ...result, user: this.publicUser(result.user) });
    } catch (error) {
      this.handleError(error, res, 'Verify OTP');
    }
  }

  async verifyFirebaseLogin(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, role } = req.body;
      const result = await this.authService.verifyFirebaseLogin(idToken, role);
      res.status(200).json({ ...result, user: this.publicUser(result.user) });
    } catch (error) {
      this.handleError(error, res, 'Verify Firebase Login');
    }
  }
}
