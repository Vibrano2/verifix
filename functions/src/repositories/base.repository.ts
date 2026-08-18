/**
 * Base Repository
 * Abstract base class for all repositories
 * Provides common CRUD operations for Firestore collections
 */

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Logger } from '../utils/logger';

export abstract class BaseRepository<T extends { [key: string]: any }> {
  protected db: admin.firestore.Firestore;
  protected collectionName: string;

  constructor(collectionName: string) {
    this.db = getFirestore('default');
    this.collectionName = collectionName;
  }

  /**
   * Get collection reference
   */
  protected getCollection(): admin.firestore.CollectionReference {
    return this.db.collection(this.collectionName);
  }

  /**
   * Create a new document
   * @param id - Document ID
   * @param data - Document data
   * @returns Created document
   */
  async create(id: string, data: T): Promise<T | null> {
    try {
      await this.getCollection().doc(id).set(data);
      return await this.findById(id);
    } catch (error) {
      Logger.error(`Error creating document in ${this.collectionName}`, error);
      throw error;
    }
  }

  /**
   * Find document by ID
   * @param id - Document ID
   * @returns Document data or null if not found
   */
  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.getCollection().doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return doc.data() as T;
    } catch (error) {
      Logger.error(`Error finding document by ID in ${this.collectionName}`, error);
      throw error;
    }
  }

  /**
   * Update document
   * @param id - Document ID
   * @param data - Partial data to update
   * @returns Updated document
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    try {
      await this.getCollection().doc(id).update(data);
      return await this.findById(id);
    } catch (error) {
      Logger.error(`Error updating document in ${this.collectionName}`, error);
      throw error;
    }
  }

  /**
   * Delete document
   * @param id - Document ID
   */
  async delete(id: string): Promise<void> {
    try {
      await this.getCollection().doc(id).delete();
    } catch (error) {
      Logger.error(`Error deleting document in ${this.collectionName}`, error);
      throw error;
    }
  }

  /**
   * Find all documents with optional limit
   * @param limit - Maximum number of documents to return
   * @returns Array of documents
   */
  async findAll(limit?: number): Promise<T[]> {
    try {
      let query: admin.firestore.Query = this.getCollection();
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data() as T);
    } catch (error) {
      Logger.error(`Error finding all documents in ${this.collectionName}`, error);
      throw error;
    }
  }

  /**
   * Check if document exists
   * @param id - Document ID
   * @returns true if document exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const doc = await this.getCollection().doc(id).get();
      return doc.exists;
    } catch (error) {
      Logger.error(`Error checking document existence in ${this.collectionName}`, error);
      throw error;
    }
  }

  /**
   * Count documents in collection
   * @returns Number of documents
   */
  async count(): Promise<number> {
    try {
      const snapshot = await this.getCollection().count().get();
      return snapshot.data().count;
    } catch (error) {
      Logger.error(`Error counting documents in ${this.collectionName}`, error);
      throw error;
    }
  }

  /**
   * Execute a batch write
   * @param operations - Array of batch operations
   */
  async batchWrite(operations: Array<{
    type: 'create' | 'update' | 'delete';
    id: string;
    data?: any;
  }>): Promise<void> {
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
    } catch (error) {
      Logger.error(`Error executing batch write in ${this.collectionName}`, error);
      throw error;
    }
  }
}
