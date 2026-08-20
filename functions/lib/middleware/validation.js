"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRating = exports.validateLocation = exports.validateUrgency = exports.validateTrade = void 0;
const types_1 = require("../types");
/**
 * Validate trade is in locked enum
 */
const validateTrade = (req, res, next) => {
    const { trade } = req.body;
    if (!trade || typeof trade !== 'string' || trade.trim() === '') {
        res.status(400).json({ error: 'Trade is required and must be a non-empty string' });
        return;
    }
    if (!types_1.LOCKED_TRADES.includes(trade)) {
        res.status(400).json({
            error: `Invalid trade. Must be one of: ${types_1.LOCKED_TRADES.join(', ')}`,
        });
        return;
    }
    next();
};
exports.validateTrade = validateTrade;
/**
 * Validate urgency is in locked enum
 */
const validateUrgency = (req, res, next) => {
    const { urgency } = req.body;
    if (!urgency || typeof urgency !== 'string') {
        res.status(400).json({ error: 'Urgency is required and must be a string' });
        return;
    }
    if (!types_1.URGENCY_VALUES.includes(urgency)) {
        res.status(400).json({
            error: `Invalid urgency. Must be one of: ${types_1.URGENCY_VALUES.join(', ')}`,
        });
        return;
    }
    next();
};
exports.validateUrgency = validateUrgency;
/**
 * Validate location has reasonable length
 */
const validateLocation = (req, res, next) => {
    const { location } = req.body;
    if (!location || typeof location !== 'string' || location.trim() === '') {
        res.status(400).json({ error: 'Location is required and must be a non-empty string' });
        return;
    }
    if (location.length > 200) {
        res.status(400).json({ error: 'Location must be 200 characters or less' });
        return;
    }
    next();
};
exports.validateLocation = validateLocation;
/**
 * Validate rating is between 1-5
 */
const validateRating = (req, res, next) => {
    const { rating } = req.body;
    if (rating === undefined || rating === null) {
        res.status(400).json({ error: 'Rating is required' });
        return;
    }
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || !Number.isInteger(ratingNum)) {
        res.status(400).json({ error: 'Rating must be an integer' });
        return;
    }
    if (ratingNum < 1 || ratingNum > 5) {
        res.status(400).json({ error: 'Rating must be between 1 and 5' });
        return;
    }
    next();
};
exports.validateRating = validateRating;
//# sourceMappingURL=validation.js.map