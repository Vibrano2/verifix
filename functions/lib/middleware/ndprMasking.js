"use strict";
/**
 * NDPR (Nigeria Data Protection Regulation) Compliance Masking Middleware
 * Ensures sensitive data like NIN and ID Document URL are omitted for non-admin callers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ndprMaskingMiddleware = exports.sanitizeArtisanProfile = void 0;
/**
 * Sanitizes artisan profile objects or arrays to strip NDPR sensitive fields.
 */
const sanitizeArtisanProfile = (data, isAdmin = false) => {
    if (!data)
        return data;
    if (Array.isArray(data)) {
        return data.map(item => (0, exports.sanitizeArtisanProfile)(item, isAdmin));
    }
    if (typeof data === 'object') {
        const sanitized = Object.assign({}, data);
        if (!isAdmin) {
            delete sanitized.nin;
            delete sanitized.id_document_url;
            delete sanitized.phone_encrypted;
            delete sanitized.email_encrypted;
        }
        else if (sanitized.nin && typeof sanitized.nin === 'string' && sanitized.nin.length > 4) {
            // Partial masking for admin view if needed: e.g. "******1234"
            sanitized.nin_masked = `******${sanitized.nin.slice(-4)}`;
        }
        return sanitized;
    }
    return data;
};
exports.sanitizeArtisanProfile = sanitizeArtisanProfile;
/**
 * Express Middleware to automatically sanitize outgoing JSON responses containing artisan data.
 */
const ndprMaskingMiddleware = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        var _a, _b;
        const isAdmin = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'admin' || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.uid) === process.env.ADMIN_UID;
        if (body && body.data) {
            body.data = (0, exports.sanitizeArtisanProfile)(body.data, isAdmin);
        }
        else if (body && (body.nin || body.id_document_url)) {
            body = (0, exports.sanitizeArtisanProfile)(body, isAdmin);
        }
        return originalJson.call(this, body);
    };
    next();
};
exports.ndprMaskingMiddleware = ndprMaskingMiddleware;
//# sourceMappingURL=ndprMasking.js.map