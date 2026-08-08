/**
 * Payment Service
 * Business logic for Paystack payment operations
 */

import * as admin from 'firebase-admin';
import axios from 'axios';
import { BaseService } from './base.service';
import { COLLECTIONS } from '../constants';
import { Transaction } from '../models/transaction.model';

export class PaymentService extends BaseService {
  private db: admin.firestore.Firestore;
  private paystackSecretKey: string;
  private paystackBaseUrl = 'https://api.paystack.co';

  constructor() {
    super();
    this.db = admin.firestore();
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
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

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
