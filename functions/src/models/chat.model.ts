import * as admin from 'firebase-admin';
import { z } from 'zod';

export interface ChatMessage {
  id?: string;
  job_id: string;
  sender_uid: string;
  content: string;
  is_read: boolean;
  created_at: Date | admin.firestore.Timestamp;
}

export const SendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(2000)
  })
});

export type SendMessageDTO = z.infer<typeof SendMessageSchema>['body'];
