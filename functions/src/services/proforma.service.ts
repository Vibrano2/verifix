import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { BaseService } from './base.service';
import { ProformaInvoice, CreateProformaDTO } from '../models/proforma.model';
import { initiateTransfer } from '../utils/paystack';

type SubmissionAccess = {
  jobRef: admin.firestore.DocumentReference;
  matchRef: admin.firestore.DocumentReference;
};

export class ProformaService extends BaseService {
  private get db(): admin.firestore.Firestore { return admin.firestore(); }

  private lockId(jobId: string, artisanUid: string): string {
    return createHash('sha256').update(`${jobId}:${artisanUid}`).digest('hex');
  }

  async assertCanSubmit(artisanUid: string, jobId: string): Promise<SubmissionAccess> {
    const jobRef = this.db.collection('jobs').doc(jobId);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) throw new Error('Job not found');
    const job = jobDoc.data()!;
    if (job.status !== 'in_progress'
      || job.assigned_artisan_uid !== artisanUid
      || job.matched_artisan_uid !== artisanUid) {
      throw new Error('Forbidden: You are not the paid, assigned artisan for this job');
    }

    const matches = await this.db.collection('matches')
      .where('job_id', '==', jobId)
      .where('artisan_uid', '==', artisanUid)
      .where('status', '==', 'paid')
      .limit(1)
      .get();
    if (matches.empty) {
      throw new Error('Forbidden: You are not the paid, assigned artisan for this job');
    }
    return { jobRef, matchRef: matches.docs[0].ref };
  }

  async submitProforma(artisanUid: string, data: CreateProformaDTO): Promise<ProformaInvoice> {
    try {
      const access = await this.assertCanSubmit(artisanUid, data.job_id);
      const expectedPathPrefix = `proforma_documents/${artisanUid}/${data.job_id}/`;
      if (!data.invoice_document_path.startsWith(expectedPathPrefix)) {
        throw new Error('Invoice document does not belong to this artisan and job');
      }

      const invoiceRef = this.db.collection('proformas').doc();
      const lockRef = this.db.collection('proforma_locks').doc(this.lockId(data.job_id, artisanUid));
      const invoiceData: ProformaInvoice = {
        ...data,
        artisan_uid: artisanUid,
        status: 'pending',
        created_at: admin.firestore.FieldValue.serverTimestamp() as any,
        updated_at: admin.firestore.FieldValue.serverTimestamp() as any
      };

      await this.db.runTransaction(async transaction => {
        const [jobDoc, matchDoc, lockDoc] = await Promise.all([
          transaction.get(access.jobRef),
          transaction.get(access.matchRef),
          transaction.get(lockRef)
        ]);
        const job = jobDoc.data();
        const match = matchDoc.data();
        if (!job || job.status !== 'in_progress'
          || job.assigned_artisan_uid !== artisanUid
          || job.matched_artisan_uid !== artisanUid
          || !match || match.status !== 'paid'
          || match.job_id !== data.job_id
          || match.artisan_uid !== artisanUid) {
          throw new Error('Forbidden: This job is no longer eligible for a proforma');
        }
        if (lockDoc.exists) throw new Error('A proforma already exists for this job');

        transaction.create(invoiceRef, invoiceData);
        transaction.create(lockRef, {
          invoice_id: invoiceRef.id,
          job_id: data.job_id,
          artisan_uid: artisanUid,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.update(access.matchRef, {
          artisan_responded_at: admin.firestore.FieldValue.serverTimestamp(),
          no_response_timer_expiry: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      this.logOperation('proforma-submitted', {
        proformaId: invoiceRef.id,
        jobId: data.job_id,
        artisanUid
      });
      return { id: invoiceRef.id, ...invoiceData, created_at: new Date() };
    } catch (error) {
      this.handleError(error, 'Submit proforma invoice');
    }
  }

  private async addReviewUrl(invoice: ProformaInvoice): Promise<ProformaInvoice> {
    if (!invoice.invoice_document_path) return invoice;
    try {
      const [invoice_document_url] = await getStorage().bucket()
        .file(invoice.invoice_document_path)
        .getSignedUrl({ action: 'read', expires: Date.now() + 10 * 60 * 1000 });
      return { ...invoice, invoice_document_url };
    } catch (error) {
      this.logger.error('Failed to create proforma review URL', { id: invoice.id, error });
      return invoice;
    }
  }

  async getJobProformas(jobId: string, uid: string, isAdmin = false): Promise<ProformaInvoice[]> {
    try {
      if (!isAdmin) {
        const jobDoc = await this.db.collection('jobs').doc(jobId).get();
        const isClient = jobDoc.data()?.client_uid === uid;
        let isArtisan = false;
        if (!isClient) {
          const matchSnapshot = await this.db.collection('matches')
            .where('job_id', '==', jobId)
            .where('artisan_uid', '==', uid)
            .where('status', 'in', ['paid', 'completed', 'payout_issue'])
            .limit(1)
            .get();
          isArtisan = !matchSnapshot.empty;
        }
        if (!isClient && !isArtisan) {
          throw new Error('Forbidden: You do not have access to this job');
        }
      }

      const snapshot = await this.db.collection('proformas')
        .where('job_id', '==', jobId)
        .orderBy('created_at', 'desc')
        .limit(100)
        .get();
      return Promise.all(snapshot.docs.map(doc => this.addReviewUrl({
        id: doc.id,
        ...doc.data()
      } as ProformaInvoice)));
    } catch (error) {
      this.handleError(error, 'Get job proformas');
    }
  }

  async getAdminQueue(): Promise<ProformaInvoice[]> {
    try {
      const snapshot = await this.db.collection('proformas')
        .where('status', 'in', ['pending', 'approval_pending', 'payout_failed'])
        .orderBy('created_at', 'desc')
        .limit(100)
        .get();
      return Promise.all(snapshot.docs.map(doc => this.addReviewUrl({
        id: doc.id,
        ...doc.data()
      } as ProformaInvoice)));
    } catch (error) {
      this.handleError(error, 'Get proforma queue');
    }
  }

  async approveProforma(
    proformaId: string,
    supplierRecipientCode: string,
    notes?: string
  ): Promise<void> {
    try {
      if (!/^RCP_[A-Za-z0-9]+$/.test(supplierRecipientCode)) {
        throw new Error('A valid, pre-vetted supplier recipient code is required');
      }
      const docRef = this.db.collection('proformas').doc(proformaId);
      const doc = await docRef.get();
      if (!doc.exists) throw new Error('Proforma invoice not found');
      const proformaData = doc.data()!;
      const txSnapshot = await this.db.collection('transactions')
        .where('job_id', '==', proformaData.job_id)
        .where('type', '==', 'escrow')
        .where('escrow_status', 'in', ['HELD', 'DISBURSED_PARTIAL'])
        .limit(1)
        .get();
      if (txSnapshot.empty) throw new Error('No held escrow is available for this proforma');

      const txRef = txSnapshot.docs[0].ref;
      const amount = Number(proformaData.total_amount);
      const amountInKobo = Math.round(amount * 100);
      if (!Number.isSafeInteger(amountInKobo) || amountInKobo <= 0) {
        throw new Error('Invalid supplier payout amount');
      }
      const transferReference = `pro-${createHash('sha256')
        .update(`${proformaId}:${txRef.id}`)
        .digest('hex')
        .slice(0, 40)}`;

      await this.db.runTransaction(async transaction => {
        const [freshProforma, freshPayment] = await Promise.all([
          transaction.get(docRef),
          transaction.get(txRef)
        ]);
        const invoice = freshProforma.data();
        const payment = freshPayment.data();
        if (!invoice || invoice.status !== 'pending') {
          throw new Error(`Proforma is already ${invoice?.status || 'unavailable'}`);
        }
        if (!payment || !['HELD', 'DISBURSED_PARTIAL'].includes(payment.escrow_status)) {
          throw new Error('No held escrow is available for this proforma');
        }
        if (payment.job_id !== invoice.job_id || payment.artisan_uid !== invoice.artisan_uid) {
          throw new Error('Proforma and escrow ownership mismatch');
        }

        const lockedValue = Number(payment.amounts?.job_value ?? payment.locked_job_value ?? 0);
        const commission = Number(payment.commission_retained ?? Math.round(lockedValue * 10) / 100);
        const reserved = Number(payment.proforma_reserved_total || 0);
        const paid = Number(payment.proforma_paid_total || 0);
        const available = Math.round((lockedValue - commission - reserved - paid) * 100) / 100;
        if (amount > available) throw new Error('Proforma amount exceeds available escrow funds');

        transaction.update(docRef, {
          status: 'approval_pending',
          payout_status: 'PROCESSING',
          supplier_recipient_code: supplierRecipientCode,
          admin_notes: notes || null,
          transfer_reference: transferReference,
          transfer_amount_kobo: amountInKobo,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.update(txRef, {
          escrow_status: 'PROFORMA_RELEASE_PENDING',
          proforma_reserved_total: reserved + amount,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      try {
        const transfer = await initiateTransfer(
          supplierRecipientCode,
          amountInKobo,
          `Artiva proforma invoice ${proformaId}`,
          transferReference
        );
        if (!transfer?.status) throw new Error('Paystack rejected the supplier transfer');
        await docRef.update({
          payout_status: 'SUBMITTED',
          payout_submitted_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        await docRef.update({
          payout_status: 'RECONCILIATION_REQUIRED',
          payout_error_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        throw error;
      }

      this.logOperation('proforma-payout-submitted', {
        proformaId,
        jobId: proformaData.job_id,
        transferReference
      });
    } catch (error) {
      this.handleError(error, 'Approve proforma');
    }
  }

  async rejectProforma(proformaId: string, reason: string): Promise<void> {
    try {
      const docRef = this.db.collection('proformas').doc(proformaId);
      await this.db.runTransaction(async transaction => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) throw new Error('Proforma invoice not found');
        const invoice = doc.data()!;
        if (invoice.status !== 'pending') {
          throw new Error(`Proforma is already ${invoice.status}`);
        }
        const lockRef = this.db.collection('proforma_locks')
          .doc(this.lockId(invoice.job_id, invoice.artisan_uid));
        transaction.update(docRef, {
          status: 'rejected',
          admin_notes: reason.trim().slice(0, 1000),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.delete(lockRef);
      });
      this.logOperation('proforma-rejected', { proformaId });
    } catch (error) {
      this.handleError(error, 'Reject proforma');
    }
  }
}
