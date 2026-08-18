/**
 * Artisan Controller
 * Handles HTTP requests for artisan operations
 */

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

  /**
   * POST /api/artisans/signup
   */
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

  /**
   * POST /v1/artisans (Unified Registration)
   */
  async registerArtisan(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const result = await this.artisanService.registerArtisan(data);
      this.sendCreated(res, 'Artisan registered successfully', { data: result?.profile }); // match requested payload response: { data: { uid, is_verified } }
    } catch (error) {
      this.handleError(error, res, 'Register artisan');
    }
  }

  /**
   * GET /v1/artisans (Public Directory)
   */
  async listArtisans(req: Request, res: Response): Promise<void> {
    try {
      const { trade, location, available } = req.query;
      const artisans = await this.artisanService.listArtisans({
        trade: trade as string,
        location: location as string,
        available: available === 'true'
      });
      this.sendSuccess(res, 'Artisans fetched successfully', { data: artisans });
    } catch (error) {
      this.handleError(error, res, 'List artisans');
    }
  }

  /**
   * PATCH /api/artisans/:uid/availability
   */
  async updateAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      const { available } = req.body;

      await this.artisanService.updateAvailability(uid, available);

      this.sendSuccess(res, 'Availability updated successfully', { available });
    } catch (error) {
      this.handleError(error, res, 'Update availability');
    }
  }

  /**
   * PATCH /api/artisans/:uid/profile
   */
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

  /**
   * POST /api/artisans/:uid/photo
   */
  async addWorkPhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      
      const { url, filename } = await uploadFile(req, `artisan_photos/${uid}`, 5 * 1024 * 1024);

      await this.artisanService.addWorkPhoto(uid, url);

      this.sendSuccess(res, 'Photo uploaded successfully', { url, filename });
    } catch (error: any) {
      if (error.message.includes('Invalid file type') || 
          error.message.includes('File too large') ||
          error.message.includes('File signature')) {
        this.sendBadRequest(res, error.message);
        return;
      }
      this.handleError(error, res, 'Add work photo');
    }
  }

  /**
   * POST /api/artisans/:uid/id-document
   */
  async uploadIDDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;
      
      const { url, filename } = await uploadFile(req, `id_documents/${uid}`, 10 * 1024 * 1024);

      await this.artisanService.uploadIDDocument(uid, url);

      this.sendSuccess(res, 'ID document uploaded successfully', { url, filename });
    } catch (error: any) {
      if (error.message.includes('Invalid file type') || 
          error.message.includes('File too large') ||
          error.message.includes('File signature')) {
        this.sendBadRequest(res, error.message);
        return;
      }
      this.handleError(error, res, 'Upload ID document');
    }
  }

  /**
   * GET /api/artisans/:uid
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;

      const profile = await this.artisanService.getProfile(uid);

      this.sendSuccess(res, 'Profile fetched successfully', { profile });
    } catch (error) {
      this.handleError(error, res, 'Get profile');
    }
  }

  /**
   * GET /api/artisans/:uid/dashboard
   */
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
