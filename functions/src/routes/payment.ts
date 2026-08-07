import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { initializePayment } from '../utils/paystack';
import { PaymentController } from '../controllers';

const router = Router();
const paymentController = new PaymentController();

/**
 * POST /api/payments/initialise
 * Initialize Paystack payment for match fee
 * Updated to British spelling per PRD specification
 * Captures locked_job_value at this moment (immutable for commission calculation)
 */
router.post('/initialise', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { match_id } = req.body;

    if (!match_id) {
      res.status(400).json({ error: 'Match ID is required' });
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

    // Amount in kobo (Paystack uses smallest currency unit)
    const amountInKobo = jobData!.match_fee * 100;

    // Generate unique reference
    const reference = `VF-${match_id}-${Date.now()}`;

    // Lock the job value at payment initialization
    // This value is immutable and used for commission calculation
    const lockedJobValue = jobData!.budget || 0;

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

    // Create transaction record with locked_job_value
    const transactionData = {
      match_id,
      artisan_uid: matchData!.artisan_uid,
      amount: jobData!.match_fee,
      status: 'pending', // Will be updated to 'held' by webhook
      paystack_reference: reference,
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
    console.error('Payment initialization error:', error);
    res.status(500).json({ 
      error: 'Failed to initialize payment',
      details: error.message 
    });
  }
});

/**
 * POST /api/payments/webhook
 * Paystack webhook handler
 * CRITICAL: Verifies webhook signature before processing
 */
router.post('/webhook', (req, res) => 
  paymentController.handleWebhook(req, res)
);

/**
 * POST /api/jobs/:id/reveal-contact
 * Reveal artisan contact details after payment
 * CRITICAL: Payment gate - checks for 'held' transaction before revealing
 */
router.post('/:id/reveal-contact', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params; // job_id
    const { match_id } = req.body;

    if (!match_id) {
      res.status(400).json({ error: 'Match ID is required' });
      return;
    }

    const db = admin.firestore();

    // Get job details
    const jobRef = db.collection('jobs').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const jobData = jobDoc.data();

    // Verify ownership
    if (jobData?.client_uid !== req.user.uid) {
      res.status(403).json({ error: 'Forbidden: You do not own this job' });
      return;
    }

    // Get match details
    const matchRef = db.collection('matches').doc(match_id);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const matchData = matchDoc.data();

    // Verify match belongs to this job
    if (matchData?.job_id !== id) {
      res.status(400).json({ error: 'Match does not belong to this job' });
      return;
    }

    // CRITICAL PAYMENT GATE: Check for held transaction
    const transactionsSnapshot = await db.collection('transactions')
      .where('match_id', '==', match_id)
      .where('status', '==', 'held')
      .limit(1)
      .get();

    if (transactionsSnapshot.empty) {
      res.status(402).json({ 
        error: 'Payment required: No valid payment found for this match' 
      });
      return;
    }

    // Get artisan contact details
    const artisanUid = matchData!.artisan_uid;
    const artisanRef = db.collection('artisan_profiles').doc(artisanUid);
    const artisanDoc = await artisanRef.get();

    if (!artisanDoc.exists) {
      res.status(404).json({ error: 'Artisan not found' });
      return;
    }

    // Get artisan user details for phone
    const artisanUserRef = db.collection('users').doc(artisanUid);
    const artisanUserDoc = await artisanUserRef.get();
    const artisanUserData = artisanUserDoc.data();

    const artisanData = artisanDoc.data();

    res.status(200).json({
      message: 'Contact details revealed',
      artisan: {
        uid: artisanUid,
        first_name: artisanUserData?.first_name,
        last_name: artisanUserData?.last_name,
        phone: artisanUserData?.phone,
        whatsapp: artisanUserData?.phone, // Assuming phone is WhatsApp
        trade: artisanData?.trade,
        location: artisanData?.location,
        tagline: artisanData?.tagline,
        completed_jobs: artisanData?.completed_jobs,
        reputation_score: artisanData?.reputation_score
      }
    });

  } catch (error: any) {
    console.error('Reveal contact error:', error);
    res.status(500).json({ 
      error: 'Failed to reveal contact details',
      details: error.message 
    });
  }
});

/**
 * GET /api/payments/verify/:reference
 * Verify a payment transaction (helper endpoint)
 */
router.get('/verify/:reference', authenticate, (req, res) => 
  paymentController.verifyPayment(req, res)
);

export default router;
