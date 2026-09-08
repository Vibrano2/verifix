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
  async verifyChatAccess(matchId: string, uid: string): Promise<{ allowed: boolean; jobId: string }> {
    const matchDoc = await this.db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) throw new Error('Match not found');
    const match = matchDoc.data()!;
    const jobDoc = await this.db.collection('jobs').doc(match.job_id).get();
    if (!jobDoc.exists) throw new Error('Job not found');
    const job = jobDoc.data()!;

    const isParticipant = match.client_uid === uid || match.artisan_uid === uid;
    const isPaidMatch = ['paid', 'completed'].includes(match.status)
      && job.chat_unlocked === true
      && job.chat_match_id === matchId;
    return { allowed: isParticipant && isPaidMatch, jobId: match.job_id };
  }

  async getMessages(matchId: string, uid: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const access = await this.verifyChatAccess(matchId, uid);
      if (!access.allowed) {
        throw new Error('Forbidden: You do not have access to this chat');
      }

      const snapshot = await this.db.collection('jobs')
        .doc(access.jobId)
        .collection('messages')
        .orderBy('created_at', 'asc')
        .limit(Math.min(Math.max(Math.trunc(limit), 1), 100))
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
    } catch (error) {
      this.handleError(error, 'Get messages');
    }
  }

  async sendMessage(matchId: string, senderUid: string, content: string): Promise<ChatMessage> {
    try {
      const matchRef = this.db.collection('matches').doc(matchId);
      const initialMatch = await matchRef.get();
      if (!initialMatch.exists) throw new Error('Match not found');
      const jobId = initialMatch.data()!.job_id;
      const jobRef = this.db.collection('jobs').doc(jobId);
      const messageRef = jobRef.collection('messages').doc();
      const messageData = {
        job_id: jobId,
        match_id: matchId,
        sender_uid: senderUid,
        content: content.trim(),
        is_read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.db.runTransaction(async transaction => {
        const [matchDoc, jobDoc] = await Promise.all([
          transaction.get(matchRef),
          transaction.get(jobRef)
        ]);
        const match = matchDoc.data();
        const job = jobDoc.data();
        const participant = match?.client_uid === senderUid || match?.artisan_uid === senderUid;
        if (!match || !job || !participant
          || !['paid', 'completed'].includes(match.status)
          || job.chat_unlocked !== true
          || job.chat_match_id !== matchId) {
          throw new Error('Forbidden: You do not have access to this chat');
        }
        transaction.create(messageRef, messageData);
        if (match.artisan_uid === senderUid && !match.artisan_responded_at) {
          transaction.update(matchRef, {
            artisan_responded_at: admin.firestore.FieldValue.serverTimestamp(),
            no_response_timer_expiry: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      this.logOperation('chat-message-sent', { jobId, matchId, senderUid });

      // PRD §5.1: fire message_sent analytics event
      new AnalyticsService().trackEvent('message_sent', senderUid, {
        job_id: jobId
      }).catch(() => {});

      return {
        id: messageRef.id,
        ...messageData,
        created_at: new Date()
      } as ChatMessage;
    } catch (error) {
      this.handleError(error, 'Send message');
    }
  }
}
