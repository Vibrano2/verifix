import { Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../types';

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
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
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
