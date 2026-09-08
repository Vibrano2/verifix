import { Request } from 'express';
import Busboy from 'busboy';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import { Logger } from './logger';

export const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
] as const;

type AllowedUploadType = typeof ALLOWED_UPLOAD_TYPES[number];

export function validateFileSignature(buffer: Buffer, declaredType: string = 'image/jpeg'): boolean {
  if (!buffer || buffer.length < 12) return false;
  switch (declaredType) {
    case 'image/jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return buffer.subarray(0, 4).toString('ascii') === 'RIFF'
        && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'application/pdf':
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    default:
      return false;
  }
}

type UploadOptions = {
  maxSizeBytes?: number;
  allowedTypes?: AllowedUploadType[];
  publicRead?: boolean;
  accessLabel?: string;
  customMetadata?: Record<string, string>;
};

export async function uploadFile(
  req: Request,
  folder: string,
  options: UploadOptions = {}
): Promise<{ url?: string; path: string; filename: string }> {
  const maxSizeBytes = options.maxSizeBytes ?? 5 * 1024 * 1024;
  const allowedTypes = options.allowedTypes ?? ['image/jpeg', 'image/png', 'image/webp'];
  const publicRead = options.publicRead ?? false;

  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    throw new Error('Invalid file upload content type');
  }

  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: maxSizeBytes, fields: 10, parts: 11 }
    });
    const chunks: Buffer[] = [];
    let originalFilename = '';
    let mimeType: AllowedUploadType | undefined;
    let fileSeen = false;
    let failed = false;

    const fail = (error: Error) => {
      if (failed) return;
      failed = true;
      reject(error);
    };

    busboy.on('file', (_fieldname, stream, info) => {
      if (fileSeen) {
        stream.resume();
        fail(new Error('Only one file may be uploaded'));
        return;
      }
      fileSeen = true;
      originalFilename = info.filename;
      if (!allowedTypes.includes(info.mimeType as AllowedUploadType)) {
        stream.resume();
        fail(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
        return;
      }
      mimeType = info.mimeType as AllowedUploadType;

      stream.on('data', (data: Buffer) => chunks.push(data));
      stream.on('limit', () => fail(new Error(`File too large. Maximum size: ${maxSizeBytes / (1024 * 1024)}MB`)));
      stream.on('error', fail);
    });

    busboy.on('filesLimit', () => fail(new Error('Only one file may be uploaded')));
    busboy.on('partsLimit', () => fail(new Error('Too many multipart fields')));
    busboy.on('error', fail);
    busboy.on('finish', async () => {
      if (failed) return;
      try {
        const buffer = Buffer.concat(chunks);
        if (!fileSeen || !mimeType || buffer.length === 0) throw new Error('No file uploaded');
        if (buffer.length > maxSizeBytes) throw new Error(`File too large. Maximum size: ${maxSizeBytes / (1024 * 1024)}MB`);
        if (!validateFileSignature(buffer, mimeType)) {
          throw new Error('File signature does not match declared type');
        }

        const extensionByType: Record<AllowedUploadType, string> = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'application/pdf': '.pdf'
        };
        const filename = `${randomUUID()}${extensionByType[mimeType]}`;
        const filePath = `${folder}/${filename}`;
        const bucket = getStorage().bucket();
        await bucket.file(filePath).save(buffer, {
          resumable: false,
          validation: 'crc32c',
          metadata: {
            contentType: mimeType,
            cacheControl: publicRead ? 'public,max-age=86400' : 'private,no-store',
            metadata: {
              originalFilename: originalFilename.slice(0, 200),
              access: options.accessLabel || (publicRead ? 'public-profile' : 'private'),
              ...(options.customMetadata || {})
            }
          }
        });

        const url = publicRead
          ? `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`
          : undefined;
        resolve({ url, path: filePath, filename });
      } catch (error) {
        Logger.error('File upload error', error);
        fail(error instanceof Error ? error : new Error('Failed to upload file'));
      }
    });

    const rawBody = (req as any).rawBody;
    if (Buffer.isBuffer(rawBody)) busboy.end(rawBody);
    else req.pipe(busboy);
  });
}
