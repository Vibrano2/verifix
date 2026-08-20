"use strict";
/**
 * Admin Controller
 * Handles HTTP requests for admin operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const base_controller_1 = require("./base.controller");
const services_1 = require("../services");
class AdminController extends base_controller_1.BaseController {
    constructor() {
        super();
        this.adminService = new services_1.AdminService();
    }
    /**
     * GET /api/admin/verification-queue
     */
    async getVerificationQueue(req, res) {
        try {
            const { limit, offset } = req.query;
            const parsedLimit = limit ? parseInt(limit, 10) : 50;
            const parsedOffset = offset ? parseInt(offset, 10) : 0;
            const queue = await this.adminService.getVerificationQueue(parsedLimit, parsedOffset);
            this.sendSuccess(res, 'Verification queue fetched successfully', {
                artisans: queue,
                count: queue.length,
                limit: parsedLimit,
                offset: parsedOffset
            });
        }
        catch (error) {
            this.handleError(error, res, 'Get verification queue');
        }
    }
    /**
     * POST /api/admin/verify/:uid
     */
    async verifyArtisan(req, res) {
        try {
            const { uid } = req.params;
            await this.adminService.verifyArtisan(uid);
            this.sendSuccess(res, 'Artisan verified successfully', {
                uid,
                is_verified: true
            });
        }
        catch (error) {
            this.handleError(error, res, 'Verify artisan');
        }
    }
    /**
     * POST /api/admin/reject/:uid
     */
    async rejectArtisan(req, res) {
        try {
            const { uid } = req.params;
            const { reason } = req.body;
            await this.adminService.rejectArtisan(uid, reason);
            this.sendSuccess(res, 'Artisan verification rejected', {
                uid,
                reason: reason || 'Not specified'
            });
        }
        catch (error) {
            this.handleError(error, res, 'Reject artisan');
        }
    }
    /**
     * GET /api/admin/stats
     */
    async getStatistics(req, res) {
        try {
            const stats = await this.adminService.getStatistics();
            this.sendSuccess(res, 'Statistics fetched successfully', stats);
        }
        catch (error) {
            this.handleError(error, res, 'Get statistics');
        }
    }
    /**
     * GET /api/admin/analytics
     */
    async getAnalytics(req, res) {
        try {
            const analytics = await this.adminService.getAnalytics();
            this.sendSuccess(res, 'Analytics data fetched successfully', analytics);
        }
        catch (error) {
            this.handleError(error, res, 'Get analytics');
        }
    }
}
exports.AdminController = AdminController;
//# sourceMappingURL=admin.controller.js.map