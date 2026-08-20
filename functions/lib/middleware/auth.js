"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnership = exports.requireAdmin = exports.authenticate = void 0;
const admin = __importStar(require("firebase-admin"));
const security_1 = require("./security");
const logger_1 = require("../utils/logger");
/**
 * Middleware to verify Firebase ID token and attach user to request
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: No token provided' });
            return;
        }
        const token = authHeader.split('Bearer ')[1];
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.user = decodedToken;
            // Audit successful authentication
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            await (0, security_1.auditLog)({
                timestamp: new Date().toISOString(),
                action: 'AUTH_SUCCESS',
                userId: decodedToken.uid,
                ip,
                userAgent: req.headers['user-agent'],
                resource: req.originalUrl,
                status: 'success'
            });
            next();
        }
        catch (error) {
            logger_1.Logger.error('Token verification failed', error);
            // Record failed authentication attempt
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            (0, security_1.recordFailedAuth)(ip);
            // Audit failed authentication
            await (0, security_1.auditLog)({
                timestamp: new Date().toISOString(),
                action: 'AUTH_FAILURE',
                ip,
                userAgent: req.headers['user-agent'],
                resource: req.originalUrl,
                status: 'failure',
                details: { error: 'Invalid token' }
            });
            res.status(401).json({ error: 'Unauthorized: Invalid token' });
            return;
        }
    }
    catch (error) {
        logger_1.Logger.error('Authentication error', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
        return;
    }
};
exports.authenticate = authenticate;
/**
 * Middleware to check if authenticated user is an admin
 * Admin UID is stored in environment variable
 */
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized: Authentication required' });
            return;
        }
        const adminUid = process.env.ADMIN_UID;
        if (!adminUid) {
            logger_1.Logger.error('ADMIN_UID environment variable not set');
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }
        if (req.user.uid !== adminUid) {
            res.status(403).json({ error: 'Forbidden: Admin access required' });
            return;
        }
        next();
    }
    catch (error) {
        logger_1.Logger.error('Admin check error', error);
        res.status(500).json({ error: 'Internal server error during authorization' });
        return;
    }
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware to verify resource ownership
 * Checks if the authenticated user owns the resource specified by :uid parameter
 */
const requireOwnership = (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized: Authentication required' });
            return;
        }
        const resourceUid = req.params.uid;
        if (!resourceUid) {
            res.status(400).json({ error: 'Bad request: Resource UID not specified' });
            return;
        }
        if (req.user.uid !== resourceUid) {
            res.status(403).json({ error: 'Forbidden: You do not own this resource' });
            return;
        }
        next();
    }
    catch (error) {
        logger_1.Logger.error('Ownership check error', error);
        res.status(500).json({ error: 'Internal server error during authorization' });
        return;
    }
};
exports.requireOwnership = requireOwnership;
//# sourceMappingURL=auth.js.map