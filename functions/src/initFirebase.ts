import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  try {
    // Attempt to load explicit credentials if present
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '../../thematic-grin-482015-a3-firebase-adminsdk-fbsvc-7e50f6b9fd.json';
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    // Fallback to default initialization (Standard in Cloud Functions env)
    admin.initializeApp();
  }
}
