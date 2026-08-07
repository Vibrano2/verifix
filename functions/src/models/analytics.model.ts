/**
 * Analytics Model
 * Defines the Analytics Event data structure (PRD Section 8.8)
 */

import * as admin from 'firebase-admin';

export type AnalyticsEventType = 
  | 'user_signup'
  | 'job_posted'
  | 'job_matched'
  | 'payment_initiated'
  | 'payment_completed'
  | 'job_completed'
  | 'rating_submitted'
  | 'artisan_verified'
  | 'contact_revealed'
  | 'profile_updated';

export interface AnalyticsEvent {
  event_id: string; // doc ID
  event_type: AnalyticsEventType;
  user_id: string;
  session_id?: string;
  metadata?: Record<string, any>;
  timestamp: Date | admin.firestore.Timestamp;
}

export interface CreateAnalyticsEventDTO {
  event_type: AnalyticsEventType;
  user_id: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

export interface AdminAnalytics {
  users: {
    total: number;
    clients: number;
    artisans: number;
    verified_artisans: number;
  };
  jobs: {
    total: number;
    open: number;
    matched: number;
    completed: number;
    cancelled: number;
  };
  matches: {
    total: number;
    pending: number;
    accepted: number;
    completed: number;
  };
  revenue: {
    total_held: number;
    total_released: number;
    total_commission: number;
  };
}
