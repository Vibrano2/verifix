"use strict";
/**
 * Payment Service
 * Business logic for Paystack payment operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const base_service_1 = require("./base.service");
const constants_1 = require("../constants");
class PaymentService extends base_service_1.BaseService {
    constructor() {
        super();
        this.paystackBaseUrl = 'https://api.paystack.co';
        this.db = admin.firestore();
        this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
    }
    /**
     * Verify Paystack webhook signature
     */
    verifyWebhookSignature(signature, body) {
        try {
            const crypto = require('crypto');
            const hash = crypto
                .createHmac('sha512', this.paystackSecretKey)
                .update(body)
                .digest('hex');
            return hash === signature;
        }
        catch (error) {
            this.logger.error('Webhook signature verification failed', { error });
            return false;
        }
    }
    /**
     * Handle successful payment webhook
     */
    async handlePaymentSuccess(reference) {
        try {
            // Find transaction by reference
            const snapshot = await this.db
                .collection(constants_1.COLLECTIONS.TRANSACTIONS)
                .where('paystack_reference', '==', reference)
                .limit(1)
                .get();
            if (snapshot.empty) {
                throw new Error(`Transaction not found for reference: ${reference}`);
            }
            const transactionDoc = snapshot.docs[0];
            const transaction = transactionDoc.data();
            // Update transaction to held (for escrow) or completed (for other types)
            const newStatus = transaction.type === 'escrow' ? 'held' : 'completed';
            await transactionDoc.ref.update({
                status: newStatus,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            this.logOperation('payment-success-handled', { reference, newStatus });
        }
        catch (error) {
            this.handleError(error, 'Handle payment success');
        }
    }
    /**
     * Verify payment status with Paystack API
     */
    async verifyPayment(reference) {
        try {
            const response = await axios_1.default.get(`${this.paystackBaseUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.paystackSecretKey}`
                }
            });
            const { status, amount, metadata } = response.data.data;
            return {
                status,
                amount: amount / 100, // Convert from kobo
                metadata
            };
        }
        catch (error) {
            this.handleError(error, 'Verify payment');
        }
    }
    /**
     * Get transaction by reference
     */
    async getTransactionByReference(reference) {
        try {
            const snapshot = await this.db
                .collection(constants_1.COLLECTIONS.TRANSACTIONS)
                .where('paystack_reference', '==', reference)
                .limit(1)
                .get();
            if (snapshot.empty) {
                return null;
            }
            const doc = snapshot.docs[0];
            return Object.assign({ id: doc.id }, doc.data());
        }
        catch (error) {
            this.handleError(error, 'Get transaction by reference');
        }
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=payment.service.js.map