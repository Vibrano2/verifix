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
function validateEnvironment() {
  const required = ['PAYSTACK_SECRET_KEY', 'ENCRYPTION_KEY', 'ADMIN_UID'];
  const missing = required.filter(key => !process.env[key] || process.env[key] === 'default-dev-key-change-in-production-32char');
  if (missing.length > 0) {
    Logger.warn(`Environment Warning: Some production key defaults are in use: ${missing.join(', ')}`);
  }
}

validateEnvironment();
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

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/artisans', artisanRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/proforma', proformaRoutes);



app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs'
  });
});

import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const api = onRequest({ 
  cors: false, 
  timeoutSeconds: 60, 
  memory: '512MiB',
  invoker: 'public'
}, app);

export const processNoResponseRefundsScheduler = onSchedule({
  schedule: 'every 15 minutes',
}, async () => {
  Logger.info('Triggering processNoResponseRefundsScheduler cron task...');
  const refundService = new RefundService();
  await refundService.processNoResponseRefunds();
});


