"use strict";
/**
 * Rating Repository
 * Handles all rating-related database operations
 * Per PRD v1.1: ratings are a separate collection, not a field on matches
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
exports.RatingRepository = void 0;
const base_repository_1 = require("./base.repository");
const constants_1 = require("../constants");
const logger_1 = require("../utils/logger");
const admin = __importStar(require("firebase-admin"));
class RatingRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(constants_1.COLLECTIONS.RATINGS);
    }
    /**
     * Find rating by job ID
     */
    async findByJobId(jobId) {
        try {
            const snapshot = await this.getCollection()
                .where('job_id', '==', jobId)
                .limit(1)
                .get();
            if (snapshot.empty) {
                return null;
            }
            const doc = snapshot.docs[0];
            return Object.assign({ rating_id: doc.id }, doc.data());
        }
        catch (error) {
            logger_1.Logger.error('Error finding rating by job ID', { jobId, error });
            throw error;
        }
    }
    /**
     * Find all ratings for an artisan
     */
    async findByArtisanUid(artisanUid) {
        try {
            const snapshot = await this.getCollection()
                .where('artisan_uid', '==', artisanUid)
                .orderBy('created_at', 'desc')
                .get();
            if (snapshot.empty) {
                return [];
            }
            return snapshot.docs.map((doc) => (Object.assign({ rating_id: doc.id }, doc.data())));
        }
        catch (error) {
            logger_1.Logger.error('Error finding ratings by artisan UID', { artisanUid, error });
            throw error;
        }
    }
    /**
     * Calculate average rating (reputation_score) for an artisan
     */
    async calculateAverageRating(artisanUid) {
        try {
            const ratings = await this.findByArtisanUid(artisanUid);
            if (ratings.length === 0) {
                return null;
            }
            const sum = ratings.reduce((acc, rating) => acc + rating.score, 0);
            const average = sum / ratings.length;
            return Math.round(average * 10) / 10; // Round to 1 decimal place
        }
        catch (error) {
            logger_1.Logger.error('Error calculating average rating', { artisanUid, error });
            throw error;
        }
    }
    /**
     * Check if a rating already exists for a job (prevent duplicate ratings)
     */
    async ratingExistsForJob(jobId) {
        try {
            const rating = await this.findByJobId(jobId);
            return rating !== null;
        }
        catch (error) {
            logger_1.Logger.error('Error checking if rating exists for job', { jobId, error });
            throw error;
        }
    }
    /**
     * Create rating and return with ID
     */
    async createRating(data) {
        try {
            // Check for duplicate rating
            const exists = await this.ratingExistsForJob(data.job_id);
            if (exists) {
                throw new Error('Rating already exists for this job');
            }
            const ratingData = Object.assign(Object.assign({}, data), { created_at: admin.firestore.FieldValue.serverTimestamp() });
            const docRef = await this.getCollection().add(ratingData);
            return Object.assign(Object.assign({ rating_id: docRef.id }, data), { created_at: new Date() });
        }
        catch (error) {
            logger_1.Logger.error('Error creating rating', { data, error });
            throw error;
        }
    }
    /**
     * Get rating statistics for an artisan
     */
    async getArtisanRatingStats(artisanUid) {
        try {
            const ratings = await this.findByArtisanUid(artisanUid);
            if (ratings.length === 0) {
                return {
                    average: null,
                    total: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };
            }
            const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            let sum = 0;
            ratings.forEach(rating => {
                sum += rating.score;
                distribution[rating.score]++;
            });
            const average = Math.round((sum / ratings.length) * 10) / 10;
            return {
                average,
                total: ratings.length,
                distribution
            };
        }
        catch (error) {
            logger_1.Logger.error('Error getting artisan rating stats', { artisanUid, error });
            throw error;
        }
    }
}
exports.RatingRepository = RatingRepository;
//# sourceMappingURL=rating.repository.js.map