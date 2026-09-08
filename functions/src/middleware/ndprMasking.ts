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
    const prototype = Object.getPrototypeOf(data);
    if (prototype !== Object.prototype && prototype !== null) return data;
    const sanitized: Record<string, any> = {};

    const protectedFields = new Set([
      'nin', 'nin_hash', 'nin_encrypted', 'phone_hash', 'phone_encrypted',
      'email_hash', 'email_encrypted', 'id_document_path', 'id_document_url',
      'bank_details', 'paystack_recipient_code'
    ]);
    for (const [key, value] of Object.entries(data)) {
      if (!isAdmin && protectedFields.has(key)) continue;
      sanitized[key] = sanitizeArtisanProfile(value, isAdmin);
    }
    if (isAdmin && typeof sanitized.nin === 'string' && sanitized.nin.length > 4) {
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
    const isAdmin = Boolean(process.env.ADMIN_UID && req.user?.uid === process.env.ADMIN_UID);

    if (body && body.data) {
      body.data = sanitizeArtisanProfile(body.data, isAdmin);
    } else if (body && (body.nin || body.id_document_url)) {
      body = sanitizeArtisanProfile(body, isAdmin);
    }

    return originalJson.call(this, body);
  };

  next();
};
