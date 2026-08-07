/**
 * Artisan Repository
 * Handles all artisan-related database operations
 */

import { BaseRepository } from './base.repository';
import { COLLECTIONS } from '../constants';
import { Logger } from '../utils/logger';
import * as admin from 'firebase-admin';

export interface Artisan {
  uid: string;
  trade: string;
  location: {
    city: string;
    state: string;
    lga: string;
  };
  tagline: string;
  id_document_url?: string;
  work_photos?: string[];
  is_available: boolean;
  is_verified: boolean;
  verification_status: string;
  rating?: number;
  total_jobs?: number;
  completed_jobs?: number;
  created_at: Date | admin.firestore.Timestamp;
}

export class ArtisanRepository extends BaseRepository<Artisan> {
  constructor() {
    super(COLLECTIONS.ARTISANS);
  }

  /**
   * Find artisans by trade
   * @param trade - Trade type
   * @param limit - Maximum number of results
   * @returns Array of artisans
   */
  async findByTrade(trade: string, limit?: number): Promise<Artisan[]> {
    try {
      let query = this.getCollection()
        .where('trade', '==', trade);
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data() as Artisan);
    } catch (error) {
      Logger.error('Error finding artisans by trade', error);
      throw error;
    }
  }

  /**
   * Find verified and available artisans
   * @param trade - Trade type (optional)
   * @param state - State location (optional)
   * @returns Array of available artisans
   */
  async findAvailable(trade?: string, state?: string): Promise<Artisan[]> {
    try {
      let query = this.getCollection()
        .where('is_available', '==', true)
        .where('is_verified', '==', true);
      
      if (trade) {
        query = query.where('trade', '==', trade);
      }
      
      if (state) {
        query = query.where('location.state', '==', state);
      }
      
      // Sort by rating (highest first)
      query = query.orderBy('rating', 'desc');
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data() as Artisan);
    } catch (error) {
      Logger.error('Error finding available artisans', error);
      throw error;
    }
  }

  /**
   * Find artisans pending verification
   * @returns Array of unverified artisans
   */
  async findPendingVerification(): Promise<Artisan[]> {
    try {
      const snapshot = await this.getCollection()
        .where('verification_status', '==', 'pending')
        .orderBy('created_at', 'desc')
        .get();
      
      return snapshot.docs.map(doc => doc.data() as Artisan);
    } catch (error) {
      Logger.error('Error finding artisans pending verification', error);
      throw error;
    }
  }

  /**
   * Update artisan availability
   * @param uid - Artisan UID
   * @param isAvailable - Availability status
   * @returns Updated artisan
   */
  async updateAvailability(uid: string, isAvailable: boolean): Promise<Artisan | null> {
    try {
      await this.getCollection().doc(uid).update({
        is_available: isAvailable
      });
      return await this.findById(uid);
    } catch (error) {
      Logger.error('Error updating artisan availability', error);
      throw error;
    }
  }

  /**
   * Verify artisan
   * @param uid - Artisan UID
   * @returns Updated artisan
   */
  async verify(uid: string): Promise<Artisan | null> {
    try {
      await this.getCollection().doc(uid).update({
        is_verified: true,
        verification_status: 'approved'
      });
      return await this.findById(uid);
    } catch (error) {
      Logger.error('Error verifying artisan', error);
      throw error;
    }
  }

  /**
   * Reject artisan verification
   * @param uid - Artisan UID
   * @param reason - Rejection reason
   * @returns Updated artisan
   */
  async reject(uid: string, reason?: string): Promise<Artisan | null> {
    try {
      const updateData: any = {
        is_verified: false,
        verification_status: 'rejected'
      };
      
      if (reason) {
        updateData.rejection_reason = reason;
      }
      
      await this.getCollection().doc(uid).update(updateData);
      return await this.findById(uid);
    } catch (error) {
      Logger.error('Error rejecting artisan', error);
      throw error;
    }
  }

  /**
   * Update artisan rating
   * @param uid - Artisan UID
   * @param newRating - New rating value
   * @returns Updated artisan
   */
  async updateRating(uid: string, newRating: number): Promise<Artisan | null> {
    try {
      const artisan = await this.findById(uid);
      if (!artisan) {
        return null;
      }

      const currentRating = artisan.rating || 0;
      const totalJobs = artisan.total_jobs || 0;
      
      // Calculate new average rating
      const updatedRating = ((currentRating * totalJobs) + newRating) / (totalJobs + 1);

      await this.getCollection().doc(uid).update({
        rating: updatedRating,
        total_jobs: admin.firestore.FieldValue.increment(1)
      });

      return await this.findById(uid);
    } catch (error) {
      Logger.error('Error updating artisan rating', error);
      throw error;
    }
  }
}
