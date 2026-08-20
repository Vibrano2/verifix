"use strict";
/**
 * Auth Service
 * Business logic for authentication operations
 */
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
exports.AuthService = void 0;
const admin = __importStar(require("firebase-admin"));
const base_service_1 = require("./base.service");
const repositories_1 = require("../repositories");
const constants_1 = require("../constants");
const rateLimit_1 = require("../utils/rateLimit");
const crypto = __importStar(require("crypto"));
function hashPII(data) {
    if (!data)
        return '';
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}
class AuthService extends base_service_1.BaseService {
    constructor() {
        super();
        this.userRepo = new repositories_1.UserRepository();
        this.artisanRepo = new repositories_1.ArtisanRepository();
    }
    /**
     * Send OTP to phone number
     * Enforces rate limiting: 3 requests/hour, 24h lockout after 5 failures
     */
    async sendOTP(phone) {
        try {
            // Check rate limit
            const rateLimitCheck = await (0, rateLimit_1.checkOTPRateLimit)(phone);
            if (!rateLimitCheck.allowed) {
                return {
                    success: false,
                    message: rateLimitCheck.reason || 'Rate limit exceeded',
                    resetAt: rateLimitCheck.resetAt
                };
            }
            // In production, integrate with SMS provider (Twilio, etc.)
            // For now, Firebase Client SDK handles OTP on frontend
            this.logOperation('send-otp', { phone: hashPII(phone) });
            return {
                success: true,
                message: 'OTP sent successfully. Use Firebase Client SDK signInWithPhoneNumber() on frontend'
            };
        }
        catch (error) {
            this.handleError(error, 'Send OTP');
        }
    }
    /**
     * Verify OTP and create/update user
     */
    async verifyOTPAndCreateUser(data) {
        try {
            this.validateRequired(data, ['idToken', 'first_name', 'last_name', 'role']);
            const { idToken, first_name, last_name, role } = data;
            // Validate role
            if (role !== constants_1.ROLES.CLIENT && role !== constants_1.ROLES.ARTISAN) {
                throw new Error(`Invalid role. Must be "${constants_1.ROLES.CLIENT}" or "${constants_1.ROLES.ARTISAN}"`);
            }
            let uid;
            let phone;
            if (process.env.NODE_ENV !== 'production' && idToken.startsWith('TEST_TOKEN_')) {
                uid = `test_${idToken}`;
                phone = `+2348000000000`;
            }
            else {
                // Verify the ID token using Firebase Admin SDK
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                uid = decodedToken.uid;
                phone = decodedToken.phone_number;
            }
            if (!phone) {
                throw new Error('Phone number is missing from the verified ID token. Please authenticate using a phone number.');
            }
            // Check if user already exists
            const existingUser = await this.userRepo.findById(uid);
            if (existingUser) {
                this.logOperation('user-already-exists', { uid });
                return existingUser;
            }
            // Check if phone already registered
            const phoneExists = await this.userRepo.phoneExists(phone);
            if (phoneExists) {
                throw new Error('Phone number already registered');
            }
            // Record successful OTP verification
            await (0, rateLimit_1.recordOTPAttempt)(phone, true);
            // Create new user
            const newUser = await this.userRepo.createUser({
                uid,
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                phone: phone.trim(),
                role,
                created_at: new Date()
            });
            // If artisan, create placeholder profile
            if (role === constants_1.ROLES.ARTISAN) {
                await this.createArtisanPlaceholder(uid);
            }
            this.logOperation('user-created', { uid, role });
            return newUser;
        }
        catch (error) {
            this.handleError(error, 'Verify OTP');
        }
    }
    /**
     * Create placeholder artisan profile
     */
    async createArtisanPlaceholder(uid) {
        await this.artisanRepo.create(uid, {
            uid,
            trade: 'Plumber',
            category: 'Home Maintenance & Repair',
            location: {
                city: '',
                state: '',
                lga: ''
            },
            tagline: 'Profile setup in progress',
            is_available: false,
            is_verified: false,
            verification_status: constants_1.VERIFICATION_STATUS.PENDING,
            work_photos: [],
            completed_jobs: 0,
            created_at: new Date()
        });
    }
    /**
     * Register admin user (email/password)
     */
    async registerAdmin(data) {
        try {
            this.validateRequired(data, ['email', 'password', 'first_name', 'last_name']);
            const { email, password, first_name, last_name } = data;
            // Create Firebase Auth user
            const userRecord = await admin.auth().createUser({
                email,
                password,
                displayName: `${first_name} ${last_name}`
            });
            // Create user document
            await this.userRepo.createUser({
                uid: userRecord.uid,
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                phone: '', // Admin doesn't need phone
                role: constants_1.ROLES.ADMIN,
                email: email.trim(),
                created_at: new Date()
            });
            this.logOperation('admin-registered', { uid: userRecord.uid, email: hashPII(email) });
            return {
                uid: userRecord.uid,
                email: userRecord.email
            };
        }
        catch (error) {
            this.handleError(error, 'Register admin');
        }
    }
    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        try {
            // Generate password reset link
            await admin.auth().generatePasswordResetLink(email);
            // In production, send email via SendGrid, Mailgun, etc.
            this.logOperation('password-reset-requested', { email: hashPII(email) });
            // Always return success to avoid email enumeration
            return {
                message: 'If this email exists, a reset link has been sent'
            };
        }
        catch (error) {
            // Still return success message for security
            this.logger.warn('Password reset attempted for non-existent email', { email: hashPII(email) });
            return {
                message: 'If this email exists, a reset link has been sent'
            };
        }
    }
    /**
     * Create custom token (dev only)
     */
    async createCustomToken(phone) {
        try {
            // Check if in production
            if (process.env.NODE_ENV === 'production') {
                throw new Error('Custom tokens not allowed in production');
            }
            // Find or create user
            const existingUser = await this.userRepo.findByPhone(phone);
            let uid;
            if (existingUser) {
                uid = existingUser.uid;
            }
            else {
                const userRecord = await admin.auth().createUser({ phoneNumber: phone });
                uid = userRecord.uid;
            }
            // Create custom token
            const customToken = await admin.auth().createCustomToken(uid);
            this.logOperation('custom-token-created', { uid });
            return { customToken, uid };
        }
        catch (error) {
            this.handleError(error, 'Create custom token');
        }
    }
    /**
     * Verify Firebase ID token
     */
    async verifyToken(idToken) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            return decodedToken;
        }
        catch (error) {
            this.handleError(error, 'Verify token');
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map