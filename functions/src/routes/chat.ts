import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/zodValidation';
import { SendMessageSchema } from '../models/chat.model';
import { ChatController } from '../controllers/chat.controller';

const router = Router();
const chatController = new ChatController();

/**
 * @swagger
 * /api/chat/job/{jobId}:
 *   get:
 *     summary: Get chat messages for a specific job
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of messages
 *       403:
 *         description: Forbidden (Not job owner or assigned artisan)
 */
router.get('/job/:jobId', authenticate, (req, res) => 
  chatController.getMessages(req, res)
);

/**
 * @swagger
 * /api/chat/job/{jobId}:
 *   post:
 *     summary: Send a chat message for a specific job
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 *       403:
 *         description: Forbidden
 */
router.post('/job/:jobId', authenticate, validate(SendMessageSchema), (req, res) => 
  chatController.sendMessage(req, res)
);

export default router;
