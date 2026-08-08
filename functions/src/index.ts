import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { 
  rateLimit, 
  securityHeaders, 
  monitorIP,
  requestId,
  validateContentType
} from './middleware/security';
import { initializeEncryption } from './utils/encryption';
import { Logger } from './utils/logger';

// Validate environment variables on startup
function validateEnvironment() {
  const required = ['PAYSTACK_SECRET_KEY', 'ENCRYPTION_KEY', 'ADMIN_UID'];
  const missing = required.filter(key => !process.env[key] || process.env[key] === 'default-dev-key-change-in-production-32char');
  if (missing.length > 0) {
    const msg = `FATAL ERROR: Missing required env vars: ${missing.join(', ')}`;
    Logger.error(msg);
    throw new Error(msg);
  }
}

validateEnvironment();

// Initialize Firebase Admin
admin.initializeApp();

// Initialize encryption
initializeEncryption();

// Create Express app
const app = express();

// Security Middleware (applied in order)
app.use(requestId); // Add request ID for tracking
app.use(securityHeaders); // Security headers (XSS, clickjacking, etc.)
app.use(monitorIP); // IP monitoring and blocking
app.use(rateLimit(100, 15 * 60 * 1000)); // Rate limit: 100 requests per 15 minutes

// CORS Configuration - Whitelist allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://verifix.app',
  'https://www.verifix.app',
  // Add your production domains here
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // JSON body parser with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL-encoded body parser
app.use(validateContentType); // Validate Content-Type headers

// Import routes
import authRoutes from './routes/auth';
import artisanRoutes from './routes/artisan';
import jobRoutes from './routes/job';
import paymentRoutes from './routes/payment';
import adminRoutes from './routes/admin';

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/artisans', artisanRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Export the Express app as a Cloud Function
export const api = functions.https.onRequest(app);
