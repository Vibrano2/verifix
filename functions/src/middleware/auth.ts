import { Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../types';
import { recordFailedAuth, auditLog } from './security';
import { Logger } from '../utils/logger';

function configuredAdminUid(): string | undefined {
  const value = process.env.ADMIN_UID?.trim();
  return value || undefined;
}

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

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token || token.length > 8192) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    try {
      const checkRevoked = process.env.FUNCTIONS_EMULATOR !== 'true';
      const decodedToken = await admin.auth().verifyIdToken(token, checkRevoked);

      // Roles are server-owned. The single configured administrator is
      // identified by UID; all other roles come from the backend-owned user
      // document. Custom claims are not accepted as an independent source of
      // administrative authority.
      if (decodedToken.uid === configuredAdminUid()) {
        (decodedToken as any).role = 'admin';
      } else {
        try {
          const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
          const persistedRole = userDoc.data()?.role;
          if (persistedRole === 'client' || persistedRole === 'artisan') {
            (decodedToken as any).role = persistedRole;
          }
        } catch {
          Logger.warn('Could not load persisted user role', { uid: decodedToken.uid });
        }
      }

      req.user = decodedToken as any;
      
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
      Logger.error('Token verification failed', error);
      
      // Record failed authentication attempt
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      void recordFailedAuth(ip);
      
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
    Logger.error('Authentication error', error);
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

    const adminUid = configuredAdminUid();
    
    if (!adminUid) {
      Logger.error('ADMIN_UID environment variable not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    if (req.user.uid !== adminUid) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    next();
  } catch (error) {
    Logger.error('Admin check error', error);
    res.status(500).json({ error: 'Internal server error during authorization' });
    return;
  }
};

/**
 * Require a server-owned application role. Admins may access role-protected
 * routes, while ordinary users must have the matching persisted role.
 */
export const requireRole = (role: 'client' | 'artisan') => (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  if (req.user.uid === configuredAdminUid() || req.user.role === role) {
    next();
    return;
  }

  res.status(403).json({ error: `Forbidden: ${role} access required` });
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
    Logger.error('Ownership check error', error);
    res.status(500).json({ error: 'Internal server error during authorization' });
    return;
  }
};
