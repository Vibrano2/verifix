import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/zodValidation';
import { SendMessageSchema } from '../models/chat.model';
import { ChatController } from '../controllers/chat.controller';
import { z } from 'zod';

const router = Router();
const chatController = new ChatController();
const matchParamsSchema = z.object({
  params: z.object({ matchId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).strict(),
  query: z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }).strict().optional()
});
const jobParamsSchema = z.object({
  params: z.object({ jobId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).strict()
});

/**
 * @swagger
 * /api/chat/{matchId}/messages:
 *   get:
 *     summary: Get chat messages for a specific match
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:matchId/messages', authenticate, validate(matchParamsSchema), (req, res) =>
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
router.post('/:matchId/messages', authenticate, validate(matchParamsSchema), validate(SendMessageSchema), (req, res) =>
  chatController.sendMessage(req, res)
);

// Frontend alias: resolve only the single paid match selected for the job.
router.get('/job/:jobId', authenticate, validate(jobParamsSchema), async (req: any, res) => {
  try {
    const db = require('firebase-admin').firestore();
    const job = await db.collection('jobs').doc(req.params.jobId).get();
    const matchId = job.data()?.chat_match_id;
    if (!job.exists || !matchId) { res.status(404).json({ error: 'No paid chat for this job' }); return; }
    req.params.matchId = matchId;
    return chatController.getMessages(req, res);
  } catch { res.status(500).json({ error: 'Failed to load chat' }); }
});

router.post('/job/:jobId', authenticate, validate(jobParamsSchema), validate(SendMessageSchema), async (req: any, res) => {
  try {
    const db = require('firebase-admin').firestore();
    const job = await db.collection('jobs').doc(req.params.jobId).get();
    const matchId = job.data()?.chat_match_id;
    if (!job.exists || !matchId) { res.status(404).json({ error: 'No paid chat for this job' }); return; }
    req.params.matchId = matchId;
    return chatController.sendMessage(req, res);
  } catch { res.status(500).json({ error: 'Failed to send message' }); }
});

export default router;
