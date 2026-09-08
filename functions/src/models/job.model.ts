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
  | 'cancelled'
  | 'refund_pending'
  | 'refunded'
  | 'disputed'
  | 'payout_issue';

export type Urgency = 'Today' | 'This Week' | 'Flexible';

const money = z.number().finite().positive().max(100_000_000)
  .refine(value => Math.abs(Math.round(value * 100) - value * 100) < 1e-8, 'Use at most two decimal places');

// Zod Schemas for Validation
export const LocationSchema = z.object({
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  lga: z.string().trim().min(1).max(100),
  address: z.string().trim().max(300).optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).strict().optional()
}).strict();

export const CreateJobSchema = z.object({
  body: z.object({
    // Accept trade or trade_needed — controller normalises to trade_needed
    trade_needed: z.enum(VALID_TRADES as [string, ...string[]]).optional(),
    trade: z.enum(VALID_TRADES as [string, ...string[]]).optional(),
    title: z.string().min(1).max(100).optional(),
    description: z.string().trim().min(3).max(2000),
    location: z.union([LocationSchema, z.string().trim().min(1).max(300)]),
    // Accept urgency or timing (frontend sends timing)
    urgency: z.enum(['Today', 'This Week', 'Flexible']).optional(),
    timing: z.enum(['Today', 'This Week', 'Flexible', 'ASAP']).optional(),
    // budget is the frontend field name for job_value
    budget: money.optional(),
    job_value: money.optional(),
    photos: z.array(z.string().url().max(2048).refine(value => value.startsWith('https://'), 'HTTPS URL required')).max(5).optional(),
    // Accepted for compatibility, but the controller always derives ownership
    // from the verified Firebase token.
    client_uid: z.string().max(128).optional()
  }).strict().refine(
    data => !!(data.trade_needed || data.trade),
    { message: 'trade or trade_needed is required', path: ['trade_needed'] }
  ).refine(
    data => data.budget === undefined || data.job_value === undefined || data.budget === data.job_value,
    { message: 'budget and job_value must match', path: ['job_value'] }
  )
});

export const UpdateJobSchema = z.object({
  body: z.object({
    title: z.string().trim().min(5).max(100).optional(),
    description: z.string().trim().min(10).max(2000).optional(),
    location: LocationSchema.optional(),
    urgency: z.enum(['Today', 'This Week', 'Flexible']).optional(),
    budget: money.optional(),
    job_value: money.optional(),
    photos: z.array(z.string().url().max(2048).refine(value => value.startsWith('https://'), 'HTTPS URL required')).max(5).optional()
  }).strict().refine(
    data => Object.keys(data).length > 0,
    { message: 'At least one field must be supplied' }
  ).refine(
    data => data.budget === undefined || data.job_value === undefined || data.budget === data.job_value,
    { message: 'budget and job_value must match', path: ['job_value'] }
  )
});

export interface Job {
  id?: string;      // Firestore doc id (alias)
  job_id?: string;  // Primary id returned by service layer
  client_uid: string;
  trade_needed: TradeName;
  title: string;
  description: string;
  location: Location;
  urgency: Urgency;
  status: JobStatus;
  matched_artisan_uid?: string;
  assigned_artisan_uid?: string;
  budget?: number;
  job_value?: number;
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
