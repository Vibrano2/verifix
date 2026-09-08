/**
 * Rate Limiting Utility
 * OTP rate limiting per PRD Section 7.1:
 * - 3 requests/hour per phone
 * - 24-hour lockout after 5 failed attempts
 */

import * as admin from 'firebase-admin';
import { Logger } from './logger';
import { hashData } from './encryption';

function hashPII(data: string): string {
  if (!data) return '';
  return hashData(data.trim()).substring(0, 16);
}

interface OTPAttempt {
  timestamp: Date;
  success: boolean;
}

interface OTPRateLimit {
  attempts: OTPAttempt[];
  locked_until?: Date;
}

const OTP_RATE_LIMIT_COLLECTION = 'otp_rate_limits';
const MAX_REQUESTS_PER_HOUR = 3;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const getDb = () => admin.firestore();

/**
 * Check if phone is rate limited for OTP requests
 */
export async function checkOTPRateLimit(phone: string): Promise<{
  allowed: boolean;
  reason?: string;
  resetAt?: Date;
}> {
  try {
    const docRef = getDb().collection(OTP_RATE_LIMIT_COLLECTION).doc(hashData(phone.trim()));
    const doc = await docRef.get();

    if (!doc.exists) {
      return { allowed: true };
    }

    const data = doc.data() as OTPRateLimit;
    const now = new Date();

    // Check if locked out
    if (data.locked_until) {
      const lockedUntil = data.locked_until instanceof admin.firestore.Timestamp 
        ? data.locked_until.toDate() 
        : new Date(data.locked_until);

      if (now < lockedUntil) {
        return {
          allowed: false,
          reason: 'Account locked due to too many failed attempts',
          resetAt: lockedUntil
        };
      }
    }

    // Check rate limit (3 requests per hour)
    const oneHourAgo = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
    const recentAttempts = data.attempts.filter(attempt => {
      const attemptTime = attempt.timestamp instanceof admin.firestore.Timestamp
        ? attempt.timestamp.toDate()
        : new Date(attempt.timestamp);
      return attemptTime > oneHourAgo;
    });

    if (recentAttempts.length >= MAX_REQUESTS_PER_HOUR) {
      const oldestAttempt = recentAttempts[0].timestamp instanceof admin.firestore.Timestamp
        ? recentAttempts[0].timestamp.toDate()
        : new Date(recentAttempts[0].timestamp);
      const resetAt = new Date(oldestAttempt.getTime() + RATE_LIMIT_WINDOW_MS);

      return {
        allowed: false,
        reason: 'Too many OTP requests. Please try again later.',
        resetAt
      };
    }

    return { allowed: true };
  } catch (error) {
    Logger.error('Error checking OTP rate limit', { phone: hashPII(phone), error });
    return { allowed: false, reason: 'OTP service is temporarily unavailable' };
  }
}

/**
 * Record OTP request attempt
 */
export async function recordOTPAttempt(phone: string, success: boolean): Promise<void> {
  try {
    const docRef = getDb().collection(OTP_RATE_LIMIT_COLLECTION).doc(hashData(phone.trim()));
    await getDb().runTransaction(async transaction => {
      const doc = await transaction.get(docRef);
      const data = doc.exists ? doc.data() as OTPRateLimit : { attempts: [] };
      const attempt: OTPAttempt = { timestamp: new Date(), success };
      const twentyFourHoursAgo = new Date(Date.now() - LOCKOUT_DURATION_MS);
      const recentAttempts = (Array.isArray(data.attempts) ? data.attempts : []).filter(item => {
        const attemptTime = item.timestamp instanceof admin.firestore.Timestamp
          ? item.timestamp.toDate()
          : new Date(item.timestamp);
        return attemptTime > twentyFourHoursAgo;
      });
      recentAttempts.push(attempt);

      const failedAttempts = recentAttempts.filter(item => !item.success).length;
      const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS
        ? admin.firestore.Timestamp.fromMillis(Date.now() + LOCKOUT_DURATION_MS)
        : data.locked_until || null;
      transaction.set(docRef, {
        attempts: recentAttempts,
        locked_until: lockedUntil,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        Logger.warn('Phone number locked due to failed OTP attempts', {
          phone: hashPII(phone),
          failedAttempts
        });
      }
    });
  } catch (error) {
    Logger.error('Error recording OTP attempt', { phone: hashPII(phone), success, error });
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Reset rate limit for a phone (admin override)
 */
export async function resetOTPRateLimit(phone: string): Promise<void> {
  try {
    const docRef = getDb().collection(OTP_RATE_LIMIT_COLLECTION).doc(hashData(phone.trim()));
    await docRef.delete();
    Logger.info('OTP rate limit reset', { phone: hashPII(phone) });
  } catch (error) {
    Logger.error('Error resetting OTP rate limit', { phone: hashPII(phone), error });
    throw error;
  }
}

/**
 * Get rate limit status for a phone
 */
export async function getOTPRateLimitStatus(phone: string): Promise<{
  attemptsInLastHour: number;
  failedAttemptsInLast24Hours: number;
  isLocked: boolean;
  lockedUntil?: Date;
}> {
  try {
    const docRef = getDb().collection(OTP_RATE_LIMIT_COLLECTION).doc(hashData(phone.trim()));
    const doc = await docRef.get();

    if (!doc.exists) {
      return {
        attemptsInLastHour: 0,
        failedAttemptsInLast24Hours: 0,
        isLocked: false
      };
    }

    const data = doc.data() as OTPRateLimit;
    const now = new Date();

    // Check if locked
    let isLocked = false;
    let lockedUntil: Date | undefined;
    
    if (data.locked_until) {
      const lockTime = data.locked_until instanceof admin.firestore.Timestamp
        ? data.locked_until.toDate()
        : new Date(data.locked_until);
      
      if (now < lockTime) {
        isLocked = true;
        lockedUntil = lockTime;
      }
    }

    // Count attempts in last hour
    const oneHourAgo = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
    const attemptsInLastHour = data.attempts.filter(a => {
      const attemptTime = a.timestamp instanceof admin.firestore.Timestamp
        ? a.timestamp.toDate()
        : new Date(a.timestamp);
      return attemptTime > oneHourAgo;
    }).length;

    // Count failed attempts in last 24 hours
    const twentyFourHoursAgo = new Date(now.getTime() - LOCKOUT_DURATION_MS);
    const failedAttemptsInLast24Hours = data.attempts.filter(a => {
      const attemptTime = a.timestamp instanceof admin.firestore.Timestamp
        ? a.timestamp.toDate()
        : new Date(a.timestamp);
      return attemptTime > twentyFourHoursAgo && !a.success;
    }).length;

    return {
      attemptsInLastHour,
      failedAttemptsInLast24Hours,
      isLocked,
      lockedUntil
    };
  } catch (error) {
    Logger.error('Error getting OTP rate limit status', { phone: hashPII(phone), error });
    throw error;
  }
}
