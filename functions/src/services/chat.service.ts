import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { ChatMessage } from '../models/chat.model';
import { AnalyticsService } from './analytics.service';

export class ChatService extends BaseService {
  private get db() { return admin.firestore(); }

  /**
   * Verify if a user is allowed to access the chat for a given job.
   * They must be either the job owner (client) or the assigned artisan.
   */
  async verifyChatAccess(jobId: string, uid: string): Promise<boolean> {
    // 1. Check if user is the client
    const jobDoc = await this.db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new Error('Job not found');
    }
    
    if (jobDoc.data()?.client_uid === uid) {
      return true;
    }

    // 2. Check if user is the assigned artisan (has an accepted/pending/completed match for this job)
    const matchSnapshot = await this.db.collection('matches')
      .where('job_id', '==', jobId)
      .where('artisan_uid', '==', uid)
      .limit(1)
      .get();
      
    if (!matchSnapshot.empty) {
      const status = matchSnapshot.docs[0].data().status;
      if (['pending', 'paid', 'accepted', 'completed'].includes(status)) {
        return true;
      }
    }

    return false;
  }

  async getMessages(jobId: string, uid: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const hasAccess = await this.verifyChatAccess(jobId, uid);
      if (!hasAccess) {
        throw new Error('Forbidden: You do not have access to this chat');
      }

      const snapshot = await this.db.collection('jobs')
        .doc(jobId)
        .collection('messages')
        .orderBy('created_at', 'asc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
    } catch (error) {
      this.handleError(error, 'Get messages');
    }
  }

  async sendMessage(jobId: string, senderUid: string, content: string): Promise<ChatMessage> {
    try {
      const hasAccess = await this.verifyChatAccess(jobId, senderUid);
      if (!hasAccess) {
        throw new Error('Forbidden: You do not have access to this chat');
      }

      const messageData = {
        job_id: jobId,
        sender_uid: senderUid,
        content,
        is_read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.db.collection('jobs')
        .doc(jobId)
        .collection('messages')
        .add(messageData);

      this.logOperation('chat-message-sent', { jobId, senderUid });

      // PRD §5.1: fire message_sent analytics event
      new AnalyticsService().trackEvent('message_sent', senderUid, {
        job_id: jobId
      }).catch(() => {});

      return {
        id: docRef.id,
        ...messageData,
        created_at: new Date()
      } as ChatMessage;
    } catch (error) {
      this.handleError(error, 'Send message');
    }
  }
}
