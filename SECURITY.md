# Verifix Backend Security Documentation

This document outlines all security requirements and their implementation status.

## ✅ Security Requirements Checklist

### 1. IDOR Protection (Insecure Direct Object Reference)
**Status: ✅ IMPLEMENTED**

Every write endpoint that modifies a resource tied to a specific user verifies the authenticated user owns that resource.

**Implementation:**
- `requireOwnership` middleware in `middleware/auth.ts`
- Used on endpoints:
  - `PATCH /api/artisans/:uid/availability`
  - `POST /api/artisans/:uid/photo`
  - `POST /api/artisans/:uid/id-document`
  - `PATCH /api/artisans/:uid/profile`
  - `GET /api/artisans/:uid/dashboard`
- Manual ownership checks on:
  - `POST /api/jobs/:id/complete` - verifies client_uid matches authenticated user
  - `POST /api/jobs/:id/rating` - verifies client_uid matches authenticated user
  - `POST /api/jobs/:id/reveal-contact` - verifies job ownership
  - All job modification endpoints

**Code Example:**
```typescript
export const requireOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (req.user.uid !== req.params.uid) {
    res.status(403).json({ error: 'Forbidden: You do not own this resource' });
    return;
  }
  next();
};
```

### 2. Webhook Signature Verification
**Status: ✅ IMPLEMENTED**

Paystack webhook endpoint verifies signature on every request before processing.

**Implementation:**
- `verifyWebhookSignature` function in `utils/paystack.ts`
- Used in `POST /api/payments/webhook`
- Rejects unsigned or invalid-signature requests

**Code Example:**
```typescript
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest('hex');
  return hash === signature;
}
```

### 3. File Upload Validation
**Status: ✅ IMPLEMENTED**

File uploads validated by actual content/signature, not extension or declared MIME type.

**Implementation:**
- `uploadFile` function in `utils/fileUpload.ts`
- Validates file signatures (magic numbers):
  - JPEG: `[0xFF, 0xD8, 0xFF]`
  - PNG: `[0x89, 0x50, 0x4E, 0x47]`
  - WebP: `[0x52, 0x49, 0x46, 0x46]`
- Checks actual bytes, not client-declared type
- Size limits enforced (5MB for photos, 10MB for documents)

**Code Example:**
```typescript
function validateFileSignature(buffer: Buffer, declaredType: string): boolean {
  const signatures = FILE_SIGNATURES[declaredType];
  return signatures.some(signature => {
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }
    return true;
  });
}
```

### 4. Payment Gate for Contact Reveal
**Status: ✅ IMPLEMENTED**

Contact-reveal endpoint checks payment status (held transaction), not just authentication.

**Implementation:**
- `POST /api/jobs/:id/reveal-contact`
- Checks for transaction with `status = 'held'` before revealing contact info
- Returns 402 Payment Required if no valid payment found

**Code Example:**
```typescript
const transactionsSnapshot = await db.collection('transactions')
  .where('match_id', '==', match_id)
  .where('status', '==', 'held')
  .limit(1)
  .get();

if (transactionsSnapshot.empty) {
  res.status(402).json({ error: 'Payment required: No valid payment found' });
  return;
}
```

### 5. Admin Access Control
**Status: ✅ IMPLEMENTED**

Admin endpoints check against environment variable, never hardcoded.

**Implementation:**
- `requireAdmin` middleware in `middleware/auth.ts`
- Reads `process.env.ADMIN_UID`
- Used on all `/api/admin/*` endpoints

**Code Example:**
```typescript
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const adminUid = process.env.ADMIN_UID;
  if (!adminUid) {
    console.error('ADMIN_UID environment variable not set');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }
  if (req.user.uid !== adminUid) {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }
  next();
};
```

### 6. Environment Variable Security
**Status: ✅ IMPLEMENTED**

`.env` in `.gitignore` from first commit. Never commit Paystack live keys.

**Implementation:**
- `.gitignore` includes `.env`, `.env.local`, `.env.*.local`
- `.env.example` template provided with test keys placeholders
- Instructions to use sandbox/test keys during development

### 7. Idempotent Job Completion
**Status: ✅ IMPLEMENTED**

Mark Complete endpoint is idempotent - calling twice doesn't double-release funds.

**Implementation:**
- `POST /api/jobs/:id/complete`
- Checks transaction status before processing
- If already `released`, returns success without re-processing

**Code Example:**
```typescript
if (transactionData?.status === 'released') {
  res.status(200).json({
    message: 'Job already marked complete (idempotent)',
    already_completed: true
  });
  return;
}
```

### 8. Commission Calculation from Locked Value
**Status: ✅ IMPLEMENTED**

Commission always calculated from `locked_job_value`, never from current job value.

**Implementation:**
- `locked_job_value` captured at payment initialization in `POST /api/payments/initialize`
- Stored immutably in transaction record
- Commission calculated in `POST /api/jobs/:id/complete` using locked value
- Handles edge cases: zero value, fractional kobo rounding

**Code Example:**
```typescript
// At payment initialization
const lockedJobValue = jobData!.budget || 0;
const commissionRetained = Math.round(lockedJobValue * 0.10);

// Stored in transaction
{
  locked_job_value: lockedJobValue,
  commission_retained: commissionRetained
}
```

### 9. Input Validation
**Status: ✅ IMPLEMENTED**

All inputs validated server-side with appropriate middleware and checks.

**Implementation:**
- Trade validation: `validateTrade` middleware - locked enum
- Urgency validation: `validateUrgency` middleware - locked enum  
- Location validation: `validateLocation` middleware - max 200 chars
- Rating validation: `validateRating` middleware - 1-5 integer
- Phone format: starts with `+`
- Description: max 1000 chars
- Tagline: max 100 chars

### 10. Firestore Security Rules
**Status: ✅ IMPLEMENTED**

Proper ownership checks and role-based access control in `firestore.rules`.

**Implementation:**
- Users: can only read/write their own document
- Artisan profiles: owners can update (except `verified` field)
- Jobs: owners can update, artisans can read open jobs
- Matches: read-only after creation (server-side only)
- Transactions: read-only (server-side only)

### 11. Authentication on All Endpoints
**Status: ✅ IMPLEMENTED**

All endpoints (except health check and webhook) require authentication.

**Implementation:**
- `authenticate` middleware on all routes
- Verifies Firebase ID token
- Attaches decoded user to request

## 🔒 Additional Security Features

### Rate Limiting
**Status: ⚠️ RECOMMENDED**

Consider adding rate limiting for production:
- Use Firebase Functions rate limiting
- Or implement custom middleware with Redis/Firestore

### CORS Configuration
**Status: ✅ IMPLEMENTED**

CORS enabled with `origin: true` (development).

**Production Recommendation:** Restrict to specific origins:
```typescript
app.use(cors({ origin: 'https://yourdomain.com' }));
```

### Request Size Limits
**Status: ✅ IMPLEMENTED**

- File uploads: 5MB (photos), 10MB (documents)
- JSON body: Express default (100kb)

### Logging
**Status: ✅ IMPLEMENTED**

All errors logged with `console.error` for Cloud Functions logging.

## 📋 Pre-Deployment Checklist

- [ ] Set `ADMIN_UID` in Firebase Functions config
- [ ] Set `PAYSTACK_SECRET_KEY` (test for staging, live for production)
- [ ] Set `PAYSTACK_PUBLIC_KEY`
- [ ] Verify `.env` is in `.gitignore`
- [ ] Restrict CORS origins for production
- [ ] Deploy Firestore security rules
- [ ] Deploy Firestore indexes
- [ ] Set up Firebase Storage bucket with appropriate permissions
- [ ] Configure Paystack webhook URL in Paystack dashboard
- [ ] Test all endpoints with authentication
- [ ] Test admin endpoints with correct/incorrect admin UID
- [ ] Test file upload with various file types
- [ ] Test payment flow end-to-end
- [ ] Test idempotent job completion
- [ ] Verify webhook signature validation

## 🚨 Security Incident Response

If a security issue is discovered:

1. Immediately rotate compromised keys (Paystack, Admin UID)
2. Review Cloud Functions logs for unauthorized access
3. Check Firestore for unauthorized data modifications
4. Disable affected endpoints if necessary
5. Investigate root cause
6. Patch vulnerability
7. Deploy fix
8. Monitor for further incidents

## 📞 Security Contact

For security concerns, contact: [Your security contact]

---

**Last Updated:** August 3, 2026
**Reviewed By:** Implementation Team
**Next Review:** Before Production Deployment
