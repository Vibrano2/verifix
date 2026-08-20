"use strict";
/**
 * Job Controller
 * Handles HTTP requests for job operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobController = void 0;
const base_controller_1 = require("./base.controller");
const services_1 = require("../services");
const admin = __importStar(require("firebase-admin"));
class JobController extends base_controller_1.BaseController {
    constructor() {
        super();
        this.jobService = new services_1.JobService();
        this.matchingService = new services_1.MatchingService();
    }
    /**
     * POST /api/jobs
     */
    async createJob(req, res) {
        try {
            if (!req.user) {
                return this.sendUnauthorized(res, 'Authentication required');
            }
            const job = await this.jobService.createJob(req.user.uid, req.body);
            this.sendCreated(res, 'Job created successfully', { job });
        }
        catch (error) {
            this.handleError(error, res, 'Create job');
        }
    }
    /**
     * GET /api/jobs/:id
     */
    async getJob(req, res) {
        try {
            const { id } = req.params;
            const job = await this.jobService.getJobById(id);
            if (!job) {
                return this.sendNotFound(res, 'Job not found');
            }
            this.sendSuccess(res, 'Job fetched successfully', { job });
        }
        catch (error) {
            this.handleError(error, res, 'Get job');
        }
    }
    /**
     * PATCH /api/jobs/:id
     */
    async updateJob(req, res) {
        try {
            const { id } = req.params;
            const job = await this.jobService.updateJob(id, req.body);
            this.sendSuccess(res, 'Job updated successfully', { job });
        }
        catch (error) {
            this.handleError(error, res, 'Update job');
        }
    }
    /**
     * GET /api/jobs (list jobs with filters)
     */
    async listJobs(req, res) {
        try {
            if (!req.user) {
                return this.sendUnauthorized(res, 'Authentication required');
            }
            const { trade, location, status, urgency, limit, offset } = req.query;
            const jobs = await this.jobService.searchJobs({
                trade: trade,
                location: location,
                status: status,
                urgency: urgency,
                limit: limit ? parseInt(limit, 10) : undefined,
                offset: offset ? parseInt(offset, 10) : undefined
            });
            this.sendSuccess(res, 'Jobs fetched successfully', {
                jobs,
                count: jobs.length,
                limit: limit ? parseInt(limit, 10) : 50,
                offset: offset ? parseInt(offset, 10) : 0
            });
        }
        catch (error) {
            this.handleError(error, res, 'List jobs');
        }
    }
    /**
     * POST /api/jobs/:id/complete
     */
    async markComplete(req, res) {
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
        }
        catch (error) {
            this.handleError(error, res, 'Mark job complete');
        }
    }
    /**
     * POST /api/jobs/:id/cancel
     */
    async cancelJob(req, res) {
        try {
            if (!req.user) {
                return this.sendUnauthorized(res, 'Authentication required');
            }
            const { id } = req.params;
            await this.jobService.cancelJob(id, req.user.uid);
            this.sendSuccess(res, 'Job cancelled successfully');
        }
        catch (error) {
            this.handleError(error, res, 'Cancel job');
        }
    }
    /**
     * GET /api/jobs/client/:clientUid (client's jobs)
     */
    async getClientJobs(req, res) {
        try {
            const { clientUid } = req.params;
            const jobs = await this.jobService.getJobsByClient(clientUid);
            this.sendSuccess(res, 'Jobs fetched successfully', { jobs, count: jobs.length });
        }
        catch (error) {
            this.handleError(error, res, 'Get client jobs');
        }
    }
    /**
     * POST /api/jobs/:id/match
     */
    async matchArtisans(req, res) {
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
            if ((jobData === null || jobData === void 0 ? void 0 : jobData.client_uid) !== req.user.uid) {
                return this.sendForbidden(res, 'Forbidden: You do not own this job');
            }
            // Only match open jobs
            if ((jobData === null || jobData === void 0 ? void 0 : jobData.status) !== 'open') {
                return this.sendBadRequest(res, 'Job is not open for matching');
            }
            const { matches, count } = await this.matchingService.matchArtisansToJob(id);
            if (count === 0) {
                this.sendSuccess(res, 'No available artisans found for this trade', { matches: [], count: 0 });
                return;
            }
            this.sendSuccess(res, 'Matches created successfully', { matches, count });
        }
        catch (error) {
            this.handleError(error, res, 'Match artisans');
        }
    }
    /**
     * GET /api/jobs/:id/matches
     */
    async getMatches(req, res) {
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
            if ((jobData === null || jobData === void 0 ? void 0 : jobData.client_uid) !== req.user.uid) {
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
            const artisanProfiles = {};
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
                return Object.assign(Object.assign({ match_id: doc.id }, matchData), { artisan: artisanData ? {
                        uid: artisanData.uid,
                        trade: artisanData.trade,
                        location: artisanData.location,
                        completed_jobs: artisanData.completed_jobs,
                        reputation_score: artisanData.reputation_score,
                        tagline: artisanData.tagline
                    } : null });
            });
            this.sendSuccess(res, 'Matches fetched successfully', {
                matches: matchesWithArtisans,
                count: matchesWithArtisans.length
            });
        }
        catch (error) {
            this.handleError(error, res, 'Get matches');
        }
    }
}
exports.JobController = JobController;
//# sourceMappingURL=job.controller.js.map