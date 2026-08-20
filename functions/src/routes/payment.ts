import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { initializePayment } from '../utils/paystack';
import { PaymentController } from '../controllers';
import { Logger } from '../utils/logger';

const router = Router();
const paymentController = new PaymentController();

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
router.post(['/initialise', '/initialize'], authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { match_id, job_value } = req.body;

    if (!match_id) {
      res.status(400).json({ error: 'Match ID is required' });
      return;
    }
    
    if (typeof job_value !== 'number' || job_value <= 0) {
      res.status(400).json({ error: 'Valid job_value is required' });
      return;
    }

    const db = admin.firestore();

    // Get match details
    const matchRef = db.collection('matches').doc(match_id);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const matchData = matchDoc.data();

    // Get job details
    const jobRef = db.collection('jobs').doc(matchData!.job_id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const jobData = jobDoc.data();

    // Verify the authenticated user is the client who owns the job
    if (jobData?.client_uid !== req.user.uid) {
      res.status(403).json({ error: 'Forbidden: You do not own this job' });
      return;
    }

    // Get user email for Paystack
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    // Use phone as email if no email (Paystack requires email)
    const email = userData?.email || `${userData?.phone.replace('+', '')}@verifix.app`;

    // Lock the job value at payment initialization
    // This value is immutable and used for commission calculation
    const lockedJobValue = job_value;

    // Backend-authoritative amount calculation: JOB VALUE + ₦500 Artiva Fee
    const platformFee = 500;
    const totalAmount = lockedJobValue + platformFee;
    
    // Amount in kobo (Paystack uses smallest currency unit)
    const amountInKobo = totalAmount * 100;

    // Generate unique reference
    const reference = `VF-${match_id}-${Date.now()}`;

    // Calculate commission (10%)
    const commissionRetained = Math.round(lockedJobValue * 0.10);

    // Initialize Paystack payment
    const paymentResponse = await initializePayment({
      email,
      amount: amountInKobo,
      reference,
      metadata: {
        match_id,
        job_id: jobData!.job_id || matchData!.job_id,
        client_uid: req.user.uid,
        artisan_uid: matchData!.artisan_uid,
        locked_job_value: lockedJobValue
      }
    });

    if (!paymentResponse.status) {
      res.status(500).json({ error: 'Failed to initialize payment with Paystack' });
      return;
    }

    // Create transaction record with v1.9 schema
    const transactionData = {
      match_id,
      artisan_uid: matchData!.artisan_uid,
      type: 'escrow',
      amounts: {
        job_value: lockedJobValue,
        platform_match_fee: platformFee,
        total_charged: totalAmount,
        artisan_net_labor: lockedJobValue - commissionRetained
      },
      escrow_status: 'PENDING', // Will be updated to 'HELD' by webhook
      paystack_reference: reference,
      
      // Legacy fields for backward compatibility
      amount: totalAmount,
      status: 'pending',
      locked_job_value: lockedJobValue,
      commission_retained: commissionRetained,
      
      released_at: null,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const transactionRef = await db.collection('transactions').add(transactionData);

    res.status(200).json({
      message: 'Payment initialized successfully',
      transaction_id: transactionRef.id,
      authorization_url: paymentResponse.data.authorization_url,
      access_code: paymentResponse.data.access_code,
      reference
    });

  } catch (error: any) {
    Logger.error('Payment initialization error:', error);
    res.status(500).json({ 
      error: 'Failed to initialize payment'
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
 * /api/payments/refund:
 *   post:
 *     summary: Initiates refund on no-response trigger (Internal)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/refund', authenticate, async (req, res) => {
  // PRD §9.4: Platform only (internal). Initiates refund on no-response trigger
  res.status(501).json({ error: 'Not implemented - handled by scheduler' });
});

export default router;
