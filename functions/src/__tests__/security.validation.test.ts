import { CreateJobSchema, UpdateJobSchema } from '../models/job.model';
import { CreateArtisanSchema } from '../models/artisan.model';
import { CreateProformaSchema } from '../models/proforma.model';
import { encrypt, decrypt, hashData, validateEncryptionKey } from '../utils/encryption';
import { validateFileSignature } from '../utils/fileUpload';
import { sanitizeArtisanProfile } from '../middleware/ndprMasking';

const validLocation = { city: 'Abuja', state: 'FCT', lga: 'AMAC' };

describe('security-sensitive validation', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
  });

  it('accepts only consistent, positive server-lockable job budgets', () => {
    const base = {
      trade: 'Plumber',
      description: 'Repair the leaking kitchen pipe',
      location: validLocation,
      urgency: 'Today' as const
    };
    expect(CreateJobSchema.safeParse({ body: { ...base, budget: 10_000, job_value: 10_000 } }).success).toBe(true);
    expect(CreateJobSchema.safeParse({ body: { ...base, budget: 10_000, job_value: 1 } }).success).toBe(false);
    expect(CreateJobSchema.safeParse({ body: { ...base, budget: 0 } }).success).toBe(false);
    expect(CreateJobSchema.safeParse({ body: { ...base, admin_override: true } }).success).toBe(false);
  });

  it('rejects unsafe job photo URLs and status tampering', () => {
    expect(CreateJobSchema.safeParse({ body: {
      trade: 'Plumber', description: 'Repair a pipe', location: validLocation,
      photos: ['data:image/png;base64,AAAA']
    } }).success).toBe(false);
    expect(UpdateJobSchema.safeParse({ body: { status: 'completed' } }).success).toBe(false);
  });

  it('requires artisan identity data and at least one declared service', () => {
    const artisan = {
      first_name: 'Ada', last_name: 'Okafor', phone: '+2348012345678',
      trade: 'Plumber', location: validLocation, tagline: 'Reliable repairs',
      nin: '12345678901'
    };
    expect(CreateArtisanSchema.safeParse({ body: artisan }).success).toBe(false);
    expect(CreateArtisanSchema.safeParse({ body: { ...artisan, services: ['Pipe repair'] } }).success).toBe(true);
    expect(CreateArtisanSchema.safeParse({ body: { ...artisan, services: ['Pipe repair'], id_document: 'data:image/png;base64,AAAA' } }).success).toBe(false);
  });

  it('requires a backend-uploaded proforma path and rejects artisan-selected recipients', () => {
    const body = {
      job_id: 'job_123', supplier_name: 'Trusted Supplies', total_amount: 2500,
      invoice_document_path: 'proforma_documents/artisan_1/job_123/123e4567-e89b-12d3-a456-426614174000.pdf'
    };
    expect(CreateProformaSchema.safeParse({ body }).success).toBe(true);
    expect(CreateProformaSchema.safeParse({ body: { ...body, invoice_document_path: 'https://evil.example/invoice.pdf' } }).success).toBe(false);
    expect(CreateProformaSchema.safeParse({ body: { ...body, supplier_recipient_code: 'RCP_ATTACKER' } }).success).toBe(false);
  });

  it('uses authenticated encryption and keyed lookup hashes', () => {
    expect(validateEncryptionKey()).toBe(true);
    const ciphertext = encrypt('+2348012345678');
    expect(ciphertext).not.toContain('+2348012345678');
    expect(decrypt(ciphertext)).toBe('+2348012345678');
    expect(hashData('+2348012345678')).toHaveLength(64);
  });

  it('checks declared upload types against file signatures', () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(8)
    ]);
    expect(validateFileSignature(png, 'image/png')).toBe(true);
    expect(validateFileSignature(png, 'image/jpeg')).toBe(false);
    expect(validateFileSignature(Buffer.from('<script>alert(1)</script>'), 'application/pdf')).toBe(false);
  });

  it('recursively removes private fields from non-admin responses', () => {
    const result = sanitizeArtisanProfile({
      profile: { uid: 'artisan-1', nin: '12345678901', bank_details: { account_number: '0123456789' } },
      user: { phone_hash: 'hash', first_name: 'Ada' }
    });
    expect(result).toEqual({
      profile: { uid: 'artisan-1' },
      user: { first_name: 'Ada' }
    });
  });
});
