/**
 * Job Controller
 * Handles HTTP requests for job operations
 */

import { Response } from 'express';
import { BaseController } from './base.controller';
import { JobService, MatchingService } from '../services';
import { AuthenticatedRequest } from '../types';
import * as admin from 'firebase-admin';

export class JobController extends BaseController {
  private jobService: JobService;
  private matchingService: MatchingService;

  constructor() {
    super();
    this.jobService = new JobService();
    this.matchingService = new MatchingService();
  }

  /**
   * POST /api/jobs
   */
  async createJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const job = await this.jobService.createJob(req.user.uid, req.body);

      this.sendCreated(res, 'Job created successfully', { job });
    } catch (error) {
      this.handleError(error, res, 'Create job');
    }
  }

  /**
   * GET /api/jobs/:id
   */
  async getJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const job = await this.jobService.getJobById(id);

      if (!job) {
        return this.sendNotFound(res, 'Job not found');
      }

      this.sendSuccess(res, 'Job fetched successfully', { job });
    } catch (error) {
      this.handleError(error, res, 'Get job');
    }
  }

  /**
   * PATCH /api/jobs/:id
   */
  async updateJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const job = await this.jobService.updateJob(id, req.body);

      this.sendSuccess(res, 'Job updated successfully', { job });
    } catch (error) {
      this.handleError(error, res, 'Update job');
    }
  }

  /**
   * GET /api/jobs (list jobs with filters)
   */
  async listJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { trade, location, status, urgency, limit, offset } = req.query;

      const jobs = await this.jobService.searchJobs({
        trade: trade as string,
        location: location as string,
        status: status as string,
        urgency: urgency as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined
      });

      this.sendSuccess(res, 'Jobs fetched successfully', { 
        jobs, 
        count: jobs.length,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0
      });
    } catch (error) {
      this.handleError(error, res, 'List jobs');
    }
  }

  /**
   * POST /api/jobs/:id/complete
   */
  async markComplete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { id } = req.params;
      const { match_id } = req.body;

      if (!match_id) {
        return this.sendBadRequest(res, 'Match ID is required');
      }

      const result = await this.jobService.markComplete(id, req.user.uid, match_id);

      // result contains the transaction details
      this.sendSuccess(res, 'Job marked complete and escrow released successfully', result);
    } catch (error) {
      this.handleError(error, res, 'Mark job complete');
    }
  }

  /**
   * POST /api/jobs/:id/cancel
   */
  async cancelJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { id } = req.params;

      await this.jobService.cancelJob(id, req.user.uid);

      this.sendSuccess(res, 'Job cancelled successfully');
    } catch (error) {
      this.handleError(error, res, 'Cancel job');
    }
  }

  /**
   * GET /api/jobs/client/:clientUid (client's jobs)
   */
  async getClientJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { clientUid } = req.params;

      const jobs = await this.jobService.getJobsByClient(clientUid);

      this.sendSuccess(res, 'Jobs fetched successfully', { jobs, count: jobs.length });
    } catch (error) {
      this.handleError(error, res, 'Get client jobs');
    }
  }

  /**
   * POST /api/jobs/:id/match
   */
  async matchArtisans(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { id } = req.params;

      const db = admin.firestore();
      const jobDoc = await db.collection('jobs').doc(id).get();
      
      if (!jobDoc.exists) {
        return this.sendNotFound(res, 'Job not found');
      }

      const jobData = jobDoc.data();

      // Verify ownership
      if (jobData?.client_uid !== req.user.uid) {
        return this.sendForbidden(res, 'Forbidden: You do not own this job');
      }

      // Only match open jobs
      if (jobData?.status !== 'open') {
        return this.sendBadRequest(res, 'Job is not open for matching');
      }

      const { matches, count } = await this.matchingService.matchArtisansToJob(id);

      if (count === 0) {
        this.sendSuccess(res, 'No available artisans found for this trade', { matches: [], count: 0 });
        return;
      }

      this.sendSuccess(res, 'Matches created successfully', { matches, count });
    } catch (error) {
      this.handleError(error, res, 'Match artisans');
    }
  }

  /**
   * GET /api/jobs/:id/matches
   */
  async getMatches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { id } = req.params;
      const db = admin.firestore();
      
      // Verify job ownership
      const jobRef = db.collection('jobs').doc(id);
      const jobDoc = await jobRef.get();

      if (!jobDoc.exists) {
        return this.sendNotFound(res, 'Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.client_uid !== req.user.uid) {
        return this.sendForbidden(res, 'Forbidden: You do not own this job');
      }

      // Get matches
      const matchesSnapshot = await db.collection('matches')
        .where('job_id', '==', id)
        .orderBy('created_at', 'desc')
        .get();

      // Extract unique artisan UIDs
      const artisanUids = [...new Set(matchesSnapshot.docs.map(doc => doc.data().artisan_uid))];

      // Batch fetch all artisan profiles (fixes N+1 query problem)
      const artisanProfiles: Record<string, any> = {};
      
      if (artisanUids.length > 0) {
        // Firestore 'in' query supports up to 10 items, so batch if needed
        const batchSize = 10;
        for (let i = 0; i < artisanUids.length; i += batchSize) {
          const batch = artisanUids.slice(i, i + batchSize);
          const artisansSnapshot = await db.collection('artisan_profiles')
            .where(admin.firestore.FieldPath.documentId(), 'in', batch)
            .get();
          
          artisansSnapshot.docs.forEach(doc => {
            artisanProfiles[doc.id] = doc.data();
          });
        }
      }

      // Map matches with artisan data
      const matchesWithArtisans = matchesSnapshot.docs.map(doc => {
        const matchData = doc.data();
        const artisanData = artisanProfiles[matchData.artisan_uid];

        return {
          match_id: doc.id,
          ...matchData,
          artisan: artisanData ? {
            uid: artisanData.uid,
            trade: artisanData.trade,
            location: artisanData.location,
            completed_jobs: artisanData.completed_jobs,
            reputation_score: artisanData.reputation_score,
            tagline: artisanData.tagline
          } : null
        };
      });

      this.sendSuccess(res, 'Matches fetched successfully', {
        matches: matchesWithArtisans,
        count: matchesWithArtisans.length
      });
    } catch (error) {
      this.handleError(error, res, 'Get matches');
    }
  }
}
