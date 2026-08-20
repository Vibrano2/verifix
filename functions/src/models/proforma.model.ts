import * as admin from 'firebase-admin';
import { z } from 'zod';

export type ProformaStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface ProformaInvoice {
  id?: string;
  job_id: string;
  artisan_uid: string;
  supplier_name: string;
  total_amount: number;
  invoice_document_url: string;
  status: ProformaStatus;
  admin_notes?: string;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
}



export const CreateProformaSchema = z.object({
  body: z.object({
    job_id: z.string(),
    supplier_name: z.string().min(2),
    total_amount: z.number().positive(),
    invoice_document_url: z.string().url()
  })
});

export type CreateProformaDTO = z.infer<typeof CreateProformaSchema>['body'];
