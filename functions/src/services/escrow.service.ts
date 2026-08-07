/**
 * Escrow Service
 * Business logic for escrow and fund release operations
 */

import * as admin from 'firebase-admin';
import { BaseService } from './base.service';
import { COLLECTIONS } from '../constants';

export class EscrowService extends BaseService {
  private db: admin.firestore.Firestore;

  constructor() {
    super();
    this.db = admin.firestore();
  }

  /**
   * Release escrow funds (Mark Complete)
   * Idempotent - calling twice doesn't double-release
   */
  async releaseFunds(jobId: string, clientUid: string): Promise<{
    artisanReceives: number;
    commissionRetained: number;
  }> {
    try {
      // Get job
      const jobDoc = await this.db.collection(COLLECTIONS.JOBS).doc(jobId).get();
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const job = jobDoc.data();

      // Verify ownership
      if (job?.client_uid !== clientUid) {
        throw new Error('Unauthorized: Only the job owner can release funds');
      }

      // Find transaction for this job
      const transactionSnapshot = await this.db
        .collection(COLLECTIONS.TRANSACTIONS)
        .where('job_id', '==', jobId)
        .where('type', '==', 'escrow')
        .where('status', '==', 'held')
        .limit(1)
        .get();

      if (transactionSnapshot.empty) {
        throw new Error('No held escrow transaction found for this job');
      }

      const transactionDoc = transactionSnapshot.docs[0];
      const transaction = transactionDoc.data();

      // Check if already released (idempotency)
      if (transaction.status === 'released') {
        this.logger.warn('Funds already released', { jobId });
        return {
          artisanReceives: transaction.locked_job_value - transaction.commission_retained,
          commissionRetained: transaction.commission_retained
        };
      }

      // Calculate amounts
      const lockedJobValue = transaction.locked_job_value || 0;
      const commissionRetained = lockedJobValue * 0.10;
      const artisanReceives = lockedJobValue - commissionRetained;

      // Update transaction status to released
      await transactionDoc.ref.update({
        status: 'released',
        commission_retained: commissionRetained,
        released_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update job status to completed
      await jobDoc.ref.update({
        status: 'completed',
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      this.logOperation('escrow-released', {
        jobId,
        transactionId: transactionDoc.id,
        artisanReceives,
        commissionRetained
      });

      return {
        artisanReceives,
        commissionRetained
      };
    } catch (error) {
      this.handleError(error, 'Release escrow funds');
    }
  }

  /**
   * Check if payment has been made for contact reveal
   */
  async checkContactRevealPayment(matchId: string): Promise<boolean> {
    try {
      const snapshot = await this.db
        .collection(COLLECTIONS.TRANSACTIONS)
        .where('match_id', '==', matchId)
        .where('type', '==', 'contact_reveal')
        .where('status', '==', 'held')
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      this.handleError(error, 'Check contact reveal payment');
    }
  }

  /**
   * Get artisan earnings summary
   */
  async getArtisanEarnings(artisanUid: string): Promise<{
    held: number;
    released: number;
    totalEarnings: number;
    totalCommission: number;
  }> {
    try {
      const snapshot = await this.db
        .collection(COLLECTIONS.TRANSACTIONS)
        .where('artisan_uid', '==', artisanUid)
        .where('type', '==', 'escrow')
        .get();

      let held = 0;
      let released = 0;
      let totalCommission = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        const lockedValue = data.locked_job_value || 0;
        const commission = data.commission_retained || (lockedValue * 0.10);
        const artisanAmount = lockedValue - commission;

        if (data.status === 'held') {
          held += artisanAmount;
        } else if (data.status === 'released') {
          released += artisanAmount;
          totalCommission += commission;
        }
      });

      return {
        held,
        released,
        totalEarnings: released,
        totalCommission
      };
    } catch (error) {
      this.handleError(error, 'Get artisan earnings');
    }
  }

  /**
   * Get platform revenue summary
   */
  async getPlatformRevenue(): Promise<{
    totalHeld: number;
    totalReleased: number;
    totalCommission: number;
  }> {
    try {
      const snapshot = await this.db
        .collection(COLLECTIONS.TRANSACTIONS)
        .where('type', '==', 'escrow')
        .get();

      let totalHeld = 0;
      let totalReleased = 0;
      let totalCommission = 0;

      snapshot.forEach(doc => {
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

      return {
        totalHeld,
        totalReleased,
        totalCommission
      };
    } catch (error) {
      this.handleError(error, 'Get platform revenue');
    }
  }

  /**
   * Refund escrow (admin action)
   */
  async refundEscrow(transactionId: string, reason: string): Promise<void> {
    try {
      const transactionDoc = await this.db
        .collection(COLLECTIONS.TRANSACTIONS)
        .doc(transactionId)
        .get();

      if (!transactionDoc.exists) {
        throw new Error('Transaction not found');
      }

      const transaction = transactionDoc.data();

      if (transaction?.status !== 'held') {
        throw new Error('Can only refund held transactions');
      }

      await transactionDoc.ref.update({
        status: 'refunded',
        metadata: {
          ...transaction?.metadata,
          refund_reason: reason
        },
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      this.logOperation('escrow-refunded', {
        transactionId,
        reason
      });
    } catch (error) {
      this.handleError(error, 'Refund escrow');
    }
  }
}
