import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { ArtisanRepository, UserRepository } from '../repositories';
import { COLLECTIONS } from '../constants';
import { Artisan } from '../models/artisan.model';
import { AdminAnalytics } from '../models/analytics.model';
import { Trade, getCategoryForTrade, isValidTrade } from '../constants/trades';

export class AdminService extends BaseService {
  private artisanRepo: ArtisanRepository;
  private userRepo: UserRepository;
  private get db() { return admin.firestore(); }

  constructor() {
    super();
    this.artisanRepo = new ArtisanRepository();
    this.userRepo = new UserRepository();
    // this.db = admin.firestore();
  }

  isAdmin(uid: string): boolean {
    const adminUid = process.env.ADMIN_UID;
    if (!adminUid) {
      this.logger.error('ADMIN_UID not configured in environment');
      return false;
    }
    return uid === adminUid;
  }

  async getVerificationQueue(limit: number = 50, offset: number = 0): Promise<Array<Artisan & { user: any }>> {
    try {
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const safeOffset = Math.max(offset, 0);

      const snapshot = await this.db.collection(COLLECTIONS.ARTISANS)
        .where('verification_status', '==', 'pending')
        .orderBy('created_at', 'desc')
        .limit(safeLimit)
        .offset(safeOffset)
        .get();

      const artisans = snapshot.docs.map(doc => doc.data() as Artisan);

      const artisansWithDetails = await Promise.all(
        artisans.map(async (artisan) => {
          const user = await this.userRepo.findById(artisan.uid);
          return {
            ...artisan,
            user: {
              first_name: user?.first_name,
              last_name: user?.last_name,
              phone: user?.phone
            }
          };
        })
      );

      this.logOperation('verification-queue-fetched', {
        count: artisansWithDetails.length,
        limit: safeLimit,
        offset: safeOffset
      });

      return artisansWithDetails;
    } catch (error) {
      this.handleError(error, 'Get verification queue');
    }
  }

  async verifyArtisan(uid: string): Promise<void> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) throw new Error('Artisan profile not found');

      if (artisan.is_verified) {
        this.logger.info('Artisan already verified', { uid });
        return;
      }

      await this.artisanRepo.verify(uid);
      this.logOperation('artisan-verified', { uid, trade: artisan.trade });
    } catch (error) {
      this.handleError(error, 'Verify artisan');
    }
  }

  async rejectArtisan(uid: string, reason?: string): Promise<void> {
    try {
      const artisan = await this.artisanRepo.findById(uid);
      if (!artisan) throw new Error('Artisan profile not found');

      await this.artisanRepo.reject(uid, reason);
      this.logOperation('artisan-rejected', {
        uid,
        reason: reason || 'Not specified'
      });
    } catch (error) {
      this.handleError(error, 'Reject artisan');
    }
  }

  async addArtisanManually(data: {
    first_name: string;
    last_name: string;
    phone: string;
    trade: string;
    location: {
      city: string;
      state: string;
      lga: string;
      address?: string;
    };
    tagline: string;
    hourly_rate?: number;
  }): Promise<{ uid: string }> {
    try {
      if (!isValidTrade(data.trade)) {
        throw new Error('Invalid trade. Must be one of the 24 locked trades.');
      }

      // Format phone to E.164 if needed
      let formattedPhone = data.phone;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+234${formattedPhone.replace(/^0/, '')}`;
      }

      // Create Auth User
      let authUser;
      try {
        authUser = await admin.auth().createUser({
          phoneNumber: formattedPhone,
          displayName: `${data.first_name} ${data.last_name}`,
        });
      } catch (authErr: any) {
        if (authErr.code === 'auth/phone-number-already-exists') {
          throw new Error('An account with this phone number already exists.');
        }
        throw authErr;
      }

      const uid = authUser.uid;
      const category = getCategoryForTrade(data.trade as Trade);

      // Create User Doc
      const userRef = this.db.collection(COLLECTIONS.USERS).doc(uid);
      await userRef.set({
        uid,
        phone: formattedPhone,
        role: 'artisan',
        first_name: data.first_name,
        last_name: data.last_name,
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        last_login: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create Artisan Doc
      const artisanData: Partial<Artisan> = {
        uid,
        trade: data.trade as Trade,
        category,
        location: data.location,
        tagline: data.tagline,
        bio: `${data.trade} based in ${data.location.city}`,
        experience_years: 1, // Default
        hourly_rate: data.hourly_rate || 2000,
        skills: [],
        portfolio: [],
        is_available: true,
        is_verified: true, // Pre-verified!
        verification_status: 'approved',
        created_at: new Date()
      };

      await this.artisanRepo.create(uid, artisanData as Artisan);

      this.logOperation('artisan-added-manually', { uid, trade: data.trade, phone: formattedPhone });

      return { uid };
    } catch (error) {
      this.handleError(error, 'Add Artisan Manually');
      throw error;
    }
  }

  async getStatistics(): Promise<{
    users: { total: number; clients: number; artisans: number };
    artisans: { total: number; verified: number; unverified: number };
    jobs: { total: number; open: number; matched: number; completed: number };
    transactions: { total: number; totalRevenue: number; totalCommission: number };
  }> {
    try {
      const allUsers = await this.userRepo.findAll();
      const clientCount = allUsers.filter(u => u.role === 'client').length;
      const artisanCount = allUsers.filter(u => u.role === 'artisan').length;

      const allArtisans = await this.artisanRepo.findAll();
      const verifiedCount = allArtisans.filter(a => a.is_verified).length;

      const jobsSnapshot = await this.db.collection(COLLECTIONS.JOBS).get();
      let openJobs = 0, matchedJobs = 0, completedJobs = 0;

      jobsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'open') openJobs++;
        if (data.status === 'matched' || data.status === 'in_progress') matchedJobs++;
        if (data.status === 'completed') completedJobs++;
      });

      const transactionsSnapshot = await this.db.collection(COLLECTIONS.TRANSACTIONS).get();
      let totalRevenue = 0, totalCommission = 0;

      transactionsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'released') {
          totalRevenue += data.amount || 0;
          totalCommission += data.commission_retained || 0;
        }
      });

      return {
        users: {
          total: allUsers.length,
          clients: clientCount,
          artisans: artisanCount
        },
        artisans: {
          total: allArtisans.length,
          verified: verifiedCount,
          unverified: allArtisans.length - verifiedCount
        },
        jobs: {
          total: jobsSnapshot.size,
          open: openJobs,
          matched: matchedJobs,
          completed: completedJobs
        },
        transactions: {
          total: transactionsSnapshot.size,
          totalRevenue,
          totalCommission
        }
      };
    } catch (error) {
      this.handleError(error, 'Get statistics');
    }
  }

  async getAnalytics(): Promise<AdminAnalytics> {
    try {
      const usersSnapshot = await this.db.collection(COLLECTIONS.USERS).get();
      let clientCount = 0, artisanCount = 0;

      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.role === 'client') clientCount++;
        if (data.role === 'artisan') artisanCount++;
      });

      const artisansSnapshot = await this.db.collection(COLLECTIONS.ARTISANS).get();
      let verifiedArtisans = 0;

      artisansSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.is_verified) verifiedArtisans++;
      });

      const jobsSnapshot = await this.db.collection(COLLECTIONS.JOBS).get();
      let openJobs = 0, matchedJobs = 0, completedJobs = 0, cancelledJobs = 0;

      jobsSnapshot.forEach(doc => {
        const data = doc.data();
        switch (data.status) {
          case 'open': openJobs++; break;
          case 'matched':
          case 'in_progress': matchedJobs++; break;
          case 'completed': completedJobs++; break;
          case 'cancelled': cancelledJobs++; break;
        }
      });

      const matchesSnapshot = await this.db.collection(COLLECTIONS.MATCHES).get();
      let pendingMatches = 0, acceptedMatches = 0, completedMatches = 0;

      matchesSnapshot.forEach(doc => {
        const data = doc.data();
        switch (data.status) {
          case 'pending': pendingMatches++; break;
          case 'accepted': acceptedMatches++; break;
          case 'completed': completedMatches++; break;
        }
      });

      const transactionsSnapshot = await this.db.collection(COLLECTIONS.TRANSACTIONS).get();
      let totalHeld = 0, totalReleased = 0, totalCommission = 0;

      transactionsSnapshot.forEach(doc => {
        const data = doc.data();
        const amount = data.amount || 0;
        const commission = data.commission_retained || 0;

        if (data.status === 'held') {
          totalHeld += amount;
        } else if (data.status === 'released') {
          totalReleased += amount;
          totalCommission += commission;
        }
      });

      return {
        users: {
          total: usersSnapshot.size,
          clients: clientCount,
          artisans: artisanCount,
          verified_artisans: verifiedArtisans
        },
        jobs: {
          total: jobsSnapshot.size,
          open: openJobs,
          matched: matchedJobs,
          completed: completedJobs,
          cancelled: cancelledJobs
        },
        matches: {
          total: matchesSnapshot.size,
          pending: pendingMatches,
          accepted: acceptedMatches,
          completed: completedMatches
        },
        revenue: {
          total_held: totalHeld,
          total_released: totalReleased,
          total_commission: totalCommission
        }
      };
    } catch (error) {
      this.handleError(error, 'Get analytics');
    }
  }
}
