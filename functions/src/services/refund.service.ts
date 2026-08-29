/**
 * 4-Hour No-Response Auto-Refund Service
 * Section 5.2 PRD Scheduled Task Implementation
 */

import * as admin from 'firebase-admin';
import axios from 'axios';
import { Logger } from '../utils/logger';
import { AnalyticsService } from './analytics.service';

export class RefundService {
  private get db() { return admin.firestore(); }
  private paystackSecretKey: string;

  constructor() {
    // this.db = admin.firestore();
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
  }

  /**
   * Executes the 4-Hour No-Response refund check across all active matches.
   * Triggered periodically by Cloud Scheduler Pub/Sub.
   */
  async processNoResponseRefunds(): Promise<{ processed: number; refunded: number; cancelled: number; errors: number }> {
    Logger.info('Starting 4-Hour No-Response Auto-Refund execution...');
    const now = admin.firestore.Timestamp.now();

    // Query paid matches (payment confirmed, timer running) whose 4-hour timer has expired
    const expiredMatchesSnapshot = await this.db.collection('matches')
      .where('status', '==', 'paid')
      .where('no_response_timer_expiry', '<', now)
      .get();

    if (expiredMatchesSnapshot.empty) {
      Logger.info('No expired matches found for auto-refund processing.');
      return { processed: 0, refunded: 0, cancelled: 0, errors: 0 };
    }

    let refundedCount = 0;
    let cancelledCount = 0;
    let errorCount = 0;

    for (const matchDoc of expiredMatchesSnapshot.docs) {
      const matchData = matchDoc.data();
      const matchId = matchDoc.id;
      const { job_id, artisan_uid, client_uid } = matchData;

      try {
        // PRD §7.4: messages are stored at jobs/{jobId}/messages (not matches/.../messages)
        const messagesSnapshot = await this.db.collection('jobs')
          .doc(job_id)
          .collection('messages')
          .where('sender_uid', '==', artisan_uid)
          .limit(1)
          .get();

        if (!messagesSnapshot.empty) {
          // YES: Artisan responded -> Cancel timer (nullify expiry)
          await this.db.collection('matches').doc(matchId).update({
            no_response_timer_expiry: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          cancelledCount++;
          Logger.info(`Match ${matchId}: Timer cancelled because artisan ${artisan_uid} responded.`);
        } else {
          // NO: Artisan did NOT respond within 4 hours -> Trigger Paystack refund & update records atomically
          await this.executeAutoRefund(matchId, job_id, artisan_uid, client_uid);
          refundedCount++;
          Logger.info(`Match ${matchId}: Auto-refund successfully processed.`);

          // PRD §5.1: fire no_response_refund analytics event
          new AnalyticsService().trackEvent('no_response_refund', client_uid, {
            match_id: matchId,
            job_id,
            artisan_uid
          }).catch(() => {});
        }
      } catch (err: any) {
        errorCount++;
        Logger.error(`Failed to process auto-refund for match ${matchId}: ${err.message}`);
      }
    }

    Logger.info(`Finished Auto-Refund run: ${refundedCount} refunded, ${cancelledCount} timer-cancelled, ${errorCount} errors.`);
    return {
      processed: expiredMatchesSnapshot.size,
      refunded: refundedCount,
      cancelled: cancelledCount,
      errors: errorCount
    };
  }

  /**
   * Performs the atomic refund operation via Paystack API and Firestore transaction.
   */
  private async executeAutoRefund(matchId: string, jobId: string, artisanUid: string, clientUid: string): Promise<void> {
    // 1. Retrieve transaction details
    const txSnapshot = await this.db.collection('transactions')
      .where('match_id', '==', matchId)
      .where('escrow_status', '==', 'HELD')
      .limit(1)
      .get();

    if (txSnapshot.empty) {
      throw new Error(`No held transaction found for match ${matchId}`);
    }

    const txDoc = txSnapshot.docs[0];
    const txData = txDoc.data();
    const { paystack_reference, amounts } = txData;
    const total_amount = amounts?.total_charged || txData.total_amount || 0;
    const locked_job_value = amounts?.job_value || txData.locked_job_value || 0;

    // 2. Call Paystack Refund API
    try {
      if (this.paystackSecretKey && this.paystackSecretKey !== 'default-dev-key-change-in-production-32char') {
        await axios.post(
          'https://api.paystack.co/refund',
          {
            transaction: paystack_reference,
            amount: Math.round(total_amount * 100), // Amount in kobo
            merchant_note: 'Auto-refund: Artisan did not respond within 4 hours'
          },
          {
            headers: {
              Authorization: `Bearer ${this.paystackSecretKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        Logger.warn(`Paystack Secret Key not set or default. Simulating refund for reference ${paystack_reference}`);
      }
    } catch (paystackError: any) {
      Logger.error(`Paystack Refund API call failed for ref ${paystack_reference}: ${paystackError.response?.data?.message || paystackError.message}`);
      // Continue with DB state update if transaction was already refunded/handled on Paystack
    }

    // 3. Execute Firestore Transaction for atomic updates
    await this.db.runTransaction(async (transaction) => {
      const matchRef = this.db.collection('matches').doc(matchId);
      const jobRef = this.db.collection('jobs').doc(jobId);
      const txRef = this.db.collection('transactions').doc(txDoc.id);
      const artisanRef = this.db.collection('artisan_profiles').doc(artisanUid);

      transaction.update(txRef, {
        escrow_status: 'REFUNDED',
        status: 'refunded', // keep legacy field in sync
        refund_reason: 'Auto-refund: 4-hour no response timer expired',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update Match status
      transaction.update(matchRef, {
        status: 'refunded',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update Job status
      transaction.update(jobRef, {
        status: 'refunded',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Increment artisan no_response_flags and reduce locked_job_value
      const artisanDoc = await transaction.get(artisanRef);
      if (artisanDoc.exists) {
        const currentFlags = artisanDoc.data()?.no_response_flags || 0;
        const currentLocked = artisanDoc.data()?.locked_job_value || 0;
        const newFlags = currentFlags + 1;
        const isSuspended = newFlags >= 3; // suspend at 3 flags (one warning buffer)

        transaction.update(artisanRef, {
          no_response_flags: newFlags,
          locked_job_value: Math.max(0, currentLocked - (locked_job_value || 0)),
          is_verified: isSuspended ? false : artisanDoc.data()?.is_verified,
          is_available: isSuspended ? false : artisanDoc.data()?.is_available,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (isSuspended) {
          Logger.warn(`Artisan ${artisanUid} automatically suspended due to ${newFlags} no-response flags.`);
        }
      }

      // PRD A-008: write in-app notification so artisan sees the flag on their dashboard
      const notificationRef = this.db.collection('notifications').doc();
      transaction.set(notificationRef, {
        recipient_uid: artisanUid,
        type: 'no_response_refund',
        job_id: jobId,
        match_id: matchId,
        message: 'A client was refunded because no response was received within the required window. This has been flagged on your profile.',
        read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  }
}
