"use strict";
/**
 * Analytics Service
 * Business logic for analytics event tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const base_service_1 = require("./base.service");
const repositories_1 = require("../repositories");
class AnalyticsService extends base_service_1.BaseService {
    constructor() {
        super();
        this.analyticsRepo = new repositories_1.AnalyticsRepository();
    }
    /**
     * Track analytics event
     * Non-blocking - failures don't break application flow
     */
    async trackEvent(eventType, userId, metadata, sessionId) {
        try {
            await this.analyticsRepo.trackEvent(eventType, userId, metadata, sessionId);
            this.logOperation('analytics-event-tracked', {
                eventType,
                userId
            });
        }
        catch (error) {
            // Log but don't throw - analytics failures shouldn't break app
            this.logger.error('Failed to track analytics event', {
                eventType,
                userId,
                error
            });
        }
    }
    /**
     * Get user activity
     */
    async getUserActivity(userId, limit = 50) {
        try {
            return await this.analyticsRepo.findByUserId(userId, limit);
        }
        catch (error) {
            this.handleError(error, 'Get user activity');
        }
    }
    /**
     * Get events by type
     */
    async getEventsByType(eventType, startDate, endDate) {
        try {
            return await this.analyticsRepo.findByEventType(eventType, startDate, endDate);
        }
        catch (error) {
            this.handleError(error, 'Get events by type');
        }
    }
    /**
     * Get event count
     */
    async getEventCount(eventType, startDate, endDate) {
        try {
            return await this.analyticsRepo.countEventsByType(eventType, startDate, endDate);
        }
        catch (error) {
            this.handleError(error, 'Get event count');
        }
    }
    /**
     * Get daily metrics for dashboard
     */
    async getDailyMetrics(startDate, endDate, eventType) {
        try {
            return await this.analyticsRepo.getDailyEventCounts(startDate, endDate, eventType);
        }
        catch (error) {
            this.handleError(error, 'Get daily metrics');
        }
    }
    /**
     * Get session events
     */
    async getSessionEvents(sessionId) {
        try {
            return await this.analyticsRepo.findBySessionId(sessionId);
        }
        catch (error) {
            this.handleError(error, 'Get session events');
        }
    }
    /**
     * Cleanup old events (admin action)
     */
    async cleanupOldEvents(daysToKeep = 90) {
        try {
            const deletedCount = await this.analyticsRepo.deleteOldEvents(daysToKeep);
            this.logOperation('analytics-cleanup', {
                deletedCount,
                daysToKeep
            });
            return deletedCount;
        }
        catch (error) {
            this.handleError(error, 'Cleanup old events');
        }
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analytics.service.js.map