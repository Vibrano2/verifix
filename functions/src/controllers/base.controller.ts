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

    // Check for common error types
    if (error.message.includes('not found')) {
      return ResponseUtil.notFound(res, error.message);
    }

    if (error.message.includes('Unauthorized') || error.message.includes('forbidden')) {
      return ResponseUtil.forbidden(res, error.message);
    }

    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      return ResponseUtil.conflict(res, error.message);
    }

    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return ResponseUtil.badRequest(res, error.message);
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
