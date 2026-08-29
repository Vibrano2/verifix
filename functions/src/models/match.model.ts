/**
 * Match Model
 * Defines the Job-Artisan Match data structure
 */

import * as admin from 'firebase-admin';

export type MatchStatus =
  | 'pending'
  | 'paid'        // payment confirmed, no-response timer running
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled'
  | 'refunded';   // auto-refunded due to no-response

export interface Match {
  id: string;
  job_id: string;
  artisan_uid: string;
  client_uid: string;
  status: MatchStatus;
  match_score?: number;
  contact_revealed: boolean;
  rating?: number;
  review?: string;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
  accepted_at?: Date | admin.firestore.Timestamp;
  completed_at?: Date | admin.firestore.Timestamp;
}

export interface CreateMatchDTO {
  job_id: string;
  artisan_uid: string;
  client_uid: string;
  match_score?: number;
}

export interface RatingDTO {
  match_id: string;
  rating: number;
  review?: string;
}
