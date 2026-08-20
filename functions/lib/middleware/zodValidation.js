"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
const validate = (schema) => async (req, res, next) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }
        else {
            logger_1.Logger.error('Unexpected validation error', error);
            res.status(500).json({ error: 'Internal server error during validation' });
        }
    }
};
exports.validate = validate;
//# sourceMappingURL=zodValidation.js.map