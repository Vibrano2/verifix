"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../middleware/auth");
const paystack_1 = require("../utils/paystack");
const controllers_1 = require("../controllers");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const paymentController = new controllers_1.PaymentController();
/**
 * @swagger
 * /api/payments/initialise:
 *   post:
 *     summary: Initialize Paystack payment for match fee
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - match_id
 *             properties:
 *               match_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 */
router.post('/initialise', auth_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { match_id } = req.body;
        if (!match_id) {
            res.status(400).json({ error: 'Match ID is required' });
            return;
        }
        const db = admin.firestore();
        // Get match details
        const matchRef = db.collection('matches').doc(match_id);
        const matchDoc = await matchRef.get();
        if (!matchDoc.exists) {
            res.status(404).json({ error: 'Match not found' });
            return;
        }
        const matchData = matchDoc.data();
        // Get job details
        const jobRef = db.collection('jobs').doc(matchData.job_id);
        const jobDoc = await jobRef.get();
        if (!jobDoc.exists) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        const jobData = jobDoc.data();
        // Verify the authenticated user is the client who owns the job
        if ((jobData === null || jobData === void 0 ? void 0 : jobData.client_uid) !== req.user.uid) {
            res.status(403).json({ error: 'Forbidden: You do not own this job' });
            return;
        }
        // Get user email for Paystack
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        // Use phone as email if no email (Paystack requires email)
        const email = (userData === null || userData === void 0 ? void 0 : userData.email) || `${userData === null || userData === void 0 ? void 0 : userData.phone.replace('+', '')}@verifix.app`;
        // Amount in kobo (Paystack uses smallest currency unit)
        const amountInKobo = jobData.match_fee * 100;
        // Generate unique reference
        const reference = `VF-${match_id}-${Date.now()}`;
        // Lock the job value at payment initialization
        // This value is immutable and used for commission calculation
        const lockedJobValue = jobData.budget || 0;
        // Calculate commission (10%)
        const commissionRetained = Math.round(lockedJobValue * 0.10);
        // Initialize Paystack payment
        const paymentResponse = await (0, paystack_1.initializePayment)({
            email,
            amount: amountInKobo,
            reference,
            metadata: {
                match_id,
                job_id: jobData.job_id || matchData.job_id,
                client_uid: req.user.uid,
                artisan_uid: matchData.artisan_uid,
                locked_job_value: lockedJobValue
            }
        });
        if (!paymentResponse.status) {
            res.status(500).json({ error: 'Failed to initialize payment with Paystack' });
            return;
        }
        // Create transaction record with locked_job_value
        const transactionData = {
            match_id,
            artisan_uid: matchData.artisan_uid,
            amount: jobData.match_fee,
            status: 'pending', // Will be updated to 'held' by webhook
            paystack_reference: reference,
            locked_job_value: lockedJobValue,
            commission_retained: commissionRetained,
            released_at: null,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };
        const transactionRef = await db.collection('transactions').add(transactionData);
        res.status(200).json({
            message: 'Payment initialized successfully',
            transaction_id: transactionRef.id,
            authorization_url: paymentResponse.data.authorization_url,
            access_code: paymentResponse.data.access_code,
            reference
        });
    }
    catch (error) {
        logger_1.Logger.error('Payment initialization error:', error);
        res.status(500).json({
            error: 'Failed to initialize payment'
        });
    }
});
/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Paystack webhook handler
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook', (req, res) => paymentController.handleWebhook(req, res));
/**
 * @swagger
 * /api/jobs/{id}/reveal-contact:
 *   post:
 *     summary: Reveal artisan contact details after payment
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - match_id
 *             properties:
 *               match_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact details revealed
 *       402:
 *         description: Payment required
 */
router.post('/:id/reveal-contact', auth_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { id } = req.params; // job_id
        const { match_id } = req.body;
        if (!match_id) {
            res.status(400).json({ error: 'Match ID is required' });
            return;
        }
        const db = admin.firestore();
        // Get job details
        const jobRef = db.collection('jobs').doc(id);
        const jobDoc = await jobRef.get();
        if (!jobDoc.exists) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        const jobData = jobDoc.data();
        // Verify ownership
        if ((jobData === null || jobData === void 0 ? void 0 : jobData.client_uid) !== req.user.uid) {
            res.status(403).json({ error: 'Forbidden: You do not own this job' });
            return;
        }
        // Get match details
        const matchRef = db.collection('matches').doc(match_id);
        const matchDoc = await matchRef.get();
        if (!matchDoc.exists) {
            res.status(404).json({ error: 'Match not found' });
            return;
        }
        const matchData = matchDoc.data();
        // Verify match belongs to this job
        if ((matchData === null || matchData === void 0 ? void 0 : matchData.job_id) !== id) {
            res.status(400).json({ error: 'Match does not belong to this job' });
            return;
        }
        // CRITICAL PAYMENT GATE: Check for held transaction
        const transactionsSnapshot = await db.collection('transactions')
            .where('match_id', '==', match_id)
            .where('status', '==', 'held')
            .limit(1)
            .get();
        if (transactionsSnapshot.empty) {
            res.status(402).json({
                error: 'Payment required: No valid payment found for this match'
            });
            return;
        }
        // Get artisan contact details
        const artisanUid = matchData.artisan_uid;
        const artisanRef = db.collection('artisan_profiles').doc(artisanUid);
        const artisanDoc = await artisanRef.get();
        if (!artisanDoc.exists) {
            res.status(404).json({ error: 'Artisan not found' });
            return;
        }
        // Get artisan user details for phone
        const artisanUserRef = db.collection('users').doc(artisanUid);
        const artisanUserDoc = await artisanUserRef.get();
        const artisanUserData = artisanUserDoc.data();
        const artisanData = artisanDoc.data();
        res.status(200).json({
            message: 'Contact details revealed',
            artisan: {
                uid: artisanUid,
                first_name: artisanUserData === null || artisanUserData === void 0 ? void 0 : artisanUserData.first_name,
                last_name: artisanUserData === null || artisanUserData === void 0 ? void 0 : artisanUserData.last_name,
                phone: artisanUserData === null || artisanUserData === void 0 ? void 0 : artisanUserData.phone,
                whatsapp: artisanUserData === null || artisanUserData === void 0 ? void 0 : artisanUserData.phone, // Assuming phone is WhatsApp
                trade: artisanData === null || artisanData === void 0 ? void 0 : artisanData.trade,
                location: artisanData === null || artisanData === void 0 ? void 0 : artisanData.location,
                tagline: artisanData === null || artisanData === void 0 ? void 0 : artisanData.tagline,
                completed_jobs: artisanData === null || artisanData === void 0 ? void 0 : artisanData.completed_jobs,
                reputation_score: artisanData === null || artisanData === void 0 ? void 0 : artisanData.reputation_score
            }
        });
    }
    catch (error) {
        logger_1.Logger.error('Reveal contact error:', error);
        res.status(500).json({
            error: 'Failed to reveal contact details'
        });
    }
});
/**
 * @swagger
 * /api/payments/verify/{reference}:
 *   get:
 *     summary: Verify a payment transaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verification status
 */
router.get('/verify/:reference', auth_1.authenticate, (req, res) => paymentController.verifyPayment(req, res));
exports.default = router;
//# sourceMappingURL=payment.js.map