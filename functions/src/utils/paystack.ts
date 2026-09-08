import axios from 'axios';
import * as crypto from 'crypto';
import { Logger } from './logger';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function paystackSecretKey(): string {
  const value = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!value || !/^sk_(test|live)_/.test(value)) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }
  return value;
}

function assertReference(reference: string): void {
  if (!/^[a-z0-9_-]{8,64}$/i.test(reference)) {
    throw new Error('Invalid Paystack reference');
  }
}

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
    assertReference(params.reference);
    if (!Number.isSafeInteger(params.amount) || params.amount <= 0) {
      throw new Error('Payment amount must be a positive integer in kobo');
    }
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      params,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey()}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
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
  payload: string | Buffer,
  signature: string
): boolean {
  try {
    if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
    const hash = crypto
      .createHmac('sha512', paystackSecretKey())
      .update(payload)
      .digest();
    const candidate = Buffer.from(signature, 'hex');
    return candidate.length === hash.length && crypto.timingSafeEqual(hash, candidate);
  } catch {
    return false;
  }
}

/**
 * Verify a payment transaction
 */
export async function verifyTransaction(reference: string): Promise<any> {
  try {
    assertReference(reference);
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey()}`,
        },
        timeout: 15_000,
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
    if (!name.trim() || !/^\d{10}$/.test(account_number) || !/^\d{3,6}$/.test(bank_code)) {
      throw new Error('Invalid transfer recipient details');
    }
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
          Authorization: `Bearer ${paystackSecretKey()}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      }
    );
    return response.data.data.recipient_code;
  } catch (error: any) {
    Logger.error('Paystack create recipient error:', error.response?.data || error.message);
    throw new Error('Failed to create transfer recipient');
  }
}

export type PaystackBank = {
  name: string;
  code: string;
};

export async function listNigerianBanks(): Promise<PaystackBank[]> {
  try {
    const response = await axios.get(`${PAYSTACK_BASE_URL}/bank`, {
      params: { country: 'nigeria', currency: 'NGN', type: 'nuban', perPage: 100 },
      headers: { Authorization: `Bearer ${paystackSecretKey()}` },
      timeout: 15_000
    });
    const banks = Array.isArray(response.data?.data) ? response.data.data : [];
    return banks
      .filter((bank: any) => bank?.active !== false && typeof bank?.name === 'string' && /^\d{3,6}$/.test(String(bank?.code || '')))
      .map((bank: any) => ({ name: bank.name.trim(), code: String(bank.code) }))
      .sort((left: PaystackBank, right: PaystackBank) => left.name.localeCompare(right.name));
  } catch (error: any) {
    Logger.error('Paystack bank list error:', error.response?.data || error.message);
    throw new Error('Failed to load supported banks');
  }
}

export async function resolveBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<{ account_number: string; account_name: string }> {
  try {
    if (!/^\d{10}$/.test(accountNumber) || !/^\d{3,6}$/.test(bankCode)) {
      throw new Error('Invalid bank account details');
    }
    const response = await axios.get(`${PAYSTACK_BASE_URL}/bank/resolve`, {
      params: { account_number: accountNumber, bank_code: bankCode },
      headers: { Authorization: `Bearer ${paystackSecretKey()}` },
      timeout: 15_000
    });
    const account = response.data?.data;
    if (account?.account_number !== accountNumber || typeof account?.account_name !== 'string' || !account.account_name.trim()) {
      throw new Error('Bank account could not be verified');
    }
    return {
      account_number: account.account_number,
      account_name: account.account_name.trim()
    };
  } catch (error: any) {
    Logger.error('Paystack bank resolution error:', error.response?.data || error.message);
    throw new Error('Failed to verify bank account');
  }
}

/**
 * Initiate a Transfer
 */
export async function initiateTransfer(
  recipient: string,
  amountInKobo: number,
  reason: string = 'Artiva Job Payment',
  reference?: string
): Promise<any> {
  try {
    if (!/^RCP_[A-Za-z0-9]+$/.test(recipient)) {
      throw new Error('Invalid Paystack recipient code');
    }
    if (!Number.isSafeInteger(amountInKobo) || amountInKobo <= 0) {
      throw new Error('Transfer amount must be a positive integer in kobo');
    }
    if (reference) assertReference(reference);
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transfer`,
      {
        source: 'balance',
        amount: amountInKobo,
        recipient,
        reason: reason.slice(0, 100),
        ...(reference ? { reference } : {})
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey()}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      }
    );
    return response.data;
  } catch (error: any) {
    Logger.error('Paystack initiate transfer error:', error.response?.data || error.message);
    throw new Error('Failed to initiate transfer');
  }
}
