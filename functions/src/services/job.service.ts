import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { COLLECTIONS } from '../constants';
import { Job, CreateJobDTO, UpdateJobDTO } from '../models/job.model';
import { isValidTrade, Trade } from '../constants/trades';
import { initiateTransfer } from '../utils/paystack';
import { AnalyticsService } from './analytics.service';

export class JobService extends BaseService {
  private get db() { return admin.firestore(); }

  constructor() {
    super();
    // this.db = admin.firestore();
  }

  async createJob(clientUid: string, data: CreateJobDTO): Promise<Job> {
    try {
      this.validateRequired(data, ['trade_needed', 'title', 'description', 'location', 'urgency']);

      if (!isValidTrade(data.trade_needed as string)) {
        throw new Error('Invalid trade. Must be one of the 24 locked trades.');
      }

      const validUrgencies = ['Today', 'This Week', 'Flexible'];
      if (!data.urgency || !validUrgencies.includes(data.urgency)) {
        throw new Error(`Invalid urgency. Must be one of: ${validUrgencies.join(', ')}`);
      }

      const jobData: any = {
        client_uid: clientUid,
        trade_needed: data.trade_needed,
        title: data.title,
        description: data.description,
        location: data.location,
        urgency: data.urgency,
        match_fee: data.match_fee || 500,
        status: 'open',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.db.collection(COLLECTIONS.JOBS).add(jobData);
      this.logOperation('job-created', { jobId: docRef.id, clientUid, trade: data.trade_needed });

      // PRD §5.1: fire job_posted analytics event (fire-and-forget, non-blocking)
      try {
        new AnalyticsService().trackEvent('job_posted', clientUid, {
          job_id: docRef.id,
          trade: data.trade_needed,
          urgency: data.urgency
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

  async updateJob(jobId: string, updates: UpdateJobDTO): Promise<Job> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) throw new Error('Job not found');

      const updateData: any = {
        ...updates,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

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

  async raiseDispute(jobId: string, uid: string, reason: string): Promise<void> {
    try {
      // Allow client or artisan to raise a dispute
      const job = await this.getJobById(jobId);
      if (!job) throw new Error('Job not found');

      const isClient = job.client_uid === uid;
      const isArtisan = job.matched_artisan_uid === uid;
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

  async markComplete(jobId: string, clientUid: string, matchId: string): Promise<any> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) throw new Error('Job not found');

      if (job.client_uid !== clientUid) {
        throw new Error('Forbidden: Only the client who posted this job can mark it complete');
      }

      const matchRef = this.db.collection('matches').doc(matchId);
      const matchDoc = await matchRef.get();
      if (!matchDoc.exists) throw new Error('Match not found');

      const matchData = matchDoc.data();
      if (matchData?.job_id !== jobId) {
        throw new Error('Match does not belong to this job');
      }

      // Query by escrow_status (v1.9 canonical field) with fallback to legacy status field
      let transactionsSnapshot = await this.db.collection('transactions')
        .where('match_id', '==', matchId)
        .where('escrow_status', '==', 'HELD')
        .limit(1)
        .get();

      if (transactionsSnapshot.empty) {
        // Fallback: legacy transactions only have flat status field
        transactionsSnapshot = await this.db.collection('transactions')
          .where('match_id', '==', matchId)
          .where('status', '==', 'held')
          .limit(1)
          .get();
      }

      if (transactionsSnapshot.empty) {
        throw new Error('No held transaction found for this match. Payment may not have been completed.');
      }

      const transactionDoc = transactionsSnapshot.docs[0];
      const transactionData = transactionDoc.data();

      if (transactionData?.status === 'released') {
        return {
          message: 'Job already marked complete (idempotent)',
          already_completed: true,
          transaction: {
            transaction_id: transactionDoc.id,
            status: 'released',
            commission_retained: transactionData.commission_retained,
            released_at: transactionData.released_at
          }
        };
      }

      const lockedJobValue = transactionData?.locked_job_value || 0;
      const commissionRetained = Math.round(lockedJobValue * 0.10);

      const artisanRef = this.db.collection('artisan_profiles').doc(matchData!.artisan_uid);
      const artisanDoc = await artisanRef.get();
      const artisanData = artisanDoc.data();

      await this.db.runTransaction(async (transaction) => {
        transaction.update(transactionDoc.ref, {
          status: 'released',
          escrow_status: 'RELEASED',  // PRD §7.3 step 4a: canonical v1.9 field
          commission_retained: commissionRetained,
          released_at: admin.firestore.FieldValue.serverTimestamp()
        });

        const jobRef = this.db.collection('jobs').doc(jobId);
        transaction.update(jobRef, {
          status: 'completed',
          completed_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        transaction.update(matchRef, {
          status: 'completed',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        transaction.update(artisanRef, {
          completed_jobs: admin.firestore.FieldValue.increment(1),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      const netAmount = lockedJobValue - commissionRetained;
      let transferResult = null;
      if (artisanData?.paystack_recipient_code && netAmount > 0) {
        try {
          transferResult = await initiateTransfer(
            artisanData.paystack_recipient_code,
            netAmount,
            `Payment for Job ${jobId}`
          );
        } catch (transferError: any) {
          this.logger.error(`Failed to transfer funds to artisan ${matchData!.artisan_uid} for job ${jobId}`, transferError);
        }
      }

      this.logOperation('job-completed', { jobId, clientUid });

      // PRD §5.1: fire job_completed analytics event (fire-and-forget, non-blocking)
      try {
        new AnalyticsService().trackEvent('job_completed', clientUid, {
          job_id: jobId,
          artisan_uid: matchData!.artisan_uid,
          locked_job_value: lockedJobValue,
          commission_retained: commissionRetained
        }).catch(() => {});
      } catch { /* analytics never blocks the main flow */ }

      return {
        message: 'Job marked complete and escrow released successfully',
        transaction: {
          transaction_id: transactionDoc.id,
          status: 'released',
          locked_job_value: lockedJobValue,
          commission_retained: commissionRetained,
          artisan_receives: netAmount,
          transfer_triggered: !!transferResult,
          released_at: new Date()
        }
      };
    } catch (error) {
      this.handleError(error, 'Mark job complete');
    }
  }

  async cancelJob(jobId: string, clientUid: string): Promise<void> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) throw new Error('Job not found');

      if (job.client_uid !== clientUid) {
        throw new Error('Unauthorized: You can only cancel your own jobs');
      }

      await this.db.collection(COLLECTIONS.JOBS).doc(jobId).update({
        status: 'cancelled',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
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
        .where('status', '==', 'accepted')
        .limit(1)
        .get();

      if (matchSnapshot.empty) {
        throw new Error('Unauthorized: You are not the accepted artisan for this job');
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
