/**
 * Base Service
 * Abstract base class for all services
 * Provides common service patterns and dependency injection
 */

import { Logger } from '../utils/logger';

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
   * Log service operation
   */
  protected logOperation(operation: string, data?: any): void {
    this.logger.info(`Service operation: ${operation}`, data);
  }
}
