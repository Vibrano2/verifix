import * as admin from 'firebase-admin';
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
        .where('status', '==', 'accepted')
        .limit(1)
        .get();

      if (matchSnapshot.empty) {
        throw new Error('Forbidden: You are not the assigned artisan for this job');
      }

      const invoiceData: ProformaInvoice = {
        ...data,
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

      await docRef.update({
        status: 'approved',
        admin_notes: notes || null,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Fetch corresponding escrow transaction
      const txSnapshot = await this.db.collection('transactions')
        .where('job_id', '==', proformaData.job_id)
        .where('type', '==', 'escrow')
        .where('escrow_status', '==', 'HELD')
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
            status: 'approved'
          }),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      this.logOperation('proforma-approved', { proformaId, jobId: proformaData.job_id });
      
      // Note: A real implementation would trigger Paystack Transfer here
      // to release the partial escrow to the supplier's bank account.
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
