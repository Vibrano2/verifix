import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { BaseService } from './base.service';
import { COLLECTIONS } from '../constants';
import { Transaction } from '../models/transaction.model';
import { AnalyticsService } from './analytics.service';
import { initiateTransfer, verifyTransaction } from '../utils/paystack';

type PaystackChargeData = {
  reference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

type PaystackTransferData = {
  reference?: string;
  amount?: number;
  status?: string;
};

type PaystackRefundData = {
  id?: number | string;
  status?: string;
  amount?: number;
  deducted_amount?: number;
  currency?: string;
  transaction?: {
    reference?: string;
    amount?: number;
    currency?: string;
  };
};

export class PaymentService extends BaseService {
  private get db(): admin.firestore.Firestore { return admin.firestore(); }

  // Optional override for isolated unit tests. Runtime code reads the
  // Secret Manager-backed environment value only when a request is handled.
  private paystackSecretKey?: string;

  private secretKey(): string {
    const value = this.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
    if (!value || !/^sk_(test|live)_/.test(value)) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }
    return value;
  }

  verifyWebhookSignature(signature: string, body: string | Buffer): boolean {
    try {
      if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
      const expected = createHmac('sha512', this.secretKey()).update(body).digest();
      const supplied = Buffer.from(signature, 'hex');
      return supplied.length === expected.length && timingSafeEqual(expected, supplied);
    } catch (error) {
      this.logger.error('Webhook signature verification failed', { error });
      return false;
    }
  }

  private expectedChargeAmountKobo(payment: FirebaseFirestore.DocumentData): number {
    return payment.expected_amount_kobo
      ?? Math.round((payment.amounts?.total_charged ?? payment.amount ?? 0) * 100);
  }

  private validateChargeData(
    data: PaystackChargeData,
    payment: FirebaseFirestore.DocumentData
  ): void {
    if (!data.reference || data.reference !== payment.paystack_reference) {
      throw new Error('Payment reference mismatch');
    }
    if (data.status !== 'success') throw new Error('Payment is not successful');
    if (data.currency !== 'NGN') throw new Error('Payment currency mismatch');
    if (!Number.isSafeInteger(data.amount) || data.amount !== this.expectedChargeAmountKobo(payment)) {
      throw new Error('Payment amount mismatch');
    }

    const metadata = data.metadata || {};
    const expectedMetadata: Record<string, unknown> = {
      match_id: payment.match_id,
      job_id: payment.job_id,
      client_uid: payment.client_uid,
      artisan_uid: payment.artisan_uid
    };
    for (const [key, expected] of Object.entries(expectedMetadata)) {
      if (expected && metadata[key] !== expected) {
        throw new Error(`Payment metadata mismatch: ${key}`);
      }
    }
  }

  async handlePaymentSuccess(data: PaystackChargeData): Promise<void> {
    const reference = data.reference;
    if (!reference) throw new Error('Payment reference is required');

    const snapshot = await this.db.collection(COLLECTIONS.TRANSACTIONS)
      .where('paystack_reference', '==', reference)
      .limit(1)
      .get();
    if (snapshot.empty) throw new Error('Transaction not found');

    const paymentRef = snapshot.docs[0].ref;
    let paymentForAnalytics: FirebaseFirestore.DocumentData | undefined;

    await this.db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const paymentDoc = await transaction.get(paymentRef);
      const payment = paymentDoc.data();
      if (!payment) throw new Error('Transaction not found');
      this.validateChargeData(data, payment);

      if (payment.escrow_status === 'HELD' || payment.status === 'held') {
        return;
      }
      if (!['PENDING', 'FAILED', 'PAYMENT_RECONCILIATION_REQUIRED'].includes(payment.escrow_status)) {
        throw new Error('Invalid payment state transition');
      }
      if (payment.type !== 'escrow' || !payment.match_id || !payment.job_id) {
        throw new Error('Invalid escrow transaction');
      }

      const matchRef = this.db.collection(COLLECTIONS.MATCHES).doc(payment.match_id);
      const jobRef = this.db.collection(COLLECTIONS.JOBS).doc(payment.job_id);
      const [matchDoc, jobDoc] = await Promise.all([
        transaction.get(matchRef),
        transaction.get(jobRef)
      ]);
      const match = matchDoc.data();
      const job = jobDoc.data();
      if (!match || !job || match.job_id !== payment.job_id) {
        throw new Error('Payment resources are inconsistent');
      }
      if (job.client_uid !== payment.client_uid || match.artisan_uid !== payment.artisan_uid) {
        throw new Error('Payment ownership mismatch');
      }
      if (job.status !== 'matched'
        || match.status !== 'accepted'
        || job.assigned_artisan_uid !== match.artisan_uid
        || job.matched_artisan_uid !== match.artisan_uid) {
        throw new Error('Payment resources are no longer eligible');
      }

      const expiry = Timestamp.fromMillis(Date.now() + 4 * 60 * 60 * 1000);

      transaction.update(paymentRef, {
        status: 'held',
        escrow_status: 'HELD',
        paystack_paid_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      transaction.update(matchRef, {
        status: 'paid',
        no_response_timer_expiry: expiry,
        updated_at: FieldValue.serverTimestamp()
      });
      transaction.update(jobRef, {
        status: 'in_progress',
        chat_unlocked: true,
        chat_match_id: payment.match_id,
        chat_unlocked_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      paymentForAnalytics = payment;
    });

    if (paymentForAnalytics) {
      new AnalyticsService().trackEvent('payment_success', paymentForAnalytics.client_uid, {
        reference,
        match_id: paymentForAnalytics.match_id,
        job_id: paymentForAnalytics.job_id,
        total_charged: paymentForAnalytics.amounts?.total_charged || paymentForAnalytics.amount
      }).catch(() => {});
    }
    this.logOperation('payment-success-handled', { reference });
  }

  async handleTransferEvent(
    event: 'transfer.success' | 'transfer.failed' | 'transfer.reversed',
    data: PaystackTransferData
  ): Promise<void> {
    if (!data.reference) throw new Error('Transfer reference is required');
    if (!/^[a-z0-9_-]{8,64}$/i.test(data.reference)) throw new Error('Invalid transfer reference');
    const snapshot = await this.db.collection(COLLECTIONS.TRANSACTIONS)
      .where('payout_reference', '==', data.reference)
      .limit(1)
      .get();
    if (snapshot.empty) {
      await this.handleProformaTransferEvent(event, data);
      return;
    }

    const paymentRef = snapshot.docs[0].ref;
    let completedPayment: FirebaseFirestore.DocumentData | undefined;
    await this.db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const paymentDoc = await transaction.get(paymentRef);
      const payment = paymentDoc.data();
      if (!payment) throw new Error('Payout transaction not found');
      if (payment.type !== 'escrow' || !payment.job_id || !payment.match_id || !payment.artisan_uid) {
        throw new Error('Invalid payout transaction');
      }
      if (!Number.isSafeInteger(data.amount) || data.amount !== payment.payout_amount_kobo) {
        throw new Error('Transfer amount mismatch');
      }

      if (event !== 'transfer.success') {
        if (event === 'transfer.reversed' && payment.payout_status === 'REVERSED') return;
        if (event === 'transfer.failed' && payment.payout_status === 'SUCCESS') return;
        if (event === 'transfer.reversed' && payment.payout_status === 'SUCCESS') {
          const jobRef = this.db.collection(COLLECTIONS.JOBS).doc(payment.job_id);
          const matchRef = this.db.collection(COLLECTIONS.MATCHES).doc(payment.match_id);
          const artisanRef = this.db.collection(COLLECTIONS.ARTISANS).doc(payment.artisan_uid);
          transaction.update(paymentRef, {
            payout_status: 'REVERSED',
            escrow_status: 'RECONCILIATION_REQUIRED',
            status: 'reconciliation_required',
            payout_completion_counted: false,
            payout_updated_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
          });
          transaction.update(jobRef, {
            status: 'payout_issue',
            updated_at: FieldValue.serverTimestamp()
          });
          transaction.update(matchRef, {
            status: 'payout_issue',
            updated_at: FieldValue.serverTimestamp()
          });
          if (payment.payout_completion_counted === true) {
            transaction.update(artisanRef, {
              completed_jobs: FieldValue.increment(-1),
              updated_at: FieldValue.serverTimestamp()
            });
          }
          return;
        }
        if (event === 'transfer.failed' && payment.payout_status === 'FAILED') return;
        transaction.update(paymentRef, {
          payout_status: event === 'transfer.reversed' ? 'REVERSED' : 'FAILED',
          escrow_status: 'RECONCILIATION_REQUIRED',
          status: 'reconciliation_required',
          payout_updated_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp()
        });
        return;
      }

      if (payment.escrow_status === 'RELEASED' || payment.status === 'released') return;
      if (!['PROCESSING', 'SUBMITTED', 'RECONCILIATION_REQUIRED'].includes(payment.payout_status)) {
        throw new Error('Invalid payout state transition');
      }

      const jobRef = this.db.collection(COLLECTIONS.JOBS).doc(payment.job_id);
      const matchRef = this.db.collection(COLLECTIONS.MATCHES).doc(payment.match_id);
      const artisanRef = this.db.collection(COLLECTIONS.ARTISANS).doc(payment.artisan_uid);
      const [jobDoc, matchDoc, artisanDoc] = await Promise.all([
        transaction.get(jobRef),
        transaction.get(matchRef),
        transaction.get(artisanRef)
      ]);
      if (!jobDoc.exists || !matchDoc.exists || !artisanDoc.exists) {
        throw new Error('Payout resources are inconsistent');
      }
      const job = jobDoc.data()!;
      const match = matchDoc.data()!;
      if (job.client_uid !== payment.client_uid
        || job.status !== 'in_progress'
        || job.completion_requested !== true
        || job.assigned_artisan_uid !== payment.artisan_uid
        || job.matched_artisan_uid !== payment.artisan_uid
        || match.job_id !== payment.job_id
        || match.artisan_uid !== payment.artisan_uid
        || match.status !== 'paid') {
        throw new Error('Payout resources are inconsistent');
      }

      const supplierPayoutIssue = payment.supplier_reversal_pending === true;
      transaction.update(paymentRef, {
        payout_status: 'SUCCESS',
        payout_completion_counted: true,
        escrow_status: supplierPayoutIssue ? 'RECONCILIATION_REQUIRED' : 'RELEASED',
        status: supplierPayoutIssue ? 'reconciliation_required' : 'released',
        released_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      transaction.update(jobRef, {
        status: supplierPayoutIssue ? 'payout_issue' : 'completed',
        completed_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      transaction.update(matchRef, {
        status: supplierPayoutIssue ? 'payout_issue' : 'completed',
        completed_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      transaction.update(artisanRef, {
        completed_jobs: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp()
      });
      completedPayment = payment;
    });

    if (completedPayment) {
      new AnalyticsService().trackEvent('job_completed', completedPayment.client_uid, {
        job_id: completedPayment.job_id,
        artisan_uid: completedPayment.artisan_uid,
        transaction_id: paymentRef.id
      }).catch(() => {});
    }
    this.logOperation('transfer-event-handled', { event, reference: data.reference });
  }

  private async handleProformaTransferEvent(
    event: 'transfer.success' | 'transfer.failed' | 'transfer.reversed',
    data: PaystackTransferData
  ): Promise<void> {
    const proformaSnapshot = await this.db.collection('proformas')
      .where('transfer_reference', '==', data.reference)
      .limit(1)
      .get();
    if (proformaSnapshot.empty) throw new Error('Payout transaction not found');

    const proformaRef = proformaSnapshot.docs[0].ref;
    const initialProforma = proformaSnapshot.docs[0].data();
    const paymentSnapshot = await this.db.collection(COLLECTIONS.TRANSACTIONS)
      .where('job_id', '==', initialProforma.job_id)
      .where('type', '==', 'escrow')
      .limit(1)
      .get();
    if (paymentSnapshot.empty) throw new Error('Escrow transaction not found');
    const paymentRef = paymentSnapshot.docs[0].ref;

    await this.db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const [proformaDoc, paymentDoc] = await Promise.all([
        transaction.get(proformaRef),
        transaction.get(paymentRef)
      ]);
      const proforma = proformaDoc.data();
      const payment = paymentDoc.data();
      if (!proforma || !payment) throw new Error('Proforma payout resources are inconsistent');
      if (payment.job_id !== proforma.job_id || payment.artisan_uid !== proforma.artisan_uid) {
        throw new Error('Proforma payout ownership mismatch');
      }
      if (!Number.isSafeInteger(data.amount) || data.amount !== proforma.transfer_amount_kobo) {
        throw new Error('Proforma transfer amount mismatch');
      }

      const amount = Number(proforma.total_amount);
      const reserved = Number(payment.proforma_reserved_total || 0);
      const paid = Number(payment.proforma_paid_total || 0);

      if (event === 'transfer.success') {
        if (proforma.payout_status === 'SUCCESS') return;
        if (['FAILED', 'REVERSED'].includes(proforma.payout_status)) {
          throw new Error('Invalid proforma payout state transition');
        }
        if (payment.escrow_status !== 'PROFORMA_RELEASE_PENDING') {
          throw new Error('Invalid proforma escrow state transition');
        }
        transaction.update(proformaRef, {
          status: 'paid',
          payout_status: 'SUCCESS',
          paid_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp()
        });
        transaction.update(paymentRef, {
          escrow_status: 'DISBURSED_PARTIAL',
          proforma_reserved_total: Math.max(0, reserved - amount),
          proforma_paid_total: paid + amount,
          proforma_invoices: FieldValue.arrayUnion({
            invoice_id: proformaDoc.id,
            supplier_name: proforma.supplier_name,
            amount,
            transfer_reference: data.reference,
            status: 'paid'
          }),
          updated_at: FieldValue.serverTimestamp()
        });
        return;
      }

      const nextPayoutStatus = event === 'transfer.reversed' ? 'REVERSED' : 'FAILED';
      if (proforma.payout_status === nextPayoutStatus) return;
      const wasPaid = proforma.payout_status === 'SUCCESS';
      const finalPayoutPending = wasPaid && payment.escrow_status === 'RELEASE_PENDING';
      const finalPayoutCompleted = wasPaid && payment.escrow_status === 'RELEASED';
      transaction.update(proformaRef, {
        status: 'payout_failed',
        payout_status: nextPayoutStatus,
        payout_failed_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      if (finalPayoutPending || finalPayoutCompleted) {
        transaction.update(paymentRef, {
          ...(finalPayoutCompleted ? {
            escrow_status: 'RECONCILIATION_REQUIRED',
            status: 'reconciliation_required'
          } : {}),
          supplier_reversal_pending: true,
          supplier_reversal_amount: amount,
          updated_at: FieldValue.serverTimestamp()
        });
        if (finalPayoutCompleted) {
          const jobRef = this.db.collection(COLLECTIONS.JOBS).doc(payment.job_id);
          transaction.update(jobRef, {
            status: 'payout_issue',
            updated_at: FieldValue.serverTimestamp()
          });
        }
        return;
      }
      transaction.update(paymentRef, {
        escrow_status: wasPaid && paid - amount > 0 ? 'DISBURSED_PARTIAL' : 'HELD',
        proforma_reserved_total: wasPaid ? reserved : Math.max(0, reserved - amount),
        proforma_paid_total: wasPaid ? Math.max(0, paid - amount) : paid,
        updated_at: FieldValue.serverTimestamp()
      });
    });

    this.logOperation('proforma-transfer-event-handled', { event, reference: data.reference });
  }

  async handleRefundEvent(
    event: 'refund.pending' | 'refund.processing' | 'refund.processed' | 'refund.failed',
    data: PaystackRefundData
  ): Promise<void> {
    const reference = data.transaction?.reference;
    if (!reference) throw new Error('Refund transaction reference is required');
    const paymentSnapshot = await this.db.collection(COLLECTIONS.TRANSACTIONS)
      .where('paystack_reference', '==', reference)
      .limit(1)
      .get();
    if (paymentSnapshot.empty) throw new Error('Refund transaction not found');
    const paymentRef = paymentSnapshot.docs[0].ref;

    if (event === 'refund.pending' || event === 'refund.processing') {
      await this.db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
        const paymentDoc = await transaction.get(paymentRef);
        if (paymentDoc.data()?.escrow_status !== 'REFUND_PENDING') {
          throw new Error('Invalid refund state transition');
        }
        transaction.update(paymentRef, {
          refund_status: event === 'refund.pending' ? 'PENDING' : 'PROCESSING',
          paystack_refund_id: data.id || paymentDoc.data()?.paystack_refund_id || null,
          updated_at: FieldValue.serverTimestamp()
        });
      });
      return;
    }

    await this.db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const paymentDoc = await transaction.get(paymentRef);
      const payment = paymentDoc.data();
      if (!payment) throw new Error('Refund transaction not found');
      if (event === 'refund.processed' && payment.escrow_status === 'REFUNDED') return;
      if (event === 'refund.failed' && payment.refund_status === 'FAILED') return;
      if (payment.escrow_status !== 'REFUND_PENDING') {
        throw new Error('Invalid refund state transition');
      }

      const expectedAmount = Number(payment.refund_amount_kobo || payment.expected_amount_kobo);
      const actualAmount = Number(data.deducted_amount ?? data.amount);
      const currency = data.currency || data.transaction?.currency;
      if (event === 'refund.processed'
        && (currency !== 'NGN' || !Number.isSafeInteger(actualAmount) || actualAmount !== expectedAmount)) {
        throw new Error('Refund amount or currency mismatch');
      }
      if (!payment.match_id || !payment.job_id || !payment.artisan_uid) {
        throw new Error('Invalid refund transaction');
      }

      const matchRef = this.db.collection(COLLECTIONS.MATCHES).doc(payment.match_id);
      const jobRef = this.db.collection(COLLECTIONS.JOBS).doc(payment.job_id);
      const artisanRef = this.db.collection(COLLECTIONS.ARTISANS).doc(payment.artisan_uid);
      const [matchDoc, jobDoc, artisanDoc] = await Promise.all([
        transaction.get(matchRef),
        transaction.get(jobRef),
        transaction.get(artisanRef)
      ]);
      if (!matchDoc.exists || !jobDoc.exists) throw new Error('Refund resources are inconsistent');

      if (event === 'refund.failed') {
        transaction.update(paymentRef, {
          escrow_status: 'HELD',
          status: 'held',
          refund_status: 'FAILED',
          refund_failed_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp()
        });
        transaction.update(matchRef, {
          status: 'paid',
          no_response_timer_expiry: null,
          updated_at: FieldValue.serverTimestamp()
        });
        transaction.update(jobRef, {
          status: 'in_progress',
          refund_requires_review: true,
          updated_at: FieldValue.serverTimestamp()
        });
        return;
      }

      transaction.update(paymentRef, {
        escrow_status: 'REFUNDED',
        status: 'refunded',
        refund_status: 'PROCESSED',
        paystack_refund_id: data.id || payment.paystack_refund_id || null,
        refunded_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      transaction.update(matchRef, {
        status: 'refunded',
        updated_at: FieldValue.serverTimestamp()
      });
      transaction.update(jobRef, {
        status: 'refunded',
        updated_at: FieldValue.serverTimestamp()
      });

      if (artisanDoc.exists) {
        const flags = Number(artisanDoc.data()?.no_response_flags || 0) + 1;
        transaction.update(artisanRef, {
          no_response_flags: flags,
          ...(flags >= 3 ? { is_verified: false, is_available: false } : {}),
          updated_at: FieldValue.serverTimestamp()
        });
      }
      const notificationRef = this.db.collection('notifications').doc();
      transaction.set(notificationRef, {
        recipient_uid: payment.artisan_uid,
        type: 'no_response_refund',
        job_id: payment.job_id,
        match_id: payment.match_id,
        message: 'The client was refunded because no response was received before the deadline.',
        read: false,
        created_at: FieldValue.serverTimestamp()
      });
    });

    this.logOperation('refund-event-handled', { event, reference });
  }

  async requestPayout(jobId: string, clientUid: string, matchId: string): Promise<{
    status: 'submitted' | 'processing' | 'released';
    transaction_id: string;
    artisan_receives: number;
    commission_retained: number;
  }> {
    const paymentQuery = await this.db.collection(COLLECTIONS.TRANSACTIONS)
      .where('match_id', '==', matchId)
      .where('type', '==', 'escrow')
      .limit(1)
      .get();
    if (paymentQuery.empty) throw new Error('No escrow transaction found for this match');

    const paymentRef = paymentQuery.docs[0].ref;
    const jobRef = this.db.collection(COLLECTIONS.JOBS).doc(jobId);
    const matchRef = this.db.collection(COLLECTIONS.MATCHES).doc(matchId);
    let payout!: {
      reference: string;
      recipient: string;
      amountInKobo: number;
      amount: number;
      commission: number;
      status?: 'processing' | 'released';
    };

    await this.db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const [jobDoc, matchDoc, paymentDoc] = await Promise.all([
        transaction.get(jobRef),
        transaction.get(matchRef),
        transaction.get(paymentRef)
      ]);
      const job = jobDoc.data();
      const match = matchDoc.data();
      const payment = paymentDoc.data();
      if (!job) throw new Error('Job not found');
      if (job.client_uid !== clientUid) {
        throw new Error('Forbidden: Only the client who posted this job can mark it complete');
      }
      if (!match) throw new Error('Match not found');
      if (match.job_id !== jobId) throw new Error('Match does not belong to this job');
      if (!payment || payment.job_id !== jobId || payment.client_uid !== clientUid) {
        throw new Error('Escrow transaction does not belong to this job');
      }
      if (payment.match_id !== matchId
        || payment.artisan_uid !== match.artisan_uid
        || job.assigned_artisan_uid !== match.artisan_uid
        || job.matched_artisan_uid !== match.artisan_uid) {
        throw new Error('Payout resources are inconsistent');
      }

      const lockedJobValue = Number(payment.amounts?.job_value ?? payment.locked_job_value ?? 0);
      const commission = Number(payment.commission_retained ?? Math.round(lockedJobValue * 10) / 100);
      const proformaPaid = Number(payment.proforma_paid_total ?? (
        Array.isArray(payment.proforma_invoices)
          ? payment.proforma_invoices
            .filter((invoice: any) => invoice.status === 'paid')
            .reduce((sum: number, invoice: any) => sum + Number(invoice.amount || 0), 0)
          : 0
      ));
      const proformaReserved = Number(payment.proforma_reserved_total || 0);
      if (!Number.isFinite(proformaReserved) || proformaReserved > 0) {
        throw new Error('Invalid job state: A supplier payout is still being processed');
      }
      const amount = Math.round((lockedJobValue - commission - proformaPaid) * 100) / 100;
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid artisan payout amount');

      const reference = payment.payout_reference
        || `job-${createHash('sha256').update(`${jobId}:${paymentRef.id}`).digest('hex').slice(0, 40)}`;
      payout = {
        reference,
        recipient: '',
        amountInKobo: Math.round(amount * 100),
        amount,
        commission
      };

      if (payment.escrow_status === 'RELEASED' || payment.status === 'released') {
        payout.status = 'released';
        return;
      }
      if (['PROCESSING', 'SUBMITTED', 'RECONCILIATION_REQUIRED'].includes(payment.payout_status)) {
        payout.status = 'processing';
        return;
      }
      if (!['HELD', 'DISBURSED_PARTIAL'].includes(payment.escrow_status) || job.status !== 'in_progress') {
        throw new Error('Invalid job state: Escrow is not available for payout');
      }
      if (match.status !== 'paid') {
        throw new Error('Invalid job state: The selected match is not paid');
      }

      const privateProfileRef = this.db.collection('artisan_private').doc(match.artisan_uid);
      const privateProfileDoc = await transaction.get(privateProfileRef);
      const recipient = privateProfileDoc.data()?.paystack_recipient_code;
      if (!recipient) throw new Error('Artisan payout account is not configured');
      payout.recipient = recipient;

      transaction.update(paymentRef, {
        payout_reference: reference,
        payout_amount_kobo: payout.amountInKobo,
        payout_status: 'PROCESSING',
        completion_requested_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      transaction.update(jobRef, {
        completion_requested: true,
        updated_at: FieldValue.serverTimestamp()
      });
    });

    if (payout.status) {
      return {
        status: payout.status,
        transaction_id: paymentRef.id,
        artisan_receives: payout.amount,
        commission_retained: payout.commission
      };
    }

    try {
      const transfer = await initiateTransfer(
        payout.recipient,
        payout.amountInKobo,
        `Payment for job ${jobId}`,
        payout.reference
      );
      if (!transfer?.status) throw new Error('Paystack rejected the transfer');
      await paymentRef.update({
        payout_status: 'SUBMITTED',
        escrow_status: 'RELEASE_PENDING',
        payout_submitted_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
    } catch (error) {
      // A network failure can occur after Paystack accepted the transfer. Keep
      // the deterministic reference and wait for a signed webhook or admin
      // reconciliation instead of risking a duplicate payout.
      await paymentRef.update({
        payout_status: 'RECONCILIATION_REQUIRED',
        escrow_status: 'RELEASE_PENDING',
        payout_error_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
      throw error;
    }

    return {
      status: 'submitted',
      transaction_id: paymentRef.id,
      artisan_receives: payout.amount,
      commission_retained: payout.commission
    };
  }

  async verifyPayment(reference: string, callerUid: string): Promise<{
    reference: string;
    status: string;
    amount: number;
  }> {
    if (!/^[a-z0-9_-]{8,64}$/i.test(reference)) throw new Error('Invalid payment reference');
    const localPayment = await this.getTransactionByReference(reference);
    if (!localPayment) throw new Error('Transaction not found');
    if (localPayment.client_uid !== callerUid) {
      throw new Error('Forbidden: You do not own this payment');
    }

    const response = await verifyTransaction(reference);
    const data = response?.data;
    if (!data) throw new Error('Invalid Paystack verification response');
    if (data.status === 'success') await this.handlePaymentSuccess(data);

    return {
      reference,
      status: String(data.status || 'unknown'),
      amount: Number(data.amount || 0) / 100
    };
  }

  async getTransactionByReference(reference: string): Promise<Transaction | null> {
    const snapshot = await this.db.collection(COLLECTIONS.TRANSACTIONS)
      .where('paystack_reference', '==', reference)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Transaction;
  }
}
