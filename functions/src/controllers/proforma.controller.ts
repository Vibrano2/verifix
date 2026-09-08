import { Response } from 'express';
import { BaseController } from './base.controller';
import { ProformaService } from '../services/proforma.service';
import { AuthenticatedRequest } from '../types';
import { uploadFile } from '../utils/fileUpload';

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
      this.sendCreated(res, 'Proforma invoice submitted successfully', { invoice });
    } catch (error: any) {
      if (error.message.includes('Forbidden')) {
        this.sendForbidden(res, error.message);
      } else {
        this.handleError(error, res, 'Submit proforma');
      }
    }
  }

  async uploadInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'artisan') {
        return this.sendUnauthorized(res, 'Only artisans can upload proforma invoices');
      }
      const { jobId } = req.params;
      await this.proformaService.assertCanSubmit(req.user.uid, jobId);
      const { path, filename } = await uploadFile(
        req,
        `proforma_documents/${req.user.uid}/${jobId}`,
        {
          maxSizeBytes: 10 * 1024 * 1024,
          allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
          publicRead: false,
          accessLabel: 'private-proforma',
          customMetadata: { artisanUid: req.user.uid, jobId }
        }
      );
      this.sendCreated(res, 'Proforma invoice uploaded successfully', { path, filename });
    } catch (error: any) {
      if (error?.message?.includes('Forbidden')) {
        return this.sendForbidden(res, error.message);
      }
      if (['Invalid file', 'File too large', 'File signature', 'No file', 'Only one', 'Too many']
        .some(message => error?.message?.includes(message))) {
        return this.sendBadRequest(res, error.message);
      }
      this.handleError(error, res, 'Upload proforma invoice');
    }
  }

  async getJobProformas(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { jobId } = req.params;
      const isAdmin = Boolean(process.env.ADMIN_UID && req.user.uid === process.env.ADMIN_UID);
      
      const invoices = await this.proformaService.getJobProformas(jobId, req.user.uid, isAdmin);
      this.sendSuccess(res, 'Proforma invoices fetched successfully', { invoices });
    } catch (error: any) {
      if (error.message.includes('Forbidden')) {
        this.sendForbidden(res, error.message);
      } else {
        this.handleError(error, res, 'Get job proformas');
      }
    }
  }
}
