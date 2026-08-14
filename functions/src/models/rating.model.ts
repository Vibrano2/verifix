import * as admin from 'firebase-admin';
import { z } from 'zod';

export const RatingSchema = z.object({
  body: z.object({
    job_id: z.string().min(1),
    match_id: z.string().optional(),
    rating: z.number().int().min(1).max(5),
    review: z.string().max(1000).optional()
  })
});

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

export type RatingDTO = z.infer<typeof RatingSchema>['body'];
