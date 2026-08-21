import { Response } from 'express';
import * as admin from 'firebase-admin';
import { BaseController } from './base.controller';
import { ChatService } from '../services/chat.service';
import { AuthenticatedRequest } from '../types';

export class ChatController extends BaseController {
  private chatService: ChatService;

  constructor() {
    super();
    this.chatService = new ChatService();
  }

  async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { matchId } = req.params;
      if (!matchId) return this.sendBadRequest(res, 'Match ID is required');

      const matchDoc = await admin.firestore().collection('matches').doc(matchId).get();
      if (!matchDoc.exists) return this.sendNotFound(res, 'Match not found');
      
      const jobId = matchDoc.data()?.job_id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const messages = await this.chatService.getMessages(jobId, req.user.uid, limit);
      this.sendSuccess(res, 'Messages fetched successfully', { messages });
    } catch (error: any) {
      if (error.message.includes('Forbidden')) {
        this.sendForbidden(res, error.message);
      } else {
        this.handleError(error, res, 'Get messages');
      }
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { matchId } = req.params;
      if (!matchId) return this.sendBadRequest(res, 'Match ID is required');

      const matchDoc = await admin.firestore().collection('matches').doc(matchId).get();
      if (!matchDoc.exists) return this.sendNotFound(res, 'Match not found');
      
      const jobId = matchDoc.data()?.job_id;
      const { content } = req.body;

      const message = await this.chatService.sendMessage(jobId, req.user.uid, content);
      this.sendCreated(res, 'Message sent successfully', { message });
    } catch (error: any) {
      if (error.message.includes('Forbidden')) {
        this.sendForbidden(res, error.message);
      } else {
        this.handleError(error, res, 'Send message');
      }
    }
  }
}
