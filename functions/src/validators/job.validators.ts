/**
 * Job Validators
 * Request validation schemas for job endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { VALID_TRADES, isValidTrade } from '../constants/trades';

export interface CreateJobRequest {
  trade_needed: string;
  title: string;
  description: string;
  location: {
    city: string;
    state: string;
    lga: string;
    address?: string;
  };
  urgency: 'Today' | 'This Week' | 'Flexible';
  match_fee?: number;
}

const VALID_URGENCIES = ['Today', 'This Week', 'Flexible'];
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;
const MAX_LOCATION_LENGTH = 100;

/**
 * Validate create job request
 * Per PRD: validate trade is non-empty and in locked enum, location has reasonable max length, urgency is one of 3 locked values
 */
export function validateCreateJob(req: Request, res: Response, next: NextFunction): void {
  const { trade_needed, title, description, location, urgency } = req.body;

  // Validate trade
  if (!trade_needed || typeof trade_needed !== 'string' || trade_needed.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Trade is required and must be non-empty'
    });
    return;
  }

  if (!isValidTrade(trade_needed)) {
    res.status(400).json({
      success: false,
      message: `Invalid trade. Must be one of: ${VALID_TRADES.join(', ')}`
    });
    return;
  }

  // Validate title
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Title is required'
    });
    return;
  }

  if (title.length > MAX_TITLE_LENGTH) {
    res.status(400).json({
      success: false,
      message: `Title must be ${MAX_TITLE_LENGTH} characters or less`
    });
    return;
  }

  // Validate description
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Description is required'
    });
    return;
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    res.status(400).json({
      success: false,
      message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`
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

  // Validate urgency (locked enum)
  if (!urgency || !VALID_URGENCIES.includes(urgency)) {
    res.status(400).json({
      success: false,
      message: `Urgency must be one of: ${VALID_URGENCIES.join(', ')}`
    });
    return;
  }



  next();
}

/**
 * Validate rating request
 */
export function validateRating(req: Request, res: Response, next: NextFunction): void {
  const { rating, review } = req.body;

  // Validate rating (1-5)
  if (rating === undefined || rating === null) {
    res.status(400).json({
      success: false,
      message: 'Rating is required'
    });
    return;
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    res.status(400).json({
      success: false,
      message: 'Rating must be an integer between 1 and 5'
    });
    return;
  }

  // Validate review if provided (optional text)
  if (review !== undefined && review !== null) {
    if (typeof review !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Review must be a string'
      });
    return;
    }

    if (review.length > 1000) {
      res.status(400).json({
        success: false,
        message: 'Review must be 1000 characters or less'
      });
    return;
    }
  }

  next();
}
