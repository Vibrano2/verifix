import { PaymentService } from '../payment.service';

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
    // Use a mock secret key for tests
    (paymentService as any).paystackSecretKey = 'sk_test_mockkey123';
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
      const result = paymentService.verifyWebhookSignature('anysig', null as any);
      expect(result).toBe(false);
    });
  });
});
