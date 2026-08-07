/**
 * Standardized API Response Utility
 * Provides consistent response format across all endpoints
 */

import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Response Utility Class
 * Standardizes all API responses for consistency
 */
export class ResponseUtil {
  /**
   * Send success response
   * @param res - Express Response object
   * @param message - Success message
   * @param data - Response data (optional)
   * @param statusCode - HTTP status code (default: 200)
   */
  static success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param res - Express Response object
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 400)
   * @param code - Error code for programmatic handling (optional)
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 400,
    code?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: message,
      code
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send created (201) response
   * @param res - Express Response object
   * @param message - Success message
   * @param data - Created resource data
   */
  static created<T>(
    res: Response,
    message: string,
    data?: T
  ): Response {
    return this.success(res, message, data, 201);
  }

  /**
   * Send no content (204) response
   * @param res - Express Response object
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send bad request (400) response
   * @param res - Express Response object
   * @param message - Error message
   */
  static badRequest(
    res: Response,
    message: string = 'Bad request'
  ): Response {
    return this.error(res, message, 400, 'BAD_REQUEST');
  }

  /**
   * Send unauthorized (401) response
   * @param res - Express Response object
   * @param message - Error message
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized'
  ): Response {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Send payment required (402) response
   * @param res - Express Response object
   * @param message - Error message
   */
  static paymentRequired(
    res: Response,
    message: string = 'Payment required'
  ): Response {
    return this.error(res, message, 402, 'PAYMENT_REQUIRED');
  }

  /**
   * Send forbidden (403) response
   * @param res - Express Response object
   * @param message - Error message
   */
  static forbidden(
    res: Response,
    message: string = 'Forbidden'
  ): Response {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Send not found (404) response
   * @param res - Express Response object
   * @param message - Error message
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  /**
   * Send conflict (409) response
   * @param res - Express Response object
   * @param message - Error message
   */
  static conflict(
    res: Response,
    message: string = 'Resource already exists'
  ): Response {
    return this.error(res, message, 409, 'CONFLICT');
  }

  /**
   * Send too many requests (429) response
   * @param res - Express Response object
   * @param message - Error message
   * @param retryAfter - Seconds until retry
   */
  static tooManyRequests(
    res: Response,
    message: string = 'Too many requests',
    retryAfter?: number
  ): Response {
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter.toString());
    }
    return this.error(res, message, 429, 'TOO_MANY_REQUESTS');
  }

  /**
   * Send internal server error (500) response
   * @param res - Express Response object
   * @param message - Error message (should be generic for security)
   */
  static serverError(
    res: Response,
    message: string = 'Internal server error'
  ): Response {
    return this.error(res, message, 500, 'SERVER_ERROR');
  }

  /**
   * Send service unavailable (503) response
   * @param res - Express Response object
   * @param message - Error message
   */
  static serviceUnavailable(
    res: Response,
    message: string = 'Service temporarily unavailable'
  ): Response {
    return this.error(res, message, 503, 'SERVICE_UNAVAILABLE');
  }
}
