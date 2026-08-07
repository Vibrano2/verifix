import { Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../types';
import { recordFailedAuth, auditLog } from './security';

/**
 * Middleware to verify Firebase ID token and attach user to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      
      // Audit successful authentication
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      await auditLog({
        timestamp: new Date().toISOString(),
        action: 'AUTH_SUCCESS',
        userId: decodedToken.uid,
        ip,
        userAgent: req.headers['user-agent'],
        resource: req.originalUrl,
        status: 'success'
      });
      
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      
      // Record failed authentication attempt
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      recordFailedAuth(ip);
      
      // Audit failed authentication
      await auditLog({
        timestamp: new Date().toISOString(),
        action: 'AUTH_FAILURE',
        ip,
        userAgent: req.headers['user-agent'],
        resource: req.originalUrl,
        status: 'failure',
        details: { error: 'Invalid token' }
      });
      
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
    return;
  }
};

/**
 * Middleware to check if authenticated user is an admin
 * Admin UID is stored in environment variable
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    const adminUid = process.env.ADMIN_UID;
    
    if (!adminUid) {
      console.error('ADMIN_UID environment variable not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    if (req.user.uid !== adminUid) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Internal server error during authorization' });
    return;
  }
};

/**
 * Middleware to verify resource ownership
 * Checks if the authenticated user owns the resource specified by :uid parameter
 */
export const requireOwnership = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    const resourceUid = req.params.uid;
    
    if (!resourceUid) {
      res.status(400).json({ error: 'Bad request: Resource UID not specified' });
      return;
    }

    if (req.user.uid !== resourceUid) {
      res.status(403).json({ error: 'Forbidden: You do not own this resource' });
      return;
    }

    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ error: 'Internal server error during authorization' });
    return;
  }
};
