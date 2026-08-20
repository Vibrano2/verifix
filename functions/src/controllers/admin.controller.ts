/**
 * Admin Controller
 * Handles HTTP requests for admin operations
 */

import { Response } from 'express';
import { BaseController } from './base.controller';
import { AdminService } from '../services/admin.service';
import { ProformaService } from '../services/proforma.service';
import { AuthenticatedRequest } from '../types';

export class AdminController extends BaseController {
  private adminService: AdminService;
  private proformaService: ProformaService;

  constructor() {
    super();
    this.adminService = new AdminService();
    this.proformaService = new ProformaService();
  }

  /**
   * GET /api/admin/verification-queue
   */
  async getVerificationQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { limit, offset } = req.query;

      const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
      const parsedOffset = offset ? parseInt(offset as string, 10) : 0;

      const queue = await this.adminService.getVerificationQueue(parsedLimit, parsedOffset);

      this.sendSuccess(res, 'Verification queue fetched successfully', {
        artisans: queue,
        count: queue.length,
        limit: parsedLimit,
        offset: parsedOffset
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

  async getProformaQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const queue = await this.proformaService.getAdminQueue();
      this.sendSuccess(res, 'Proforma queue fetched successfully', { queue });
    } catch (error) {
      this.handleError(error, res, 'Get proforma queue');
    }
  }

  /**
   * GET /api/admin/flags
   */
  async getFlags(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const flags = await this.adminService.getArtisansWithFlags();
      this.sendSuccess(res, 'Artisans with no-response flags fetched successfully', flags);
    } catch (error) {
      this.handleError(error, res, 'Get flags');
    }
  }

  async approveProforma(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      await this.proformaService.approveProforma(id, notes);
      this.sendSuccess(res, 'Proforma invoice approved successfully');
    } catch (error) {
      this.handleError(error, res, 'Approve proforma');
    }
  }

  async rejectProforma(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) {
        this.sendBadRequest(res, 'Rejection reason is required');
        return;
      }
      await this.proformaService.rejectProforma(id, reason);
      this.sendSuccess(res, 'Proforma invoice rejected successfully');
    } catch (error) {
      this.handleError(error, res, 'Reject proforma');
    }
  }
}
