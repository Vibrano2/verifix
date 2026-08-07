/**
 * Rating Model
 * Defines the Rating data structure (separate collection per PRD v1.1)
 */

import * as admin from 'firebase-admin';

export interface Rating {
  rating_id: string; // doc ID
  job_id: string;
  artisan_uid: string;
  client_uid: string;
  score: number; // 1-5
  review?: string; // Text review (PRD Section 7.4 + user story C-005)
  created_at: Date | admin.firestore.Timestamp;
}

export interface CreateRatingDTO {
  job_id: string;
  artisan_uid: string;
  client_uid: string;
  score: number;
  review?: string;
}

export interface RatingDTO {
  match_id?: string; // For backward compatibility
  job_id: string;
  rating: number;
  review?: string;
}
