import * as admin from 'firebase-admin';
import { z } from 'zod';

export type ProformaStatus =
  | 'pending'
  | 'approval_pending'
  | 'rejected'
  | 'paid'
  | 'payout_failed';

export interface ProformaInvoice {
  id?: string;
  job_id: string;
  artisan_uid: string;
  supplier_name: string;
  supplier_recipient_code?: string;
  total_amount: number;
  invoice_document_path: string;
  invoice_document_url?: string;
  status: ProformaStatus;
  payout_status?: string;
  admin_notes?: string;
  transfer_reference?: string | null;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
}

const money = z.number().finite().positive().max(100_000_000)
  .refine(value => Math.abs(Math.round(value * 100) - value * 100) < 1e-8, 'Use at most two decimal places');

export const CreateProformaSchema = z.object({
  body: z.object({
    job_id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    supplier_name: z.string().trim().min(2).max(120),
    total_amount: money,
    invoice_document_path: z.string().min(1).max(512).regex(
      /^proforma_documents\/[^/]{1,128}\/[A-Za-z0-9_-]{1,128}\/[A-Fa-f0-9-]{36}\.(?:jpg|png|pdf)$/,
      'Upload the invoice through the proforma upload endpoint'
    ),
    materials_cost: z.number().finite().nonnegative().max(100_000_000).optional(),
    items: z.array(z.object({
      description: z.string().trim().min(1).max(300),
      quantity: z.number().finite().positive().max(100_000),
      unit_price: z.number().finite().nonnegative().max(100_000_000)
    }).strict()).max(50).optional()
  }).strict()
});

export type CreateProformaDTO = z.infer<typeof CreateProformaSchema>['body'];
