"use strict";
/**
 * Base Service
 * Abstract base class for all services
 * Provides common service patterns and dependency injection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const logger_1 = require("../utils/logger");
class BaseService {
    constructor() {
        this.logger = logger_1.Logger;
    }
    /**
     * Handle service errors consistently
     */
    handleError(error, context) {
        this.logger.error(`${context} error`, error);
        throw error;
    }
    /**
     * Validate required fields
     */
    validateRequired(fields, fieldNames) {
        const missing = fieldNames.filter(name => !fields[name]);
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }
    /**
     * Log service operation
     */
    logOperation(operation, data) {
        this.logger.info(`Service operation: ${operation}`, data);
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=base.service.js.map