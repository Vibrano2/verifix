"use strict";
/**
 * User Repository
 * Handles all user-related database operations
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
exports.UserRepository = void 0;
const admin = __importStar(require("firebase-admin"));
const base_repository_1 = require("./base.repository");
const constants_1 = require("../constants");
const encryption_1 = require("../utils/encryption");
const logger_1 = require("../utils/logger");
class UserRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(constants_1.COLLECTIONS.USERS);
    }
    /**
     * Find user by phone number
     * @param phone - Phone number in E.164 format
     * @returns User or null if not found
     */
    async findByPhone(phone) {
        try {
            const phoneHash = (0, encryption_1.hashData)(phone);
            const snapshot = await this.getCollection()
                .where('phone_hash', '==', phoneHash)
                .limit(1)
                .get();
            if (snapshot.empty) {
                return null;
            }
            return snapshot.docs[0].data();
        }
        catch (error) {
            logger_1.Logger.error('Error finding user by phone', error);
            throw error;
        }
    }
    /**
     * Find all users by role
     * @param role - User role (client, artisan, admin)
     * @returns Array of users
     */
    async findByRole(role) {
        try {
            const snapshot = await this.getCollection()
                .where('role', '==', role)
                .get();
            return snapshot.docs.map(doc => doc.data());
        }
        catch (error) {
            logger_1.Logger.error('Error finding users by role', error);
            throw error;
        }
    }
    /**
     * Check if phone number already exists
     * @param phone - Phone number
     * @returns true if phone exists
     */
    async phoneExists(phone) {
        const user = await this.findByPhone(phone);
        return user !== null;
    }
    /**
     * Create user with phone hash
     * @param user - User data
     * @returns Created user
     */
    async createUser(user) {
        try {
            // Add phone hash for lookup
            const userData = Object.assign(Object.assign({}, user), { phone_hash: (0, encryption_1.hashData)(user.phone), created_at: admin.firestore.FieldValue.serverTimestamp() });
            await this.getCollection().doc(user.uid).set(userData);
            return await this.findById(user.uid);
        }
        catch (error) {
            logger_1.Logger.error('Error creating user', error);
            throw error;
        }
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=user.repository.js.map