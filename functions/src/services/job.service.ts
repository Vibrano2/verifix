/**
 * Job Service
 * Business logic for job operations
 */

import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { COLLECTIONS } from '../constants';
import { Job, CreateJobDTO, UpdateJobDTO } from '../models/job.model';
import { isValidTrade, Trade } from '../constants/trades';

export class JobService extends BaseService {
  private db: admin.firestore.Firestore;

  constructor() {
    super();
    this.db = admin.firestore();
  }

  /**
   * Create new job
   */
  async createJob(clientUid: string, data: CreateJobDTO): Promise<Job> {
    try {
      this.validateRequired(data, ['trade_needed', 'title', 'description', 'location', 'urgency']);

      // Validate trade
      if (!isValidTrade(data.trade_needed as string)) {
        throw new Error('Invalid trade. Must be one of the 24 locked trades.');
      }

      // Validate urgency
      const validUrgencies = ['Today', 'This Week', 'Flexible'];
      if (!validUrgencies.includes(data.urgency)) {
        throw new Error(`Invalid urgency. Must be one of: ${validUrgencies.join(', ')}`);
      }

      const jobData: any = {
        client_uid: clientUid,
        trade_needed: data.trade_needed,
        title: data.title,
        description: data.description,
        location: data.location,
        urgency: data.urgency,
        budget: data.budget,
        budget_min: data.budget_min,
        budget_max: data.budget_max,
        match_fee: data.match_fee || 500, // Default ₦500
        status: 'open',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.db.collection(COLLECTIONS.JOBS).add(jobData);

      this.logOperation('job-created', { jobId: docRef.id, clientUid, trade: data.trade_needed });

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

  /**
   * Get job by ID
   */
  async getJobById(jobId: string): Promise<Job | null> {
    try {
      const doc = await this.db.collection(COLLECTIONS.JOBS).doc(jobId).get();

      if (!doc.exists) {
        return null;
      }

      return {
        job_id: doc.id,
        ...doc.data()
      } as unknown as Job;
    } catch (error) {
      this.handleError(error, 'Get job by ID');
    }
  }

  /**
   * Update job
   */
  async updateJob(jobId: string, updates: UpdateJobDTO): Promise<Job> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

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

  /**
   * Get jobs by client UID
   */
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

  /**
   * Get open jobs by trade
   */
  async getOpenJobsByTrade(trade: Trade): Promise<Job[]> {
    try {
      if (!isValidTrade(trade as string)) {
        throw new Error('Invalid trade');
      }

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

  /**
   * Mark job as complete
   */
  async markComplete(jobId: string, clientUid: string): Promise<void> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Verify ownership
      if (job.client_uid !== clientUid) {
        throw new Error('Unauthorized: You can only complete your own jobs');
      }

      // Check if already completed
      if (job.status === 'completed') {
        this.logger.warn('Job already completed', { jobId });
        return;
      }

      await this.db.collection(COLLECTIONS.JOBS).doc(jobId).update({
        status: 'completed',
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      this.logOperation('job-completed', { jobId, clientUid });
    } catch (error) {
      this.handleError(error, 'Mark job complete');
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string, clientUid: string): Promise<void> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Verify ownership
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

  /**
   * Search jobs with filters
   */
  async searchJobs(filters: {
    trade?: string;
    location?: string;
    status?: string;
    urgency?: string;
  }): Promise<Job[]> {
    try {
      let query: admin.firestore.Query = this.db.collection(COLLECTIONS.JOBS);

      if (filters.trade) {
        if (!isValidTrade(filters.trade)) {
          throw new Error('Invalid trade');
        }
        query = query.where('trade_needed', '==', filters.trade);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.urgency) {
        query = query.where('urgency', '==', filters.urgency);
      }

      const snapshot = await query.orderBy('created_at', 'desc').get();

      let jobs = snapshot.docs.map(doc => ({
        job_id: doc.id,
        ...doc.data()
      } as unknown as Job));

      // Filter by location if provided (Firestore doesn't support nested field queries well)
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
