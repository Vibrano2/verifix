import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { ArtisanRepository, UserRepository } from '../repositories';
import { Artisan, CreateArtisanDTO, UpdateArtisanProfileDTO, PortfolioProject, PublicArtisanDTO, mapToPublicArtisan } from '../models/artisan.model';
import { getCategoryForTrade, isValidTrade, Trade } from '../constants/trades';
import { createTransferRecipient, resolveBankAccount } from '../utils/paystack';
import { encrypt, hashData, maskSensitiveData } from '../utils/encryption';

export class ArtisanService extends BaseService {
  private artisanRepo: ArtisanRepository;
  private userRepo: UserRepository;
  private get db() { return admin.firestore(); }

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
        tagline: data.tagline.trim(),
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

  private normalizePhone(phone: string): string {
    const value = phone.replace(/[\s()-]/g, '');
    if (/^0[789]\d{9}$/.test(value)) return `+234${value.slice(1)}`;
    if (/^\+234[789]\d{9}$/.test(value)) return value;
    throw new Error('Invalid verified phone number');
  }

  async registerArtisan(
    uid: string,
    data: CreateArtisanDTO,
    verifiedPhone?: string
  ): Promise<{ user: any, profile: Artisan }> {
    try {
      this.validateRequired(data, [
        'first_name', 'last_name', 'phone', 'trade', 'location', 'tagline'
      ]);

      if (!isValidTrade(data.trade)) {
        throw new Error('Invalid trade. Must be one of the 24 locked trades.');
      }

      const existingUser = await this.userRepo.findById(uid);
      if (!existingUser || existingUser.role !== 'artisan') {
        throw new Error('Only registered artisans can create an artisan profile');
      }
      if (!verifiedPhone || this.normalizePhone(verifiedPhone) !== this.normalizePhone(data.phone)) {
        throw new Error('Phone number must match the verified Firebase phone number');
      }
      const normalizedPhone = this.normalizePhone(verifiedPhone);

      const existingPrivate = await this.db.collection('artisan_private').doc(uid).get();
      const existingPrivateData = existingPrivate.data();
      let paystack_recipient_code = '';
      let resolvedAccountName = '';
      if (data.bank_details) {
        const accountHash = hashData(`${data.bank_details.bank_code}:${data.bank_details.account_number}`);
        if (existingPrivateData?.bank_details?.account_hash === accountHash
          && existingPrivateData.paystack_recipient_code) {
          paystack_recipient_code = existingPrivateData.paystack_recipient_code;
          resolvedAccountName = existingPrivateData.bank_details?.account_name || data.bank_details.account_name;
        } else {
          const resolved = await resolveBankAccount(
            data.bank_details.account_number,
            data.bank_details.bank_code
          );
          resolvedAccountName = resolved.account_name;
          paystack_recipient_code = await createTransferRecipient(
            resolved.account_name,
            data.bank_details.account_number,
            data.bank_details.bank_code
          );
        }
      }

      const category = getCategoryForTrade(data.trade as Trade);
      
      const artisanData: any = {
        uid,
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        trade: data.trade as Trade,
        category,
        location: typeof data.location === 'string' ? { address: data.location } : data.location,
        tagline: data.tagline,
        bio: data.bio || '',
        experience_years: data.experience_years || 0,
        hourly_rate: data.hourly_rate || 0,
        skills: data.services || data.skills || [],
        services: data.services || data.skills || [],
        portfolio: data.portfolio || [],
        is_available: false,
        is_verified: false,
        verification_status: 'pending',
        work_photos: [],
        completed_jobs: 0,
        reputation_score: null,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const privateData: Record<string, any> = {
        uid,
        nin_encrypted: encrypt(data.nin),
        nin_hash: hashData(data.nin),
        nin_last4: data.nin.slice(-4),
        paystack_recipient_code: paystack_recipient_code || null,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      if (data.bank_details) {
        privateData.bank_details = {
          account_name: resolvedAccountName,
          account_number_encrypted: encrypt(data.bank_details.account_number),
          account_number_last4: data.bank_details.account_number.slice(-4),
          account_hash: hashData(`${data.bank_details.bank_code}:${data.bank_details.account_number}`),
          bank_code: data.bank_details.bank_code
        };
      }

      const userRef = this.db.collection('users').doc(uid);
      const profileRef = this.db.collection('artisan_profiles').doc(uid);
      const privateRef = this.db.collection('artisan_private').doc(uid);
      const ninRegistryRef = this.db.collection('nin_registry').doc(privateData.nin_hash);
      await this.db.runTransaction(async transaction => {
        const [freshUser, freshProfile, freshPrivate, ninRegistration] = await Promise.all([
          transaction.get(userRef),
          transaction.get(profileRef),
          transaction.get(privateRef),
          transaction.get(ninRegistryRef)
        ]);
        if (!freshUser.exists || freshUser.data()?.role !== 'artisan') {
          throw new Error('Only registered artisans can create an artisan profile');
        }
        if (freshProfile.data()?.verification_status === 'approved') {
          throw new Error('Verified profiles cannot be re-registered');
        }
        if (ninRegistration.exists && ninRegistration.data()?.uid !== uid) {
          throw new Error('This NIN is already registered');
        }
        const previousNinHash = freshPrivate.data()?.nin_hash;
        let previousNinRegistry: admin.firestore.DocumentSnapshot | undefined;
        let previousNinRegistryRef: admin.firestore.DocumentReference | undefined;
        if (previousNinHash && previousNinHash !== privateData.nin_hash) {
          previousNinRegistryRef = this.db.collection('nin_registry').doc(previousNinHash);
          previousNinRegistry = await transaction.get(previousNinRegistryRef);
        }
        transaction.set(userRef, {
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          phone_encrypted: encrypt(normalizedPhone),
          phone_hash: hashData(normalizedPhone),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        transaction.set(profileRef, artisanData, { merge: true });
        transaction.set(privateRef, privateData, { merge: true });
        transaction.set(ninRegistryRef, {
          uid,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        if (previousNinRegistryRef && previousNinRegistry?.data()?.uid === uid) {
          transaction.delete(previousNinRegistryRef);
        }
      });

      const user = await this.userRepo.findById(uid);
      const profile = await this.artisanRepo.findById(uid);
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
      if (available && !artisan.is_verified) {
        throw new Error('Only verified artisans can become available');
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

  async updateProfile(uid: string, updates: UpdateArtisanProfileDTO): Promise<Artisan> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) throw new Error('Artisan profile not found');

      if (updates.is_available && !artisan.is_verified) {
        throw new Error('Only verified artisans can become available');
      }

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
      if (workPhotos.length >= 10) throw new Error('A maximum of 10 work photos is allowed');
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

  async uploadIDDocument(uid: string, documentPath: string): Promise<void> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) throw new Error('Artisan profile not found');

      await this.db.collection('artisan_private').doc(uid).set({
        id_document_path: documentPath,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      this.logOperation('id-document-uploaded', { uid });
    } catch (error) {
      this.handleError(error, 'Upload ID document');
    }
  }

  async getProfile(uid: string, requestorUid?: string, isAdmin?: boolean): Promise<Artisan | Omit<Artisan, 'nin' | 'id_document_url'>> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) throw new Error('Artisan profile not found');

      const publicProfile = mapToPublicArtisan(artisan);
      if (!isAdmin && requestorUid !== uid) return publicProfile;

      const privateDoc = await this.db.collection('artisan_private').doc(uid).get();
      const privateData = privateDoc.data();
      return {
        ...publicProfile,
        private_summary: privateData ? {
          nin: privateData.nin_last4 ? maskSensitiveData(privateData.nin_last4, 4) : null,
          bank_account_last4: privateData.bank_details?.account_number_last4 || null,
          id_document_uploaded: Boolean(privateData.id_document_path),
          payout_account_configured: Boolean(privateData.paystack_recipient_code)
        } : null
      } as any;
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

  async listArtisans(filters: { trade?: string; location?: string; available?: boolean; limit?: number }): Promise<PublicArtisanDTO[]> {
    try {
      if (filters.trade && !isValidTrade(filters.trade)) throw new Error('Invalid trade');
      const safeLimit = Math.min(Math.max(filters.limit || 50, 1), 100);
      if (filters.available === true || filters.available?.toString() === 'true') {
        const availableArtisans = await this.artisanRepo.findAvailable(filters.trade, filters.location, safeLimit);
        return availableArtisans.map(mapToPublicArtisan);
      }
      
      let query: admin.firestore.Query = admin.firestore().collection('artisan_profiles')
        .where('is_verified', '==', true);
      
      if (filters.trade) {
        query = query.where('trade', '==', filters.trade);
      }
      if (filters.available !== undefined) {
        query = query.where('is_available', '==', filters.available);
      }
      
      const snapshot = await query.limit(safeLimit).get();
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
