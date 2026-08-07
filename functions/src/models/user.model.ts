/**
 * User Model
 * Defines the User data structure
 */

import * as admin from 'firebase-admin';

export interface User {
  uid: string;
  phone: string;
  phone_hash?: string;
  phone_encrypted?: string;
  first_name: string;
  last_name: string;
  role: 'client' | 'artisan' | 'admin';
  email?: string;
  email_encrypted?: string;
  email_hash?: string;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
}

export interface CreateUserDTO {
  uid: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: 'client' | 'artisan' | 'admin';
  email?: string;
}

export interface UpdateUserDTO {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}
