import * as admin from 'firebase-admin';
import axios from 'axios';
import { Logger } from '../utils/logger';
import { AnalyticsService } from './analytics.service';

export class RefundService {
  private get db() { return admin.firestore(); }

  private secretKey(): string {
    const value = process.env.PAYSTACK_SECRET_KEY;
    if (!value || !/^sk_(test|live)_/.test(value)) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }
    return value;
  }

  async processNoResponseRefunds(): Promise<{ processed: number; refunded: number; cancelled: number; errors: number }> {
    Logger.info('Starting no-response refund execution');
    const now = admin.firestore.Timestamp.now();
    const expiredMatches = await this.db.collection('matches')
      .where('status', '==', 'paid')
      .where('no_response_timer_expiry', '<', now)
      .limit(100)
      .get();

    let queued = 0;
    let cancelled = 0;
    let errors = 0;
    for (const matchDoc of expiredMatches.docs) {
      const match = matchDoc.data();
      try {
        const messages = await this.db.collection('jobs').doc(match.job_id).collection('messages')
          .where('sender_uid', '==', match.artisan_uid)
          .limit(1)
          .get();
        if (!messages.empty) {
          await this.db.runTransaction(async transaction => {
            const currentMatch = await transaction.get(matchDoc.ref);
            if (currentMatch.data()?.status === 'paid') {
              transaction.update(matchDoc.ref, {
                artisan_responded_at: currentMatch.data()?.artisan_responded_at
                  || admin.firestore.FieldValue.serverTimestamp(),
                no_response_timer_expiry: null,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          });
          cancelled += 1;
          continue;
        }

        await this.queueRefund(matchDoc.id, match.job_id, match.artisan_uid, match.client_uid);
        queued += 1;
        new AnalyticsService().trackEvent('no_response_refund_queued', match.client_uid, {
          match_id: matchDoc.id,
          job_id: match.job_id,
          artisan_uid: match.artisan_uid
        }).catch(() => {});
      } catch (error) {
        errors += 1;
        Logger.error('Failed to queue no-response refund', { matchId: matchDoc.id, error });
      }
    }

    return { processed: expiredMatches.size, refunded: queued, cancelled, errors };
  }

  private async queueRefund(matchId: string, jobId: string, artisanUid: string, clientUid: string): Promise<void> {
    const paymentSnapshot = await this.db.collection('transactions')
      .where('match_id', '==', matchId)
      .where('escrow_status', '==', 'HELD')
      .limit(1)
      .get();
    if (paymentSnapshot.empty) throw new Error('No held transaction found for match');

    const paymentRef = paymentSnapshot.docs[0].ref;
    const matchRef = this.db.collection('matches').doc(matchId);
    const jobRef = this.db.collection('jobs').doc(jobId);
    let reference = '';
    let amountInKobo = 0;

    await this.db.runTransaction(async transaction => {
      const [paymentDoc, matchDoc, jobDoc] = await Promise.all([
        transaction.get(paymentRef),
        transaction.get(matchRef),
        transaction.get(jobRef)
      ]);
      const payment = paymentDoc.data();
      const match = matchDoc.data();
      const job = jobDoc.data();
      if (!payment || payment.escrow_status !== 'HELD' || !match || match.status !== 'paid') {
        throw new Error('Refund is no longer eligible');
      }
      if (match.artisan_responded_at) {
        throw new Error('Refund is no longer eligible: The artisan responded');
      }
      if (!job || payment.job_id !== jobId || payment.client_uid !== clientUid
        || payment.artisan_uid !== artisanUid || match.job_id !== jobId) {
        throw new Error('Refund resources are inconsistent');
      }

      reference = payment.paystack_reference;
      amountInKobo = Number(payment.expected_amount_kobo
        ?? Math.round((payment.amounts?.total_charged ?? payment.amount ?? 0) * 100));
      if (!reference || !Number.isSafeInteger(amountInKobo) || amountInKobo <= 0) {
        throw new Error('Refund payment details are invalid');
      }

      transaction.update(paymentRef, {
        escrow_status: 'REFUND_PENDING',
        refund_status: 'INITIATING',
        refund_amount_kobo: amountInKobo,
        refund_reason: 'Artisan did not respond before the deadline',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      transaction.update(matchRef, {
        status: 'refund_pending',
        no_response_timer_expiry: null,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      transaction.update(jobRef, {
        status: 'refund_pending',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    try {
      const response = await axios.post(
        'https://api.paystack.co/refund',
        {
          transaction: reference,
          amount: amountInKobo,
          currency: 'NGN',
          merchant_note: 'Auto-refund: Artisan did not respond before the deadline'
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey()}`,
            'Content-Type': 'application/json'
          },
          timeout: 15_000
        }
      );
      if (!response.data?.status || !response.data?.data?.id) {
        throw new Error('Paystack rejected the refund request');
      }
      await paymentRef.update({
        refund_status: 'PENDING',
        paystack_refund_id: response.data.data.id,
        refund_queued_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      // The API may have accepted the request before a network failure. Keep
      // funds pending and reconcile through signed webhook events.
      await paymentRef.update({
        refund_status: 'RECONCILIATION_REQUIRED',
        refund_error_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      throw error;
    }
  }
}
