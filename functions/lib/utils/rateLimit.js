"use strict";
/**
 * Rate Limiting Utility
 * OTP rate limiting per PRD Section 7.1:
 * - 3 requests/hour per phone
 * - 24-hour lockout after 5 failed attempts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOTPRateLimit = checkOTPRateLimit;
exports.recordOTPAttempt = recordOTPAttempt;
exports.resetOTPRateLimit = resetOTPRateLimit;
exports.getOTPRateLimitStatus = getOTPRateLimitStatus;
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const logger_1 = require("./logger");
function hashPII(data) {
    if (!data)
        return '';
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}
const OTP_RATE_LIMIT_COLLECTION = 'otp_rate_limits';
const MAX_REQUESTS_PER_HOUR = 3;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const db = admin.firestore();
/**
 * Check if phone is rate limited for OTP requests
 */
async function checkOTPRateLimit(phone) {
    try {
        const docRef = db.collection(OTP_RATE_LIMIT_COLLECTION).doc(phone);
        const doc = await docRef.get();
        if (!doc.exists) {
            return { allowed: true };
        }
        const data = doc.data();
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
    }
    catch (error) {
        logger_1.Logger.error('Error checking OTP rate limit', { phone: hashPII(phone), error });
        // Fail open - allow the request if there's a database error
        return { allowed: true };
    }
}
/**
 * Record OTP request attempt
 */
async function recordOTPAttempt(phone, success) {
    try {
        const docRef = db.collection(OTP_RATE_LIMIT_COLLECTION).doc(phone);
        const doc = await docRef.get();
        const attempt = {
            phone,
            timestamp: new Date(),
            success
        };
        if (!doc.exists) {
            // Create new record
            await docRef.set({
                phone,
                attempts: [attempt],
                locked_until: null
            });
            return;
        }
        const data = doc.data();
        // Clean up old attempts (older than 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - LOCKOUT_DURATION_MS);
        const recentAttempts = data.attempts.filter(a => {
            const attemptTime = a.timestamp instanceof admin.firestore.Timestamp
                ? a.timestamp.toDate()
                : new Date(a.timestamp);
            return attemptTime > twentyFourHoursAgo;
        });
        // Add new attempt
        recentAttempts.push(attempt);
        // Check for 5 failed attempts (trigger lockout)
        if (!success) {
            const failedAttempts = recentAttempts.filter(a => !a.success);
            if (failedAttempts.length >= MAX_FAILED_ATTEMPTS) {
                const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
                await docRef.update({
                    attempts: recentAttempts,
                    locked_until: admin.firestore.Timestamp.fromDate(lockedUntil)
                });
                logger_1.Logger.warn('Phone number locked due to failed OTP attempts', {
                    phone: hashPII(phone),
                    failedAttempts: failedAttempts.length,
                    lockedUntil
                });
                return;
            }
        }
        // Update attempts
        await docRef.update({
            attempts: recentAttempts
        });
    }
    catch (error) {
        logger_1.Logger.error('Error recording OTP attempt', { phone: hashPII(phone), success, error });
        // Don't throw - this is a non-critical operation
    }
}
/**
 * Reset rate limit for a phone (admin override)
 */
async function resetOTPRateLimit(phone) {
    try {
        const docRef = db.collection(OTP_RATE_LIMIT_COLLECTION).doc(phone);
        await docRef.delete();
        logger_1.Logger.info('OTP rate limit reset', { phone: hashPII(phone) });
    }
    catch (error) {
        logger_1.Logger.error('Error resetting OTP rate limit', { phone: hashPII(phone), error });
        throw error;
    }
}
/**
 * Get rate limit status for a phone
 */
async function getOTPRateLimitStatus(phone) {
    try {
        const docRef = db.collection(OTP_RATE_LIMIT_COLLECTION).doc(phone);
        const doc = await docRef.get();
        if (!doc.exists) {
            return {
                attemptsInLastHour: 0,
                failedAttemptsInLast24Hours: 0,
                isLocked: false
            };
        }
        const data = doc.data();
        const now = new Date();
        // Check if locked
        let isLocked = false;
        let lockedUntil;
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
    }
    catch (error) {
        logger_1.Logger.error('Error getting OTP rate limit status', { phone: hashPII(phone), error });
        throw error;
    }
}
//# sourceMappingURL=rateLimit.js.map