import axios from 'axios';
import * as crypto from 'crypto';
import { Logger } from './logger';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Initialize a Paystack payment
 */
export async function initializePayment(params: {
  email: string;
  amount: number; // in kobo (₦1 = 100 kobo)
  reference: string;
  metadata?: Record<string, any>;
}): Promise<any> {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      params,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    Logger.error('Paystack initialization error:', error.response?.data || error.message);
    throw new Error('Failed to initialize payment');
  }
}

/**
 * Verify Paystack webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest('hex');
  
  return hash === signature;
}

/**
 * Verify a payment transaction
 */
export async function verifyTransaction(reference: string): Promise<any> {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    Logger.error('Paystack verification error:', error.response?.data || error.message);
    throw new Error('Failed to verify transaction');
  }
}

/**
 * Create a Transfer Recipient
 */
export async function createTransferRecipient(
  name: string,
  account_number: string,
  bank_code: string
): Promise<string> {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transferrecipient`,
      {
        type: 'nuban',
        name,
        account_number,
        bank_code,
        currency: 'NGN'
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.data.recipient_code;
  } catch (error: any) {
    Logger.error('Paystack create recipient error:', error.response?.data || error.message);
    throw new Error('Failed to create transfer recipient');
  }
}

/**
 * Initiate a Transfer
 */
export async function initiateTransfer(
  recipient: string,
  amount: number, // in kobo
  reason: string = 'Artiva Job Payment'
): Promise<any> {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transfer`,
      {
        source: 'balance',
        amount,
        recipient,
        reason
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    Logger.error('Paystack initiate transfer error:', error.response?.data || error.message);
    throw new Error('Failed to initiate transfer');
  }
}
