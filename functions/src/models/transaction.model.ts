/**
 * Transaction Model
 * Defines the Transaction/Payment data structure
 */

import * as admin from 'firebase-admin';

export type TransactionType = 'escrow' | 'contact_reveal' | 'commission';

export type TransactionStatus = 
  | 'pending' 
  | 'completed' 
  | 'released' 
  | 'held'
  | 'failed'
  | 'refunded';

export interface Transaction {
  id: string;
  job_id?: string;
  match_id?: string;
  client_uid: string;
  artisan_uid?: string;
  type: TransactionType;
  
  // v1.9 Schema
  amounts: {
    job_value: number;
    platform_match_fee: number;
    total_charged: number;
    artisan_net_labor: number;
  };
  escrow_status: 'HELD' | 'DISBURSED_PARTIAL' | 'RELEASED' | 'REFUNDED' | 'PENDING' | 'COMPLETED' | 'FAILED';
  proforma_invoices?: Array<{
    invoice_id: string;
    supplier_name: string;
    amount: number;
    status: string;
  }>;
  paystack_reference: string;
  refund_reason?: string;

  // Legacy fields (optional if maintaining backward compat in code)
  amount?: number;
  commission_retained?: number;
  locked_job_value?: number;
  status?: TransactionStatus;

  paystack_authorization?: any;
  metadata?: Record<string, any>;
  created_at: Date | admin.firestore.Timestamp;
  updated_at?: Date | admin.firestore.Timestamp;
  released_at?: Date | admin.firestore.Timestamp;
}

export interface CreateTransactionDTO {
  job_id?: string;
  match_id?: string;
  client_uid: string;
  artisan_uid?: string;
  type: TransactionType;
  
  amounts: {
    job_value: number;
    platform_match_fee: number;
    total_charged: number;
    artisan_net_labor: number;
  };
  escrow_status: 'HELD' | 'DISBURSED_PARTIAL' | 'RELEASED' | 'REFUNDED' | 'PENDING' | 'COMPLETED' | 'FAILED';
  
  paystack_reference: string;
  metadata?: Record<string, any>;
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    customer: {
      email: string;
      phone: string;
    };
    metadata?: Record<string, any>;
    authorization?: any;
  };
}

export interface PaymentInitializationResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}
