import './initFirebase';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.config';
import { 
  rateLimit, 
  securityHeaders, 
  monitorIP,
  requestId,
  validateContentType
} from './middleware/security';
import { ndprMaskingMiddleware } from './middleware/ndprMasking';
import { initializeEncryption } from './utils/encryption';
import { Logger } from './utils/logger';
import { RefundService } from './services/refund.service';
import authRoutes from './routes/auth';
import artisanRoutes from './routes/artisan';
import jobRoutes from './routes/job';
import paymentRoutes from './routes/payment';
import adminRoutes from './routes/admin';
import chatRoutes from './routes/chat';
import proformaRoutes from './routes/proforma';
// Environment validation disabled during deployment to prevent log noise
initializeEncryption();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:5173',
  'https://verifix.app',
  'https://www.verifix.app',
  'https://artiva-f24a8.web.app',
  'https://artiva-f24a8.firebaseapp.com',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(requestId);
app.use(securityHeaders);
app.use(monitorIP);
app.use(rateLimit(100, 15 * 60 * 1000));

app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateContentType);
app.use(ndprMaskingMiddleware as any);

app.use(['/api/docs', '/docs'], swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/users', '/users'], authRoutes);
app.use(['/api/artisans', '/artisans'], artisanRoutes);
app.use(['/api/jobs', '/jobs'], jobRoutes);
app.use(['/api/payments', '/payments'], paymentRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api/chat', '/chat'], chatRoutes);
app.use(['/api/proforma', '/proforma', '/api/proformas', '/proformas'], proformaRoutes);

app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs'
  });
});

import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

const paystackSecretKey = defineSecret('PAYSTACK_SECRET_KEY');
const encryptionKey = defineSecret('ENCRYPTION_KEY');

export const api = onRequest({ 
  cors: false, 
  timeoutSeconds: 60, 
  memory: '512MiB',
  invoker: 'public',
  secrets: [paystackSecretKey, encryptionKey]
}, app);

export const processNoResponseRefundsScheduler = onSchedule({
  schedule: 'every 15 minutes',
  secrets: [paystackSecretKey, encryptionKey]
}, async () => {
  Logger.info('Triggering processNoResponseRefundsScheduler cron task...');
  const refundService = new RefundService();
  await refundService.processNoResponseRefunds();
});

