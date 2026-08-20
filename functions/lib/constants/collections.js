"use strict";
/**
 * Firestore Collection Names
 * Centralized collection name constants to avoid hardcoded strings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLLECTIONS = void 0;
exports.COLLECTIONS = {
    USERS: 'users',
    ARTISANS: 'artisan_profiles',
    JOBS: 'jobs',
    MATCHES: 'matches',
    TRANSACTIONS: 'transactions',
    AUDIT_LOGS: 'audit_logs',
    RATINGS: 'ratings', // Separate collection per PRD v1.1
    ANALYTICS_EVENTS: 'analytics_events' // Per PRD Section 8.8
};
//# sourceMappingURL=collections.js.map