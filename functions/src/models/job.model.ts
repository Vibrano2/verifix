import * as admin from 'firebase-admin';
import { z } from 'zod';
import { Location } from './artisan.model';
import { Trade, VALID_TRADES } from '../constants/trades';

export type TradeName = Trade;

export type JobStatus = 
  | 'open' 
  | 'matched' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export type Urgency = 'Today' | 'This Week' | 'Flexible';

// Zod Schemas for Validation
export const LocationSchema = z.object({
  city: z.string().min(1),
  state: z.string().min(1),
  lga: z.string().min(1),
  address: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

export const CreateJobSchema = z.object({
  body: z.object({
    trade_needed: z.enum(VALID_TRADES as [string, ...string[]]).optional(),
    trade: z.enum(VALID_TRADES as [string, ...string[]]).optional(),
    title: z.string().min(5).max(100),
    description: z.string().min(10).max(1000),
    location: z.union([LocationSchema, z.string()]),
    urgency: z.enum(['Today', 'This Week', 'Flexible']).optional(),
    timing: z.string().optional(),
    budget: z.number().positive().optional(),
    budget_min: z.number().positive().optional(),
    budget_max: z.number().positive().optional(),
    match_fee: z.number().positive().optional()
  })
});

export const UpdateJobSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(100).optional(),
    description: z.string().min(10).max(1000).optional(),
    location: LocationSchema.optional(),
    urgency: z.enum(['Today', 'This Week', 'Flexible']).optional(),
    budget: z.number().positive().optional(),
    status: z.enum(['open', 'matched', 'in_progress', 'completed', 'cancelled']).optional()
  })
});

export interface Job {
  id: string;
  client_uid: string;
  trade_needed: TradeName;
  title: string;
  description: string;
  location: Location;
  urgency: Urgency;
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  status: JobStatus;
  matched_artisan_uid?: string;
  locked_job_value?: number;
  match_fee?: number;
  tracking_state?: 'en_route' | 'arrived';
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
  completed_at?: Date | admin.firestore.Timestamp;
}

export type CreateJobDTO = z.infer<typeof CreateJobSchema>['body'] & { client_uid: string };
export type UpdateJobDTO = z.infer<typeof UpdateJobSchema>['body'];

export interface JobMatch {
  artisan_uid: string;
  score: number;
  distance?: number;
  rating?: number;
  completed_jobs?: number;
  is_available: boolean;
  is_verified: boolean;
}
