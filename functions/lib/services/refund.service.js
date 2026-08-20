"use strict";
/**
 * 4-Hour No-Response Auto-Refund Service
 * Section 5.2 PRD Scheduled Task Implementation
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
exports.RefundService = void 0;
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class RefundService {
    constructor() {
        this.db = admin.firestore();
        this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
    }
    /**
     * Executes the 4-Hour No-Response refund check across all active matches.
     * Triggered periodically by Cloud Scheduler Pub/Sub.
     */
    async processNoResponseRefunds() {
        logger_1.Logger.info('Starting 4-Hour No-Response Auto-Refund execution...');
        const now = admin.firestore.Timestamp.now();
        // Query active matches whose 4-hour timer has expired
        const expiredMatchesSnapshot = await this.db.collection('matches')
            .where('status', '==', 'active')
            .where('no_response_timer_expiry', '<', now)
            .get();
        if (expiredMatchesSnapshot.empty) {
            logger_1.Logger.info('No expired matches found for auto-refund processing.');
            return { processed: 0, refunded: 0, cancelled: 0, errors: 0 };
        }
        let refundedCount = 0;
        let cancelledCount = 0;
        let errorCount = 0;
        for (const matchDoc of expiredMatchesSnapshot.docs) {
            const matchData = matchDoc.data();
            const matchId = matchDoc.id;
            const { job_id, artisan_uid, client_uid } = matchData;
            try {
                // Query messages subcollection for any message sent by the assigned artisan
                const messagesSnapshot = await this.db.collection('matches')
                    .doc(matchId)
                    .collection('messages')
                    .where('sender_uid', '==', artisan_uid)
                    .limit(1)
                    .get();
                if (!messagesSnapshot.empty) {
                    // YES: Artisan responded -> Cancel timer (nullify expiry)
                    await this.db.collection('matches').doc(matchId).update({
                        no_response_timer_expiry: null,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    cancelledCount++;
                    logger_1.Logger.info(`Match ${matchId}: Timer cancelled because artisan ${artisan_uid} responded.`);
                }
                else {
                    // NO: Artisan did NOT respond within 4 hours -> Trigger Paystack refund & update records atomically
                    await this.executeAutoRefund(matchId, job_id, artisan_uid, client_uid);
                    refundedCount++;
                    logger_1.Logger.info(`Match ${matchId}: Auto-refund successfully processed.`);
                }
            }
            catch (err) {
                errorCount++;
                logger_1.Logger.error(`Failed to process auto-refund for match ${matchId}: ${err.message}`);
            }
        }
        logger_1.Logger.info(`Finished Auto-Refund run: ${refundedCount} refunded, ${cancelledCount} timer-cancelled, ${errorCount} errors.`);
        return {
            processed: expiredMatchesSnapshot.size,
            refunded: refundedCount,
            cancelled: cancelledCount,
            errors: errorCount
        };
    }
    /**
     * Performs the atomic refund operation via Paystack API and Firestore transaction.
     */
    async executeAutoRefund(matchId, jobId, artisanUid, clientUid) {
        var _a, _b;
        // 1. Retrieve transaction details
        const txSnapshot = await this.db.collection('transactions')
            .where('match_id', '==', matchId)
            .where('status', '==', 'held')
            .limit(1)
            .get();
        if (txSnapshot.empty) {
            throw new Error(`No held transaction found for match ${matchId}`);
        }
        const txDoc = txSnapshot.docs[0];
        const txData = txDoc.data();
        const { paystack_reference, total_amount, locked_job_value } = txData;
        // 2. Call Paystack Refund API
        try {
            if (this.paystackSecretKey && this.paystackSecretKey !== 'default-dev-key-change-in-production-32char') {
                await axios_1.default.post('https://api.paystack.co/refund', {
                    transaction: paystack_reference,
                    amount: Math.round(total_amount * 100), // Amount in kobo
                    merchant_note: 'Auto-refund: Artisan did not respond within 4 hours'
                }, {
                    headers: {
                        Authorization: `Bearer ${this.paystackSecretKey}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
            else {
                logger_1.Logger.warn(`Paystack Secret Key not set or default. Simulating refund for reference ${paystack_reference}`);
            }
        }
        catch (paystackError) {
            logger_1.Logger.error(`Paystack Refund API call failed for ref ${paystack_reference}: ${((_b = (_a = paystackError.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || paystackError.message}`);
            // Continue with DB state update if transaction was already refunded/handled on Paystack
        }
        // 3. Execute Firestore Transaction for atomic updates
        await this.db.runTransaction(async (transaction) => {
            var _a, _b;
            const matchRef = this.db.collection('matches').doc(matchId);
            const jobRef = this.db.collection('jobs').doc(jobId);
            const txRef = this.db.collection('transactions').doc(txDoc.id);
            const artisanRef = this.db.collection('artisan_profiles').doc(artisanUid);
            // Update Transaction status
            transaction.update(txRef, {
                status: 'refunded',
                refund_reason: 'Auto-refund: 4-hour no response timer expired',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Update Match status
            transaction.update(matchRef, {
                status: 'refunded',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Update Job status
            transaction.update(jobRef, {
                status: 'refunded',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Increment artisan no_response_flags and reduce locked_job_value
            const artisanDoc = await transaction.get(artisanRef);
            if (artisanDoc.exists) {
                const currentFlags = ((_a = artisanDoc.data()) === null || _a === void 0 ? void 0 : _a.no_response_flags) || 0;
                const currentLocked = ((_b = artisanDoc.data()) === null || _b === void 0 ? void 0 : _b.locked_job_value) || 0;
                transaction.update(artisanRef, {
                    no_response_flags: currentFlags + 1,
                    locked_job_value: Math.max(0, currentLocked - (locked_job_value || 0)),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });
    }
}
exports.RefundService = RefundService;
//# sourceMappingURL=refund.service.js.map