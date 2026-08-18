import * as admin from 'firebase-admin';
import { z } from 'zod';

export const RegisterUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    first_name: z.string().min(1).max(50),
    last_name: z.string().min(1).max(50),
    role: z.enum(['client', 'artisan', 'admin']),
  })
});

export const LoginUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

export const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

export const ResetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8)
  })
});

export const UpdateUserSchema = z.object({
  body: z.object({
    first_name: z.string().min(1).max(50).optional(),
    last_name: z.string().min(1).max(50).optional(),
    phone: z.string().min(10).max(15).optional()
  })
});

export interface User {
  uid: string;
  email: string;
  password_hash?: string;
  email_verified?: boolean;
  email_encrypted?: string;
  email_hash?: string;
  phone?: string;
  phone_hash?: string;
  phone_encrypted?: string;
  first_name: string;
  last_name: string;
  role: 'client' | 'artisan' | 'admin';
  reset_token_hash?: string;
  reset_token_expires?: Date | admin.firestore.Timestamp;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
}

export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>['body'];
export type LoginUserDTO = z.infer<typeof LoginUserSchema>['body'];
export type ResetPasswordDTO = z.infer<typeof ResetPasswordSchema>['body'];
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>['body'];
