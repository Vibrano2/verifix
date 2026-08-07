/**
 * Admin Controller
 * Handles HTTP requests for admin operations
 */

import { Response } from 'express';
import { BaseController } from './base.controller';
import { AdminService } from '../services';
import { AuthenticatedRequest } from '../types';

export class AdminController extends BaseController {
  private adminService: AdminService;

  constructor() {
    super();
    this.adminService = new AdminService();
  }

  /**
   * GET /api/admin/verification-queue
   */
  async getVerificationQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const queue = await this.adminService.getVerificationQueue();

      this.sendSuccess(res, 'Verification queue fetched successfully', {
        artisans: queue,
        count: queue.length
      });
    } catch (error) {
      this.handleError(error, res, 'Get verification queue');
    }
  }

  /**
   * POST /api/admin/verify/:uid
   */
  async verifyArtisan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;

      await this.adminService.verifyArtisan(uid);

      this.sendSuccess(res, 'Artisan verified successfully', {
        uid,
        is_verified: true
      });
    } catch (error) {
      this.handleError(error, res, 'Verify artisan');
    }
  }

  /**
   * POST /api/admin/reject/:uid
   */
  async rejectArtisan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      const { reason } = req.body;

      await this.adminService.rejectArtisan(uid, reason);

      this.sendSuccess(res, 'Artisan verification rejected', {
        uid,
        reason: reason || 'Not specified'
      });
    } catch (error) {
      this.handleError(error, res, 'Reject artisan');
    }
  }

  /**
   * GET /api/admin/stats
   */
  async getStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await this.adminService.getStatistics();

      this.sendSuccess(res, 'Statistics fetched successfully', stats);
    } catch (error) {
      this.handleError(error, res, 'Get statistics');
    }
  }

  /**
   * GET /api/admin/analytics
   */
  async getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const analytics = await this.adminService.getAnalytics();

      this.sendSuccess(res, 'Analytics data fetched successfully', analytics);
    } catch (error) {
      this.handleError(error, res, 'Get analytics');
    }
  }
}
