import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';

describe('Firestore authorization rules', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: 'demo-verifix',
      firestore: {
        rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8')
      }
    });
  });

  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await Promise.all([
        setDoc(doc(db, 'users/client-1'), { uid: 'client-1', role: 'client' }),
        setDoc(doc(db, 'users/artisan-1'), { uid: 'artisan-1', role: 'artisan' }),
        setDoc(doc(db, 'artisan_profiles/artisan-1'), { uid: 'artisan-1', is_verified: true }),
        setDoc(doc(db, 'artisan_private/artisan-1'), { nin_encrypted: 'ciphertext' }),
        setDoc(doc(db, 'jobs/job-1'), {
          client_uid: 'client-1',
          assigned_artisan_uid: 'artisan-1',
          matched_artisan_uid: 'artisan-1',
          chat_unlocked: true,
          chat_match_id: 'match-1',
          status: 'in_progress'
        }),
        setDoc(doc(db, 'matches/match-1'), {
          job_id: 'job-1', client_uid: 'client-1', artisan_uid: 'artisan-1', status: 'paid'
        }),
        setDoc(doc(db, 'transactions/payment-1'), {
          job_id: 'job-1', client_uid: 'client-1', artisan_uid: 'artisan-1', status: 'held'
        }),
        setDoc(doc(db, 'jobs/job-1/messages/message-1'), {
          job_id: 'job-1', match_id: 'match-1', sender_uid: 'client-1',
          content: 'Hello', is_read: false, created_at: serverTimestamp()
        }),
        setDoc(doc(db, 'notifications/notification-1'), {
          recipient_uid: 'artisan-1', read: false, message: 'A notification'
        })
      ]);
    });
  });

  afterAll(async () => {
    await environment.cleanup();
  });

  it('keeps public and private artisan records behind the safe API', async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    const artisan = environment.authenticatedContext('artisan-1').firestore();
    const client = environment.authenticatedContext('client-1').firestore();

    await assertFails(getDocs(collection(anonymous, 'artisan_profiles')));
    await assertSucceeds(getDoc(doc(artisan, 'artisan_profiles/artisan-1')));
    await assertFails(getDoc(doc(client, 'artisan_profiles/artisan-1')));
    await assertFails(getDoc(doc(artisan, 'artisan_private/artisan-1')));
  });

  it('denies client-side writes to server-owned roles and job state', async () => {
    const client = environment.authenticatedContext('client-1').firestore();
    await assertFails(updateDoc(doc(client, 'users/client-1'), { role: 'admin' }));
    await assertFails(updateDoc(doc(client, 'jobs/job-1'), { status: 'completed' }));
    await assertFails(setDoc(doc(client, 'transactions/forged'), {
      client_uid: 'client-1', status: 'released'
    }));
  });

  it('limits job and transaction reads to participants', async () => {
    const artisan = environment.authenticatedContext('artisan-1').firestore();
    const stranger = environment.authenticatedContext('stranger').firestore();
    await assertSucceeds(getDoc(doc(artisan, 'jobs/job-1')));
    await assertSucceeds(getDoc(doc(artisan, 'transactions/payment-1')));
    await assertFails(getDoc(doc(stranger, 'jobs/job-1')));
    await assertFails(getDoc(doc(stranger, 'transactions/payment-1')));
  });

  it('allows paid participants to read chat but requires API writes', async () => {
    const client = environment.authenticatedContext('client-1').firestore();
    const artisan = environment.authenticatedContext('artisan-1').firestore();
    const stranger = environment.authenticatedContext('stranger').firestore();
    const message = 'jobs/job-1/messages/message-1';
    await assertSucceeds(getDoc(doc(client, message)));
    await assertSucceeds(getDoc(doc(artisan, message)));
    await assertFails(getDoc(doc(stranger, message)));
    await assertFails(setDoc(doc(client, 'jobs/job-1/messages/forged'), {
      job_id: 'job-1', match_id: 'match-1', sender_uid: 'client-1',
      content: 'Bypass the API', is_read: false, created_at: serverTimestamp()
    }));
  });

  it('only lets a notification owner acknowledge it without changing other fields', async () => {
    const artisan = environment.authenticatedContext('artisan-1').firestore();
    const stranger = environment.authenticatedContext('stranger').firestore();
    const notification = doc(artisan, 'notifications/notification-1');
    await assertSucceeds(updateDoc(notification, { read: true }));
    await assertFails(updateDoc(doc(stranger, 'notifications/notification-1'), { read: true }));
    await assertFails(updateDoc(notification, { read: true, recipient_uid: 'stranger' }));
  });

  it('does not grant direct database access from a legacy admin claim', async () => {
    const admin = environment.authenticatedContext('admin-1', { artiva_admin: true }).firestore();
    await assertFails(getDoc(doc(admin, 'artisan_profiles/artisan-1')));
    await assertFails(getDoc(doc(admin, 'transactions/payment-1')));
    await assertFails(getDoc(doc(admin, 'artisan_private/artisan-1')));
  });
});
