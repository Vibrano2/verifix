import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * GET /api/admin/verification-queue
 * List all unverified artisans
 * CRITICAL: Only accessible by admin (UID checked against process.env.ADMIN_UID)
 */
router.get('/verification-queue', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = admin.firestore();

    // Query artisans with verified = false
    const unverifiedSnapshot = await db.collection('artisan_profiles')
      .where('verified', '==', false)
      .orderBy('updated_at', 'desc')
      .get();

    // Fetch user details for each artisan
    const artisansWithDetails = await Promise.all(
      unverifiedSnapshot.docs.map(async (doc) => {
        const artisanData = doc.data();
        
        // Get user details
        const userDoc = await db.collection('users').doc(artisanData.uid).get();
        const userData = userDoc.data();

        return {
          uid: doc.id,
          first_name: userData?.first_name,
          last_name: userData?.last_name,
          phone: userData?.phone,
          trade: artisanData.trade,
          category: artisanData.category,
          location: artisanData.location,
          tagline: artisanData.tagline,
          id_document_url: artisanData.id_document_url,
          work_photos: artisanData.work_photos,
          verified: artisanData.verified,
          created_at: userData?.created_at,
          updated_at: artisanData.updated_at
        };
      })
    );

    res.status(200).json({
      message: 'Verification queue fetched successfully',
      artisans: artisansWithDetails,
      count: artisansWithDetails.length
    });

  } catch (error: any) {
    console.error('Verification queue error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch verification queue',
      details: error.message 
    });
  }
});

/**
 * POST /api/admin/verify/:uid
 * Verify an artisan (set verified = true)
 * CRITICAL: Only accessible by admin (UID checked against process.env.ADMIN_UID)
 * Admin UID is read from environment variable, never hardcoded
 */
router.post('/verify/:uid', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      res.status(400).json({ error: 'Artisan UID is required' });
      return;
    }

    const db = admin.firestore();
    const artisanRef = db.collection('artisan_profiles').doc(uid);
    const artisanDoc = await artisanRef.get();

    if (!artisanDoc.exists) {
      res.status(404).json({ error: 'Artisan profile not found' });
      return;
    }

    const artisanData = artisanDoc.data();

    // Check if already verified
    if (artisanData?.verified === true) {
      res.status(200).json({
        message: 'Artisan already verified',
        already_verified: true,
        artisan: {
          uid: artisanData.uid,
          trade: artisanData.trade,
          verified: true
        }
      });
      return;
    }

    // Set verified to true
    await artisanRef.update({
      verified: true,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      message: 'Artisan verified successfully',
      artisan: {
        uid,
        trade: artisanData?.trade,
        verified: true
      }
    });

  } catch (error: any) {
    console.error('Verify artisan error:', error);
    res.status(500).json({ 
      error: 'Failed to verify artisan',
      details: error.message 
    });
  }
});

/**
 * POST /api/admin/reject/:uid
 * Reject an artisan verification
 * CRITICAL: Only accessible by admin
 */
router.post('/reject/:uid', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const { reason } = req.body;

    if (!uid) {
      res.status(400).json({ error: 'Artisan UID is required' });
      return;
    }

    const db = admin.firestore();
    const artisanRef = db.collection('artisan_profiles').doc(uid);
    const artisanDoc = await artisanRef.get();

    if (!artisanDoc.exists) {
      res.status(404).json({ error: 'Artisan profile not found' });
      return;
    }

    // Optional: Store rejection reason in a separate collection or field
    // For now, just keep verified = false
    await artisanRef.update({
      verified: false,
      rejection_reason: reason || 'Not specified',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      message: 'Artisan verification rejected',
      reason: reason || 'Not specified'
    });

  } catch (error: any) {
    console.error('Reject artisan error:', error);
    res.status(500).json({ 
      error: 'Failed to reject artisan',
      details: error.message 
    });
  }
});

/**
 * GET /api/admin/stats
 * Get platform statistics
 * CRITICAL: Only accessible by admin
 */
router.get('/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = admin.firestore();

    // Count users by role
    const usersSnapshot = await db.collection('users').get();
    let clientCount = 0;
    let artisanCount = 0;

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'client') clientCount++;
      if (data.role === 'artisan') artisanCount++;
    });

    // Count verified artisans
    const verifiedArtisansSnapshot = await db.collection('artisan_profiles')
      .where('verified', '==', true)
      .get();

    // Count jobs by status
    const jobsSnapshot = await db.collection('jobs').get();
    let openJobs = 0;
    let matchedJobs = 0;
    let completedJobs = 0;

    jobsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'open') openJobs++;
      if (data.status === 'matched') matchedJobs++;
      if (data.status === 'complete') completedJobs++;
    });

    // Calculate total transactions
    const transactionsSnapshot = await db.collection('transactions').get();
    let totalRevenue = 0;
    let totalCommission = 0;

    transactionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'released') {
        totalRevenue += data.amount || 0;
        totalCommission += data.commission_retained || 0;
      }
    });

    res.status(200).json({
      users: {
        total: usersSnapshot.size,
        clients: clientCount,
        artisans: artisanCount
      },
      artisans: {
        verified: verifiedArtisansSnapshot.size,
        unverified: artisanCount - verifiedArtisansSnapshot.size
      },
      jobs: {
        total: jobsSnapshot.size,
        open: openJobs,
        matched: matchedJobs,
        completed: completedJobs
      },
      transactions: {
        total: transactionsSnapshot.size,
        total_revenue: totalRevenue,
        total_commission: totalCommission
      }
    });

  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch admin statistics',
      details: error.message 
    });
  }
});

export default router;
