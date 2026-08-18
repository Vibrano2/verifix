import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { Logger } from '../utils/logger';

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const db = admin.firestore();
    const docRef = db.collection('rate_limits').doc(ip.replace(/:/g, '_'));

    try {
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists || now > doc.data()!.resetTime) {
          transaction.set(docRef, { count: 1, resetTime: now + windowMs });
          return { allowed: true };
        }

        const data = doc.data()!;
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
            retryAfter: Math.ceil((result.resetTime! - now) / 1000)
          });
          Logger.warn(`Rate limit exceeded for IP: ${ip}`);
        } else {
          next();
        }
      });
    } catch (error) {
      Logger.error('Rate limiting error', error);
      next();
    }
  };
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

export const monitorIP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const db = admin.firestore();
  const docRef = db.collection('ip_monitoring').doc(ip.replace(/:/g, '_'));
  
  try {
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data()!;
      if (data.blockedUntil && now < data.blockedUntil) {
        const remainingTime = Math.ceil((data.blockedUntil - now) / 1000);
        res.status(403).json({
          error: 'IP address temporarily blocked',
          message: 'Your IP has been blocked due to suspicious activity',
          unblockIn: remainingTime
        });
        return;
      }
      
      if (data.blockedUntil && now >= data.blockedUntil) {
        await docRef.update({ blockedUntil: null, failedAttempts: 0 });
      }
    }
    next();
  } catch (error) {
    Logger.error('IP monitoring error', error);
    next();
  }
};

export const recordFailedAuth = async (ip: string): Promise<void> => {
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
      
      const data = doc.data()!;
      const attempts = (data.failedAttempts || 0) + 1;
      
      const updateData: any = {
        failedAttempts: attempts,
        suspiciousActivity: admin.firestore.FieldValue.arrayUnion(activity)
      };
      
      if (attempts >= 5) {
        const blockDuration = 15 * 60 * 1000;
        updateData.blockedUntil = now + blockDuration;
        Logger.warn(`IP ${ip} blocked for 15 minutes after ${attempts} failed attempts`);
      }
      
      transaction.update(docRef, updateData);
    });
  } catch (error) {
    Logger.error('Failed to record auth failure', error);
  }
};

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

export const auditLog = async (log: AuditLog): Promise<void> => {
  try {
    const db = admin.firestore();
    await db.collection('audit_logs').add({
      ...log,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    Logger.error('Failed to write audit log', error);
  }
};

export const auditMiddleware = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];
    const originalJson = res.json.bind(res);
    
    res.json = function (body: any): Response {
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
      
      auditLog({
        timestamp: new Date().toISOString(),
        action,
        userId: (req as any).user?.uid,
        ip,
        userAgent,
        resource: req.originalUrl,
        status,
        details: status === 'failure' ? body : undefined
      }).catch(err => Logger.error('Audit log error', err));
      
      return originalJson(body);
    };
    
    next();
  };
};

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
};

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
