/**
 * Status Constants
 * Centralized status enums for jobs, transactions, and verification
 */

export const JOB_STATUS = {
  OPEN: 'open',
  MATCHED: 'matched',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  RELEASED: 'released',
  HELD: 'held'
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export type VerificationStatus = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];

export const MATCH_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  COMPLETED: 'completed'
} as const;

export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];

/**
 * Validation helpers
 */
export const isValidJobStatus = (status: string): status is JobStatus => {
  return Object.values(JOB_STATUS).includes(status as JobStatus);
};

export const isValidTransactionStatus = (status: string): status is TransactionStatus => {
  return Object.values(TRANSACTION_STATUS).includes(status as TransactionStatus);
};

export const isValidVerificationStatus = (status: string): status is VerificationStatus => {
  return Object.values(VERIFICATION_STATUS).includes(status as VerificationStatus);
};
