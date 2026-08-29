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

  async createJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const body = { ...req.body };
      if (body.trade && !body.trade_needed) body.trade_needed = body.trade;
      if (body.timing && !body.urgency) body.urgency = body.timing === 'ASAP' ? 'Today' : 'Flexible';
      if (typeof body.location === 'string') body.location = { address: body.location, city: '', state: '', lga: '' };

      const job = await this.jobService.createJob(req.user.uid, body);
      this.sendCreated(res, 'Job created successfully', { data: job });
    } catch (error) {
      this.handleError(error, res, 'Create job');
    }
  }

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

  async updateJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const job = await this.jobService.updateJob(id, req.body);
      this.sendSuccess(res, 'Job updated successfully', { job });
    } catch (error) {
      this.handleError(error, res, 'Update job');
    }
  }

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

  async selectArtisan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { id } = req.params;
      const { artisan_id } = req.body;

      if (!artisan_id) {
        return this.sendBadRequest(res, 'Artisan ID is required');
      }

      const db = admin.firestore();
      const matchesSnapshot = await db.collection('matches')
        .where('job_id', '==', id)
        .where('artisan_uid', '==', artisan_id)
        .limit(1)
        .get();

      if (matchesSnapshot.empty) {
         const matchRef = db.collection('matches').doc();
         await matchRef.set({
           job_id: id,
           artisan_uid: artisan_id,
           status: 'accepted',
           rating: null,
           created_at: admin.firestore.FieldValue.serverTimestamp(),
           updated_at: admin.firestore.FieldValue.serverTimestamp()
         });
         
         await db.collection('jobs').doc(id).update({
           status: 'matched',
           assigned_artisan_uid: artisan_id
         });
         
         this.sendSuccess(res, 'Artisan selected', { match_id: matchRef.id });
         return;
      }

      const matchDoc = matchesSnapshot.docs[0];
      await matchDoc.ref.update({ status: 'accepted' });
      await db.collection('jobs').doc(id).update({
        status: 'matched',
        assigned_artisan_uid: artisan_id
      });

      this.sendSuccess(res, 'Artisan selected', { match_id: matchDoc.id });
    } catch (error) {
      this.handleError(error, res, 'Select artisan');
    }
  }

  async markComplete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { id } = req.params;
      let { match_id, rating, review } = req.body;
      const db = admin.firestore();

      // Auto-resolve match_id: prefer paid status (post-payment), fall back to accepted, then sole match
      if (!match_id) {
        const paidSnapshot = await db.collection('matches')
          .where('job_id', '==', id)
          .where('status', '==', 'paid')
          .limit(1).get();

        if (!paidSnapshot.empty) {
          match_id = paidSnapshot.docs[0].id;
        } else {
          const acceptedSnapshot = await db.collection('matches')
            .where('job_id', '==', id)
            .where('status', '==', 'accepted')
            .limit(1).get();
          if (!acceptedSnapshot.empty) {
            match_id = acceptedSnapshot.docs[0].id;
          } else {
            const allMatches = await db.collection('matches').where('job_id', '==', id).get();
            if (allMatches.size === 1) {
              match_id = allMatches.docs[0].id;
            } else {
              return this.sendBadRequest(res, 'match_id is required');
            }
          }
        }
      }

      const result = await this.jobService.markComplete(id, req.user.uid, match_id);

      // Submit rating if provided — look up artisan_uid from the match
      if (rating) {
        try {
          const matchDoc = await db.collection('matches').doc(match_id).get();
          const artisan_uid = matchDoc.data()?.artisan_uid;
          if (artisan_uid) {
            const { RatingService, DuplicateRatingError } = require('../services/rating.service');
            const ratingService = new RatingService();
            await ratingService.submitRating({
              jobId: id,
              artisanUid: artisan_uid,
              clientUid: req.user.uid,
              score: rating,
              review
            });
          }
        } catch (e: any) {
          // Duplicate rating is acceptable here — don't fail the whole completion
          this.logger.warn('Inline rating submission skipped', { error: e?.message });
        }
      }

      this.sendSuccess(res, 'Job marked complete and escrow released successfully', result);
    } catch (error) {
      this.handleError(error, res, 'Mark job complete');
    }
  }

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

  async getClientJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { clientUid } = req.params;
      const jobs = await this.jobService.getJobsByClient(clientUid);
      this.sendSuccess(res, 'Jobs fetched successfully', { jobs, count: jobs.length });
    } catch (error) {
      this.handleError(error, res, 'Get client jobs');
    }
  }

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
      if (jobData?.client_uid !== req.user.uid) {
        return this.sendForbidden(res, 'Forbidden: You do not own this job');
      }

      if (jobData?.status !== 'open') {
        return this.sendBadRequest(res, 'Job is not open for matching');
      }

      const { matches, count } = await this.matchingService.matchArtisansToJob(id);

      if (count === 0) {
        // Log zero results for admin visibility (Q04)
        await db.collection('analytics_events').add({
          event_type: 'zero_results',
          job_id: id,
          trade: jobData.trade_needed || jobData.trade,
          location: jobData.location,
          client_uid: req.user.uid,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        this.sendSuccess(res, 'No available artisans found for this trade', { matches: [], count: 0 });
        return;
      }

      this.sendSuccess(res, 'Matches created successfully', { matches, count });
    } catch (error) {
      this.handleError(error, res, 'Match artisans');
    }
  }

  async getMatches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { id } = req.params;
      const db = admin.firestore();
      
      const jobRef = db.collection('jobs').doc(id);
      const jobDoc = await jobRef.get();

      if (!jobDoc.exists) {
        return this.sendNotFound(res, 'Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.client_uid !== req.user.uid) {
        return this.sendForbidden(res, 'Forbidden: You do not own this job');
      }

      const matchesSnapshot = await db.collection('matches')
        .where('job_id', '==', id)
        .orderBy('created_at', 'desc')
        .get();

      const artisanUids = [...new Set(matchesSnapshot.docs.map(doc => doc.data().artisan_uid))];
      const artisanProfiles: Record<string, any> = {};
      
      if (artisanUids.length > 0) {
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

  async startTracking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }
      const { id } = req.params;
      await this.jobService.updateTrackingState(id, req.user.uid, 'en_route');
      this.sendSuccess(res, 'Tracking started');
    } catch (error) {
      this.handleError(error, res, 'Start tracking');
    }
  }

  async arriveTracking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }
      const { id } = req.params;
      await this.jobService.updateTrackingState(id, req.user.uid, 'arrived');
      this.sendSuccess(res, 'Artisan arrived');
    } catch (error) {
      this.handleError(error, res, 'Arrive tracking');
    }
  }

  async disputeJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return this.sendBadRequest(res, 'Dispute reason is required');
      }

      await this.jobService.raiseDispute(id, req.user.uid, reason);
      this.sendSuccess(res, 'Dispute raised successfully');
    } catch (error) {
      this.handleError(error, res, 'Dispute job');
    }
  }
}
