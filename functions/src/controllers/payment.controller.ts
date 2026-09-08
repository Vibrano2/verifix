import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { PaymentService } from '../services';
import { AuthenticatedRequest } from '../types';

export class PaymentController extends BaseController {
  private paymentService: PaymentService;

  constructor() {
    super();
    this.paymentService = new PaymentService();
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signatureHeader = req.headers['x-paystack-signature'];
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
      const body: Buffer | string = (req as any).rawBody || JSON.stringify(req.body);

      const isValid = this.paymentService.verifyWebhookSignature(signature || '', body);

      if (!isValid) {
        return this.sendUnauthorized(res, 'Invalid webhook signature');
      }

      const event = req.body;
      if (event.event === 'charge.success') {
        await this.paymentService.handlePaymentSuccess(event.data);
      } else if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event.event)) {
        await this.paymentService.handleTransferEvent(event.event, event.data);
      } else if (['refund.pending', 'refund.processing', 'refund.processed', 'refund.failed'].includes(event.event)) {
        await this.paymentService.handleRefundEvent(event.event, event.data);
      }

      this.sendSuccess(res, 'Webhook processed');
    } catch (error) {
      this.logger.error('Webhook processing error', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  async verifyPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }
      const reference = req.params.reference || req.body.reference;
      
      if (!reference) {
         return this.sendBadRequest(res, 'Payment reference is required');
      }

      const verification = await this.paymentService.verifyPayment(reference, req.user.uid);
      this.sendSuccess(res, 'Payment verified', verification);
    } catch (error) {
      this.handleError(error, res, 'Verify payment');
    }
  }

}
