import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { COLLECTIONS } from '../constants';
import { Job, CreateJobDTO, UpdateJobDTO } from '../models/job.model';
import { isValidTrade, Trade } from '../constants/trades';
import { AnalyticsService } from './analytics.service';

export class JobService extends BaseService {
  private get db() { return admin.firestore(); }

  constructor() {
    super();
    // this.db = admin.firestore();
  }

  async createJob(clientUid: string, data: CreateJobDTO): Promise<Job> {
    try {
      const normalized = { ...data } as CreateJobDTO & { trade?: string; timing?: string };
      if (!normalized.trade_needed && normalized.trade) {
        normalized.trade_needed = normalized.trade as any;
      }
      if (!normalized.urgency && normalized.timing) {
        normalized.urgency = (normalized.timing === 'ASAP' ? 'Today' : normalized.timing) as any;
      }
      if (normalized.trade_needed && normalized.trade && normalized.trade !== normalized.trade_needed) {
        throw new Error('trade and trade_needed must match');
      }
      if (normalized.urgency && normalized.timing && normalized.timing !== normalized.urgency && normalized.timing !== 'ASAP') {
        throw new Error('urgency and timing must match');
      }

      this.validateRequired(normalized, ['trade_needed', 'title', 'description', 'location', 'urgency']);

      if (!isValidTrade(normalized.trade_needed as string)) {
        throw new Error('Invalid trade. Must be one of the 24 locked trades.');
      }

      const validUrgencies = ['Today', 'This Week', 'Flexible'];
      if (!normalized.urgency || !validUrgencies.includes(normalized.urgency)) {
        throw new Error(`Invalid urgency. Must be one of: ${validUrgencies.join(', ')}`);
      }

      const jobData: any = {
        client_uid: clientUid,
        trade_needed: normalized.trade_needed,
        title: normalized.title,
        description: normalized.description,
        location: normalized.location,
        urgency: normalized.urgency,
        match_fee: 500,
        status: 'open',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const budget = normalized.budget ?? normalized.job_value;
      if (budget !== undefined) {
        jobData.budget = budget;
        jobData.job_value = budget;
      }
      if (normalized.photos) {
        jobData.photos = normalized.photos;
      }

      const docRef = await this.db.collection(COLLECTIONS.JOBS).add(jobData);
      this.logOperation('job-created', { jobId: docRef.id, clientUid, trade: normalized.trade_needed });

      // PRD §5.1: fire job_posted analytics event (fire-and-forget, non-blocking)
      try {
        new AnalyticsService().trackEvent('job_posted', clientUid, {
          job_id: docRef.id,
          trade: normalized.trade_needed,
          urgency: normalized.urgency
        }).catch(() => {});
      } catch { /* analytics never blocks the main flow */ }

      return {
        job_id: docRef.id,
        ...jobData,
        created_at: new Date(),
        updated_at: new Date()
      } as Job;
    } catch (error) {
      this.handleError(error, 'Create job');
    }
  }

  async getJobById(jobId: string): Promise<Job | null> {
    try {
      const doc = await this.db.collection(COLLECTIONS.JOBS).doc(jobId).get();
      if (!doc.exists) return null;

      return {
        job_id: doc.id,
        ...doc.data()
      } as unknown as Job;
    } catch (error) {
      this.handleError(error, 'Get job by ID');
    }
  }

  async updateJob(jobId: string, callerUid: string, updates: UpdateJobDTO, isAdmin = false): Promise<Job> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) throw new Error('Job not found');
      if (job.client_uid !== callerUid && !isAdmin) {
        throw new Error('Forbidden: You do not own this job');
      }
      if (job.status !== 'open') {
        throw new Error('Invalid job state: Only open jobs can be edited');
      }

      const updateData: any = {
        ...updates,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const budget = updates.budget ?? updates.job_value;
      if (budget !== undefined) {
        updateData.budget = budget;
        updateData.job_value = budget;
      }

      await this.db.collection(COLLECTIONS.JOBS).doc(jobId).update(updateData);
      this.logOperation('job-updated', { jobId });

      return await this.getJobById(jobId) as Job;
    } catch (error) {
      this.handleError(error, 'Update job');
    }
  }

  async getJobsByClient(clientUid: string): Promise<Job[]> {
    try {
      const snapshot = await this.db
        .collection(COLLECTIONS.JOBS)
        .where('client_uid', '==', clientUid)
        .orderBy('created_at', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        job_id: doc.id,
        ...doc.data()
      } as unknown as Job));
    } catch (error) {
      this.handleError(error, 'Get jobs by client');
    }
  }

  async getJobsForArtisan(artisanUid: string, requestedLimit?: number): Promise<Job[]> {
    try {
      const limit = requestedLimit && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 50;
      const matches = await this.db.collection(COLLECTIONS.MATCHES)
        .where('artisan_uid', '==', artisanUid)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get();
      const matchByJob = new Map<string, { match_id: string; match_status: string }>();
      matches.docs.forEach(doc => {
        const data = doc.data();
        if (data.job_id && !matchByJob.has(data.job_id)) {
          matchByJob.set(data.job_id, { match_id: doc.id, match_status: data.status });
        }
      });
      const jobIds = [...new Set(matches.docs.map(doc => doc.data().job_id).filter(Boolean))] as string[];
      if (jobIds.length === 0) return [];

      const jobs: Job[] = [];
      for (let index = 0; index < jobIds.length; index += 30) {
        const chunk = jobIds.slice(index, index + 30);
        const snapshot = await this.db.collection(COLLECTIONS.JOBS)
          .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
          .get();
        jobs.push(...snapshot.docs.map(doc => ({
          job_id: doc.id,
          ...doc.data(),
          ...(matchByJob.get(doc.id) || {})
        } as unknown as Job)));
      }
      return jobs.sort((a: any, b: any) => {
        const left = a.created_at?.toMillis?.() || 0;
        const right = b.created_at?.toMillis?.() || 0;
        return right - left;
      });
    } catch (error) {
      this.handleError(error, 'Get jobs for artisan');
    }
  }

  async raiseDispute(jobId: string, uid: string, reason: string): Promise<void> {
    try {
      // Allow client or artisan to raise a dispute
      const job = await this.getJobById(jobId);
      if (!job) throw new Error('Job not found');

      const isClient = job.client_uid === uid;
      const isArtisan = job.matched_artisan_uid === uid || job.assigned_artisan_uid === uid;
      if (!isClient && !isArtisan) {
        throw new Error('Unauthorized: You must be the client or assigned artisan to dispute this job');
      }

      await this.db.runTransaction(async (transaction) => {
        const jobRef = this.db.collection(COLLECTIONS.JOBS).doc(jobId);
        
        // Find associated escrow transaction
        const txSnapshot = await transaction.get(
          this.db.collection(COLLECTIONS.TRANSACTIONS)
            .where('job_id', '==', jobId)
            .where('type', '==', 'escrow')
            .limit(1)
        );

        if (!txSnapshot.empty) {
          const txDoc = txSnapshot.docs[0];
          // Freeze funds
          transaction.update(txDoc.ref, {
            escrow_status: 'DISPUTED',
            status: 'disputed', // legacy sync
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        transaction.update(jobRef, {
          status: 'disputed',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Log the dispute event for admins
        const disputeRef = this.db.collection('disputes').doc();
        transaction.set(disputeRef, {
          job_id: jobId,
          raised_by_uid: uid,
          reason: reason,
          status: 'open',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      this.logOperation('job-disputed', { jobId, raisedBy: uid, reason });
    } catch (error) {
      this.handleError(error, 'Raise dispute');
    }
  }

  async getOpenJobsByTrade(trade: Trade): Promise<Job[]> {
    try {
      if (!isValidTrade(trade as string)) throw new Error('Invalid trade');

      const snapshot = await this.db
        .collection(COLLECTIONS.JOBS)
        .where('trade_needed', '==', trade)
        .where('status', '==', 'open')
        .orderBy('created_at', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        job_id: doc.id,
        ...doc.data()
      } as unknown as Job));
    } catch (error) {
      this.handleError(error, 'Get open jobs by trade');
    }
  }

  async cancelJob(jobId: string, clientUid: string): Promise<void> {
    try {
      const jobRef = this.db.collection(COLLECTIONS.JOBS).doc(jobId);
      const matchesQuery = this.db.collection(COLLECTIONS.MATCHES).where('job_id', '==', jobId);
      const escrowQuery = this.db.collection(COLLECTIONS.TRANSACTIONS)
        .where('job_id', '==', jobId)
        .where('type', '==', 'escrow')
        .limit(10);

      await this.db.runTransaction(async transaction => {
        const [jobDoc, matches, escrows] = await Promise.all([
          transaction.get(jobRef),
          transaction.get(matchesQuery),
          transaction.get(escrowQuery)
        ]);
        const job = jobDoc.data();
        if (!job) throw new Error('Job not found');
        if (job.client_uid !== clientUid) {
          throw new Error('Unauthorized: You can only cancel your own jobs');
        }
        if (!['open', 'matched'].includes(job.status)) {
          throw new Error('Invalid job state: This job can no longer be cancelled');
        }
        const hasPaidEscrow = escrows.docs.some(doc =>
          ['PENDING', 'PAYMENT_RECONCILIATION_REQUIRED', 'HELD', 'DISBURSED_PARTIAL', 'RELEASE_PENDING', 'RELEASED', 'REFUND_PENDING']
            .includes(doc.data().escrow_status)
          || ['pending', 'reconciliation_required', 'held', 'released', 'refund_pending'].includes(doc.data().status)
        );
        if (hasPaidEscrow) {
          throw new Error('Invalid job state: Paid jobs must be refunded before cancellation');
        }

        transaction.update(jobRef, {
          status: 'cancelled',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        matches.docs.forEach(match => transaction.update(match.ref, {
          status: 'cancelled',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }));
      });

      this.logOperation('job-cancelled', { jobId, clientUid });
    } catch (error) {
      this.handleError(error, 'Cancel job');
    }
  }

  async updateTrackingState(jobId: string, artisanUid: string, state: 'en_route' | 'arrived'): Promise<void> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) throw new Error('Job not found');

      if (job.status !== 'in_progress') {
        throw new Error('Can only track location for in_progress (funded) jobs');
      }

      const matchSnapshot = await this.db.collection('matches')
        .where('job_id', '==', jobId)
        .where('artisan_uid', '==', artisanUid)
        .where('status', '==', 'paid')
        .limit(1)
        .get();

      if (matchSnapshot.empty) {
        throw new Error('Unauthorized: You are not the paid artisan for this job');
      }

      await this.db.collection(COLLECTIONS.JOBS).doc(jobId).update({
        tracking_state: state,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      this.logOperation('job-tracking-updated', { jobId, artisanUid, state });
    } catch (error) {
      this.handleError(error, 'Update tracking state');
    }
  }

  async searchJobs(filters: {
    trade?: string;
    location?: string;
    status?: string;
    urgency?: string;
    limit?: number;
    offset?: number;
  }): Promise<Job[]> {
    try {
      let query: admin.firestore.Query = this.db.collection(COLLECTIONS.JOBS);

      if (filters.trade) {
        if (!isValidTrade(filters.trade)) throw new Error('Invalid trade');
        query = query.where('trade_needed', '==', filters.trade);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.urgency) {
        query = query.where('urgency', '==', filters.urgency);
      }

      query = query.orderBy('created_at', 'desc');

      const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;
      const offset = filters.offset || 0;

      query = query.limit(limit);
      if (offset > 0) {
        query = query.offset(offset);
      }

      const snapshot = await query.get();

      let jobs = snapshot.docs.map(doc => ({
        job_id: doc.id,
        ...doc.data()
      } as unknown as Job));

      if (filters.location) {
        jobs = jobs.filter(job => 
          job.location.city.toLowerCase().includes(filters.location!.toLowerCase()) ||
          job.location.state.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }

      return jobs;
    } catch (error) {
      this.handleError(error, 'Search jobs');
    }
  }


}
