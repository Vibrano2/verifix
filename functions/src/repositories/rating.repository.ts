/**
 * Rating Repository
 * Handles all rating-related database operations
 * Per PRD v1.1: ratings are a separate collection, not a field on matches
 */

import { BaseRepository } from './base.repository';
import { COLLECTIONS } from '../constants';
import { Rating } from '../models/rating.model';
import { Logger } from '../utils/logger';
import * as admin from 'firebase-admin';

export class RatingRepository extends BaseRepository<Rating> {
  constructor() {
    super(COLLECTIONS.RATINGS);
  }

  /**
   * Find rating by job ID
   */
  async findByJobId(jobId: string): Promise<Rating | null> {
    try {
      const snapshot = await this.getCollection()
        .where('job_id', '==', jobId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { rating_id: doc.id, ...doc.data() } as Rating;
    } catch (error) {
      Logger.error('Error finding rating by job ID', { jobId, error });
      throw error;
    }
  }

  /**
   * Find all ratings for an artisan
   */
  async findByArtisanUid(artisanUid: string): Promise<Rating[]> {
    try {
      const snapshot = await this.getCollection()
        .where('artisan_uid', '==', artisanUid)
        .orderBy('created_at', 'desc')
        .get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
        rating_id: doc.id,
        ...doc.data()
      } as Rating));
    } catch (error) {
      Logger.error('Error finding ratings by artisan UID', { artisanUid, error });
      throw error;
    }
  }

  /**
   * Calculate average rating (reputation_score) for an artisan
   */
  async calculateAverageRating(artisanUid: string): Promise<number | null> {
    try {
      const ratings = await this.findByArtisanUid(artisanUid);

      if (ratings.length === 0) {
        return null;
      }

      const sum = ratings.reduce((acc, rating) => acc + rating.score, 0);
      const average = sum / ratings.length;

      return Math.round(average * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      Logger.error('Error calculating average rating', { artisanUid, error });
      throw error;
    }
  }

  /**
   * Check if a rating already exists for a job (prevent duplicate ratings)
   */
  async ratingExistsForJob(jobId: string): Promise<boolean> {
    try {
      const rating = await this.findByJobId(jobId);
      return rating !== null;
    } catch (error) {
      Logger.error('Error checking if rating exists for job', { jobId, error });
      throw error;
    }
  }

  /**
   * Create rating and return with ID
   */
  async createRating(data: {
    job_id: string;
    artisan_uid: string;
    client_uid: string;
    score: number;
    review?: string;
  }): Promise<Rating> {
    try {
      // Check for duplicate rating
      const exists = await this.ratingExistsForJob(data.job_id);
      if (exists) {
        throw new Error('Rating already exists for this job');
      }

      const ratingData = {
        ...data,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.getCollection().add(ratingData);
      
      return {
        rating_id: docRef.id,
        ...data,
        created_at: new Date()
      };
    } catch (error) {
      Logger.error('Error creating rating', { data, error });
      throw error;
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
      const ratings = await this.findByArtisanUid(artisanUid);

      if (ratings.length === 0) {
        return {
          average: null,
          total: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;

      ratings.forEach(rating => {
        sum += rating.score;
        distribution[rating.score as keyof typeof distribution]++;
      });

      const average = Math.round((sum / ratings.length) * 10) / 10;

      return {
        average,
        total: ratings.length,
        distribution
      };
    } catch (error) {
      Logger.error('Error getting artisan rating stats', { artisanUid, error });
      throw error;
    }
  }
}
