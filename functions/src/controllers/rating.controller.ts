/**
 * Rating Controller
 * Handles HTTP requests for rating operations
 */

import { Response } from 'express';
import { BaseController } from './base.controller';
import { RatingService } from '../services';
import { AuthenticatedRequest } from '../types';

export class RatingController extends BaseController {
  private ratingService: RatingService;

  constructor() {
    super();
    this.ratingService = new RatingService();
  }

  /**
   * POST /api/jobs/:id/rating
   */
  async submitRating(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { id: jobId } = req.params;
      const { artisan_uid, score, review } = req.body;

      const rating = await this.ratingService.submitRating({
        jobId,
        artisanUid: artisan_uid,
        clientUid: req.user.uid,
        score,
        review
      });

      this.sendCreated(res, 'Rating submitted successfully', { rating });
    } catch (error: any) {
      // Check for duplicate rating
      if (error.message && error.message.includes('already exists')) {
        return this.sendConflict(res, 'Rating already exists for this job');
      }
      this.handleError(error, res, 'Submit rating');
    }
  }

  /**
   * GET /api/artisans/:uid/ratings
   */
  async getArtisanRatings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;

      const ratings = await this.ratingService.getArtisanRatings(uid);

      this.sendSuccess(res, 'Ratings fetched successfully', {
        ratings,
        count: ratings.length
      });
    } catch (error) {
      this.handleError(error, res, 'Get artisan ratings');
    }
  }

  /**
   * GET /api/artisans/:uid/rating-stats
   */
  async getRatingStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { uid } = req.params;

      const stats = await this.ratingService.getArtisanRatingStats(uid);

      this.sendSuccess(res, 'Rating statistics fetched successfully', stats);
    } catch (error) {
      this.handleError(error, res, 'Get rating stats');
    }
  }

  /**
   * GET /api/jobs/:id/rating
   */
  async getJobRating(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: jobId } = req.params;

      const rating = await this.ratingService.getRatingForJob(jobId);

      if (!rating) {
        return this.sendNotFound(res, 'No rating found for this job');
      }

      this.sendSuccess(res, 'Rating fetched successfully', { rating });
    } catch (error) {
      this.handleError(error, res, 'Get job rating');
    }
  }
}
