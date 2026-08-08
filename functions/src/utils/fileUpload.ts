import { Request } from 'express';
import Busboy from 'busboy';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { Logger } from './logger';

// Allowed MIME types for images
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// File type signatures (magic numbers) for validation
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47], // PNG
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF (WebP container)
  ],
};

/**
 * Validate file type by checking actual file signature (magic numbers)
 * This prevents relying on just file extension or declared MIME type
 */
function validateFileSignature(buffer: Buffer, declaredType: string): boolean {
  const signatures = FILE_SIGNATURES[declaredType];
  if (!signatures) return false;

  return signatures.some(signature => {
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }
    return true;
  });
}

/**
 * Upload a file to Firebase Storage with validation
 */
export async function uploadFile(
  req: Request,
  folder: string,
  maxSizeBytes: number = 5 * 1024 * 1024 // 5MB default
): Promise<{ url: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let fileBuffer: Buffer = Buffer.alloc(0);
    let filename = '';
    let mimeType = '';
    let fileSize = 0;

    busboy.on('file', (fieldname, file, info) => {
      filename = info.filename;
      mimeType = info.mimeType;

      // Check MIME type
      if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        file.resume();
        reject(new Error(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`));
        return;
      }

      // Collect file data
      file.on('data', (data: Buffer) => {
        fileSize += data.length;

        // Check file size
        if (fileSize > maxSizeBytes) {
          file.resume();
          reject(new Error(`File too large. Maximum size: ${maxSizeBytes / (1024 * 1024)}MB`));
          return;
        }

        fileBuffer = Buffer.concat([fileBuffer, data]);
      });

      file.on('end', () => {
        // Validate actual file signature
        if (!validateFileSignature(fileBuffer, mimeType)) {
          reject(new Error('File signature does not match declared type. Possible file type mismatch or corruption.'));
          return;
        }
      });
    });

    busboy.on('finish', async () => {
      try {
        if (fileBuffer.length === 0) {
          reject(new Error('No file uploaded'));
          return;
        }

        // Generate unique filename
        const ext = path.extname(filename);
        const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
        const filePath = `${folder}/${uniqueFilename}`;

        // Upload to Firebase Storage
        const bucket = admin.storage().bucket();
        const file = bucket.file(filePath);

        await file.save(fileBuffer, {
          metadata: {
            contentType: mimeType,
          },
        });

        // Make file publicly accessible
        await file.makePublic();

        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        resolve({ url: publicUrl, filename: uniqueFilename });
      } catch (error) {
        Logger.error('File upload error:', error);
        reject(new Error('Failed to upload file'));
      }
    });

    busboy.on('error', (error: Error) => {
      reject(error);
    });

    req.pipe(busboy);
  });
}
