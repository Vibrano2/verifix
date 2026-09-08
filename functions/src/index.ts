import './initFirebase';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
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

const paystackSecret = defineSecret('PAYSTACK_SECRET_KEY');
const encryptionSecret = defineSecret('ENCRYPTION_KEY');
const adminUidSecret = defineSecret('ADMIN_UID');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const productionOrigins = [
  'https://verifix.app',
  'https://www.verifix.app',
  'https://artiva-f24a8.web.app',
  'https://artiva-f24a8.firebaseapp.com',
];
const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const developmentOrigins = process.env.FUNCTIONS_EMULATOR === 'true'
  ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000', 'http://localhost:5173']
  : [];
const allowedOrigins = new Set([...productionOrigins, ...configuredOrigins, ...developmentOrigins]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
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
const standardRateLimit = rateLimit(100, 15 * 60 * 1000);
app.use((req, res, next) => {
  if (req.path.endsWith('/payments/webhook')) return next();
  return standardRateLimit(req, res, next);
});

app.use(express.json({
  limit: '1mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(validateContentType);
app.use(ndprMaskingMiddleware as any);

app.use((_req, res, next) => {
  try {
    initializeEncryption();
    next();
  } catch (error) {
    Logger.error('Runtime secret validation failed', error);
    res.status(503).json({ error: 'Service temporarily unavailable' });
  }
});

if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.ENABLE_API_DOCS === 'true') {
  app.use(['/api/docs', '/docs'], swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use('/api/auth', authRoutes);
app.use('/api/artisans', artisanRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use(['/api/proforma', '/api/proformas'], proformaRoutes);

app.get(['/api/health', '/health'], (_req, res) => {
  res.json({ status: 'healthy' });
});

export const api = onRequest({ 
  cors: false, 
  timeoutSeconds: 60, 
  memory: '512MiB',
  invoker: 'public',
  secrets: [paystackSecret, encryptionSecret, adminUidSecret]
}, app);

export const processNoResponseRefundsScheduler = onSchedule({
  schedule: 'every 15 minutes',
  secrets: [paystackSecret]
}, async () => {
  Logger.info('Triggering processNoResponseRefundsScheduler cron task...');
  const refundService = new RefundService();
  await refundService.processNoResponseRefunds();
});
