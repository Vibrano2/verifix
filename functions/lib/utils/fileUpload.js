"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
const busboy_1 = __importDefault(require("busboy"));
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
// Allowed MIME types for images
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// File type signatures (magic numbers) for validation
const FILE_SIGNATURES = {
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
function validateFileSignature(buffer, declaredType) {
    const signatures = FILE_SIGNATURES[declaredType];
    if (!signatures)
        return false;
    return signatures.some(signature => {
        for (let i = 0; i < signature.length; i++) {
            if (buffer[i] !== signature[i])
                return false;
        }
        return true;
    });
}
/**
 * Upload a file to Firebase Storage with validation
 */
async function uploadFile(req, folder, maxSizeBytes = 5 * 1024 * 1024 // 5MB default
) {
    return new Promise((resolve, reject) => {
        const busboy = (0, busboy_1.default)({ headers: req.headers });
        let fileBuffer = Buffer.alloc(0);
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
            file.on('data', (data) => {
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
            }
            catch (error) {
                logger_1.Logger.error('File upload error:', error);
                reject(new Error('Failed to upload file'));
            }
        });
        busboy.on('error', (error) => {
            reject(error);
        });
        req.pipe(busboy);
    });
}
//# sourceMappingURL=fileUpload.js.map