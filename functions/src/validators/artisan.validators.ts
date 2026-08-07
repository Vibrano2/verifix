/**
 * Artisan Validators
 * Request validation schemas for artisan endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { isValidTrade, VALID_TRADES } from '../constants/trades';

export interface ArtisanSignupRequest {
  trade: string;
  location: {
    city: string;
    state: string;
    lga: string;
    address?: string;
  };
  tagline: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
}

export interface UpdateAvailabilityRequest {
  available: boolean;
}

const MAX_TAGLINE_LENGTH = 100;
const MAX_BIO_LENGTH = 500;
const MAX_LOCATION_LENGTH = 100;

/**
 * Validate artisan signup request
 */
export function validateArtisanSignup(req: Request, res: Response, next: NextFunction): void {
  const { trade, location, tagline, bio, experience_years, hourly_rate } = req.body;

  // Validate trade (must be in locked enum)
  if (!trade || typeof trade !== 'string' || trade.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Trade is required'
    });
    return;
  }

  if (!isValidTrade(trade)) {
    res.status(400).json({
      success: false,
      message: `Invalid trade. Must be one of: ${VALID_TRADES.join(', ')}`
    });
    return;
  }

  // Validate location
  if (!location || typeof location !== 'object') {
    res.status(400).json({
      success: false,
      message: 'Location object is required'
    });
    return;
  }

  if (!location.city || typeof location.city !== 'string' || location.city.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Location city is required'
    });
    return;
  }

  if (!location.state || typeof location.state !== 'string' || location.state.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Location state is required'
    });
    return;
  }

  if (!location.lga || typeof location.lga !== 'string' || location.lga.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Location LGA is required'
    });
    return;
  }

  // Check location field lengths
  if (location.city.length > MAX_LOCATION_LENGTH ||
      location.state.length > MAX_LOCATION_LENGTH ||
      location.lga.length > MAX_LOCATION_LENGTH) {
    res.status(400).json({
      success: false,
      message: `Location fields must be ${MAX_LOCATION_LENGTH} characters or less`
    });
    return;
  }

  // Validate tagline
  if (!tagline || typeof tagline !== 'string' || tagline.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Tagline is required (~100 char bio)'
    });
    return;
  }

  if (tagline.length > MAX_TAGLINE_LENGTH) {
    res.status(400).json({
      success: false,
      message: `Tagline must be ${MAX_TAGLINE_LENGTH} characters or less`
    });
    return;
  }

  // Validate optional bio
  if (bio !== undefined && bio !== null) {
    if (typeof bio !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Bio must be a string'
      });
    return;
    }

    if (bio.length > MAX_BIO_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Bio must be ${MAX_BIO_LENGTH} characters or less`
      });
    return;
    }
  }

  // Validate optional experience_years
  if (experience_years !== undefined && experience_years !== null) {
    if (typeof experience_years !== 'number' || experience_years < 0 || experience_years > 100) {
      res.status(400).json({
        success: false,
        message: 'Experience years must be a number between 0 and 100'
      });
    return;
    }
  }

  // Validate optional hourly_rate
  if (hourly_rate !== undefined && hourly_rate !== null) {
    if (typeof hourly_rate !== 'number' || hourly_rate < 0) {
      res.status(400).json({
        success: false,
        message: 'Hourly rate must be a positive number'
      });
    return;
    }
  }

  next();
}

/**
 * Validate update availability request
 */
export function validateUpdateAvailability(req: Request, res: Response, next: NextFunction): void {
  const { available } = req.body;

  if (available === undefined || available === null) {
    res.status(400).json({
      success: false,
      message: 'Available status is required'
    });
    return;
  }

  if (typeof available !== 'boolean') {
    res.status(400).json({
      success: false,
      message: 'Available must be a boolean'
    });
    return;
  }

  next();
}

/**
 * Validate file upload (photo)
 * Server-side MIME validation per PRD security requirements
 */
export function validatePhotoUpload(req: any, res: Response, next: NextFunction): void {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: 'Photo file is required'
    });
    return;
    return;
  }

  // Validate actual MIME type (not just extension)
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    res.status(400).json({
      success: false,
      message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed'
    });
    return;
    return;
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    res.status(400).json({
      success: false,
      message: 'File size must be 5MB or less'
    });
    return;
    return;
  }

  next();
}
