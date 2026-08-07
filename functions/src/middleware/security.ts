import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

/**
 * Rate Limiting Configuration
 * Stores request counts in memory (use Redis for production)
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

/**
 * Simple rate limiting middleware
 * Limits requests per IP address
 */
export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Initialize or get existing rate limit data
    if (!rateLimitStore[ip] || now > rateLimitStore[ip].resetTime) {
      rateLimitStore[ip] = {
        count: 1,
        resetTime: now + windowMs
      };
      next();
      return;
    }
    
    // Increment request count
    rateLimitStore[ip].count++;
    
    // Check if limit exceeded
    if (rateLimitStore[ip].count > maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimitStore[ip].resetTime - now) / 1000)
      });
      
      // Log suspicious activity
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return;
    }
    
    next();
  };
};

/**
 * Sanitize user input to prevent XSS and injection attacks
 * Removes/escapes potentially dangerous characters
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query params
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({ error: 'Invalid input format' });
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize key name
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitize string to prevent XSS and injection
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;')
    .replace(/=/g, '&#61;');
}

/**
 * Security headers middleware
 * Implements various security headers to prevent common attacks
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
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

/**
 * IP Blocking/Monitoring
 * Tracks suspicious IPs and blocks them
 */
interface IPMonitoring {
  [ip: string]: {
    failedAttempts: number;
    blockedUntil?: number;
    suspiciousActivity: string[];
  };
}

const ipMonitoring: IPMonitoring = {};

/**
 * Monitor and block suspicious IP addresses
 */
export const monitorIP = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Initialize IP monitoring
  if (!ipMonitoring[ip]) {
    ipMonitoring[ip] = {
      failedAttempts: 0,
      suspiciousActivity: []
    };
  }
  
  // Check if IP is currently blocked
  if (ipMonitoring[ip].blockedUntil && now < ipMonitoring[ip].blockedUntil!) {
    const remainingTime = Math.ceil((ipMonitoring[ip].blockedUntil! - now) / 1000);
    res.status(403).json({
      error: 'IP address temporarily blocked',
      message: 'Your IP has been blocked due to suspicious activity',
      unblockIn: remainingTime
    });
    return;
  }
  
  // Reset block if time expired
  if (ipMonitoring[ip].blockedUntil && now >= ipMonitoring[ip].blockedUntil!) {
    ipMonitoring[ip].blockedUntil = undefined;
    ipMonitoring[ip].failedAttempts = 0;
  }
  
  next();
};

/**
 * Record failed authentication attempt
 * Call this when authentication fails
 */
export const recordFailedAuth = (ip: string): void => {
  if (!ipMonitoring[ip]) {
    ipMonitoring[ip] = {
      failedAttempts: 0,
      suspiciousActivity: []
    };
  }
  
  ipMonitoring[ip].failedAttempts++;
  ipMonitoring[ip].suspiciousActivity.push(`Failed auth at ${new Date().toISOString()}`);
  
  // Block IP after 5 failed attempts (15 minutes)
  if (ipMonitoring[ip].failedAttempts >= 5) {
    const blockDuration = 15 * 60 * 1000; // 15 minutes
    ipMonitoring[ip].blockedUntil = Date.now() + blockDuration;
    
    console.warn(`IP ${ip} blocked for 15 minutes after ${ipMonitoring[ip].failedAttempts} failed attempts`);
  }
};

/**
 * Security Audit Logger
 * Logs all sensitive operations for security monitoring
 */
export interface AuditLog {
  timestamp: string;
  action: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  resource?: string;
  status: 'success' | 'failure';
  details?: any;
}

/**
 * Create audit log entry in Firestore
 */
export const auditLog = async (log: AuditLog): Promise<void> => {
  try {
    const db = admin.firestore();
    await db.collection('audit_logs').add({
      ...log,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't fail the request if logging fails
  }
};

/**
 * Audit logging middleware for sensitive operations
 */
export const auditMiddleware = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];
    
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    res.json = function (body: any): Response {
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
      
      // Log asynchronously (don't await)
      auditLog({
        timestamp: new Date().toISOString(),
        action,
        userId: (req as any).user?.uid,
        ip,
        userAgent,
        resource: req.originalUrl,
        status,
        details: status === 'failure' ? body : undefined
      }).catch(err => console.error('Audit log error:', err));
      
      return originalJson(body);
    };
    
    next();
  };
};

/**
 * Request ID middleware for tracking requests
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
};

/**
 * Validate Content-Type for POST/PATCH requests
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
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

/**
 * Clean up old rate limit entries (run periodically)
 */
export const cleanupRateLimitStore = (): void => {
  const now = Date.now();
  for (const ip in rateLimitStore) {
    if (now > rateLimitStore[ip].resetTime) {
      delete rateLimitStore[ip];
    }
  }
};

// Cleanup every 10 minutes
setInterval(cleanupRateLimitStore, 10 * 60 * 1000);
