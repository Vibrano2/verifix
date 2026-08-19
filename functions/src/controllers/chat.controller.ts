import { Response } from 'express';
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

      const { jobId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const messages = await this.chatService.getMessages(jobId, req.user.uid, limit);
      this.sendSuccess(res, 'Messages fetched successfully', { messages });
    } catch (error: any) {
      if (error.message.includes('Forbidden')) {
        this.sendError(res, error.message, 403);
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

      const { jobId } = req.params;
      const { content } = req.body;

      const message = await this.chatService.sendMessage(jobId, req.user.uid, content);
      this.sendSuccess(res, 'Message sent successfully', { message }, 201);
    } catch (error: any) {
      if (error.message.includes('Forbidden')) {
        this.sendError(res, error.message, 403);
      } else {
        this.handleError(error, res, 'Send message');
      }
    }
  }
}
