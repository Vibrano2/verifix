import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'artiva-f24a8'
  });
}

export const db = getFirestore();
export const auth = getAuth();
