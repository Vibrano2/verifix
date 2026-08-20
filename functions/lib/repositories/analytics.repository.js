"use strict";
/**
 * Analytics Repository
 * Handles all analytics event tracking operations
 * Per PRD Section 8.8: for Data Analysis dashboard
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
exports.AnalyticsRepository = void 0;
const base_repository_1 = require("./base.repository");
const constants_1 = require("../constants");
const logger_1 = require("../utils/logger");
const admin = __importStar(require("firebase-admin"));
class AnalyticsRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(constants_1.COLLECTIONS.ANALYTICS_EVENTS);
    }
    /**
     * Track an analytics event
     */
    async trackEvent(eventType, userId, metadata, sessionId) {
        try {
            const eventData = {
                event_type: eventType,
                user_id: userId,
                session_id: sessionId,
                metadata,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await this.getCollection().add(eventData);
            return {
                event_id: docRef.id,
                event_type: eventType,
                user_id: userId,
                session_id: sessionId,
                metadata,
                timestamp: new Date()
            };
        }
        catch (error) {
            logger_1.Logger.error('Error tracking analytics event', { eventType, userId, error });
            // Don't throw - analytics failures should not break application flow
            throw error;
        }
    }
    /**
     * Get events by user ID
     */
    async findByUserId(userId, limit = 100) {
        try {
            const snapshot = await this.getCollection()
                .where('user_id', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            if (snapshot.empty) {
                return [];
            }
            return snapshot.docs.map((doc) => (Object.assign({ event_id: doc.id }, doc.data())));
        }
        catch (error) {
            logger_1.Logger.error('Error finding events by user ID', { userId, error });
            throw error;
        }
    }
    /**
     * Get events by type
     */
    async findByEventType(eventType, startDate, endDate, limit = 1000) {
        try {
            let query = this.getCollection()
                .where('event_type', '==', eventType);
            if (startDate) {
                query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate));
            }
            if (endDate) {
                query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate));
            }
            const snapshot = await query
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            if (snapshot.empty) {
                return [];
            }
            return snapshot.docs.map((doc) => (Object.assign({ event_id: doc.id }, doc.data())));
        }
        catch (error) {
            logger_1.Logger.error('Error finding events by type', { eventType, error });
            throw error;
        }
    }
    /**
     * Get event count by type
     */
    async countEventsByType(eventType, startDate, endDate) {
        try {
            let query = this.getCollection()
                .where('event_type', '==', eventType);
            if (startDate) {
                query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate));
            }
            if (endDate) {
                query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate));
            }
            const snapshot = await query.get();
            return snapshot.size;
        }
        catch (error) {
            logger_1.Logger.error('Error counting events by type', { eventType, error });
            throw error;
        }
    }
    /**
     * Get events by session
     */
    async findBySessionId(sessionId) {
        try {
            const snapshot = await this.getCollection()
                .where('session_id', '==', sessionId)
                .orderBy('timestamp', 'asc')
                .get();
            if (snapshot.empty) {
                return [];
            }
            return snapshot.docs.map((doc) => (Object.assign({ event_id: doc.id }, doc.data())));
        }
        catch (error) {
            logger_1.Logger.error('Error finding events by session ID', { sessionId, error });
            throw error;
        }
    }
    /**
     * Get daily event counts (for dashboard charts)
     */
    async getDailyEventCounts(startDate, endDate, eventType) {
        try {
            let query = this.getCollection()
                .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
                .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate));
            if (eventType) {
                query = query.where('event_type', '==', eventType);
            }
            const snapshot = await query.get();
            const dailyCounts = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const timestamp = data.timestamp instanceof admin.firestore.Timestamp
                    ? data.timestamp.toDate()
                    : new Date(data.timestamp);
                const dateKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
                dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
            });
            return dailyCounts;
        }
        catch (error) {
            logger_1.Logger.error('Error getting daily event counts', { startDate, endDate, eventType, error });
            throw error;
        }
    }
    /**
     * Delete old events (cleanup - keep last 90 days)
     */
    async deleteOldEvents(daysToKeep = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const snapshot = await this.getCollection()
                .where('timestamp', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
                .get();
            if (snapshot.empty) {
                return 0;
            }
            const batch = admin.firestore().batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            logger_1.Logger.info('Deleted old analytics events', {
                count: snapshot.size,
                cutoffDate
            });
            return snapshot.size;
        }
        catch (error) {
            logger_1.Logger.error('Error deleting old events', { daysToKeep, error });
            throw error;
        }
    }
}
exports.AnalyticsRepository = AnalyticsRepository;
//# sourceMappingURL=analytics.repository.js.map