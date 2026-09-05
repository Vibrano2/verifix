import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'artiva-f24a8'
  });
}

try {
  const adminMod = require('firebase-admin');
  const dbInst = getFirestore();
  if (typeof adminMod.firestore !== 'function') {
    adminMod.firestore = () => dbInst;
    adminMod.firestore.FieldValue = FieldValue;
    adminMod.firestore.Timestamp = Timestamp;
  }
  const authInst = getAuth();
  if (typeof adminMod.auth !== 'function') {
    adminMod.auth = () => authInst;
  }
} catch (e) {}

export const db = getFirestore();
export const auth = getAuth();
