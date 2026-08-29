import * as admin from 'firebase-admin';
import { z } from 'zod';

export type ProformaStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface ProformaInvoice {
  id?: string;
  job_id: string;
  artisan_uid: string;
  supplier_name: string;
  supplier_recipient_code?: string; // Paystack transfer recipient code for direct payout
  total_amount: number;
  invoice_document_url: string;
  status: ProformaStatus;
  admin_notes?: string;
  transfer_reference?: string | null; // Paystack transfer_code set on approval
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
}

export const CreateProformaSchema = z.object({
  body: z.object({
    job_id: z.string(),
    supplier_name: z.string().min(2),
    supplier_recipient_code: z.string().optional(),
    total_amount: z.number().positive(),
    // Accept both field names: invoice_document_url (canonical) or receipt_url (frontend alias)
    invoice_document_url: z.string().url().optional(),
    receipt_url: z.string().url().optional(),
    // Additional frontend-submitted fields (ignored by service, stored for audit)
    materials_cost: z.number().nonnegative().optional(),
    labor_cost: z.number().nonnegative().optional(),
    items: z.array(z.any()).optional()
  }).refine(
    data => !!(data.invoice_document_url || data.receipt_url),
    { message: 'invoice_document_url or receipt_url is required', path: ['invoice_document_url'] }
  )
});

export type CreateProformaDTO = z.infer<typeof CreateProformaSchema>['body'];
