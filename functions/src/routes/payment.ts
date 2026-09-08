import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/zodValidation';
import { AuthenticatedRequest } from '../types';
import { initializePayment, listNigerianBanks, resolveBankAccount } from '../utils/paystack';
import { PaymentController } from '../controllers';
import { Logger } from '../utils/logger';

const router = Router();
const paymentController = new PaymentController();
const initializeSchema = z.object({
  body: z.object({
    match_id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/)
  }).strict()
});
const resolveAccountSchema = z.object({
  body: z.object({
    account_number: z.string().regex(/^\d{10}$/),
    bank_code: z.string().regex(/^\d{3,6}$/)
  }).strict()
});
const verifySchema = z.object({
  body: z.object({ reference: z.string().regex(/^[a-z0-9_-]{8,64}$/i) }).strict()
});
const verifyParamSchema = z.object({
  params: z.object({ reference: z.string().regex(/^[a-z0-9_-]{8,64}$/i) }).strict()
});

router.get('/banks', authenticate, requireRole('artisan'), async (_req, res) => {
  try {
    const banks = await listNigerianBanks();
    res.json({ success: true, data: { banks } });
  } catch {
    res.status(502).json({ error: 'Unable to load supported banks' });
  }
});

router.post('/resolve-account', authenticate, requireRole('artisan'), validate(resolveAccountSchema), async (req, res) => {
  try {
    const account = await resolveBankAccount(req.body.account_number, req.body.bank_code);
    res.json({ success: true, data: account });
  } catch {
    res.status(400).json({ error: 'Unable to verify bank account' });
  }
});

/**
 * @swagger
 * /api/payments/initialise:
 *   post:
 *     summary: Initialize Paystack payment for match fee
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - match_id
 *             properties:
 *               match_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 */
router.post(
  ['/initialise', '/initialize'],
  authenticate,
  requireRole('client'),
  validate(initializeSchema),
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { match_id } = req.body;

    const db = admin.firestore();

    // Get match details
    const matchRef = db.collection('matches').doc(match_id);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const matchData = matchDoc.data()!;

    // Get job details
    const jobRef = db.collection('jobs').doc(matchData.job_id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const jobData = jobDoc.data()!;

    // Verify the authenticated user is the client who owns the job
    if (jobData.client_uid !== req.user.uid) {
      res.status(403).json({ error: 'Forbidden: You do not own this job' });
      return;
    }

    // Get user email for Paystack
    if (matchData.status !== 'accepted'
      || jobData.assigned_artisan_uid !== matchData.artisan_uid
      || jobData.matched_artisan_uid !== matchData.artisan_uid) {
      res.status(409).json({ error: 'The selected match is not ready for payment' });
      return;
    }

    const lockedJobValue = Number(jobData.budget ?? jobData.job_value);
    if (!Number.isFinite(lockedJobValue) || lockedJobValue <= 0 || lockedJobValue > 100_000_000) {
      res.status(409).json({ error: 'The job must have a valid server-stored budget before payment' });
      return;
    }

    // Backend-authoritative amount calculation: JOB VALUE + ₦500 Artiva Fee
    const platformFee = 500;
    const totalAmount = lockedJobValue + platformFee;
    
    // Amount in kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(totalAmount * 100);

    // Generate unique reference
    const reference = `vf-${Date.now().toString(36)}-${randomBytes(8).toString('hex')}`;

    // Calculate commission (10%)
    const commissionRetained = Math.round(lockedJobValue * 10) / 100;

    const transactionRef = db.collection('transactions').doc(`escrow-${match_id}`);
    const transactionData = {
      job_id: matchData.job_id,
      client_uid: req.user.uid,
      match_id,
      artisan_uid: matchData.artisan_uid,
      type: 'escrow',
      amounts: {
        job_value: lockedJobValue,
        platform_match_fee: platformFee,
        total_charged: totalAmount,
        artisan_net_labor: lockedJobValue - commissionRetained
      },
      expected_amount_kobo: amountInKobo,
      currency: 'NGN',
      escrow_status: 'PENDING',
      paystack_reference: reference,
      amount: totalAmount,
      status: 'pending',
      locked_job_value: lockedJobValue,
      commission_retained: commissionRetained,
      released_at: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const existingIntent: { value?: { authorization_url: string; access_code: string; reference: string } } = {};
    await db.runTransaction(async transaction => {
      const [freshMatch, freshJob, existingPayment] = await Promise.all([
        transaction.get(matchRef),
        transaction.get(jobRef),
        transaction.get(transactionRef)
      ]);
      const currentMatch = freshMatch.data();
      const currentJob = freshJob.data();
      if (!currentMatch || !currentJob
        || currentJob.client_uid !== req.user!.uid
        || currentMatch.job_id !== jobRef.id
        || currentMatch.artisan_uid !== currentJob.assigned_artisan_uid
        || currentMatch.artisan_uid !== currentJob.matched_artisan_uid
        || currentJob.status !== 'matched'
        || Number(currentJob.budget ?? currentJob.job_value) !== lockedJobValue
        || currentMatch.status !== 'accepted') {
        throw new Error('Payment resources changed; retry from the job screen');
      }
      if (existingPayment.exists) {
        const existing = existingPayment.data()!;
        if (existing.escrow_status === 'PENDING'
          && existing.expected_amount_kobo === amountInKobo
          && typeof existing.authorization_url === 'string'
          && typeof existing.access_code === 'string') {
          existingIntent.value = {
            authorization_url: existing.authorization_url,
            access_code: existing.access_code,
            reference: existing.paystack_reference
          };
          return;
        }
        if (existing.escrow_status !== 'FAILED') {
          throw new Error('A payment is already in progress for this match');
        }
      }

      transaction.set(transactionRef, transactionData);
      transaction.update(jobRef, {
        locked_job_value: lockedJobValue,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    if (existingIntent.value) {
      res.status(200).json({
        message: 'Payment already initialized',
        transaction_id: transactionRef.id,
        ...existingIntent.value
      });
      return;
    }

    const uidFragment = req.user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
    const email = req.user.email || `payments+${uidFragment}@verifix.app`;

    let paymentResponse: any;
    try {
      paymentResponse = await initializePayment({
        email,
        amount: amountInKobo,
        reference,
        metadata: {
          match_id,
          job_id: matchData.job_id,
          client_uid: req.user.uid,
          artisan_uid: matchData.artisan_uid,
          locked_job_value: lockedJobValue
        }
      });
    } catch (error) {
      await db.runTransaction(async transaction => {
        const current = await transaction.get(transactionRef);
        if (current.data()?.paystack_reference === reference
          && current.data()?.escrow_status === 'PENDING') {
          transaction.update(transactionRef, {
            escrow_status: 'PAYMENT_RECONCILIATION_REQUIRED',
            status: 'reconciliation_required',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });
      throw error;
    }

    if (!paymentResponse.status
      || typeof paymentResponse.data?.authorization_url !== 'string'
      || !paymentResponse.data.authorization_url.startsWith('https://')
      || typeof paymentResponse.data?.access_code !== 'string') {
      await db.runTransaction(async transaction => {
        const current = await transaction.get(transactionRef);
        if (current.data()?.paystack_reference === reference
          && current.data()?.escrow_status === 'PENDING') {
          transaction.update(transactionRef, {
            escrow_status: 'FAILED',
            status: 'failed',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });
      throw new Error('Paystack rejected payment initialization');
    }

    await transactionRef.update({
      authorization_url: paymentResponse.data.authorization_url.slice(0, 2048),
      access_code: paymentResponse.data.access_code.slice(0, 256),
      initialized_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      message: 'Payment initialized successfully',
      transaction_id: transactionRef.id,
      authorization_url: paymentResponse.data.authorization_url,
      access_code: paymentResponse.data.access_code,
      reference
    });

  } catch (error: any) {
    Logger.error('Payment initialization error:', error);
    const conflict = error?.message?.includes('already') || error?.message?.includes('changed');
    res.status(conflict ? 409 : 500).json({
      error: conflict ? error.message : 'Failed to initialize payment'
    });
  }
});

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Paystack webhook handler
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook', (req, res) => 
  paymentController.handleWebhook(req, res)
);

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify Paystack payment with body reference
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/verify', authenticate, requireRole('client'), validate(verifySchema), (req, res) =>
  paymentController.verifyPayment(req as any, res)
);

/**
 * @swagger
 * /api/payments/verify/{reference}:
 *   get:
 *     summary: Verify Paystack payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/verify/:reference', authenticate, requireRole('client'), validate(verifyParamSchema), (req, res) =>
  paymentController.verifyPayment(req as any, res)
);

export default router;
