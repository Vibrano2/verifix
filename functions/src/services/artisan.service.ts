/**
 * Artisan Service
 * Business logic for artisan operations
 */

import { BaseService } from './base.service';
import { ArtisanRepository, UserRepository } from '../repositories';
import { Artisan, UpdateArtisanProfileDTO } from '../models/artisan.model';
import { getCategoryForTrade, isValidTrade, Trade } from '../constants/trades';

export class ArtisanService extends BaseService {
  private artisanRepo: ArtisanRepository;
  private userRepo: UserRepository;

  constructor() {
    super();
    this.artisanRepo = new ArtisanRepository();
    this.userRepo = new UserRepository();
  }

  /**
   * Complete artisan profile signup
   */
  async completeProfile(uid: string, data: {
    trade: string;
    location: {
      city: string;
      state: string;
      lga: string;
      address?: string;
    };
    tagline: string;
    bio?: string;
    experience_years?: number;
    hourly_rate?: number;
  }): Promise<Artisan> {
    try {
      this.validateRequired(data, ['trade', 'location', 'tagline']);

      // Validate trade is in locked enum
      if (!isValidTrade(data.trade)) {
        throw new Error(`Invalid trade. Must be one of the 24 locked trades.`);
      }

      // Verify user exists and is artisan
      const user = await this.userRepo.findById(uid);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'artisan') {
        throw new Error('Only artisans can create artisan profiles');
      }

      // Get category from trade
      const category = getCategoryForTrade(data.trade as Trade);

      // Create/update artisan profile
      const artisanData: any = {
        uid,
        trade: data.trade as Trade,
        category,
        location: data.location,
        tagline: data.tagline,
        bio: data.bio,
        experience_years: data.experience_years,
        hourly_rate: data.hourly_rate,
        is_available: false,
        is_verified: false,
        verification_status: 'pending',
        work_photos: [],
        completed_jobs: 0,
        reputation_score: null,
        updated_at: new Date()
      };

      const artisan = await this.artisanRepo.update(uid, artisanData);

      this.logOperation('artisan-profile-completed', { uid, trade: data.trade });

      return artisan!;
    } catch (error) {
      this.handleError(error, 'Complete artisan profile');
    }
  }

  /**
   * Update artisan availability
   */
  async updateAvailability(uid: string, available: boolean): Promise<void> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) {
        throw new Error('Artisan profile not found');
      }

      await this.artisanRepo.update(uid, {
        is_available: available,
        updated_at: new Date()
      } as any);

      this.logOperation('artisan-availability-updated', { uid, available });
    } catch (error) {
      this.handleError(error, 'Update availability');
    }
  }

  /**
   * Update artisan profile
   */
  async updateProfile(uid: string, updates: UpdateArtisanProfileDTO): Promise<Artisan> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) {
        throw new Error('Artisan profile not found');
      }

      // If trade is being updated, update category too
      let updateData: any = { ...updates, updated_at: new Date() };
      
      if (updates.trade) {
        if (!isValidTrade(updates.trade as string)) {
          throw new Error('Invalid trade');
        }
        updateData.category = getCategoryForTrade(updates.trade);
      }

      const updatedArtisan = await this.artisanRepo.update(uid, updateData);

      this.logOperation('artisan-profile-updated', { uid });

      return updatedArtisan!;
    } catch (error) {
      this.handleError(error, 'Update artisan profile');
    }
  }

  /**
   * Add work photo
   */
  async addWorkPhoto(uid: string, photoUrl: string): Promise<void> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) {
        throw new Error('Artisan profile not found');
      }

      const workPhotos = artisan.work_photos || [];
      workPhotos.push(photoUrl);

      await this.artisanRepo.update(uid, {
        work_photos: workPhotos,
        updated_at: new Date()
      } as any);

      this.logOperation('work-photo-added', { uid, photoUrl });
    } catch (error) {
      this.handleError(error, 'Add work photo');
    }
  }

  /**
   * Upload ID document
   */
  async uploadIDDocument(uid: string, documentUrl: string): Promise<void> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) {
        throw new Error('Artisan profile not found');
      }

      await this.artisanRepo.update(uid, {
        id_document_url: documentUrl,
        updated_at: new Date()
      } as any);

      this.logOperation('id-document-uploaded', { uid });
    } catch (error) {
      this.handleError(error, 'Upload ID document');
    }
  }

  /**
   * Get artisan profile
   */
  async getProfile(uid: string): Promise<Artisan> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) {
        throw new Error('Artisan profile not found');
      }

      return artisan;
    } catch (error) {
      this.handleError(error, 'Get artisan profile');
    }
  }

  /**
   * Get artisan dashboard data
   */
  async getDashboard(uid: string): Promise<{
    profile: Artisan;
    finances: {
      held: number;
      released: number;
      total_earnings: number;
    };
    matches: {
      pending: number;
      accepted: number;
      completed: number;
      total: number;
    };
  }> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) {
        throw new Error('Artisan profile not found');
      }

      // This would call transaction and match repositories
      // For now, returning placeholder structure
      return {
        profile: artisan,
        finances: {
          held: 0,
          released: 0,
          total_earnings: 0
        },
        matches: {
          pending: 0,
          accepted: 0,
          completed: 0,
          total: 0
        }
      };
    } catch (error) {
      this.handleError(error, 'Get artisan dashboard');
    }
  }

  /**
   * Find artisans by trade
   */
  async findByTrade(trade: string, limit?: number): Promise<Artisan[]> {
    try {
      if (!isValidTrade(trade)) {
        throw new Error('Invalid trade');
      }

      const artisans = await this.artisanRepo.findByTrade(trade as Trade, limit);
      return artisans;
    } catch (error) {
      this.handleError(error, 'Find artisans by trade');
    }
  }
}
