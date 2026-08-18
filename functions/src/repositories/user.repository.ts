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
   * Find user by email
   * @param email - User email address
   * @returns User or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const snapshot = await this.getCollection()
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      return snapshot.docs[0].data() as User;
    } catch (error) {
      Logger.error('Error finding user by email', error);
      throw error;
    }
  }

  /**
   * Check if email already exists
   * @param email - User email address
   * @returns true if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  /**
   * Update password hash
   */
  async updatePassword(uid: string, password_hash: string): Promise<void> {
    try {
      await this.getCollection().doc(uid).update({
        password_hash,
        reset_token_hash: admin.firestore.FieldValue.delete(),
        reset_token_expires: admin.firestore.FieldValue.delete(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      Logger.error('Error updating password', error);
      throw error;
    }
  }

  /**
   * Update reset token
   */
  async updateResetToken(uid: string, reset_token_hash: string, expires: Date): Promise<void> {
    try {
      await this.getCollection().doc(uid).update({
        reset_token_hash,
        reset_token_expires: expires,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      Logger.error('Error updating reset token', error);
      throw error;
    }
  }

  /**
   * Create user
   * @param user - User data
   * @returns Created user
   */
  async createUser(user: User): Promise<User | null> {
    try {
      const userData = {
        ...user,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };

      if (user.phone) {
        userData.phone_hash = hashData(user.phone);
      }
      if (user.email) {
        userData.email_hash = hashData(user.email);
      }
      
      await this.getCollection().doc(user.uid).set(userData);
      return await this.findById(user.uid);
    } catch (error) {
      Logger.error('Error creating user', error);
      throw error;
    }
  }
}
