/**
 * Base Service
 * Abstract base class for all services
 * Provides common service patterns and dependency injection
 */

import * as admin from 'firebase-admin';
import { Logger } from '../utils/logger';
import { COLLECTIONS } from '../constants';

export abstract class BaseService {
  protected logger = Logger;

  /**
   * Handle service errors consistently
   */
  protected handleError(error: any, context: string): never {
    this.logger.error(`${context} error`, error);
    throw error;
  }

  /**
   * Validate required fields
   */
  protected validateRequired(fields: Record<string, any>, fieldNames: string[]): void {
    const missing = fieldNames.filter(name => !fields[name]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Log service operation to console and Firestore (Analytics)
   */
  protected logOperation(operation: string, data?: any): void {
    this.logger.info(`Service operation: ${operation}`, data);
    
    // Save to analytics_events collection per PRD Section 7.5
    try {
      const db = admin.firestore();
      db.collection(COLLECTIONS.ANALYTICS_EVENTS).add({
        event_type: operation,
        user_id: data?.uid || data?.clientUid || data?.artisanUid || 'system',
        metadata: data || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }).catch(err => {
        this.logger.error('Failed to write analytics event to Firestore', err);
      });
    } catch (e) {
      // Ignore if admin is not initialized (e.g. in some tests)
    }
  }
}
