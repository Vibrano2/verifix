"use strict";
/**
 * Base Repository
 * Abstract base class for all repositories
 * Provides common CRUD operations for Firestore collections
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
exports.BaseRepository = void 0;
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
class BaseRepository {
    constructor(collectionName) {
        this.db = admin.firestore();
        this.collectionName = collectionName;
    }
    /**
     * Get collection reference
     */
    getCollection() {
        return this.db.collection(this.collectionName);
    }
    /**
     * Create a new document
     * @param id - Document ID
     * @param data - Document data
     * @returns Created document
     */
    async create(id, data) {
        try {
            await this.getCollection().doc(id).set(data);
            return await this.findById(id);
        }
        catch (error) {
            logger_1.Logger.error(`Error creating document in ${this.collectionName}`, error);
            throw error;
        }
    }
    /**
     * Find document by ID
     * @param id - Document ID
     * @returns Document data or null if not found
     */
    async findById(id) {
        try {
            const doc = await this.getCollection().doc(id).get();
            if (!doc.exists) {
                return null;
            }
            return doc.data();
        }
        catch (error) {
            logger_1.Logger.error(`Error finding document by ID in ${this.collectionName}`, error);
            throw error;
        }
    }
    /**
     * Update document
     * @param id - Document ID
     * @param data - Partial data to update
     * @returns Updated document
     */
    async update(id, data) {
        try {
            await this.getCollection().doc(id).update(data);
            return await this.findById(id);
        }
        catch (error) {
            logger_1.Logger.error(`Error updating document in ${this.collectionName}`, error);
            throw error;
        }
    }
    /**
     * Delete document
     * @param id - Document ID
     */
    async delete(id) {
        try {
            await this.getCollection().doc(id).delete();
        }
        catch (error) {
            logger_1.Logger.error(`Error deleting document in ${this.collectionName}`, error);
            throw error;
        }
    }
    /**
     * Find all documents with optional limit
     * @param limit - Maximum number of documents to return
     * @returns Array of documents
     */
    async findAll(limit) {
        try {
            let query = this.getCollection();
            if (limit) {
                query = query.limit(limit);
            }
            const snapshot = await query.get();
            return snapshot.docs.map(doc => doc.data());
        }
        catch (error) {
            logger_1.Logger.error(`Error finding all documents in ${this.collectionName}`, error);
            throw error;
        }
    }
    /**
     * Check if document exists
     * @param id - Document ID
     * @returns true if document exists
     */
    async exists(id) {
        try {
            const doc = await this.getCollection().doc(id).get();
            return doc.exists;
        }
        catch (error) {
            logger_1.Logger.error(`Error checking document existence in ${this.collectionName}`, error);
            throw error;
        }
    }
    /**
     * Count documents in collection
     * @returns Number of documents
     */
    async count() {
        try {
            const snapshot = await this.getCollection().count().get();
            return snapshot.data().count;
        }
        catch (error) {
            logger_1.Logger.error(`Error counting documents in ${this.collectionName}`, error);
            throw error;
        }
    }
    /**
     * Execute a batch write
     * @param operations - Array of batch operations
     */
    async batchWrite(operations) {
        try {
            const batch = this.db.batch();
            for (const op of operations) {
                const docRef = this.getCollection().doc(op.id);
                switch (op.type) {
                    case 'create':
                        batch.set(docRef, op.data);
                        break;
                    case 'update':
                        batch.update(docRef, op.data);
                        break;
                    case 'delete':
                        batch.delete(docRef);
                        break;
                }
            }
            await batch.commit();
        }
        catch (error) {
            logger_1.Logger.error(`Error executing batch write in ${this.collectionName}`, error);
            throw error;
        }
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base.repository.js.map