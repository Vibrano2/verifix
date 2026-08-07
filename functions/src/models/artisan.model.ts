/**
 * Artisan Model
 * Defines the Artisan data structure
 */

import * as admin from 'firebase-admin';
import { Trade, TradeCategory } from '../constants/trades';

export type TradeName = Trade;

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface Location {
  city: string;
  state: string;
  lga: string;
  address?: string;
}

export interface Artisan {
  uid: string;
  trade: TradeName;
  category: TradeCategory; // Derived from trade
  location: Location;
  tagline: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
  id_document_url?: string;
  work_photos?: string[];
  is_available: boolean;
  is_verified: boolean;
  verification_status: VerificationStatus;
  rating?: number;
  reputation_score?: number; // Average of all ratings (replaces rating)
  total_jobs?: number;
  completed_jobs?: number;
  rejection_reason?: string;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
}

export interface CreateArtisanDTO {
  uid: string;
  trade: TradeName;
  location: Location;
  tagline: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
}

export interface UpdateArtisanProfileDTO {
  trade?: TradeName;
  location?: Location;
  tagline?: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
}
