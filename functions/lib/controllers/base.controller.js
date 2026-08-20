"use strict";
/**
 * Base Controller
 * Abstract base class for all controllers
 * Handles HTTP responses and error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
class BaseController {
    constructor() {
        this.logger = logger_1.Logger;
    }
    /**
     * Handle controller errors and send appropriate HTTP response
     */
    handleError(error, res, operation) {
        this.logger.error(`${operation} controller error`, error);
        // Check for common error types
        if (error.message.includes('not found')) {
            return response_1.ResponseUtil.notFound(res, error.message);
        }
        if (error.message.includes('Unauthorized') || error.message.includes('forbidden')) {
            return response_1.ResponseUtil.forbidden(res, error.message);
        }
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            return response_1.ResponseUtil.conflict(res, error.message);
        }
        if (error.message.includes('required') || error.message.includes('Invalid')) {
            return response_1.ResponseUtil.badRequest(res, error.message);
        }
        // Default to server error
        return response_1.ResponseUtil.serverError(res, 'An unexpected error occurred');
    }
    /**
     * Send success response
     */
    sendSuccess(res, message, data) {
        response_1.ResponseUtil.success(res, message, data);
    }
    /**
     * Send created response
     */
    sendCreated(res, message, data) {
        response_1.ResponseUtil.created(res, message, data);
    }
    /**
     * Send bad request response
     */
    sendBadRequest(res, message) {
        response_1.ResponseUtil.badRequest(res, message);
    }
    /**
     * Send not found response
     */
    sendNotFound(res, message) {
        response_1.ResponseUtil.notFound(res, message);
    }
    /**
     * Send unauthorized response
     */
    sendUnauthorized(res, message) {
        response_1.ResponseUtil.unauthorized(res, message);
    }
    /**
     * Send forbidden response
     */
    sendForbidden(res, message) {
        response_1.ResponseUtil.forbidden(res, message);
    }
    /**
     * Send conflict response
     */
    sendConflict(res, message) {
        response_1.ResponseUtil.conflict(res, message);
    }
}
exports.BaseController = BaseController;
//# sourceMappingURL=base.controller.js.map