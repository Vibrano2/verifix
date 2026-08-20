"use strict";
/**
 * Artisan Controller
 * Handles HTTP requests for artisan operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtisanController = void 0;
const base_controller_1 = require("./base.controller");
const services_1 = require("../services");
const fileUpload_1 = require("../utils/fileUpload");
class ArtisanController extends base_controller_1.BaseController {
    constructor() {
        super();
        this.artisanService = new services_1.ArtisanService();
    }
    /**
     * POST /api/artisans/signup
     */
    async completeProfile(req, res) {
        try {
            if (!req.user) {
                return this.sendUnauthorized(res, 'Authentication required');
            }
            const { trade, location, tagline, bio, experience_years, hourly_rate, skills, portfolio } = req.body;
            const artisan = await this.artisanService.completeProfile(req.user.uid, {
                trade,
                location,
                tagline,
                bio,
                experience_years,
                hourly_rate,
                skills,
                portfolio
            });
            this.sendCreated(res, 'Artisan profile created successfully', { profile: artisan });
        }
        catch (error) {
            this.handleError(error, res, 'Complete artisan profile');
        }
    }
    /**
     * PATCH /api/artisans/:uid/availability
     */
    async updateAvailability(req, res) {
        try {
            const { uid } = req.params;
            const { available } = req.body;
            await this.artisanService.updateAvailability(uid, available);
            this.sendSuccess(res, 'Availability updated successfully', { available });
        }
        catch (error) {
            this.handleError(error, res, 'Update availability');
        }
    }
    /**
     * PATCH /api/artisans/:uid/profile
     */
    async updateProfile(req, res) {
        try {
            const { uid } = req.params;
            const updates = req.body;
            const artisan = await this.artisanService.updateProfile(uid, updates);
            this.sendSuccess(res, 'Profile updated successfully', { profile: artisan });
        }
        catch (error) {
            this.handleError(error, res, 'Update profile');
        }
    }
    /**
     * POST /api/artisans/:uid/photo
     */
    async addWorkPhoto(req, res) {
        try {
            const { uid } = req.params;
            const { url, filename } = await (0, fileUpload_1.uploadFile)(req, `artisan_photos/${uid}`, 5 * 1024 * 1024);
            await this.artisanService.addWorkPhoto(uid, url);
            this.sendSuccess(res, 'Photo uploaded successfully', { url, filename });
        }
        catch (error) {
            if (error.message.includes('Invalid file type') ||
                error.message.includes('File too large') ||
                error.message.includes('File signature')) {
                this.sendBadRequest(res, error.message);
                return;
            }
            this.handleError(error, res, 'Add work photo');
        }
    }
    /**
     * POST /api/artisans/:uid/id-document
     */
    async uploadIDDocument(req, res) {
        try {
            const { uid } = req.params;
            const { url, filename } = await (0, fileUpload_1.uploadFile)(req, `id_documents/${uid}`, 10 * 1024 * 1024);
            await this.artisanService.uploadIDDocument(uid, url);
            this.sendSuccess(res, 'ID document uploaded successfully', { url, filename });
        }
        catch (error) {
            if (error.message.includes('Invalid file type') ||
                error.message.includes('File too large') ||
                error.message.includes('File signature')) {
                this.sendBadRequest(res, error.message);
                return;
            }
            this.handleError(error, res, 'Upload ID document');
        }
    }
    /**
     * GET /api/artisans/:uid
     */
    async getProfile(req, res) {
        try {
            const { uid } = req.params;
            const profile = await this.artisanService.getProfile(uid);
            this.sendSuccess(res, 'Profile fetched successfully', { profile });
        }
        catch (error) {
            this.handleError(error, res, 'Get profile');
        }
    }
    /**
     * GET /api/artisans/:uid/dashboard
     */
    async getDashboard(req, res) {
        try {
            const { uid } = req.params;
            const dashboard = await this.artisanService.getDashboard(uid);
            this.sendSuccess(res, 'Dashboard data fetched successfully', dashboard);
        }
        catch (error) {
            this.handleError(error, res, 'Get dashboard');
        }
    }
}
exports.ArtisanController = ArtisanController;
//# sourceMappingURL=artisan.controller.js.map