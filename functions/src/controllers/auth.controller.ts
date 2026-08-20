import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService();
  }

  async registerUser(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, first_name, last_name, role } = req.body;
      const user = await this.authService.registerUser({ idToken, first_name, last_name, role });
      this.sendCreated(res, 'User created successfully', user);
    } catch (error) {
      this.handleError(error, res, 'Register user');
    }
  }

  async registerAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, first_name, last_name } = req.body;
      const result = await this.authService.registerAdmin({ email, password, first_name, last_name });
      this.sendCreated(res, 'Admin registered successfully', result);
    } catch (error) {
      this.handleError(error, res, 'Register admin');
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
      res.status(200).json(result);
    } catch (error) {
      this.handleError(error, res, 'Verify OTP');
    }
  }

  async verifyEmailLogin(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, role } = req.body;
      const result = await this.authService.verifyEmailLogin(idToken, role);
      res.status(200).json(result);
    } catch (error) {
      this.handleError(error, res, 'Verify Email Login');
    }
  }

  async verifyFirebaseLogin(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, role } = req.body;
      const result = await this.authService.verifyEmailLogin(idToken, role);
      res.status(200).json(result);
    } catch (error) {
      this.handleError(error, res, 'Verify Firebase Login');
    }
  }
}
