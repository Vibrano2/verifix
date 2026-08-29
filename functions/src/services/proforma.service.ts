import * as admin from 'firebase-admin';
import axios from 'axios';
import { BaseService } from './base.service';
import { ProformaInvoice, CreateProformaDTO } from '../models/proforma.model';

export class ProformaService extends BaseService {
  private get db() { return admin.firestore(); }

  async submitProforma(artisanUid: string, data: CreateProformaDTO): Promise<ProformaInvoice> {
    try {
      // Verify job ownership
      const jobDoc = await this.db.collection('jobs').doc(data.job_id).get();
      if (!jobDoc.exists) throw new Error('Job not found');
      
      const matchSnapshot = await this.db.collection('matches')
        .where('job_id', '==', data.job_id)
        .where('artisan_uid', '==', artisanUid)
        .limit(1)
        .get();

      const isAssigned = !matchSnapshot.empty || jobDoc.data()?.matched_artisan_uid === artisanUid;

      if (!isAssigned) {
        throw new Error('Forbidden: You are not the assigned artisan for this job');
      }

      // Normalise: frontend sends receipt_url, canonical field is invoice_document_url
      const invoiceDocUrl = data.invoice_document_url || (data as any).receipt_url || '';

      const invoiceData: ProformaInvoice = {
        ...data,
        invoice_document_url: invoiceDocUrl,
        artisan_uid: artisanUid,
        status: 'pending',
        created_at: admin.firestore.FieldValue.serverTimestamp() as any
      };

      const docRef = await this.db.collection('proformas').add(invoiceData);
      
      this.logOperation('proforma-submitted', { 
        proformaId: docRef.id, 
        jobId: data.job_id, 
        artisanUid 
      });

      return {
        id: docRef.id,
        ...invoiceData,
        created_at: new Date()
      } as ProformaInvoice;
    } catch (error) {
      this.handleError(error, 'Submit proforma invoice');
    }
  }

  async getJobProformas(jobId: string, uid: string, isAdmin: boolean = false): Promise<ProformaInvoice[]> {
    try {
      if (!isAdmin) {
        // Verify access: must be client or artisan
        const jobDoc = await this.db.collection('jobs').doc(jobId).get();
        const isClient = jobDoc.data()?.client_uid === uid;
        
        let isArtisan = false;
        if (!isClient) {
          const matchSnapshot = await this.db.collection('matches')
            .where('job_id', '==', jobId)
            .where('artisan_uid', '==', uid)
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
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProformaInvoice[];
    } catch (error) {
      this.handleError(error, 'Get job proformas');
    }
  }

  async getAdminQueue(): Promise<ProformaInvoice[]> {
    try {
      const snapshot = await this.db.collection('proformas')
        .where('status', 'in', ['pending'])
        .orderBy('created_at', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProformaInvoice[];
    } catch (error) {
      this.handleError(error, 'Get proforma queue');
    }
  }

  async approveProforma(proformaId: string, notes?: string): Promise<void> {
    try {
      const docRef = this.db.collection('proformas').doc(proformaId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new Error('Proforma invoice not found');
      }
      
      const proformaData = doc.data()!;

      if (proformaData.status !== 'pending') {
        throw new Error(`Proforma is already ${proformaData.status}`);
      }

      // 1. Trigger Paystack Transfer to supplier's recipient code
      const supplierAmount = Math.round((proformaData.total_amount || 0) * 100); // kobo
      let transferReference: string | null = null;

      if (proformaData.supplier_recipient_code && supplierAmount > 0) {
        const paystackKey = process.env.PAYSTACK_SECRET_KEY || '';
        try {
          const transferRes = await axios.post(
            'https://api.paystack.co/transfer',
            {
              source: 'balance',
              amount: supplierAmount,
              recipient: proformaData.supplier_recipient_code,
              reason: `Artiva proforma payout — invoice ${proformaId}`
            },
            {
              headers: {
                Authorization: `Bearer ${paystackKey}`,
                'Content-Type': 'application/json'
              }
            }
          );
          transferReference = transferRes.data?.data?.transfer_code || null;
        } catch (transferErr: any) {
          this.logger.error('Paystack Transfer failed for proforma', {
            proformaId,
            error: transferErr.response?.data?.message || transferErr.message
          });
          // Do not abort — admin manually arranges payment; still update Firestore state
        }
      } else {
        this.logger.warn('No supplier_recipient_code on proforma — skipping automated transfer', { proformaId });
      }

      // 2. Update proforma status
      await docRef.update({
        status: 'approved',
        admin_notes: notes || null,
        transfer_reference: transferReference,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Update escrow transaction to DISBURSED_PARTIAL
      const txSnapshot = await this.db.collection('transactions')
        .where('job_id', '==', proformaData.job_id)
        .where('type', '==', 'escrow')
        .where('escrow_status', 'in', ['HELD', 'DISBURSED_PARTIAL'])
        .limit(1)
        .get();

      if (!txSnapshot.empty) {
        const txDoc = txSnapshot.docs[0];
        await txDoc.ref.update({
          escrow_status: 'DISBURSED_PARTIAL',
          proforma_invoices: admin.firestore.FieldValue.arrayUnion({
            invoice_id: proformaId,
            supplier_name: proformaData.supplier_name,
            amount: proformaData.total_amount,
            transfer_reference: transferReference,
            status: 'approved'
          }),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      this.logOperation('proforma-approved', { proformaId, jobId: proformaData.job_id, transferReference });
    } catch (error) {
      this.handleError(error, 'Approve proforma');
    }
  }

  async rejectProforma(proformaId: string, reason: string): Promise<void> {
    try {
      const docRef = this.db.collection('proformas').doc(proformaId);
      await docRef.update({
        status: 'rejected',
        admin_notes: reason,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      this.logOperation('proforma-rejected', { proformaId });
    } catch (error) {
      this.handleError(error, 'Reject proforma');
    }
  }
}
