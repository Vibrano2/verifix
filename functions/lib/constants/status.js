"use strict";
/**
 * Status Constants
 * Centralized status enums for jobs, transactions, and verification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidVerificationStatus = exports.isValidTransactionStatus = exports.isValidJobStatus = exports.MATCH_STATUS = exports.VERIFICATION_STATUS = exports.TRANSACTION_STATUS = exports.JOB_STATUS = void 0;
exports.JOB_STATUS = {
    OPEN: 'open',
    MATCHED: 'matched',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};
exports.TRANSACTION_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    RELEASED: 'released',
    HELD: 'held'
};
exports.VERIFICATION_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};
exports.MATCH_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    COMPLETED: 'completed'
};
/**
 * Validation helpers
 */
const isValidJobStatus = (status) => {
    return Object.values(exports.JOB_STATUS).includes(status);
};
exports.isValidJobStatus = isValidJobStatus;
const isValidTransactionStatus = (status) => {
    return Object.values(exports.TRANSACTION_STATUS).includes(status);
};
exports.isValidTransactionStatus = isValidTransactionStatus;
const isValidVerificationStatus = (status) => {
    return Object.values(exports.VERIFICATION_STATUS).includes(status);
};
exports.isValidVerificationStatus = isValidVerificationStatus;
//# sourceMappingURL=status.js.map