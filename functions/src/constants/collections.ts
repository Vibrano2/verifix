/**
 * Firestore Collection Names
 * Centralized collection name constants to avoid hardcoded strings
 */

export const COLLECTIONS = {
  USERS: 'users',
  ARTISANS: 'artisan_profiles',
  JOBS: 'jobs',
  MATCHES: 'matches',
  TRANSACTIONS: 'transactions',
  AUDIT_LOGS: 'audit_logs',
  RATINGS: 'ratings', // Separate collection per PRD v1.1
  ANALYTICS_EVENTS: 'analytics_events' // Per PRD Section 8.8
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
