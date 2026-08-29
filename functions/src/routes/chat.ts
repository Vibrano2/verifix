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

// Frontend alias: /api/chat/job/:jobId — resolves jobId to the active matchId then proxies
router.get('/job/:jobId', authenticate, async (req: any, res) => {
  try {
    const db = require('firebase-admin').firestore();
    const snap = await db.collection('matches')
      .where('job_id', '==', req.params.jobId)
      .where('status', 'in', ['pending', 'paid', 'accepted', 'completed'])
      .limit(1).get();
    if (snap.empty) { res.status(404).json({ error: 'No active match for this job' }); return; }
    req.params.matchId = snap.docs[0].id;
    return chatController.getMessages(req, res);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/job/:jobId', authenticate, async (req: any, res) => {
  try {
    const db = require('firebase-admin').firestore();
    const snap = await db.collection('matches')
      .where('job_id', '==', req.params.jobId)
      .where('status', 'in', ['pending', 'paid', 'accepted', 'completed'])
      .limit(1).get();
    if (snap.empty) { res.status(404).json({ error: 'No active match for this job' }); return; }
    req.params.matchId = snap.docs[0].id;
    return chatController.sendMessage(req, res);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
