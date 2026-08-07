/**
 * Job Model
 * Defines the Job data structure
 */

import * as admin from 'firebase-admin';
import { Location } from './artisan.model';
import { Trade } from '../constants/trades';

export type TradeName = Trade;

export type JobStatus = 
  | 'open' 
  | 'matched' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export type Urgency = 'Today' | 'This Week' | 'Flexible'; // Locked enum per PRD

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
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
  completed_at?: Date | admin.firestore.Timestamp;
}

export interface CreateJobDTO {
  client_uid: string;
  trade_needed: TradeName;
  title: string;
  description: string;
  location: Location;
  urgency: Urgency;
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  match_fee?: number;
}

export interface UpdateJobDTO {
  title?: string;
  description?: string;
  location?: Location;
  urgency?: Urgency;
  budget?: number;
  status?: JobStatus;
}

export interface JobMatch {
  artisan_uid: string;
  score: number;
  distance?: number;
  rating?: number;
  completed_jobs?: number;
  is_available: boolean;
  is_verified: boolean;
}
