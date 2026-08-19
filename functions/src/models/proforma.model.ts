import * as admin from 'firebase-admin';
import { z } from 'zod';

export type ProformaStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface ProformaInvoice {
  id?: string;
  job_id: string;
  artisan_uid: string;
  supplier_name: string;
  supplier_bank_details: {
    account_name: string;
    account_number: string;
    bank_code: string;
  };
  total_amount: number;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  invoice_document_url?: string;
  status: ProformaStatus;
  admin_notes?: string;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
}

export const ProformaItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  total: z.number().positive()
});

export const CreateProformaSchema = z.object({
  body: z.object({
    job_id: z.string(),
    supplier_name: z.string().min(2),
    supplier_bank_details: z.object({
      account_name: z.string(),
      account_number: z.string(),
      bank_code: z.string()
    }),
    total_amount: z.number().positive(),
    items: z.array(ProformaItemSchema).min(1),
    invoice_document_url: z.string().url().optional()
  })
});

export type CreateProformaDTO = z.infer<typeof CreateProformaSchema>['body'];
