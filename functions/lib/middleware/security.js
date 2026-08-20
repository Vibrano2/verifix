"use strict";
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
exports.validateContentType = exports.requestId = exports.auditMiddleware = exports.auditLog = exports.recordFailedAuth = exports.monitorIP = exports.securityHeaders = exports.rateLimit = void 0;
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
/**
 * Firestore-backed rate limiting middleware
 * Limits requests per IP address
 */
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return async (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const db = admin.firestore();
        const docRef = db.collection('rate_limits').doc(ip.replace(/:/g, '_'));
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                if (!doc.exists || now > doc.data().resetTime) {
                    transaction.set(docRef, { count: 1, resetTime: now + windowMs });
                    return { allowed: true };
                }
                const data = doc.data();
                if (data.count > maxRequests) {
                    return { allowed: false, resetTime: data.resetTime };
                }
                transaction.update(docRef, { count: admin.firestore.FieldValue.increment(1) });
                return { allowed: true };
            }).then(result => {
                if (!result.allowed) {
                    res.status(429).json({
                        error: 'Too many requests',
                        message: 'Rate limit exceeded. Please try again later.',
                        retryAfter: Math.ceil((result.resetTime - now) / 1000)
                    });
                    logger_1.Logger.warn(`Rate limit exceeded for IP: ${ip}`);
                }
                else {
                    next();
                }
            });
        }
        catch (error) {
            // Fail open if Firestore has issues so we don't break the app
            logger_1.Logger.error('Rate limiting error', error);
            next();
        }
    };
};
exports.rateLimit = rateLimit;
/**
 * Security headers middleware
 * Implements various security headers to prevent common attacks
 */
const securityHeaders = (req, res, next) => {
    // Prevent XSS attacks
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Strict Transport Security (HTTPS only)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
};
exports.securityHeaders = securityHeaders;
/**
 * Monitor and block suspicious IP addresses using Firestore
 */
const monitorIP = async (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const db = admin.firestore();
    const docRef = db.collection('ip_monitoring').doc(ip.replace(/:/g, '_'));
    try {
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            if (data.blockedUntil && now < data.blockedUntil) {
                const remainingTime = Math.ceil((data.blockedUntil - now) / 1000);
                res.status(403).json({
                    error: 'IP address temporarily blocked',
                    message: 'Your IP has been blocked due to suspicious activity',
                    unblockIn: remainingTime
                });
                return;
            }
            // Reset block if time expired
            if (data.blockedUntil && now >= data.blockedUntil) {
                await docRef.update({ blockedUntil: null, failedAttempts: 0 });
            }
        }
        next();
    }
    catch (error) {
        logger_1.Logger.error('IP monitoring error', error);
        next();
    }
};
exports.monitorIP = monitorIP;
/**
 * Record failed authentication attempt using Firestore
 * Call this when authentication fails
 */
const recordFailedAuth = async (ip) => {
    try {
        const db = admin.firestore();
        const docRef = db.collection('ip_monitoring').doc(ip.replace(/:/g, '_'));
        const now = Date.now();
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            const activity = `Failed auth at ${new Date().toISOString()}`;
            if (!doc.exists) {
                transaction.set(docRef, {
                    failedAttempts: 1,
                    suspiciousActivity: [activity]
                });
                return;
            }
            const data = doc.data();
            const attempts = (data.failedAttempts || 0) + 1;
            const updateData = {
                failedAttempts: attempts,
                suspiciousActivity: admin.firestore.FieldValue.arrayUnion(activity)
            };
            if (attempts >= 5) {
                const blockDuration = 15 * 60 * 1000; // 15 minutes
                updateData.blockedUntil = now + blockDuration;
                logger_1.Logger.warn(`IP ${ip} blocked for 15 minutes after ${attempts} failed attempts`);
            }
            transaction.update(docRef, updateData);
        });
    }
    catch (error) {
        logger_1.Logger.error('Failed to record auth failure', error);
    }
};
exports.recordFailedAuth = recordFailedAuth;
/**
 * Create audit log entry in Firestore
 */
const auditLog = async (log) => {
    try {
        const db = admin.firestore();
        await db.collection('audit_logs').add(Object.assign(Object.assign({}, log), { timestamp: admin.firestore.FieldValue.serverTimestamp() }));
    }
    catch (error) {
        logger_1.Logger.error('Failed to write audit log', error);
        // Don't fail the request if logging fails
    }
};
exports.auditLog = auditLog;
/**
 * Audit logging middleware for sensitive operations
 */
const auditMiddleware = (action) => {
    return async (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'];
        // Store original res.json to intercept response
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            var _a;
            const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
            // Log asynchronously (don't await)
            (0, exports.auditLog)({
                timestamp: new Date().toISOString(),
                action,
                userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid,
                ip,
                userAgent,
                resource: req.originalUrl,
                status,
                details: status === 'failure' ? body : undefined
            }).catch(err => logger_1.Logger.error('Audit log error', err));
            return originalJson(body);
        };
        next();
    };
};
exports.auditMiddleware = auditMiddleware;
/**
 * Request ID middleware for tracking requests
 */
const requestId = (req, res, next) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-ID', id);
    next();
};
exports.requestId = requestId;
/**
 * Validate Content-Type for POST/PATCH requests
 */
const validateContentType = (req, res, next) => {
    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
            res.status(415).json({
                error: 'Unsupported Media Type',
                message: 'Content-Type must be application/json or multipart/form-data'
            });
            return;
        }
    }
    next();
};
exports.validateContentType = validateContentType;
//# sourceMappingURL=security.js.map