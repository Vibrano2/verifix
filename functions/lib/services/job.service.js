"use strict";
/**
 * Job Service
 * Business logic for job operations
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
exports.JobService = void 0;
const admin = __importStar(require("firebase-admin"));
const base_service_1 = require("./base.service");
const constants_1 = require("../constants");
const trades_1 = require("../constants/trades");
class JobService extends base_service_1.BaseService {
    constructor() {
        super();
        this.db = admin.firestore();
    }
    /**
     * Create new job
     */
    async createJob(clientUid, data) {
        try {
            this.validateRequired(data, ['trade_needed', 'title', 'description', 'location', 'urgency']);
            // Validate trade
            if (!(0, trades_1.isValidTrade)(data.trade_needed)) {
                throw new Error('Invalid trade. Must be one of the 24 locked trades.');
            }
            // Validate urgency
            const validUrgencies = ['Today', 'This Week', 'Flexible'];
            if (!validUrgencies.includes(data.urgency)) {
                throw new Error(`Invalid urgency. Must be one of: ${validUrgencies.join(', ')}`);
            }
            const jobData = {
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
            const docRef = await this.db.collection(constants_1.COLLECTIONS.JOBS).add(jobData);
            this.logOperation('job-created', { jobId: docRef.id, clientUid, trade: data.trade_needed });
            return Object.assign(Object.assign({ job_id: docRef.id }, jobData), { created_at: new Date(), updated_at: new Date() });
        }
        catch (error) {
            this.handleError(error, 'Create job');
        }
    }
    /**
     * Get job by ID
     */
    async getJobById(jobId) {
        try {
            const doc = await this.db.collection(constants_1.COLLECTIONS.JOBS).doc(jobId).get();
            if (!doc.exists) {
                return null;
            }
            return Object.assign({ job_id: doc.id }, doc.data());
        }
        catch (error) {
            this.handleError(error, 'Get job by ID');
        }
    }
    /**
     * Update job
     */
    async updateJob(jobId, updates) {
        try {
            const job = await this.getJobById(jobId);
            if (!job) {
                throw new Error('Job not found');
            }
            const updateData = Object.assign(Object.assign({}, updates), { updated_at: admin.firestore.FieldValue.serverTimestamp() });
            await this.db.collection(constants_1.COLLECTIONS.JOBS).doc(jobId).update(updateData);
            this.logOperation('job-updated', { jobId });
            return await this.getJobById(jobId);
        }
        catch (error) {
            this.handleError(error, 'Update job');
        }
    }
    /**
     * Get jobs by client UID
     */
    async getJobsByClient(clientUid) {
        try {
            const snapshot = await this.db
                .collection(constants_1.COLLECTIONS.JOBS)
                .where('client_uid', '==', clientUid)
                .orderBy('created_at', 'desc')
                .get();
            return snapshot.docs.map(doc => (Object.assign({ job_id: doc.id }, doc.data())));
        }
        catch (error) {
            this.handleError(error, 'Get jobs by client');
        }
    }
    /**
     * Get open jobs by trade
     */
    async getOpenJobsByTrade(trade) {
        try {
            if (!(0, trades_1.isValidTrade)(trade)) {
                throw new Error('Invalid trade');
            }
            const snapshot = await this.db
                .collection(constants_1.COLLECTIONS.JOBS)
                .where('trade_needed', '==', trade)
                .where('status', '==', 'open')
                .orderBy('created_at', 'desc')
                .get();
            return snapshot.docs.map(doc => (Object.assign({ job_id: doc.id }, doc.data())));
        }
        catch (error) {
            this.handleError(error, 'Get open jobs by trade');
        }
    }
    /**
     * Mark job as complete and release escrow
     * CRITICAL REQUIREMENTS:
     * - Only the client who owns the job can mark it complete
     * - Commission calculated from locked_job_value (never from current job value)
     * - Idempotent - calling twice doesn't double-release
     * - Handles edge cases: zero job value, fractional kobo
     */
    async markComplete(jobId, clientUid, matchId) {
        try {
            const job = await this.getJobById(jobId);
            if (!job) {
                throw new Error('Job not found');
            }
            // Verify ownership
            if (job.client_uid !== clientUid) {
                throw new Error('Forbidden: Only the client who posted this job can mark it complete');
            }
            const matchRef = this.db.collection('matches').doc(matchId);
            const matchDoc = await matchRef.get();
            if (!matchDoc.exists) {
                throw new Error('Match not found');
            }
            const matchData = matchDoc.data();
            // Verify match belongs to this job
            if ((matchData === null || matchData === void 0 ? void 0 : matchData.job_id) !== jobId) {
                throw new Error('Match does not belong to this job');
            }
            // Get transaction for this match
            const transactionsSnapshot = await this.db.collection('transactions')
                .where('match_id', '==', matchId)
                .where('status', '==', 'held')
                .limit(1)
                .get();
            if (transactionsSnapshot.empty) {
                throw new Error('No held transaction found for this match. Payment may not have been completed.');
            }
            const transactionDoc = transactionsSnapshot.docs[0];
            const transactionData = transactionDoc.data();
            // IDEMPOTENCY CHECK: If transaction already released, return success without re-processing
            if ((transactionData === null || transactionData === void 0 ? void 0 : transactionData.status) === 'released') {
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
            // Calculate commission from locked_job_value (immutable, set at payment initialization)
            const lockedJobValue = (transactionData === null || transactionData === void 0 ? void 0 : transactionData.locked_job_value) || 0;
            // Handle edge case: zero job value
            if (lockedJobValue === 0) {
                this.logger.warn(`Job ${jobId} has zero locked_job_value, no commission to retain`);
            }
            // Calculate 10% commission, rounding to handle fractional kobo
            const commissionRetained = Math.round(lockedJobValue * 0.10);
            // CRITICAL: Use Firestore transaction to ensure atomicity
            // All 4 updates succeed or all fail - prevents partial completion
            await this.db.runTransaction(async (transaction) => {
                // 1. Update transaction: status → released, set commission and released_at
                transaction.update(transactionDoc.ref, {
                    status: 'released',
                    commission_retained: commissionRetained,
                    released_at: admin.firestore.FieldValue.serverTimestamp()
                });
                // 2. Update job status to complete
                const jobRef = this.db.collection('jobs').doc(jobId);
                transaction.update(jobRef, {
                    status: 'completed', // PRD uses 'completed', code used 'complete'
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
                // 3. Update match status to completed
                transaction.update(matchRef, {
                    status: 'completed',
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
                // 4. Increment artisan's completed_jobs count
                const artisanRef = this.db.collection('artisan_profiles').doc(matchData.artisan_uid);
                transaction.update(artisanRef, {
                    completed_jobs: admin.firestore.FieldValue.increment(1),
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            this.logOperation('job-completed', { jobId, clientUid });
            return {
                message: 'Job marked complete and escrow released successfully',
                transaction: {
                    transaction_id: transactionDoc.id,
                    status: 'released',
                    locked_job_value: lockedJobValue,
                    commission_retained: commissionRetained,
                    artisan_receives: lockedJobValue - commissionRetained,
                    released_at: new Date()
                }
            };
        }
        catch (error) {
            this.handleError(error, 'Mark job complete');
        }
    }
    /**
     * Cancel job
     */
    async cancelJob(jobId, clientUid) {
        try {
            const job = await this.getJobById(jobId);
            if (!job) {
                throw new Error('Job not found');
            }
            // Verify ownership
            if (job.client_uid !== clientUid) {
                throw new Error('Unauthorized: You can only cancel your own jobs');
            }
            await this.db.collection(constants_1.COLLECTIONS.JOBS).doc(jobId).update({
                status: 'cancelled',
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            this.logOperation('job-cancelled', { jobId, clientUid });
        }
        catch (error) {
            this.handleError(error, 'Cancel job');
        }
    }
    /**
     * Search jobs with filters
     * Now supports pagination with limit and offset
     */
    async searchJobs(filters) {
        try {
            let query = this.db.collection(constants_1.COLLECTIONS.JOBS);
            if (filters.trade) {
                if (!(0, trades_1.isValidTrade)(filters.trade)) {
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
            // Apply ordering
            query = query.orderBy('created_at', 'desc');
            // Apply pagination
            const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50; // Default 50, max 100
            const offset = filters.offset || 0;
            query = query.limit(limit);
            if (offset > 0) {
                query = query.offset(offset);
            }
            const snapshot = await query.get();
            let jobs = snapshot.docs.map(doc => (Object.assign({ job_id: doc.id }, doc.data())));
            // Filter by location if provided (Firestore doesn't support nested field queries well)
            if (filters.location) {
                jobs = jobs.filter(job => job.location.city.toLowerCase().includes(filters.location.toLowerCase()) ||
                    job.location.state.toLowerCase().includes(filters.location.toLowerCase()));
            }
            return jobs;
        }
        catch (error) {
            this.handleError(error, 'Search jobs');
        }
    }
}
exports.JobService = JobService;
//# sourceMappingURL=job.service.js.map