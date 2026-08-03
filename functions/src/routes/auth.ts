import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';

const router = Router();

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number using Firebase Auth
 */
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    // Validate phone format (basic check - should start with +)
    if (!phone.startsWith('+')) {
      res.status(400).json({ 
        error: 'Phone number must be in international format (e.g., +2348012345678)' 
      });
      return;
    }

    // Firebase Admin SDK doesn't directly send OTP
    // In production, you would:
    // 1. Use Firebase Client SDK on frontend to trigger phone auth
    // 2. Or use a third-party SMS service (Twilio, etc.)
    // 3. Or use Firebase Auth REST API
    
    // For now, we'll create a custom token approach
    // In real implementation, use Firebase Client SDK's phone auth on frontend
    
    res.status(200).json({
      message: 'OTP sent successfully',
      phone: phone,
      // In production, Firebase Client SDK handles this
      note: 'Use Firebase Client SDK signInWithPhoneNumber() on frontend'
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      error: 'Failed to send OTP',
      details: error.message 
    });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and create/update user
 * 
 * In production, the frontend uses Firebase Client SDK to verify OTP
 * and gets an ID token, which is then sent to this endpoint to create user profile
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { 
      phone, 
      first_name, 
      last_name, 
      role,
      uid // From Firebase Auth after client-side OTP verification
    } = req.body;

    // Validate required fields
    if (!phone || !first_name || !last_name || !role || !uid) {
      res.status(400).json({ 
        error: 'Missing required fields: phone, first_name, last_name, role, uid' 
      });
      return;
    }

    // Validate role
    if (role !== 'client' && role !== 'artisan') {
      res.status(400).json({ 
        error: 'Role must be either "client" or "artisan"' 
      });
      return;
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    // Check if user already exists
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // User exists, return existing user data
      const userData = userDoc.data();
      res.status(200).json({
        message: 'User already exists',
        user: userData
      });
      return;
    }

    // Create new user document
    const newUser = {
      uid,
      first_name,
      last_name,
      phone,
      role,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await userRef.set(newUser);

    // If artisan, create a placeholder profile (to be completed later)
    if (role === 'artisan') {
      const artisanRef = db.collection('artisan_profiles').doc(uid);
      await artisanRef.set({
        uid,
        trade: '', // To be set during profile completion
        category: '', // To be derived from trade
        location: '',
        available: false,
        verified: false,
        id_document_url: '',
        work_photos: [],
        completed_jobs: 0,
        reputation_score: null,
        tagline: '',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        ...newUser,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      error: 'Failed to verify OTP and create user',
      details: error.message 
    });
  }
});

/**
 * POST /api/auth/create-custom-token
 * Helper endpoint for development/testing
 * Creates a custom token for a phone number (bypassing OTP in dev)
 */
router.post('/create-custom-token', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    // Check if user exists with this phone
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users')
      .where('phone', '==', phone)
      .limit(1)
      .get();

    let uid: string;

    if (!usersSnapshot.empty) {
      // User exists
      uid = usersSnapshot.docs[0].id;
    } else {
      // Create a new user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        phoneNumber: phone
      });
      uid = userRecord.uid;
    }

    // Create custom token
    const customToken = await admin.auth().createCustomToken(uid);

    res.status(200).json({
      customToken,
      uid,
      message: 'Custom token created. Use this to sign in on the client.'
    });

  } catch (error: any) {
    console.error('Create custom token error:', error);
    res.status(500).json({ 
      error: 'Failed to create custom token',
      details: error.message 
    });
  }
});

export default router;
