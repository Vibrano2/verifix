/**
 * Job Controller
 * Handles HTTP requests for job operations
 */

import { Response } from 'express';
import { BaseController } from './base.controller';
import { JobService } from '../services';
import { AuthenticatedRequest } from '../types';

export class JobController extends BaseController {
  private jobService: JobService;

  constructor() {
    super();
    this.jobService = new JobService();
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

      const { trade, location, status, urgency } = req.query;

      const jobs = await this.jobService.searchJobs({
        trade: trade as string,
        location: location as string,
        status: status as string,
        urgency: urgency as string
      });

      this.sendSuccess(res, 'Jobs fetched successfully', { jobs, count: jobs.length });
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

      await this.jobService.markComplete(id, req.user.uid);

      this.sendSuccess(res, 'Job marked as complete successfully');
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
}
