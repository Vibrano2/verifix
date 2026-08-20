import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/zodValidation';
import { SendMessageSchema } from '../models/chat.model';
import { ChatController } from '../controllers/chat.controller';

const router = Router();
const chatController = new ChatController();

/**
 * @swagger
 * /api/chat/{matchId}/messages:
 *   get:
 *     summary: Get chat messages for a specific match
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:matchId/messages', authenticate, (req, res) => 
  chatController.getMessages(req, res)
);

/**
 * @swagger
 * /api/chat/{matchId}/messages:
 *   post:
 *     summary: Send a chat message for a specific match
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:matchId/messages', authenticate, validate(SendMessageSchema), (req, res) => 
  chatController.sendMessage(req, res)
);

export default router;
