import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { ArtisanRepository, UserRepository } from '../repositories';
import { Artisan, UpdateArtisanProfileDTO, PortfolioProject, PublicArtisanDTO, mapToPublicArtisan } from '../models/artisan.model';
import { getCategoryForTrade, isValidTrade, Trade } from '../constants/trades';
import { createTransferRecipient } from '../utils/paystack';
import { validateFileSignature } from '../utils/fileUpload';

export class ArtisanService extends BaseService {
  private artisanRepo: ArtisanRepository;
  private userRepo: UserRepository;

  constructor() {
    super();
    this.artisanRepo = new ArtisanRepository();
    this.userRepo = new UserRepository();
  }

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
    skills?: string[];
    portfolio?: PortfolioProject[];
  }): Promise<Artisan> {
    try {
      this.validateRequired(data, ['trade', 'location', 'tagline']);

      if (!isValidTrade(data.trade)) {
        throw new Error('Invalid trade. Must be one of the 24 locked trades.');
      }

      const user = await this.userRepo.findById(uid);
      if (!user) throw new Error('User not found');
      if (user.role !== 'artisan') throw new Error('Only artisans can create artisan profiles');

      const category = getCategoryForTrade(data.trade as Trade);

      const artisanData: any = {
        uid,
        trade: data.trade as Trade,
        category,
        location: data.location,
        tagline: data.tagline,
        bio: data.bio,
        experience_years: data.experience_years,
        hourly_rate: data.hourly_rate,
        skills: data.skills || [],
        portfolio: data.portfolio || [],
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

  async registerArtisan(uid: string, data: any): Promise<{ user: any, profile: Artisan }> {
    try {
      this.validateRequired(data, [
        'first_name', 'last_name', 'phone', 'trade', 'location', 'tagline'
      ]);

      if (!isValidTrade(data.trade)) {
        throw new Error('Invalid trade. Must be one of the 24 locked trades.');
      }

      // Update the existing user document with their first/last name and phone
      const userData: any = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        phone: data.phone,
        role: 'artisan',
        updated_at: new Date()
      };
      
      const user = await this.userRepo.update(uid, userData);

      let paystack_recipient_code = '';
      if (data.bank_details) {
        paystack_recipient_code = await createTransferRecipient(
          data.bank_details.account_name,
          data.bank_details.account_number,
          data.bank_details.bank_code
        );
      }

      const bucket = admin.storage().bucket();
      
      let id_document_url = data.id_photo || '';
      if (data.id_document_base64) {
        const buffer = Buffer.from(data.id_document_base64, 'base64');
        if (!validateFileSignature(buffer, 'image/jpeg') && !validateFileSignature(buffer, 'image/png')) {
          throw new Error('Invalid ID document file format. Only JPEG and PNG images are allowed.');
        }
        const file = bucket.file(`id_documents/${uid}/id_doc_${Date.now()}.jpg`);
        await file.save(buffer, { contentType: 'image/jpeg' });
        await file.makePublic();
        id_document_url = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      }

      const work_photos: string[] = data.work_photos || [];
      if (data.work_photos_base64 && Array.isArray(data.work_photos_base64)) {
        for (let i = 0; i < data.work_photos_base64.length; i++) {
          const buffer = Buffer.from(data.work_photos_base64[i], 'base64');
          if (!validateFileSignature(buffer, 'image/jpeg') && !validateFileSignature(buffer, 'image/png')) {
            continue;
          }
          const file = bucket.file(`artisan_photos/${uid}/work_${Date.now()}_${i}.jpg`);
          await file.save(buffer, { contentType: 'image/jpeg' });
          await file.makePublic();
          work_photos.push(`https://storage.googleapis.com/${bucket.name}/${file.name}`);
        }
      }

      const category = getCategoryForTrade(data.trade as Trade);
      
      const artisanData: any = {
        uid,
        trade: data.trade as Trade,
        category,
        location: typeof data.location === 'string' ? { address: data.location } : data.location,
        tagline: data.tagline,
        bio: data.bio || '',
        experience_years: data.experience_years || 0,
        hourly_rate: data.hourly_rate || 0,
        skills: data.services || data.skills || [],
        portfolio: data.portfolio || [],
        is_available: false,
        is_verified: false,
        verification_status: 'pending',
        work_photos,
        id_document_url,
        nin: data.nin || '',
        bank_details: data.bank_details || null,
        paystack_recipient_code,
        completed_jobs: 0,
        reputation_score: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const profile = await this.artisanRepo.create(uid, artisanData);
      this.logOperation('artisan-registered', { uid });

      return { user, profile: profile! };
    } catch (error) {
      this.handleError(error, 'Register artisan');
    }
  }

  async updateAvailability(uid: string, available: boolean): Promise<void> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) throw new Error('Artisan profile not found');

      await this.artisanRepo.update(uid, {
        is_available: available,
        updated_at: new Date()
      } as any);

      this.logOperation('artisan-availability-updated', { uid, available });
    } catch (error) {
      this.handleError(error, 'Update availability');
    }
  }

  async updateProfile(uid: string, updates: UpdateArtisanProfileDTO): Promise<Artisan> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) throw new Error('Artisan profile not found');

      let updateData: any = { ...updates, updated_at: new Date() };
      
      if (updates.trade) {
        if (!isValidTrade(updates.trade as string)) throw new Error('Invalid trade');
        updateData.category = getCategoryForTrade(updates.trade as Trade);
      }

      const updatedArtisan = await this.artisanRepo.update(uid, updateData);
      this.logOperation('artisan-profile-updated', { uid });

      return updatedArtisan!;
    } catch (error) {
      this.handleError(error, 'Update artisan profile');
    }
  }

  async addWorkPhoto(uid: string, photoUrl: string): Promise<void> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) throw new Error('Artisan profile not found');

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

  async uploadIDDocument(uid: string, documentUrl: string): Promise<void> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) throw new Error('Artisan profile not found');

      await this.artisanRepo.update(uid, {
        id_document_url: documentUrl,
        updated_at: new Date()
      } as any);

      this.logOperation('id-document-uploaded', { uid });
    } catch (error) {
      this.handleError(error, 'Upload ID document');
    }
  }

  async getProfile(uid: string, requestorUid?: string, isAdmin?: boolean): Promise<Artisan | Omit<Artisan, 'nin' | 'id_document_url'>> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) throw new Error('Artisan profile not found');

      // PRD §7.5 / §11.4: NIN and ID documents restricted to admin UID only
      if (!isAdmin && requestorUid !== uid) {
        const { nin, id_document_url, bank_details, paystack_recipient_code, rejection_reason, ...publicProfile } = artisan as any;
        return publicProfile;
      }

      return artisan;
    } catch (error) {
      this.handleError(error, 'Get artisan profile');
    }
  }

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
      if (!artisan) throw new Error('Artisan profile not found');

      const db = admin.firestore();

      const matchesSnapshot = await db.collection('matches')
        .where('artisan_uid', '==', uid)
        .get();

      let pending = 0, accepted = 0, completed = 0;
      matchesSnapshot.docs.forEach((doc: any) => {
        const status = doc.data().status;
        if (status === 'pending') pending++;
        if (status === 'accepted') accepted++;
        if (status === 'completed') completed++;
      });

      const transactionsSnapshot = await db.collection('transactions')
        .where('artisan_uid', '==', uid)
        .get();

      let held = 0, released = 0;
      transactionsSnapshot.docs.forEach((doc: any) => {
        const tx = doc.data();
        // Prefer v1.9 nested amounts; fall back to legacy flat fields
        const lockedValue = tx.amounts?.job_value ?? tx.locked_job_value ?? 0;
        const commission = tx.amounts
          ? (lockedValue - (tx.amounts.artisan_net_labor ?? lockedValue))
          : (tx.commission_retained ?? 0);
        if (tx.status === 'held') {
          held += lockedValue;
        } else if (tx.status === 'released') {
          released += lockedValue - commission;
        }
      });

      return {
        profile: artisan,
        finances: {
          held,
          released,
          total_earnings: released
        },
        matches: {
          pending,
          accepted,
          completed,
          total: matchesSnapshot.size
        }
      };
    } catch (error) {
      this.handleError(error, 'Get artisan dashboard');
    }
  }

  async findByTrade(trade: string, limit?: number): Promise<PublicArtisanDTO[]> {
    try {
      if (!isValidTrade(trade)) throw new Error('Invalid trade');

      const artisans = await this.artisanRepo.findByTrade(trade as Trade, limit);
      return artisans.map(mapToPublicArtisan);
    } catch (error) {
      this.handleError(error, 'Find artisans by trade');
    }
  }

  async listArtisans(filters: { trade?: string; location?: string; available?: boolean }): Promise<PublicArtisanDTO[]> {
    try {
      if (filters.available === true || filters.available?.toString() === 'true') {
        const availableArtisans = await this.artisanRepo.findAvailable(filters.trade, filters.location);
        return availableArtisans.map(mapToPublicArtisan);
      }
      
      let query: admin.firestore.Query = admin.firestore().collection('artisan_profiles')
        .where('is_verified', '==', true);
      
      if (filters.trade) {
        query = query.where('trade', '==', filters.trade);
      }
      
      const snapshot = await query.get();
      let results = snapshot.docs.map((doc: any) => doc.data() as Artisan);
      
      if (filters.location) {
        const locLower = filters.location.toLowerCase();
        results = results.filter((a: Artisan) => 
          a.location?.city?.toLowerCase().includes(locLower) ||
          a.location?.state?.toLowerCase().includes(locLower) ||
          a.location?.address?.toLowerCase().includes(locLower)
        );
      }
      
      return results.map(mapToPublicArtisan);
    } catch (error) {
      this.handleError(error, 'List artisans');
    }
  }
}
