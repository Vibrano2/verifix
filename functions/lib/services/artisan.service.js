"use strict";
/**
 * Artisan Service
 * Business logic for artisan operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtisanService = void 0;
const base_service_1 = require("./base.service");
const repositories_1 = require("../repositories");
const trades_1 = require("../constants/trades");
class ArtisanService extends base_service_1.BaseService {
    constructor() {
        super();
        this.artisanRepo = new repositories_1.ArtisanRepository();
        this.userRepo = new repositories_1.UserRepository();
    }
    /**
     * Complete artisan profile signup
     */
    async completeProfile(uid, data) {
        try {
            this.validateRequired(data, ['trade', 'location', 'tagline']);
            // Validate trade is in locked enum
            if (!(0, trades_1.isValidTrade)(data.trade)) {
                throw new Error(`Invalid trade. Must be one of the 24 locked trades.`);
            }
            // Verify user exists and is artisan
            const user = await this.userRepo.findById(uid);
            if (!user) {
                throw new Error('User not found');
            }
            if (user.role !== 'artisan') {
                throw new Error('Only artisans can create artisan profiles');
            }
            // Get category from trade
            const category = (0, trades_1.getCategoryForTrade)(data.trade);
            // Create/update artisan profile
            const artisanData = {
                uid,
                trade: data.trade,
                category,
                location: data.location,
                tagline: data.tagline,
                bio: data.bio,
                experience_years: data.experience_years,
                hourly_rate: data.hourly_rate,
                skills: data.skills || [],
                portfolio: data.portfolio || [],
                is_available: false,
                is_verified: false,
                verification_status: 'pending',
                work_photos: [],
                completed_jobs: 0,
                reputation_score: null,
                updated_at: new Date()
            };
            const artisan = await this.artisanRepo.update(uid, artisanData);
            this.logOperation('artisan-profile-completed', { uid, trade: data.trade });
            return artisan;
        }
        catch (error) {
            this.handleError(error, 'Complete artisan profile');
        }
    }
    /**
     * Update artisan availability
     */
    async updateAvailability(uid, available) {
        try {
            const artisan = await this.artisanRepo.findById(uid);
            if (!artisan) {
                throw new Error('Artisan profile not found');
            }
            await this.artisanRepo.update(uid, {
                is_available: available,
                updated_at: new Date()
            });
            this.logOperation('artisan-availability-updated', { uid, available });
        }
        catch (error) {
            this.handleError(error, 'Update availability');
        }
    }
    /**
     * Update artisan profile
     */
    async updateProfile(uid, updates) {
        try {
            const artisan = await this.artisanRepo.findById(uid);
            if (!artisan) {
                throw new Error('Artisan profile not found');
            }
            // If trade is being updated, update category too
            let updateData = Object.assign(Object.assign({}, updates), { updated_at: new Date() });
            if (updates.trade) {
                if (!(0, trades_1.isValidTrade)(updates.trade)) {
                    throw new Error('Invalid trade');
                }
                updateData.category = (0, trades_1.getCategoryForTrade)(updates.trade);
            }
            const updatedArtisan = await this.artisanRepo.update(uid, updateData);
            this.logOperation('artisan-profile-updated', { uid });
            return updatedArtisan;
        }
        catch (error) {
            this.handleError(error, 'Update artisan profile');
        }
    }
    /**
     * Add work photo
     */
    async addWorkPhoto(uid, photoUrl) {
        try {
            const artisan = await this.artisanRepo.findById(uid);
            if (!artisan) {
                throw new Error('Artisan profile not found');
            }
            const workPhotos = artisan.work_photos || [];
            workPhotos.push(photoUrl);
            await this.artisanRepo.update(uid, {
                work_photos: workPhotos,
                updated_at: new Date()
            });
            this.logOperation('work-photo-added', { uid, photoUrl });
        }
        catch (error) {
            this.handleError(error, 'Add work photo');
        }
    }
    /**
     * Upload ID document
     */
    async uploadIDDocument(uid, documentUrl) {
        try {
            const artisan = await this.artisanRepo.findById(uid);
            if (!artisan) {
                throw new Error('Artisan profile not found');
            }
            await this.artisanRepo.update(uid, {
                id_document_url: documentUrl,
                updated_at: new Date()
            });
            this.logOperation('id-document-uploaded', { uid });
        }
        catch (error) {
            this.handleError(error, 'Upload ID document');
        }
    }
    /**
     * Get artisan profile
     */
    async getProfile(uid) {
        try {
            const artisan = await this.artisanRepo.findById(uid);
            if (!artisan) {
                throw new Error('Artisan profile not found');
            }
            return artisan;
        }
        catch (error) {
            this.handleError(error, 'Get artisan profile');
        }
    }
    /**
     * Get artisan dashboard data
     */
    async getDashboard(uid) {
        try {
            const artisan = await this.artisanRepo.findById(uid);
            if (!artisan) {
                throw new Error('Artisan profile not found');
            }
            // This would call transaction and match repositories
            // For now, returning placeholder structure
            return {
                profile: artisan,
                finances: {
                    held: 0,
                    released: 0,
                    total_earnings: 0
                },
                matches: {
                    pending: 0,
                    accepted: 0,
                    completed: 0,
                    total: 0
                }
            };
        }
        catch (error) {
            this.handleError(error, 'Get artisan dashboard');
        }
    }
    /**
     * Find artisans by trade
     */
    async findByTrade(trade, limit) {
        try {
            if (!(0, trades_1.isValidTrade)(trade)) {
                throw new Error('Invalid trade');
            }
            const artisans = await this.artisanRepo.findByTrade(trade, limit);
            return artisans;
        }
        catch (error) {
            this.handleError(error, 'Find artisans by trade');
        }
    }
}
exports.ArtisanService = ArtisanService;
//# sourceMappingURL=artisan.service.js.map