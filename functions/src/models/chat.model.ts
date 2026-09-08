import * as admin from 'firebase-admin';
import { z } from 'zod';

export interface ChatMessage {
  id?: string;
  job_id: string;
  match_id: string;
  sender_uid: string;
  content: string;
  is_read: boolean;
  created_at: Date | admin.firestore.Timestamp;
}

export const SendMessageSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1).max(2000)
  }).strict()
});

export type SendMessageDTO = z.infer<typeof SendMessageSchema>['body'];
