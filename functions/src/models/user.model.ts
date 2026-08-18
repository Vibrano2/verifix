import * as admin from 'firebase-admin';
import { z } from 'zod';

export const CreateUserSchema = z.object({
  body: z.object({
    idToken: z.string().min(10),
    first_name: z.string().min(1).max(50),
    last_name: z.string().min(1).max(50),
    role: z.enum(['client', 'artisan']),
    email: z.string().email()
  })
});

export const UpdateUserSchema = z.object({
  body: z.object({
    first_name: z.string().min(1).max(50).optional(),
    last_name: z.string().min(1).max(50).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).max(15).optional()
  })
});

export interface User {
  uid: string;
  phone?: string;
  phone_hash?: string;
  phone_encrypted?: string;
  first_name: string;
  last_name: string;
  role: 'client' | 'artisan' | 'admin';
  email: string;
  email_encrypted?: string;
  email_hash?: string;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
}

export type CreateUserDTO = z.infer<typeof CreateUserSchema>['body'];
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>['body'];
