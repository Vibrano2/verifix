import { Request, Response, NextFunction } from 'express';
import { LOCKED_TRADES, URGENCY_VALUES, TradeName, Urgency } from '../types';

/**
 * Validate trade is in locked enum
 */
export const validateTrade = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { trade } = req.body;

  if (!trade || typeof trade !== 'string' || trade.trim() === '') {
    res.status(400).json({ error: 'Trade is required and must be a non-empty string' });
    return;
  }

  if (!LOCKED_TRADES.includes(trade as TradeName)) {
    res.status(400).json({
      error: `Invalid trade. Must be one of: ${LOCKED_TRADES.join(', ')}`,
    });
    return;
  }

  next();
};

/**
 * Validate urgency is in locked enum
 */
export const validateUrgency = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { urgency } = req.body;

  if (!urgency || typeof urgency !== 'string') {
    res.status(400).json({ error: 'Urgency is required and must be a string' });
    return;
  }

  if (!URGENCY_VALUES.includes(urgency as Urgency)) {
    res.status(400).json({
      error: `Invalid urgency. Must be one of: ${URGENCY_VALUES.join(', ')}`,
    });
    return;
  }

  next();
};

/**
 * Validate location has reasonable length
 */
export const validateLocation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { location } = req.body;

  if (!location || typeof location !== 'string' || location.trim() === '') {
    res.status(400).json({ error: 'Location is required and must be a non-empty string' });
    return;
  }

  if (location.length > 200) {
    res.status(400).json({ error: 'Location must be 200 characters or less' });
    return;
  }

  next();
};

/**
 * Validate rating is between 1-5
 */
export const validateRating = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { rating } = req.body;

  if (rating === undefined || rating === null) {
    res.status(400).json({ error: 'Rating is required' });
    return;
  }

  const ratingNum = Number(rating);

  if (isNaN(ratingNum) || !Number.isInteger(ratingNum)) {
    res.status(400).json({ error: 'Rating must be an integer' });
    return;
  }

  if (ratingNum < 1 || ratingNum > 5) {
    res.status(400).json({ error: 'Rating must be between 1 and 5' });
    return;
  }

  next();
};
