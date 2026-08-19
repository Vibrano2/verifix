import { Response } from 'express';
import { BaseController } from './base.controller';
import { ProformaService } from '../services/proforma.service';
import { AuthenticatedRequest } from '../types';

export class ProformaController extends BaseController {
  private proformaService: ProformaService;

  constructor() {
    super();
    this.proformaService = new ProformaService();
  }

  async submitProforma(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'artisan') {
        return this.sendUnauthorized(res, 'Only artisans can submit proforma invoices');
      }

      const invoice = await this.proformaService.submitProforma(req.user.uid, req.body);
      this.sendSuccess(res, 'Proforma invoice submitted successfully', { invoice }, 201);
    } catch (error: any) {
      if (error.message.includes('Forbidden')) {
        this.sendError(res, error.message, 403);
      } else {
        this.handleError(error, res, 'Submit proforma');
      }
    }
  }

  async getJobProformas(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { jobId } = req.params;
      const isAdmin = req.user.role === 'admin';
      
      const invoices = await this.proformaService.getJobProformas(jobId, req.user.uid, isAdmin);
      this.sendSuccess(res, 'Proforma invoices fetched successfully', { invoices });
    } catch (error: any) {
      if (error.message.includes('Forbidden')) {
        this.sendError(res, error.message, 403);
      } else {
        this.handleError(error, res, 'Get job proformas');
      }
    }
  }
}
