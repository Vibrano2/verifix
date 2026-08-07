/**
 * User Repository
 * Handles all user-related database operations
 */

import * as admin from 'firebase-admin';
import { BaseRepository } from './base.repository';
import { COLLECTIONS } from '../constants';
import { User } from '../models/user.model';
import { hashData } from '../utils/encryption';
import { Logger } from '../utils/logger';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(COLLECTIONS.USERS);
  }

  /**
   * Find user by phone number
   * @param phone - Phone number in E.164 format
   * @returns User or null if not found
   */
  async findByPhone(phone: string): Promise<User | null> {
    try {
      const phoneHash = hashData(phone);
      const snapshot = await this.getCollection()
        .where('phone_hash', '==', phoneHash)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      return snapshot.docs[0].data() as User;
    } catch (error) {
      Logger.error('Error finding user by phone', error);
      throw error;
    }
  }

  /**
   * Find all users by role
   * @param role - User role (client, artisan, admin)
   * @returns Array of users
   */
  async findByRole(role: string): Promise<User[]> {
    try {
      const snapshot = await this.getCollection()
        .where('role', '==', role)
        .get();
      
      return snapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      Logger.error('Error finding users by role', error);
      throw error;
    }
  }

  /**
   * Check if phone number already exists
   * @param phone - Phone number
   * @returns true if phone exists
   */
  async phoneExists(phone: string): Promise<boolean> {
    const user = await this.findByPhone(phone);
    return user !== null;
  }

  /**
   * Create user with phone hash
   * @param user - User data
   * @returns Created user
   */
  async createUser(user: User): Promise<User | null> {
    try {
      // Add phone hash for lookup
      const userData = {
        ...user,
        phone_hash: hashData(user.phone),
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await this.getCollection().doc(user.uid).set(userData);
      return await this.findById(user.uid);
    } catch (error) {
      Logger.error('Error creating user', error);
      throw error;
    }
  }
}
