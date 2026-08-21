import * as admin from 'firebase-admin';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';
import { BaseService } from './base.service';
import { COLLECTIONS } from '../constants';
import { Transaction } from '../models/transaction.model';

export class PaymentService extends BaseService {
  private get db() { 
    try {
      return getFirestore();
    } catch {
      return (admin as any).firestore ? (admin as any).firestore() : ({} as any);
    }
  }
  private paystackSecretKey: string;
  private paystackBaseUrl = 'https://api.paystack.co';

  constructor() {
    super();
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
  }


  /**
   * Verify Paystack webhook signature
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    try {
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', this.paystackSecretKey)
        .update(body)
        .digest('hex');

      return hash === signature;
    } catch (error) {
      this.logger.error('Webhook signature verification failed', { error });
      return false;
    }
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(reference: string): Promise<void> {
    try {
      // Find transaction by reference
      const snapshot = await this.db
        .collection(COLLECTIONS.TRANSACTIONS)
        .where('paystack_reference', '==', reference)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new Error(`Transaction not found for reference: ${reference}`);
      }

      const transactionDoc = snapshot.docs[0];
      const transaction = transactionDoc.data();

      // Update transaction to held (for escrow) or completed (for other types)
      const newStatus = transaction.type === 'escrow' ? 'held' : 'completed';

      await transactionDoc.ref.update({
        status: newStatus,
        escrow_status: transaction.type === 'escrow' ? 'HELD' : undefined,
        updated_at: FieldValue.serverTimestamp()
      });

      if (transaction.type === 'escrow' && transaction.match_id) {
        // Dynamic No-Response Timer (PRD Q02)
        const matchRef = this.db.collection(COLLECTIONS.MATCHES).doc(transaction.match_id);
        const matchDoc = await matchRef.get();
        if (matchDoc.exists) {
          const matchData = matchDoc.data();
          const jobRef = this.db.collection(COLLECTIONS.JOBS).doc(matchData!.job_id);
          const jobDoc = await jobRef.get();
          
          let timerHours = 4; // default
          if (jobDoc.exists) {
            const urgency = jobDoc.data()?.urgency;
            if (urgency === 'Today') {
              timerHours = 2;
            } else if (urgency === 'This Week') {
              timerHours = 4;
            } else if (urgency === 'Flexible') {
              timerHours = 12;
            }
          }

          const expiryDate = new Date();
          expiryDate.setHours(expiryDate.getHours() + timerHours);
          
          await matchRef.update({
            status: 'paid', // Active/Paid
            no_response_timer_expiry: Timestamp.fromDate(expiryDate),
            updated_at: FieldValue.serverTimestamp()
          });
        }
      }

      this.logOperation('payment-success-handled', { reference, newStatus });
    } catch (error) {
      this.handleError(error, 'Handle payment success');
    }
  }

  /**
   * Verify payment status with Paystack API
   */
  async verifyPayment(reference: string): Promise<{
    status: string;
    amount: number;
    metadata: any;
  }> {
    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`
          }
        }
      );

      const { status, amount, metadata } = response.data.data;

      return {
        status,
        amount: amount / 100, // Convert from kobo
        metadata
      };
    } catch (error) {
      this.handleError(error, 'Verify payment');
    }
  }

  /**
   * Get transaction by reference
   */
  async getTransactionByReference(reference: string): Promise<Transaction | null> {
    try {
      const snapshot = await this.db
        .collection(COLLECTIONS.TRANSACTIONS)
        .where('paystack_reference', '==', reference)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Transaction;
    } catch (error) {
      this.handleError(error, 'Get transaction by reference');
    }
  }
}
