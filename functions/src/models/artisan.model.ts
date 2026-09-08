import * as admin from 'firebase-admin';
import { z } from 'zod';
import { Trade, TradeCategory, VALID_TRADES } from '../constants/trades';

export type TradeName = Trade;

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface PortfolioProject {
  title: string;
  description: string;
  image_urls?: string[];
}

export const PortfolioProjectSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000),
  image_urls: z.array(z.string().url().max(2048).refine(value => value.startsWith('https://'), 'HTTPS URL required')).max(10).optional()
}).strict();

export const LocationSchema = z.object({
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  lga: z.string().trim().min(1).max(100),
  address: z.string().trim().max(300).optional()
}).strict();

export const CreateArtisanSchema = z.object({
  body: z.object({
    first_name: z.string().trim().min(2).max(80),
    last_name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^(?:\+234|0)[789]\d{9}$/),
    trade: z.enum(VALID_TRADES as [string, ...string[]]),
    location: LocationSchema,
    tagline: z.string().trim().min(5).max(100),
    bio: z.string().trim().max(1000).optional(),
    experience_years: z.number().int().min(0).max(100).optional(),
    hourly_rate: z.number().finite().min(0).max(100_000_000).optional(),
    skills: z.array(z.string().trim().min(1).max(50)).min(1).max(20).optional(),
    services: z.array(z.string().trim().min(1).max(80)).min(1).max(20).optional(),
    portfolio: z.array(PortfolioProjectSchema).max(10).optional(),
    nin: z.string().regex(/^\d{11}$/),
    bank_details: z.object({
      account_name: z.string().trim().min(2).max(120),
      account_number: z.string().regex(/^\d{10}$/),
      bank_code: z.string().regex(/^\d{3,6}$/)
    }).strict().optional()
  }).strict().refine(data => Boolean(data.services?.length || data.skills?.length), {
    message: 'At least one service or skill is required',
    path: ['services']
  })
});

export const UpdateArtisanSchema = z.object({
  body: z.object({
    trade: z.enum(VALID_TRADES as [string, ...string[]]).optional(),
    location: LocationSchema.optional(),
    tagline: z.string().trim().min(5).max(100).optional(),
    bio: z.string().trim().max(1000).optional(),
    experience_years: z.number().int().min(0).max(100).optional(),
    hourly_rate: z.number().finite().min(0).max(100_000_000).optional(),
    skills: z.array(z.string().trim().min(1).max(50)).min(1).max(20).optional(),
    services: z.array(z.string().trim().min(1).max(80)).min(1).max(20).optional(),
    portfolio: z.array(PortfolioProjectSchema).max(10).optional(),
    is_available: z.boolean().optional()
  }).strict().refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be supplied'
  })
});

export interface Location {
  city: string;
  state: string;
  lga: string;
  address?: string;
}

export interface BankDetails {
  account_number: string;
  bank_code: string;
  account_name: string;
}

export interface Artisan {
  uid: string;
  first_name?: string;
  last_name?: string;
  trade: TradeName;
  category: TradeCategory; // Derived from trade
  location: Location;
  tagline: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
  skills?: string[];
  services?: string[];       // PRD A-002: at least one specific service per trade
  portfolio?: PortfolioProject[];
  id_document_url?: string;
  work_photos?: string[];
  nin?: string;
  is_available: boolean;
  is_verified: boolean;
  verification_status: VerificationStatus;
  rating?: number;
  reputation_score?: number; // Average of all ratings (replaces rating)
  total_jobs?: number;
  completed_jobs?: number;
  no_response_flags?: number; // PRD A-008 / AD-004
  rejection_reason?: string;
  bank_details?: BankDetails;
  paystack_recipient_code?: string;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
}

export type CreateArtisanDTO = z.infer<typeof CreateArtisanSchema>['body'];
export type UpdateArtisanProfileDTO = z.infer<typeof UpdateArtisanSchema>['body'];

export type PublicArtisanDTO = Omit<Artisan, 'nin' | 'bank_details' | 'paystack_recipient_code' | 'id_document_url' | 'rejection_reason'>;

export function mapToPublicArtisan(artisan: Artisan): PublicArtisanDTO {
  const {
    nin,
    bank_details,
    paystack_recipient_code,
    id_document_url,
    rejection_reason,
    ...publicData
  } = artisan;
  
  return publicData;
}
