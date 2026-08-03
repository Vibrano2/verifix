import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { authenticate, requireOwnership } from '../middleware/auth';
import { validateTrade } from '../middleware/validation';
import { uploadFile } from '../utils/fileUpload';
import { AuthenticatedRequest } from '../types';
import { getCategoryFromTrade, TradeName } from '../types';

const router = Router();

/**
 * POST /api/artisans/signup
 * Complete artisan profile after initial auth
 * Creates artisan_profiles document with trade and other details
 */
router.post('/signup', authenticate, validateTrade, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      trade,
      location,
      tagline,
      id_document_url,
      work_photos
    } = req.body;

    // Validate required fields
    if (!trade || !location) {
      res.status(400).json({ error: 'Trade and location are required' });
      return;
    }

    if (!tagline || tagline.length > 100) {
      res.status(400).json({ error: 'Tagline is required and must be 100 characters or less' });
      return;
    }

    const uid = req.user.uid;
    const db = admin.firestore();
    
    // Check if user exists and is an artisan
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();
    if (userData?.role !== 'artisan') {
      res.status(403).json({ error: 'Only artisans can create artisan profiles' });
      return;
    }

    // Get category from trade
    const category = getCategoryFromTrade(trade as TradeName);

    // Create or update artisan profile
    const artisanRef = db.collection('artisan_profiles').doc(uid);
    const artisanProfile = {
      uid,
      trade: trade as TradeName,
      category,
      location,
      available: false, // Starts as unavailable
      verified: false, // Must be verified by admin
      id_document_url: id_document_url || '',
      work_photos: work_photos || [],
      completed_jobs: 0,
      reputation_score: null,
      tagline,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await artisanRef.set(artisanProfile, { merge: true });

    res.status(201).json({
      message: 'Artisan profile created successfully',
      profile: {
        ...artisanProfile,
        updated_at: new Date()
      }
    });

  } catch (error: any) {
    console.error('Artisan signup error:', error);
    res.status(500).json({ 
      error: 'Failed to create artisan profile',
      details: error.message 
    });
  }
});

/**
 * PATCH /api/artisans/:uid/availability
 * Toggle artisan availability
 * IDOR protection: Must be the artisan owner
 */
router.patch('/:uid/availability', authenticate, requireOwnership, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const { available } = req.body;

    if (typeof available !== 'boolean') {
      res.status(400).json({ error: 'Available must be a boolean value' });
      return;
    }

    const db = admin.firestore();
    const artisanRef = db.collection('artisan_profiles').doc(uid);
    const artisanDoc = await artisanRef.get();

    if (!artisanDoc.exists) {
      res.status(404).json({ error: 'Artisan profile not found' });
      return;
    }

    // Update availability
    await artisanRef.update({
      available,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      message: 'Availability updated successfully',
      available
    });

  } catch (error: any) {
    console.error('Update availability error:', error);
    res.status(500).json({ 
      error: 'Failed to update availability',
      details: error.message 
    });
  }
});

/**
 * POST /api/artisans/:uid/photo
 * Upload work photo for artisan
 * IDOR protection: Must be the artisan owner
 * 
 * Security: Validates actual file MIME type/signature, not just extension
 */
router.post('/:uid/photo', authenticate, requireOwnership, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;

    const db = admin.firestore();
    const artisanRef = db.collection('artisan_profiles').doc(uid);
    const artisanDoc = await artisanRef.get();

    if (!artisanDoc.exists) {
      res.status(404).json({ error: 'Artisan profile not found' });
      return;
    }

    // Upload file with validation (checks actual file signature)
    const { url, filename } = await uploadFile(req, `artisan_photos/${uid}`, 5 * 1024 * 1024);

    // Add photo URL to work_photos array
    await artisanRef.update({
      work_photos: admin.firestore.FieldValue.arrayUnion(url),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      message: 'Photo uploaded successfully',
      url,
      filename
    });

  } catch (error: any) {
    console.error('Photo upload error:', error);
    
    // Return specific error messages from file validation
    if (error.message.includes('Invalid file type') || 
        error.message.includes('File too large') ||
        error.message.includes('File signature')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ 
      error: 'Failed to upload photo',
      details: error.message 
    });
  }
});

/**
 * POST /api/artisans/:uid/id-document
 * Upload ID document for verification
 * IDOR protection: Must be the artisan owner
 */
router.post('/:uid/id-document', authenticate, requireOwnership, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;

    const db = admin.firestore();
    const artisanRef = db.collection('artisan_profiles').doc(uid);
    const artisanDoc = await artisanRef.get();

    if (!artisanDoc.exists) {
      res.status(404).json({ error: 'Artisan profile not found' });
      return;
    }

    // Upload file with validation
    const { url, filename } = await uploadFile(req, `id_documents/${uid}`, 10 * 1024 * 1024); // 10MB for documents

    // Update ID document URL
    await artisanRef.update({
      id_document_url: url,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      message: 'ID document uploaded successfully',
      url,
      filename
    });

  } catch (error: any) {
    console.error('ID document upload error:', error);
    
    if (error.message.includes('Invalid file type') || 
        error.message.includes('File too large') ||
        error.message.includes('File signature')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ 
      error: 'Failed to upload ID document',
      details: error.message 
    });
  }
});

/**
 * GET /api/artisans/:uid
 * Get artisan profile details
 */
router.get('/:uid', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;

    const db = admin.firestore();
    const artisanRef = db.collection('artisan_profiles').doc(uid);
    const artisanDoc = await artisanRef.get();

    if (!artisanDoc.exists) {
      res.status(404).json({ error: 'Artisan profile not found' });
      return;
    }

    const profileData = artisanDoc.data();

    res.status(200).json({
      profile: profileData
    });

  } catch (error: any) {
    console.error('Get artisan profile error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch artisan profile',
      details: error.message 
    });
  }
});

/**
 * PATCH /api/artisans/:uid/profile
 * Update artisan profile (location, tagline, etc.)
 * IDOR protection: Must be the artisan owner
 */
router.patch('/:uid/profile', authenticate, requireOwnership, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const { location, tagline } = req.body;

    const db = admin.firestore();
    const artisanRef = db.collection('artisan_profiles').doc(uid);
    const artisanDoc = await artisanRef.get();

    if (!artisanDoc.exists) {
      res.status(404).json({ error: 'Artisan profile not found' });
      return;
    }

    const updates: any = {
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    if (location !== undefined) {
      if (typeof location !== 'string' || location.length > 200) {
        res.status(400).json({ error: 'Location must be a string with max 200 characters' });
        return;
      }
      updates.location = location;
    }

    if (tagline !== undefined) {
      if (typeof tagline !== 'string' || tagline.length > 100) {
        res.status(400).json({ error: 'Tagline must be a string with max 100 characters' });
        return;
      }
      updates.tagline = tagline;
    }

    await artisanRef.update(updates);

    res.status(200).json({
      message: 'Profile updated successfully',
      updates
    });

  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: error.message 
    });
  }
});

/**
 * GET /api/artisans/:uid/dashboard
 * Get artisan dashboard data
 * Returns sum of held and released funds separately (no client-side math needed)
 * IDOR protection: Must be the artisan owner
 */
router.get('/:uid/dashboard', authenticate, requireOwnership, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;

    const db = admin.firestore();

    // Get artisan profile
    const artisanRef = db.collection('artisan_profiles').doc(uid);
    const artisanDoc = await artisanRef.get();

    if (!artisanDoc.exists) {
      res.status(404).json({ error: 'Artisan profile not found' });
      return;
      }

    const artisanData = artisanDoc.data();

    // Query transactions by artisan_uid
    const transactionsSnapshot = await db.collection('transactions')
      .where('artisan_uid', '==', uid)
      .get();

    let heldTotal = 0;
    let releasedTotal = 0;

    transactionsSnapshot.forEach(doc => {
      const data = doc.data();
      const amount = data.locked_job_value || 0;
      const commission = data.commission_retained || 0;
      const artisanReceives = amount - commission;

      if (data.status === 'held') {
        heldTotal += artisanReceives;
      } else if (data.status === 'released') {
        releasedTotal += artisanReceives;
      }
    });

    // Get matches for this artisan
    const matchesSnapshot = await db.collection('matches')
      .where('artisan_uid', '==', uid)
      .get();

    let pendingMatches = 0;
    let acceptedMatches = 0;
    let completedMatches = 0;

    matchesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'pending') pendingMatches++;
      if (data.status === 'accepted') acceptedMatches++;
      if (data.status === 'completed') completedMatches++;
    });

    res.status(200).json({
      artisan: {
        uid: artisanData?.uid,
        trade: artisanData?.trade,
        location: artisanData?.location,
        available: artisanData?.available,
        verified: artisanData?.verified,
        completed_jobs: artisanData?.completed_jobs,
        reputation_score: artisanData?.reputation_score,
        tagline: artisanData?.tagline
      },
      finances: {
        held: heldTotal,
        released: releasedTotal,
        total_earnings: releasedTotal
      },
      matches: {
        pending: pendingMatches,
        accepted: acceptedMatches,
        completed: completedMatches,
        total: matchesSnapshot.size
      }
    });

  } catch (error: any) {
    console.error('Artisan dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch artisan dashboard',
      details: error.message 
    });
  }
});

export default router;
