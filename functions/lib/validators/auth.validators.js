"use strict";
/**
 * Auth Validators
 * Request validation schemas for auth endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSendOTP = validateSendOTP;
exports.validateVerifyOTP = validateVerifyOTP;
exports.validateRegisterAdmin = validateRegisterAdmin;
exports.validateResetPassword = validateResetPassword;
const constants_1 = require("../constants");
/**
 * Validate send OTP request
 */
function validateSendOTP(req, res, next) {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
        res.status(400).json({
            success: false,
            message: 'Phone number is required'
        });
        return;
    }
    // Basic phone validation (Nigerian format)
    const phoneRegex = /^(\+234|0)[789]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
        res.status(400).json({
            success: false,
            message: 'Invalid phone number format. Use Nigerian format (+234... or 0...)'
        });
        return;
    }
    next();
}
/**
 * Validate verify OTP request
 */
function validateVerifyOTP(req, res, next) {
    const { phone, otp, role } = req.body;
    if (!phone || typeof phone !== 'string') {
        res.status(400).json({
            success: false,
            message: 'Phone number is required'
        });
        return;
    }
    if (!otp || typeof otp !== 'string') {
        res.status(400).json({
            success: false,
            message: 'OTP is required'
        });
        return;
    }
    if (!role || ![constants_1.ROLES.CLIENT, constants_1.ROLES.ARTISAN].includes(role)) {
        res.status(400).json({
            success: false,
            message: 'Valid role is required (client or artisan)'
        });
        return;
    }
    next();
}
/**
 * Validate register admin request
 */
function validateRegisterAdmin(req, res, next) {
    const { email, password, first_name, last_name } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({
            success: false,
            message: 'Valid email is required'
        });
        return;
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
        res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters'
        });
        return;
    }
    if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) {
        res.status(400).json({
            success: false,
            message: 'First name is required'
        });
        return;
    }
    if (!last_name || typeof last_name !== 'string' || last_name.trim().length === 0) {
        res.status(400).json({
            success: false,
            message: 'Last name is required'
        });
        return;
    }
    next();
}
/**
 * Validate reset password request
 */
function validateResetPassword(req, res, next) {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        // Return success anyway to avoid email enumeration
        res.status(200).json({
            success: true,
            message: 'If this email exists, a reset link has been sent'
        });
        return;
    }
    next();
}
//# sourceMappingURL=auth.validators.js.map