/**
 * NDPR (Nigeria Data Protection Regulation) Compliance Masking Middleware
 * Ensures sensitive data like NIN and ID Document URL are omitted for non-admin callers.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * Sanitizes artisan profile objects or arrays to strip NDPR sensitive fields.
 */
export const sanitizeArtisanProfile = (data: any, isAdmin: boolean = false): any => {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeArtisanProfile(item, isAdmin));
  }

  if (typeof data === 'object') {
    const sanitized = { ...data };

    if (!isAdmin) {
      delete sanitized.nin;
      delete sanitized.id_document_url;
      delete sanitized.phone_encrypted;
      delete sanitized.email_encrypted;
    } else if (sanitized.nin && typeof sanitized.nin === 'string' && sanitized.nin.length > 4) {
      // Partial masking for admin view if needed: e.g. "******1234"
      sanitized.nin_masked = `******${sanitized.nin.slice(-4)}`;
    }

    return sanitized;
  }

  return data;
};

/**
 * Express Middleware to automatically sanitize outgoing JSON responses containing artisan data.
 */
export const ndprMaskingMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const originalJson = res.json;

  res.json = function (body: any): Response {
    const isAdmin = req.user?.role === 'admin' || req.user?.uid === process.env.ADMIN_UID;

    if (body && body.data) {
      body.data = sanitizeArtisanProfile(body.data, isAdmin);
    } else if (body && (body.nin || body.id_document_url)) {
      body = sanitizeArtisanProfile(body, isAdmin);
    }

    return originalJson.call(this, body);
  };

  next();
};
