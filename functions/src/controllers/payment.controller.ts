import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { PaymentService, EscrowService } from '../services';
import { AuthenticatedRequest } from '../types';

export class PaymentController extends BaseController {
  private paymentService: PaymentService;
  private escrowService: EscrowService;

  constructor() {
    super();
    this.paymentService = new PaymentService();
    this.escrowService = new EscrowService();
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      const body = (req as any).rawBody || JSON.stringify(req.body);

      const isValid = this.paymentService.verifyWebhookSignature(signature, body);

      if (!isValid) {
        return this.sendUnauthorized(res, 'Invalid webhook signature');
      }

      const event = req.body;
      if (event.event === 'charge.success') {
        await this.paymentService.handlePaymentSuccess(event.data.reference);
      }

      this.sendSuccess(res, 'Webhook processed');
    } catch (error) {
      this.logger.error('Webhook processing error', error);
      this.sendSuccess(res, 'Webhook received');
    }
  }

  async verifyPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reference = req.params.reference || req.body.reference;
      
      if (!reference) {
         return this.sendBadRequest(res, 'Payment reference is required');
      }

      const verification = await this.paymentService.verifyPayment(reference);
      this.sendSuccess(res, 'Payment verified', verification);
    } catch (error) {
      this.handleError(error, res, 'Verify payment');
    }
  }

  async releaseEscrow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return this.sendUnauthorized(res, 'Authentication required');
      }

      const { jobId } = req.params;
      const result = await this.escrowService.releaseFunds(jobId, req.user.uid);
      this.sendSuccess(res, 'Escrow funds released successfully', result);
    } catch (error) {
      this.handleError(error, res, 'Release escrow');
    }
  }
}
