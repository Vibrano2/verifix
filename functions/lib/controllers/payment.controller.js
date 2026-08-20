"use strict";
/**
 * Payment Controller
 * Handles HTTP requests for payment operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const base_controller_1 = require("./base.controller");
const services_1 = require("../services");
class PaymentController extends base_controller_1.BaseController {
    constructor() {
        super();
        this.paymentService = new services_1.PaymentService();
        this.escrowService = new services_1.EscrowService();
    }
    /**
     * POST /api/payments/webhook
     */
    async handleWebhook(req, res) {
        try {
            const signature = req.headers['x-paystack-signature'];
            const body = JSON.stringify(req.body);
            // Verify webhook signature
            const isValid = this.paymentService.verifyWebhookSignature(signature, body);
            if (!isValid) {
                return this.sendUnauthorized(res, 'Invalid webhook signature');
            }
            const event = req.body;
            // Handle successful payment
            if (event.event === 'charge.success') {
                await this.paymentService.handlePaymentSuccess(event.data.reference);
            }
            // Always return 200 to Paystack
            this.sendSuccess(res, 'Webhook processed');
        }
        catch (error) {
            this.logger.error('Webhook processing error', error);
            // Still return 200 to prevent Paystack retries
            this.sendSuccess(res, 'Webhook received');
        }
    }
    /**
     * GET /api/payments/verify/:reference
     */
    async verifyPayment(req, res) {
        try {
            const { reference } = req.params;
            const verification = await this.paymentService.verifyPayment(reference);
            this.sendSuccess(res, 'Payment verified', verification);
        }
        catch (error) {
            this.handleError(error, res, 'Verify payment');
        }
    }
    /**
     * POST /api/payments/release-escrow/:jobId
     */
    async releaseEscrow(req, res) {
        try {
            if (!req.user) {
                return this.sendUnauthorized(res, 'Authentication required');
            }
            const { jobId } = req.params;
            const result = await this.escrowService.releaseFunds(jobId, req.user.uid);
            this.sendSuccess(res, 'Escrow funds released successfully', result);
        }
        catch (error) {
            this.handleError(error, res, 'Release escrow');
        }
    }
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=payment.controller.js.map