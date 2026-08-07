import * as crypto from 'crypto';

/**
 * Encryption utility for sensitive data (PII)
 * Uses AES-256-GCM encryption
 */

// Get encryption key from environment variable
// In production, use Firebase Secret Manager or KMS
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production-32char';

// Ensure key is exactly 32 bytes for AES-256
const KEY = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf8');

/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted string with IV and auth tag (format: iv:authTag:encryptedData)
 */
export function encrypt(text: string): string {
  try {
    // Generate random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedText - Encrypted string (format: iv:authTag:encryptedData)
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    // Parse the encrypted data
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    
    // Convert hex strings back to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data for searching (one-way)
 * Useful for phone number lookups without storing plain text
 * @param text - Text to hash
 * @returns SHA-256 hash
 */
export function hashData(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Encrypt phone number
 * @param phone - Phone number in E.164 format (+234...)
 * @returns Encrypted phone number
 */
export function encryptPhone(phone: string): string {
  if (!phone || !phone.startsWith('+')) {
    throw new Error('Invalid phone format. Must be E.164 format (+234...)');
  }
  return encrypt(phone);
}

/**
 * Decrypt phone number
 * @param encryptedPhone - Encrypted phone number
 * @returns Plain text phone number
 */
export function decryptPhone(encryptedPhone: string): string {
  return decrypt(encryptedPhone);
}

/**
 * Mask sensitive data for display
 * Shows only last 4 characters
 * @param text - Sensitive text
 * @returns Masked text (e.g., "****5678")
 */
export function maskSensitiveData(text: string, visibleChars: number = 4): string {
  if (!text || text.length <= visibleChars) {
    return '****';
  }
  
  const masked = '*'.repeat(Math.max(4, text.length - visibleChars));
  const visible = text.slice(-visibleChars);
  return masked + visible;
}

/**
 * Mask phone number for display
 * Example: +2348012345678 -> +234****5678
 */
export function maskPhone(phone: string): string {
  if (!phone || !phone.startsWith('+')) {
    return '****';
  }
  
  // Keep country code and last 4 digits
  const countryCode = phone.slice(0, 4); // e.g., +234
  const lastFour = phone.slice(-4);
  const maskedMiddle = '*'.repeat(Math.max(4, phone.length - 8));
  
  return `${countryCode}${maskedMiddle}${lastFour}`;
}

/**
 * Encrypt user object sensitive fields
 * @param user - User object
 * @returns User object with encrypted fields
 */
export function encryptUserData(user: any): any {
  const encrypted = { ...user };
  
  if (user.phone) {
    encrypted.phone_encrypted = encryptPhone(user.phone);
    encrypted.phone_hash = hashData(user.phone); // For lookups
    delete encrypted.phone; // Remove plain text
  }
  
  if (user.email) {
    encrypted.email_encrypted = encrypt(user.email);
    encrypted.email_hash = hashData(user.email);
    delete encrypted.email;
  }
  
  return encrypted;
}

/**
 * Decrypt user object sensitive fields
 * @param user - User object with encrypted fields
 * @returns User object with decrypted fields
 */
export function decryptUserData(user: any): any {
  const decrypted = { ...user };
  
  if (user.phone_encrypted) {
    try {
      decrypted.phone = decryptPhone(user.phone_encrypted);
    } catch (error) {
      console.error('Failed to decrypt phone:', error);
      decrypted.phone = null;
    }
  }
  
  if (user.email_encrypted) {
    try {
      decrypted.email = decrypt(user.email_encrypted);
    } catch (error) {
      console.error('Failed to decrypt email:', error);
      decrypted.email = null;
    }
  }
  
  return decrypted;
}

/**
 * Generate secure random token
 * @param length - Token length in bytes (default: 32)
 * @returns Hex string token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate encryption key strength
 * @returns true if key is strong enough
 */
export function validateEncryptionKey(): boolean {
  if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️  ENCRYPTION_KEY not set in environment variables. Using default key (NOT SECURE)');
    return false;
  }
  
  if (process.env.ENCRYPTION_KEY.length < 32) {
    console.warn('⚠️  ENCRYPTION_KEY is too short. Should be at least 32 characters');
    return false;
  }
  
  return true;
}

/**
 * Initialize encryption and validate configuration
 */
export function initializeEncryption(): void {
  validateEncryptionKey();
  console.log('🔐 Encryption module initialized');
}
