import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { authenticate } from '../middleware/auth';
import { validateTrade, validateUrgency, validateLocation, validateRating } from '../middleware/validation';
import { AuthenticatedRequest } from '../types';
import { Urgency } from '../types';
import { JobController } from '../controllers';
import { RatingController } from '../controllers';
import { Logger } from '../utils/logger';

const router = Router();
const jobController = new JobController();
const ratingController = new RatingController();

/**
 * POST /api/jobs
 * Create a new job posting
 * Validates: trade (locked enum), urgency (locked enum), location (max length)
 */
router.post('/', authenticate, validateTrade, validateUrgency, validateLocation, (req, res) => 
  jobController.createJob(req, res)
);

/**
 * GET /api/jobs/:id
 * Get job details
 * Only accessible by job owner or matched artisans
 */
router.get('/:id', authenticate, (req, res) => 
  jobController.getJob(req, res)
);

/**
 * GET /api/jobs
 * List jobs for authenticated user (client)
 */
router.get('/', authenticate, (req, res) => 
  jobController.listJobs(req, res)
);

/**
 * PATCH /api/jobs/:id
 * Update job details (before matching)
 */
router.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { description, budget, urgency } = req.body;

    const db = admin.firestore();
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

    // Can only update open jobs
    if (jobData?.status !== 'open') {
      res.status(400).json({ error: 'Cannot update job that is not open' });
      return;
    }

    const updates: any = {
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 1000) {
        res.status(400).json({ error: 'Description must be a string with max 1000 characters' });
        return;
      }
      updates.description = description;
    }

    if (budget !== undefined) {
      if (budget !== null && (typeof budget !== 'number' || budget < 0)) {
        res.status(400).json({ error: 'Budget must be a positive number or null' });
        return;
      }
      updates.budget = budget;
    }

    if (urgency !== undefined) {
      const validUrgencies: Urgency[] = ['Today', 'This Week', 'Flexible'];
      if (!validUrgencies.includes(urgency)) {
        res.status(400).json({ error: 'Invalid urgency value' });
        return;
      }
      updates.urgency = urgency;
    }

    await jobRef.update(updates);

    res.status(200).json({
      message: 'Job updated successfully',
      updates
    });

  } catch (error: any) {
    Logger.error('Update job error:', error);
    res.status(500).json({ 
      error: 'Failed to update job'
    });
  }
});

/**
 * POST /api/jobs/:id/match
 * Find matching artisans for a job
 * Matching algorithm: filter by trade + available, sort by completed_jobs and reputation_score
 */
router.post('/:id/match', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
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

    // Only match open jobs
    if (jobData?.status !== 'open') {
      res.status(400).json({ error: 'Job is not open for matching' });
      return;
    }

    // Query artisans by trade, available, and verified
    const artisansSnapshot = await db.collection('artisan_profiles')
      .where('trade', '==', jobData.trade)
      .where('available', '==', true)
      .where('verified', '==', true)
      .get();

    if (artisansSnapshot.empty) {
      res.status(200).json({
        message: 'No available artisans found for this trade',
        matches: []
      });
      return;
    }

    // Sort artisans by completed_jobs (desc) and reputation_score (desc) as tiebreakers
    const artisans = artisansSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })).sort((a: any, b: any) => {
      // Primary: completed_jobs (descending)
      if (b.completed_jobs !== a.completed_jobs) {
        return b.completed_jobs - a.completed_jobs;
      }
      // Tiebreaker: reputation_score (descending, nulls last)
      if (a.reputation_score === null) return 1;
      if (b.reputation_score === null) return -1;
      return b.reputation_score - a.reputation_score;
    });

    // Return top 5 matches
    const topMatches = artisans.slice(0, 5);

    // CRITICAL: Use Firestore transaction to ensure atomicity
    // Create matches and update job status atomically
    const matchResults = await db.runTransaction(async (transaction) => {
      const matchesRef = db.collection('matches');
      const createdMatches: any[] = [];

      // Create match records within transaction
      for (const artisan of topMatches) {
        const matchData = {
          job_id: id,
          artisan_uid: artisan.uid,
          status: 'pending',
          rating: null,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        const matchDocRef = matchesRef.doc(); // Generate ID
        transaction.set(matchDocRef, matchData);
        
        createdMatches.push({
          match_id: matchDocRef.id,
          ...matchData,
          artisan: {
            uid: (artisan as any).uid,
            trade: (artisan as any).trade,
            location: (artisan as any).location,
            completed_jobs: (artisan as any).completed_jobs,
            reputation_score: (artisan as any).reputation_score,
            tagline: (artisan as any).tagline
          }
        });
      }

      // Update job status to matched within same transaction
      transaction.update(jobRef, {
        status: 'matched',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return createdMatches;
    });

    res.status(200).json({
      message: 'Matches created successfully',
      matches: matchResults,
      count: matchResults.length
    });

  } catch (error: any) {
    Logger.error('Job matching error:', error);
    res.status(500).json({ 
      error: 'Failed to match artisans'
    });
  }
});

/**
 * GET /api/jobs/:id/matches
 * Get matches for a specific job
 */
router.get('/:id/matches', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const db = admin.firestore();
    
    // Verify job ownership
    const jobRef = db.collection('jobs').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const jobData = jobDoc.data();
    if (jobData?.client_uid !== req.user.uid) {
      res.status(403).json({ error: 'Forbidden: You do not own this job' });
      return;
    }

    // Get matches
    const matchesSnapshot = await db.collection('matches')
      .where('job_id', '==', id)
      .orderBy('created_at', 'desc')
      .get();

    // Extract unique artisan UIDs
    const artisanUids = [...new Set(matchesSnapshot.docs.map(doc => doc.data().artisan_uid))];

    // Batch fetch all artisan profiles (fixes N+1 query problem)
    const artisanProfiles: Record<string, any> = {};
    
    if (artisanUids.length > 0) {
      // Firestore 'in' query supports up to 10 items, so batch if needed
      const batchSize = 10;
      for (let i = 0; i < artisanUids.length; i += batchSize) {
        const batch = artisanUids.slice(i, i + batchSize);
        const artisansSnapshot = await db.collection('artisan_profiles')
          .where(admin.firestore.FieldPath.documentId(), 'in', batch)
          .get();
        
        artisansSnapshot.docs.forEach(doc => {
          artisanProfiles[doc.id] = doc.data();
        });
      }
    }

    // Map matches with artisan data
    const matchesWithArtisans = matchesSnapshot.docs.map(doc => {
      const matchData = doc.data();
      const artisanData = artisanProfiles[matchData.artisan_uid];

      return {
        match_id: doc.id,
        ...matchData,
        artisan: artisanData ? {
          uid: artisanData.uid,
          trade: artisanData.trade,
          location: artisanData.location,
          completed_jobs: artisanData.completed_jobs,
          reputation_score: artisanData.reputation_score,
          tagline: artisanData.tagline
        } : null
      };
    });

    res.status(200).json({
      matches: matchesWithArtisans,
      count: matchesWithArtisans.length
    });

  } catch (error: any) {
    Logger.error('Get matches error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch matches'
    });
  }
});

/**
 * POST /api/jobs/:id/rating
 * Submit rating for completed job
 * CRITICAL REQUIREMENTS:
 * - Only authenticated client who owns the job can rate
 * - Rating must be 1-5
 * - Check for duplicate rating (return 409 if already exists)
 * - Recalculate artisan reputation_score as average of all ratings
 */
router.post('/:id/rating', authenticate, validateRating, (req, res) => 
  ratingController.submitRating(req, res)
);

/**
 * POST /api/jobs/:id/complete
 * Mark job as complete and release escrow
 * CRITICAL REQUIREMENTS:
 * - Only the client who owns the job can mark it complete
 * - Commission calculated from locked_job_value (never from current job value)
 * - Idempotent - calling twice doesn't double-release
 * - Handles edge cases: zero job value, fractional kobo
 */
router.post('/:id/complete', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
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

    // CRITICAL: Verify the authenticated user is the client who owns the job
    // Not the artisan, not any other authenticated user
    if (jobData?.client_uid !== req.user.uid) {
      res.status(403).json({ 
        error: 'Forbidden: Only the client who posted this job can mark it complete' 
      });
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

    // Get transaction for this match
    const transactionsSnapshot = await db.collection('transactions')
      .where('match_id', '==', match_id)
      .where('status', '==', 'held')
      .limit(1)
      .get();

    if (transactionsSnapshot.empty) {
      res.status(404).json({ 
        error: 'No held transaction found for this match. Payment may not have been completed.' 
      });
      return;
    }

    const transactionDoc = transactionsSnapshot.docs[0];
    const transactionData = transactionDoc.data();

    // IDEMPOTENCY CHECK: If transaction already released, return success without re-processing
    if (transactionData?.status === 'released') {
      res.status(200).json({
        message: 'Job already marked complete (idempotent)',
        already_completed: true,
        transaction: {
          transaction_id: transactionDoc.id,
          status: 'released',
          commission_retained: transactionData.commission_retained,
          released_at: transactionData.released_at
        }
      });
      return;
    }

    // Calculate commission from locked_job_value (immutable, set at payment initialization)
    const lockedJobValue = transactionData?.locked_job_value || 0;
    
    // Handle edge case: zero job value
    if (lockedJobValue === 0) {
      Logger.warn(`Job ${id} has zero locked_job_value, no commission to retain`);
    }

    // Calculate 10% commission, rounding to handle fractional kobo
    const commissionRetained = Math.round(lockedJobValue * 0.10);

    // CRITICAL: Use Firestore transaction to ensure atomicity
    // All 4 updates succeed or all fail - prevents partial completion
    await db.runTransaction(async (transaction) => {
      // 1. Update transaction: status → released, set commission and released_at
      transaction.update(transactionDoc.ref, {
        status: 'released',
        commission_retained: commissionRetained,
        released_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2. Update job status to complete
      transaction.update(jobRef, {
        status: 'complete',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Update match status to completed
      transaction.update(matchRef, {
        status: 'completed',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. Increment artisan's completed_jobs count
      const artisanRef = db.collection('artisan_profiles').doc(matchData!.artisan_uid);
      transaction.update(artisanRef, {
        completed_jobs: admin.firestore.FieldValue.increment(1),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.status(200).json({
      message: 'Job marked complete and escrow released successfully',
      transaction: {
        transaction_id: transactionDoc.id,
        status: 'released',
        locked_job_value: lockedJobValue,
        commission_retained: commissionRetained,
        artisan_receives: lockedJobValue - commissionRetained,
        released_at: new Date()
      }
    });

  } catch (error: any) {
    Logger.error('Job completion error:', error);
    res.status(500).json({ 
      error: 'Failed to mark job complete'
    });
  }
});

export default router;
