import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';

// Extend Express Request to include Firebase user
export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

// User types
export type UserRole = 'client' | 'artisan';

export interface User {
  uid: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  created_at: FirebaseFirestore.Timestamp;
  updated_at: FirebaseFirestore.Timestamp;
}

// Locked trade enum
export const LOCKED_TRADES = [
  // Home Maintenance & Repair
  'Electricians',
  'Plumbers',
  'Carpenters',
  'AC technicians',
  'Generator repairers',
  'Borehole repair technicians',
  'Welders',
  'Tilers',
  'PoP',
  'Aluminium fabricators',
  // Vehicle
  'Mechanics',
  // Home Services
  'Home cleaners',
  'Laundry services',
  'Movers',
  'Gardeners',
  'CCTV installers',
  // Personal Care
  'Barbers',
  'Hairdressers',
  'Makeup artists',
  'Tailors',
  // Professional/Care
  'Tutors',
  'Nurses',
  'Caregivers',
  // Events
  'Event photographers',
  'Painters',
] as const;

export type TradeName = typeof LOCKED_TRADES[number];

// Category groups
export type Category =
  | 'Home Maintenance & Repair'
  | 'Vehicle'
  | 'Home Services'
  | 'Personal Care'
  | 'Professional/Care'
  | 'Events';

// Urgency enum
export const URGENCY_VALUES = ['Today', 'This Week', 'Flexible'] as const;
export type Urgency = typeof URGENCY_VALUES[number];

// Artisan Profile
export interface ArtisanProfile {
  uid: string;
  trade: TradeName;
  category: Category;
  location: string;
  available: boolean;
  verified: boolean;
  id_document_url: string;
  work_photos: string[];
  completed_jobs: number;
  reputation_score: number | null;
  tagline: string;
  updated_at: FirebaseFirestore.Timestamp;
}

// Job
export type JobStatus = 'open' | 'matched' | 'complete' | 'cancelled';

export interface Job {
  job_id: string;
  client_uid: string;
  trade: TradeName;
  location: string;
  urgency: Urgency;
  description: string;
  match_fee: number;
  status: JobStatus;
  created_at: FirebaseFirestore.Timestamp;
  updated_at: FirebaseFirestore.Timestamp;
}

// Match
export type MatchStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export interface Match {
  match_id: string;
  job_id: string;
  artisan_uid: string;
  status: MatchStatus;
  rating: number | null;
  created_at: FirebaseFirestore.Timestamp;
  updated_at: FirebaseFirestore.Timestamp;
}

// Transaction
export type TransactionStatus = 'held' | 'released';

export interface Transaction {
  transaction_id: string;
  match_id: string;
  artisan_uid: string;
  amount: number;
  status: TransactionStatus;
  paystack_reference: string;
  locked_job_value: number;
  commission_retained: number;
  released_at: FirebaseFirestore.Timestamp | null;
  created_at: FirebaseFirestore.Timestamp;
}

// Helper function to get category from trade
export function getCategoryFromTrade(trade: TradeName): Category {
  const categoryMap: Record<TradeName, Category> = {
    'Electricians': 'Home Maintenance & Repair',
    'Plumbers': 'Home Maintenance & Repair',
    'Carpenters': 'Home Maintenance & Repair',
    'AC technicians': 'Home Maintenance & Repair',
    'Generator repairers': 'Home Maintenance & Repair',
    'Borehole repair technicians': 'Home Maintenance & Repair',
    'Welders': 'Home Maintenance & Repair',
    'Tilers': 'Home Maintenance & Repair',
    'PoP': 'Home Maintenance & Repair',
    'Aluminium fabricators': 'Home Maintenance & Repair',
    'Mechanics': 'Vehicle',
    'Home cleaners': 'Home Services',
    'Laundry services': 'Home Services',
    'Movers': 'Home Services',
    'Gardeners': 'Home Services',
    'CCTV installers': 'Home Services',
    'Barbers': 'Personal Care',
    'Hairdressers': 'Personal Care',
    'Makeup artists': 'Personal Care',
    'Tailors': 'Personal Care',
    'Tutors': 'Professional/Care',
    'Nurses': 'Professional/Care',
    'Caregivers': 'Professional/Care',
    'Event photographers': 'Events',
    'Painters': 'Events',
  };
  return categoryMap[trade];
}
