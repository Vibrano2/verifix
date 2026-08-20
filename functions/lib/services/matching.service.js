"use strict";
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
exports.MatchingService = void 0;
const admin = __importStar(require("firebase-admin"));
const base_service_1 = require("./base.service");
class MatchingService extends base_service_1.BaseService {
    constructor() {
        super();
        this.db = admin.firestore();
    }
    /**
     * Match artisans to a job
     */
    async matchArtisansToJob(jobId, limit = 5) {
        const jobDoc = await this.db.collection('jobs').doc(jobId).get();
        if (!jobDoc.exists) {
            throw new Error('Job not found');
        }
        const jobData = jobDoc.data();
        // Query artisans by trade, available, and verified
        const artisansSnapshot = await this.db.collection('artisan_profiles')
            .where('trade', '==', jobData.trade_needed)
            .where('is_available', '==', true)
            .where('is_verified', '==', true)
            .get();
        if (artisansSnapshot.empty) {
            return { matches: [], count: 0 };
        }
        // Sort artisans by completed_jobs (desc) and reputation_score (desc) as tiebreakers
        const artisans = artisansSnapshot.docs.map((doc) => (Object.assign({ uid: doc.id }, doc.data())));
        artisans.sort((a, b) => {
            // Primary: completed_jobs (descending)
            const aCompleted = a.completed_jobs || 0;
            const bCompleted = b.completed_jobs || 0;
            if (bCompleted !== aCompleted) {
                return bCompleted - aCompleted;
            }
            // Tiebreaker: reputation_score (descending, nulls last)
            const aScore = a.reputation_score === null || a.reputation_score === undefined ? -1 : a.reputation_score;
            const bScore = b.reputation_score === null || b.reputation_score === undefined ? -1 : b.reputation_score;
            return bScore - aScore;
        });
        // Return top matches
        const topMatches = artisans.slice(0, limit);
        // CRITICAL: Use Firestore transaction to ensure atomicity
        // Create matches and update job status atomically
        const matchResults = await this.db.runTransaction(async (transaction) => {
            const matchesRef = this.db.collection('matches');
            const createdMatches = [];
            // Create match records within transaction
            for (const artisan of topMatches) {
                const matchData = {
                    job_id: jobId,
                    artisan_uid: artisan.uid,
                    status: 'pending',
                    rating: null,
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                };
                const matchDocRef = matchesRef.doc(); // Generate ID
                transaction.set(matchDocRef, matchData);
                createdMatches.push(Object.assign(Object.assign({ match_id: matchDocRef.id }, matchData), { artisan: {
                        uid: artisan.uid,
                        trade: artisan.trade,
                        location: artisan.location,
                        completed_jobs: artisan.completed_jobs,
                        reputation_score: artisan.reputation_score,
                        tagline: artisan.tagline
                    } }));
            }
            // Update job status to matched within same transaction
            transaction.update(jobDoc.ref, {
                status: 'matched',
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            return createdMatches;
        });
        return { matches: matchResults, count: matchResults.length };
    }
}
exports.MatchingService = MatchingService;
//# sourceMappingURL=matching.service.js.map