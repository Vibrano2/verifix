"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const payment_service_1 = require("../payment.service");
describe('PaymentService', () => {
    let paymentService;
    beforeEach(() => {
        paymentService = new payment_service_1.PaymentService();
        // Use a mock secret key for tests
        paymentService.paystackSecretKey = 'sk_test_mockkey123';
    });
    describe('verifyWebhookSignature', () => {
        it('should return true for a valid signature', () => {
            const crypto = require('crypto');
            const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref123' } });
            const validSignature = crypto.createHmac('sha512', 'sk_test_mockkey123').update(body).digest('hex');
            const result = paymentService.verifyWebhookSignature(validSignature, body);
            expect(result).toBe(true);
        });
        it('should return false for an invalid signature', () => {
            const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref123' } });
            const invalidSignature = 'invalid_signature_hash_xyz';
            const result = paymentService.verifyWebhookSignature(invalidSignature, body);
            expect(result).toBe(false);
        });
        it('should return false if hashing throws an error', () => {
            // Intentionally passing null to body to trigger crypto error
            const result = paymentService.verifyWebhookSignature('anysig', null);
            expect(result).toBe(false);
        });
    });
});
//# sourceMappingURL=payment.service.test.js.map