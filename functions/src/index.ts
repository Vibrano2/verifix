import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
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

// Validate environment variables on startup
function validateEnvironment() {
  const required = ['PAYSTACK_SECRET_KEY', 'ENCRYPTION_KEY', 'ADMIN_UID'];
  const missing = required.filter(key => !process.env[key] || process.env[key] === 'default-dev-key-change-in-production-32char');
  if (missing.length > 0) {
    Logger.warn(`Environment Warning: Some production key defaults are in use: ${missing.join(', ')}`);
  }
}

validateEnvironment();

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Initialize encryption
initializeEncryption();

// Create Express app
const app = express();

// Security Middleware
app.use(requestId);
app.use(securityHeaders);
app.use(monitorIP);
app.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173',
  'https://verifix.app',
  'https://www.verifix.app',
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateContentType);

// NDPR PII Data Masking Middleware
app.use(ndprMaskingMiddleware as any);

// Swagger API Documentation UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Import routes
import authRoutes from './routes/auth';
import artisanRoutes from './routes/artisan';
import jobRoutes from './routes/job';
import paymentRoutes from './routes/payment';
import adminRoutes from './routes/admin';

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/artisans', artisanRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs'
  });
});

// Export Express App as HTTPS Cloud Function
export const api = functions.https.onRequest(app);

// Export PubSub Scheduled Cloud Function for 4-Hour No-Response Auto-Refunds
const refundService = new RefundService();
export const processNoResponseRefundsScheduler = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    Logger.info('Triggering processNoResponseRefundsScheduler cron task...');
    return await refundService.processNoResponseRefunds();
  });
