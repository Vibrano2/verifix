"use strict";
/**
 * Rating Service
 * Business logic for rating operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingService = void 0;
const base_service_1 = require("./base.service");
const repositories_1 = require("../repositories");
class RatingService extends base_service_1.BaseService {
    constructor() {
        super();
        this.ratingRepo = new repositories_1.RatingRepository();
        this.artisanRepo = new repositories_1.ArtisanRepository();
    }
    /**
     * Submit rating for a job
     * Prevents duplicate ratings (409 Conflict)
     * Recalculates artisan reputation_score
     */
    async submitRating(data) {
        try {
            this.validateRequired(data, ['jobId', 'artisanUid', 'clientUid', 'score']);
            // Validate score (1-5)
            if (data.score < 1 || data.score > 5 || !Number.isInteger(data.score)) {
                throw new Error('Rating score must be an integer between 1 and 5');
            }
            // Check for duplicate rating
            const existingRating = await this.ratingRepo.findByJobId(data.jobId);
            if (existingRating) {
                throw new Error('Rating already exists for this job');
            }
            // Create rating
            const rating = await this.ratingRepo.createRating({
                job_id: data.jobId,
                artisan_uid: data.artisanUid,
                client_uid: data.clientUid,
                score: data.score,
                review: data.review
            });
            // Recalculate artisan reputation_score
            await this.updateArtisanReputation(data.artisanUid);
            this.logOperation('rating-submitted', {
                jobId: data.jobId,
                artisanUid: data.artisanUid,
                score: data.score
            });
            return rating;
        }
        catch (error) {
            this.handleError(error, 'Submit rating');
        }
    }
    /**
     * Update artisan reputation score
     * Calculates average of all ratings
     */
    async updateArtisanReputation(artisanUid) {
        try {
            const averageRating = await this.ratingRepo.calculateAverageRating(artisanUid);
            await this.artisanRepo.updateReputationScore(artisanUid, averageRating);
            this.logOperation('reputation-updated', {
                artisanUid,
                newScore: averageRating
            });
        }
        catch (error) {
            this.logger.error('Failed to update artisan reputation', { artisanUid, error });
            // Don't throw - rating was saved successfully
        }
    }
    /**
     * Get ratings for an artisan
     */
    async getArtisanRatings(artisanUid) {
        try {
            return await this.ratingRepo.findByArtisanUid(artisanUid);
        }
        catch (error) {
            this.handleError(error, 'Get artisan ratings');
        }
    }
    /**
     * Get rating statistics for an artisan
     */
    async getArtisanRatingStats(artisanUid) {
        try {
            return await this.ratingRepo.getArtisanRatingStats(artisanUid);
        }
        catch (error) {
            this.handleError(error, 'Get artisan rating stats');
        }
    }
    /**
     * Check if rating exists for job
     */
    async ratingExistsForJob(jobId) {
        try {
            return await this.ratingRepo.ratingExistsForJob(jobId);
        }
        catch (error) {
            this.handleError(error, 'Check rating exists');
        }
    }
    /**
     * Get rating for a specific job
     */
    async getRatingForJob(jobId) {
        try {
            return await this.ratingRepo.findByJobId(jobId);
        }
        catch (error) {
            this.handleError(error, 'Get rating for job');
        }
    }
}
exports.RatingService = RatingService;
//# sourceMappingURL=rating.service.js.map