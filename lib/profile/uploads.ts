/**
 * SINTRA Profile System - Upload Utilities
 * Handles avatar uploads with S3 presigned URLs or local storage
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const IMAGE_SIZE = 512; // Max dimensions

// S3 configuration
const useS3 = Boolean(
  process.env.S3_ENDPOINT &&
  process.env.S3_BUCKET &&
  process.env.S3_ACCESS_KEY &&
  process.env.S3_SECRET_KEY
);

let s3Client: S3Client | null = null;

if (useS3) {
  s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
}

export interface UploadResult {
  uploadUrl?: string;
  avatarUrl: string;
  requiresUpload: boolean;
}

/**
 * Generate avatar upload URL (S3 presigned or local path)
 * @param userId - User ID
 * @param fileName - Original file name
 * @param contentType - MIME type
 * @returns Upload result with URLs
 */
export async function generateAvatarUploadUrl(
  userId: string,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  if (!ALLOWED_MIMES.includes(contentType)) {
    throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const hash = crypto.randomBytes(8).toString('hex');
  const newFileName = `avatar_${hash}.${ext}`;

  if (useS3 && s3Client) {
    const key = `avatars/${userId}/${newFileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;

    return { uploadUrl, avatarUrl: publicUrl, requiresUpload: true };
  } else {
    const publicUrl = `/uploads/${userId}/${newFileName}`;
    return { avatarUrl: publicUrl, requiresUpload: false };
  }
}

/**
 * Process and save avatar to local storage
 * @param userId - User ID
 * @param fileBuffer - Image file buffer
 * @param contentType - MIME type
 * @returns Public URL of saved avatar
 */
export async function processLocalUpload(
  userId: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size: 5MB');
  }

  if (!ALLOWED_MIMES.includes(contentType)) {
    throw new Error('Invalid file type');
  }

  const processed = await sharp(fileBuffer, {
    limitInputPixels: 16777216, // 4096x4096 max
  })
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover', position: 'center' })
    .withMetadata({ orientation: 1 }) // Strip EXIF but keep basic
    .jpeg({ quality: 90 })
    .toBuffer();

  const hash = crypto.createHash('md5').update(processed).digest('hex').slice(0, 12);
  const fileName = `avatar_${hash}.jpg`;
  const userDir = path.join(UPLOAD_DIR, userId);

  await fs.mkdir(userDir, { recursive: true });
  await fs.writeFile(path.join(userDir, fileName), processed);

  return `/uploads/${userId}/${fileName}`;
}

/**
 * Delete old avatar files, keeping only the current one
 * @param userId - User ID
 * @param keepUrl - URL of avatar to keep
 */
export async function deleteOldAvatars(userId: string, keepUrl: string): Promise<void> {
  try {
    const userDir = path.join(UPLOAD_DIR, userId);
    const files = await fs.readdir(userDir);
    const keepFileName = path.basename(keepUrl);

    for (const file of files) {
      if (file.startsWith('avatar_') && file !== keepFileName) {
        await fs.unlink(path.join(userDir, file)).catch(() => {});
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Validate file upload request
 * @param contentType - MIME type
 * @param fileSize - File size in bytes
 * @throws Error if validation fails
 */
export function validateUpload(contentType: string, fileSize: number): void {
  if (!ALLOWED_MIMES.includes(contentType)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_MIMES.join(', ')}`);
  }

  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
}

/**
 * Get upload mode (S3 or local)
 * @returns Upload mode
 */
export function getUploadMode(): 's3' | 'local' {
  return useS3 ? 's3' : 'local';
}
