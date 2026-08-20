"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const controllers_1 = require("../controllers");
const router = (0, express_1.Router)();
const adminController = new controllers_1.AdminController();
/**
 * GET /api/admin/verification-queue
 * List all unverified artisans
 */
router.get('/verification-queue', auth_1.authenticate, auth_1.requireAdmin, (req, res) => adminController.getVerificationQueue(req, res));
/**
 * POST /api/admin/verify/:uid
 * Verify an artisan
 */
router.post('/verify/:uid', auth_1.authenticate, auth_1.requireAdmin, (req, res) => adminController.verifyArtisan(req, res));
/**
 * POST /api/admin/reject/:uid
 * Reject an artisan verification
 */
router.post('/reject/:uid', auth_1.authenticate, auth_1.requireAdmin, (req, res) => adminController.rejectArtisan(req, res));
/**
 * GET /api/admin/stats
 * Get platform statistics
 */
router.get('/stats', auth_1.authenticate, auth_1.requireAdmin, (req, res) => adminController.getStatistics(req, res));
/**
 * GET /api/admin/analytics
 * Get comprehensive analytics data
 */
router.get('/analytics', auth_1.authenticate, auth_1.requireAdmin, (req, res) => adminController.getAnalytics(req, res));
exports.default = router;
//# sourceMappingURL=admin.js.map