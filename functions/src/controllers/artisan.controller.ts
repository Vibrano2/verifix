import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ArtisanService } from '../services';
import { AuthenticatedRequest } from '../types';
import { uploadFile } from '../utils/fileUpload';

export class ArtisanController extends BaseController {
  private artisanService: ArtisanService;

  constructor() {
    super();
    this.artisanService = new ArtisanService();
  }

  async completeProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { trade, location, tagline, bio, experience_years, hourly_rate, skills, portfolio } = req.body;

      const artisan = await this.artisanService.completeProfile(req.user.uid, {
        trade,
        location,
        tagline,
        bio,
        experience_years,
        hourly_rate,
        skills,
        portfolio
      });

      this.sendCreated(res, 'Artisan profile created successfully', { profile: artisan });
    } catch (error) {
      this.handleError(error, res, 'Complete artisan profile');
    }
  }

  async registerArtisan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const data = req.body;
      const result = await this.artisanService.registerArtisan(req.user.uid, data, req.user.phone_number);
      this.sendCreated(res, 'Artisan registered successfully', { data: result?.profile });
    } catch (error) {
      this.handleError(error, res, 'Register artisan');
    }
  }

  async listArtisans(req: Request, res: Response): Promise<void> {
    try {
      const { trade, location, available, limit } = req.query;
      const artisans = await this.artisanService.listArtisans({
        trade: trade as string,
        location: location as string,
        available: available === undefined ? undefined : available === 'true',
        limit: typeof limit === 'number' ? limit : undefined
      });
      this.sendSuccess(res, 'Artisans fetched successfully', { data: artisans });
    } catch (error) {
      this.handleError(error, res, 'List artisans');
    }
  }

  async updateAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      const available = req.body.available ?? req.body.is_available;

      await this.artisanService.updateAvailability(uid, available);
      this.sendSuccess(res, 'Availability updated successfully', { available });
    } catch (error) {
      this.handleError(error, res, 'Update availability');
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      const updates = req.body;

      const artisan = await this.artisanService.updateProfile(uid, updates);
      this.sendSuccess(res, 'Profile updated successfully', { profile: artisan });
    } catch (error) {
      this.handleError(error, res, 'Update profile');
    }
  }

  async addWorkPhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      const { url, filename } = await uploadFile(req, `artisan_photos/${uid}`, {
        maxSizeBytes: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        publicRead: true
      });

      await this.artisanService.addWorkPhoto(uid, url!);
      this.sendSuccess(res, 'Photo uploaded successfully', { url, filename });
    } catch (error: any) {
      if (error.message.includes('Invalid file') ||
          error.message.includes('File too large') ||
          error.message.includes('File signature') ||
          error.message.includes('No file') ||
          error.message.includes('Only one') ||
          error.message.includes('Too many')) {
        this.sendBadRequest(res, error.message);
        return;
      }
      this.handleError(error, res, 'Add work photo');
    }
  }

  async uploadIDDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      const { path, filename } = await uploadFile(req, `id_documents/${uid}`, {
        maxSizeBytes: 10 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        publicRead: false
      });

      await this.artisanService.uploadIDDocument(uid, path);
      this.sendSuccess(res, 'ID document uploaded successfully', { filename });
    } catch (error: any) {
      if (error.message.includes('Invalid file') ||
          error.message.includes('File too large') ||
          error.message.includes('File signature') ||
          error.message.includes('No file') ||
          error.message.includes('Only one') ||
          error.message.includes('Too many')) {
        this.sendBadRequest(res, error.message);
        return;
      }
      this.handleError(error, res, 'Upload ID document');
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      const adminUid = process.env.ADMIN_UID;
      const isAdmin = Boolean(adminUid && req.user?.uid === adminUid);
      const profile = await this.artisanService.getProfile(uid, req.user?.uid, isAdmin);
      this.sendSuccess(res, 'Profile fetched successfully', { profile });
    } catch (error) {
      this.handleError(error, res, 'Get profile');
    }
  }

  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      const dashboard = await this.artisanService.getDashboard(uid);
      this.sendSuccess(res, 'Dashboard data fetched successfully', dashboard);
    } catch (error) {
      this.handleError(error, res, 'Get dashboard');
    }
  }
}
