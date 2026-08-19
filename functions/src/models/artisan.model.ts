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
  title: z.string().min(3).max(100),
  description: z.string().max(1000),
  image_urls: z.array(z.string().url()).max(10).optional()
});

export const LocationSchema = z.object({
  city: z.string().min(1),
  state: z.string().min(1),
  lga: z.string().min(1),
  address: z.string().optional()
});

export const CreateArtisanSchema = z.object({
  body: z.object({
    first_name: z.string().min(2),
    last_name: z.string().min(2),
    phone: z.string().min(10),
    trade: z.enum(VALID_TRADES as [string, ...string[]]),
    location: LocationSchema,
    tagline: z.string().min(5).max(100),
    bio: z.string().max(1000).optional(),
    experience_years: z.number().min(0).optional(),
    hourly_rate: z.number().min(0).optional(),
    skills: z.array(z.string().min(1).max(50)).max(20).optional(),
    portfolio: z.array(PortfolioProjectSchema).max(10).optional(),
    nin: z.string().length(11),
    bank_details: z.object({
      account_number: z.string(),
      bank_code: z.string()
    }).optional(),
    id_document_base64: z.string().optional(),
    work_photos_base64: z.array(z.string()).optional()
  })
});

export const UpdateArtisanSchema = z.object({
  body: z.object({
    trade: z.enum(VALID_TRADES as [string, ...string[]]).optional(),
    location: LocationSchema.optional(),
    tagline: z.string().min(5).max(100).optional(),
    bio: z.string().max(1000).optional(),
    experience_years: z.number().min(0).optional(),
    hourly_rate: z.number().min(0).optional(),
    skills: z.array(z.string().min(1).max(50)).max(20).optional(),
    portfolio: z.array(PortfolioProjectSchema).max(10).optional(),
    nin: z.string().length(11).optional(),
    bank_details: z.object({
      account_number: z.string(),
      bank_code: z.string()
    }).optional()
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
  trade: TradeName;
  category: TradeCategory; // Derived from trade
  location: Location;
  tagline: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
  skills?: string[];
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
  rejection_reason?: string;
  bank_details?: BankDetails;
  paystack_recipient_code?: string;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
}

export type CreateArtisanDTO = z.infer<typeof CreateArtisanSchema>['body'] & { uid: string };
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
