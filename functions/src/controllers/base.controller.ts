/**
 * Base Controller
 * Abstract base class for all controllers
 * Handles HTTP responses and error handling
 */

import { Response } from 'express';
import { ResponseUtil } from '../utils/response';
import { Logger } from '../utils/logger';

export abstract class BaseController {
  protected logger = Logger;

  /**
   * Handle controller errors and send appropriate HTTP response
   */
  protected handleError(error: any, res: Response, operation: string): Response {
    this.logger.error(`${operation} controller error`, error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const normalized = message.toLowerCase();

    // Check for common error types
    if (normalized.includes('not found')) {
      return ResponseUtil.notFound(res, message);
    }

    if (normalized.includes('unauthorized') || normalized.includes('authentication required')) {
      return ResponseUtil.unauthorized(res, message);
    }

    if (normalized.includes('forbidden') || normalized.includes('only the')) {
      return ResponseUtil.forbidden(res, message);
    }

    if (normalized.includes('already exists') || normalized.includes('already ')
      || normalized.includes('invalid job state') || normalized.includes('state transition')) {
      return ResponseUtil.conflict(res, message);
    }

    if (normalized.includes('required') || normalized.includes('invalid')
      || normalized.includes('must ') || normalized.includes('exceeds')) {
      return ResponseUtil.badRequest(res, message);
    }

    // Default to server error
    return ResponseUtil.serverError(res, 'An unexpected error occurred');
  }

  /**
   * Send success response
   */
  protected sendSuccess(res: Response, message: string, data?: any): void {
    ResponseUtil.success(res, message, data);
  }

  /**
   * Send created response
   */
  protected sendCreated(res: Response, message: string, data?: any): void {
    ResponseUtil.created(res, message, data);
  }

  /**
   * Send bad request response
   */
  protected sendBadRequest(res: Response, message: string): void {
    ResponseUtil.badRequest(res, message);
  }

  /**
   * Send not found response
   */
  protected sendNotFound(res: Response, message: string): void {
    ResponseUtil.notFound(res, message);
  }

  /**
   * Send unauthorized response
   */
  protected sendUnauthorized(res: Response, message: string): void {
    ResponseUtil.unauthorized(res, message);
  }

  /**
   * Send forbidden response
   */
  protected sendForbidden(res: Response, message: string): void {
    ResponseUtil.forbidden(res, message);
  }

  /**
   * Send conflict response
   */
  protected sendConflict(res: Response, message: string): void {
    ResponseUtil.conflict(res, message);
  }
}
