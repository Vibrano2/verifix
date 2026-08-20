"use strict";
/**
 * Standardized API Response Utility
 * Provides consistent response format across all endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseUtil = void 0;
/**
 * Response Utility Class
 * Standardizes all API responses for consistency
 */
class ResponseUtil {
    /**
     * Send success response
     * @param res - Express Response object
     * @param message - Success message
     * @param data - Response data (optional)
     * @param statusCode - HTTP status code (default: 200)
     */
    static success(res, message, data, statusCode = 200) {
        const response = {
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
    static error(res, message, statusCode = 400, code) {
        const response = {
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
    static created(res, message, data) {
        return this.success(res, message, data, 201);
    }
    /**
     * Send no content (204) response
     * @param res - Express Response object
     */
    static noContent(res) {
        return res.status(204).send();
    }
    /**
     * Send bad request (400) response
     * @param res - Express Response object
     * @param message - Error message
     */
    static badRequest(res, message = 'Bad request') {
        return this.error(res, message, 400, 'BAD_REQUEST');
    }
    /**
     * Send unauthorized (401) response
     * @param res - Express Response object
     * @param message - Error message
     */
    static unauthorized(res, message = 'Unauthorized') {
        return this.error(res, message, 401, 'UNAUTHORIZED');
    }
    /**
     * Send payment required (402) response
     * @param res - Express Response object
     * @param message - Error message
     */
    static paymentRequired(res, message = 'Payment required') {
        return this.error(res, message, 402, 'PAYMENT_REQUIRED');
    }
    /**
     * Send forbidden (403) response
     * @param res - Express Response object
     * @param message - Error message
     */
    static forbidden(res, message = 'Forbidden') {
        return this.error(res, message, 403, 'FORBIDDEN');
    }
    /**
     * Send not found (404) response
     * @param res - Express Response object
     * @param message - Error message
     */
    static notFound(res, message = 'Resource not found') {
        return this.error(res, message, 404, 'NOT_FOUND');
    }
    /**
     * Send conflict (409) response
     * @param res - Express Response object
     * @param message - Error message
     */
    static conflict(res, message = 'Resource already exists') {
        return this.error(res, message, 409, 'CONFLICT');
    }
    /**
     * Send too many requests (429) response
     * @param res - Express Response object
     * @param message - Error message
     * @param retryAfter - Seconds until retry
     */
    static tooManyRequests(res, message = 'Too many requests', retryAfter) {
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
    static serverError(res, message = 'Internal server error') {
        return this.error(res, message, 500, 'SERVER_ERROR');
    }
    /**
     * Send service unavailable (503) response
     * @param res - Express Response object
     * @param message - Error message
     */
    static serviceUnavailable(res, message = 'Service temporarily unavailable') {
        return this.error(res, message, 503, 'SERVICE_UNAVAILABLE');
    }
}
exports.ResponseUtil = ResponseUtil;
//# sourceMappingURL=response.js.map