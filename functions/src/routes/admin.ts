import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { ArtisanRepository, UserRepository } from '../repositories';
import { ResponseUtil } from '../utils/response';
import { Logger } from '../utils/logger';
import { COLLECTIONS } from '../constants';

const router = Router();
const artisanRepo = new ArtisanRepository();
const userRepo = new UserRepository();

/**
 * GET /api/admin/verification-queue
 * List all unverified artisans
 * CRITICAL: Only accessible by admin (UID checked against process.env.ADMIN_UID)
 */
router.get('/verification-queue', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get all artisans pending verification using repository
    const unverifiedArtisans = await artisanRepo.findPendingVerification();

    // Fetch user details for each artisan
    const artisansWithDetails = await Promise.all(
      unverifiedArtisans.map(async (artisan) => {
        const user = await userRepo.findById(artisan.uid);
        
        return {
          uid: artisan.uid,
          first_name: user?.first_name,
          last_name: user?.last_name,
          phone: user?.phone,
          trade: artisan.trade,
          location: artisan.location,
          tagline: artisan.tagline,
          id_document_url: artisan.id_document_url,
          work_photos: artisan.work_photos,
          verification_status: artisan.verification_status,
          created_at: artisan.created_at
        };
      })
    );

    Logger.info('Verification queue fetched', { count: artisansWithDetails.length });

    return ResponseUtil.success(res, 'Verification queue fetched successfully', {
      artisans: artisansWithDetails,
      count: artisansWithDetails.length
    });

  } catch (error: any) {
    Logger.error('Verification queue error', error);
    return ResponseUtil.serverError(res, 'Failed to fetch verification queue');
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
      return ResponseUtil.badRequest(res, 'Artisan UID is required');
    }

    // Check if artisan exists
    const artisan = await artisanRepo.findById(uid);
    if (!artisan) {
      return ResponseUtil.notFound(res, 'Artisan profile not found');
    }

    // Check if already verified
    if (artisan.is_verified) {
      Logger.info('Artisan already verified', { uid });
      return ResponseUtil.success(res, 'Artisan already verified', {
        already_verified: true,
        artisan: {
          uid: artisan.uid,
          trade: artisan.trade,
          is_verified: true
        }
      });
    }

    // Verify using repository
    const verifiedArtisan = await artisanRepo.verify(uid);

    Logger.info('Artisan verified successfully', { uid, trade: verifiedArtisan?.trade });

    return ResponseUtil.success(res, 'Artisan verified successfully', {
      artisan: {
        uid,
        trade: verifiedArtisan?.trade,
        is_verified: true
      }
    });

  } catch (error: any) {
    Logger.error('Verify artisan error', error);
    return ResponseUtil.serverError(res, 'Failed to verify artisan');
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
      return ResponseUtil.badRequest(res, 'Artisan UID is required');
    }

    // Check if artisan exists
    const artisan = await artisanRepo.findById(uid);
    if (!artisan) {
      return ResponseUtil.notFound(res, 'Artisan profile not found');
    }

    // Reject using repository
    await artisanRepo.reject(uid, reason);

    Logger.info('Artisan verification rejected', { uid, reason: reason || 'Not specified' });

    return ResponseUtil.success(res, 'Artisan verification rejected', {
      reason: reason || 'Not specified'
    });

  } catch (error: any) {
    Logger.error('Reject artisan error', error);
    return ResponseUtil.serverError(res, 'Failed to reject artisan');
  }
});

/**
 * GET /api/admin/stats
 * Get platform statistics
 * CRITICAL: Only accessible by admin
 */
router.get('/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Use repositories for cleaner queries
    const allUsers = await userRepo.findAll();
    const allArtisans = await artisanRepo.findAll();
    
    // Count users by role
    const clientCount = allUsers.filter(u => u.role === 'client').length;
    const artisanCount = allUsers.filter(u => u.role === 'artisan').length;

    // Count verified artisans
    const verifiedCount = allArtisans.filter(a => a.is_verified).length;

    // Count jobs by status (still need direct Firestore for this)
    const db = admin.firestore();
    const jobsSnapshot = await db.collection('jobs').get();
    let openJobs = 0;
    let matchedJobs = 0;
    let completedJobs = 0;

    jobsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'open') openJobs++;
      if (data.status === 'matched' || data.status === 'in_progress') matchedJobs++;
      if (data.status === 'completed') completedJobs++;
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

    const stats = {
      users: {
        total: allUsers.length,
        clients: clientCount,
        artisans: artisanCount
      },
      artisans: {
        total: allArtisans.length,
        verified: verifiedCount,
        unverified: allArtisans.length - verifiedCount
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
    };

    Logger.info('Admin stats fetched', { userCount: allUsers.length, jobCount: jobsSnapshot.size });

    return ResponseUtil.success(res, 'Statistics fetched successfully', stats);

  } catch (error: any) {
    Logger.error('Admin stats error', error);
    return ResponseUtil.serverError(res, 'Failed to fetch admin statistics');
  }
});

/**
 * GET /api/admin/analytics
 * Get comprehensive analytics data (PRD requirement)
 * Returns: { users, jobs, matches, revenue }
 * CRITICAL: Only accessible by admin
 */
router.get('/analytics', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = admin.firestore();

    // Get users analytics
    const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
    let clientCount = 0;
    let artisanCount = 0;
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'client') clientCount++;
      if (data.role === 'artisan') artisanCount++;
    });

    // Get artisans with verification status
    const artisansSnapshot = await db.collection(COLLECTIONS.ARTISANS).get();
    let verifiedArtisans = 0;
    
    artisansSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.is_verified) verifiedArtisans++;
    });

    // Get jobs analytics
    const jobsSnapshot = await db.collection(COLLECTIONS.JOBS).get();
    let openJobs = 0;
    let matchedJobs = 0;
    let completedJobs = 0;
    let cancelledJobs = 0;

    jobsSnapshot.forEach(doc => {
      const data = doc.data();
      switch (data.status) {
        case 'open':
          openJobs++;
          break;
        case 'matched':
        case 'in_progress':
          matchedJobs++;
          break;
        case 'completed':
          completedJobs++;
          break;
        case 'cancelled':
          cancelledJobs++;
          break;
      }
    });

    // Get matches analytics
    const matchesSnapshot = await db.collection(COLLECTIONS.MATCHES).get();
    let pendingMatches = 0;
    let acceptedMatches = 0;
    let completedMatches = 0;

    matchesSnapshot.forEach(doc => {
      const data = doc.data();
      switch (data.status) {
        case 'pending':
          pendingMatches++;
          break;
        case 'accepted':
          acceptedMatches++;
          break;
        case 'completed':
          completedMatches++;
          break;
      }
    });

    // Get revenue analytics
    const transactionsSnapshot = await db.collection(COLLECTIONS.TRANSACTIONS).get();
    let totalHeld = 0;
    let totalReleased = 0;
    let totalCommission = 0;

    transactionsSnapshot.forEach(doc => {
      const data = doc.data();
      const amount = data.amount || 0;
      const commission = data.commission_retained || 0;

      if (data.status === 'held') {
        totalHeld += amount;
      } else if (data.status === 'released') {
        totalReleased += amount;
        totalCommission += commission;
      }
    });

    const analytics = {
      users: {
        total: usersSnapshot.size,
        clients: clientCount,
        artisans: artisanCount,
        verified_artisans: verifiedArtisans
      },
      jobs: {
        total: jobsSnapshot.size,
        open: openJobs,
        matched: matchedJobs,
        completed: completedJobs,
        cancelled: cancelledJobs
      },
      matches: {
        total: matchesSnapshot.size,
        pending: pendingMatches,
        accepted: acceptedMatches,
        completed: completedMatches
      },
      revenue: {
        total_held: totalHeld,
        total_released: totalReleased,
        total_commission: totalCommission
      }
    };

    Logger.info('Admin analytics fetched', { 
      totalUsers: usersSnapshot.size, 
      totalJobs: jobsSnapshot.size,
      totalRevenue: totalReleased
    });

    return ResponseUtil.success(res, 'Analytics data fetched successfully', analytics);

  } catch (error: any) {
    Logger.error('Admin analytics error', error);
    return ResponseUtil.serverError(res, 'Failed to fetch analytics data');
  }
});

export default router;
