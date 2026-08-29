/**
 * Rating Service
 * Business logic for rating operations
 */

import { BaseService } from './base.service';
import { RatingRepository, ArtisanRepository } from '../repositories';
import { Rating } from '../models/rating.model';
import { AnalyticsService } from './analytics.service';

// Typed duplicate-rating error so the controller can return 409 cleanly
export class DuplicateRatingError extends Error {
  constructor() {
    super('Rating already exists for this job');
    this.name = 'DuplicateRatingError';
  }
}

export class RatingService extends BaseService {
  private ratingRepo: RatingRepository;
  private artisanRepo: ArtisanRepository;

  constructor() {
    super();
    this.ratingRepo = new RatingRepository();
    this.artisanRepo = new ArtisanRepository();
  }

  /**
   * Submit rating for a job
   * Prevents duplicate ratings (409 Conflict)
   * Recalculates artisan reputation_score
   */
  async submitRating(data: {
    jobId: string;
    artisanUid: string;
    clientUid: string;
    score: number;
    review?: string;
  }): Promise<Rating> {
    try {
      this.validateRequired(data, ['jobId', 'artisanUid', 'clientUid', 'score']);

      // Validate score (1-5)
      if (data.score < 1 || data.score > 5 || !Number.isInteger(data.score)) {
        throw new Error('Rating score must be an integer between 1 and 5');
      }

      // Check for duplicate rating — PRD C-006: duplicate rejected with 409
      const existingRating = await this.ratingRepo.findByJobId(data.jobId);
      if (existingRating) {
        throw new DuplicateRatingError();
      }

      // Create rating
      const rating = await this.ratingRepo.createRating({
        job_id: data.jobId,
        artisan_uid: data.artisanUid,
        client_uid: data.clientUid,
        score: data.score,
        review: data.review
      });

      // Recalculate artisan reputation_score
      await this.updateArtisanReputation(data.artisanUid);

      this.logOperation('rating-submitted', {
        jobId: data.jobId,
        artisanUid: data.artisanUid,
        score: data.score
      });

      // PRD §5.1: fire rating_submitted analytics event
      new AnalyticsService().trackEvent('rating_submitted', data.clientUid, {
        job_id: data.jobId,
        artisan_uid: data.artisanUid,
        score: data.score
      }).catch(() => {});

      return rating;
    } catch (error) {
      this.handleError(error, 'Submit rating');
    }
  }

  /**
   * Update artisan reputation score
   * Calculates average of all ratings
   */
  private async updateArtisanReputation(artisanUid: string): Promise<void> {
    try {
      const averageRating = await this.ratingRepo.calculateAverageRating(artisanUid);

      await this.artisanRepo.updateReputationScore(artisanUid, averageRating);

      this.logOperation('reputation-updated', {
        artisanUid,
        newScore: averageRating
      });
    } catch (error) {
      this.logger.error('Failed to update artisan reputation', { artisanUid, error });
      // Don't throw - rating was saved successfully
    }
  }

  /**
   * Get ratings for an artisan
   */
  async getArtisanRatings(artisanUid: string): Promise<Rating[]> {
    try {
      return await this.ratingRepo.findByArtisanUid(artisanUid);
    } catch (error) {
      this.handleError(error, 'Get artisan ratings');
    }
  }

  /**
   * Get rating statistics for an artisan
   */
  async getArtisanRatingStats(artisanUid: string): Promise<{
    average: number | null;
    total: number;
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  }> {
    try {
      return await this.ratingRepo.getArtisanRatingStats(artisanUid);
    } catch (error) {
      this.handleError(error, 'Get artisan rating stats');
    }
  }

  /**
   * Check if rating exists for job
   */
  async ratingExistsForJob(jobId: string): Promise<boolean> {
    try {
      return await this.ratingRepo.ratingExistsForJob(jobId);
    } catch (error) {
      this.handleError(error, 'Check rating exists');
    }
  }

  /**
   * Get rating for a specific job
   */
  async getRatingForJob(jobId: string): Promise<Rating | null> {
    try {
      return await this.ratingRepo.findByJobId(jobId);
    } catch (error) {
      this.handleError(error, 'Get rating for job');
    }
  }
}
