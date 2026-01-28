/**
 * STORAGE SERVICE
 *
 * Enterprise file upload & management service
 * - AWS S3 Integration
 * - Image Processing (Sharp)
 * - Virus Scanning (optional)
 * - Presigned URLs
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';

// ==========================================
// CONFIGURATION
// ==========================================

const S3_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET || 'flowent-ai-files',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.AWS_ENDPOINT, // Support for MinIO/LocalStack
  forcePathStyle: process.env.AWS_USE_PATH_STYLE_ENDPOINT === 'true', // Required for MinIO
};

// Initialize S3 Client
const s3Client = new S3Client({
  region: S3_CONFIG.region,
  endpoint: S3_CONFIG.endpoint,
  forcePathStyle: S3_CONFIG.forcePathStyle,
  credentials: S3_CONFIG.accessKeyId && S3_CONFIG.secretAccessKey
    ? {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey,
      }
    : undefined,
});

// ==========================================
// TYPES
// ==========================================

export interface UploadOptions {
  userId: string;
  workspaceId?: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  visibility?: 'private' | 'workspace' | 'public';
  metadata?: Record<string, any>;
}

export interface UploadResult {
  storageKey: string;
  url?: string;
  thumbnailUrl?: string;
  size: number;
  checksum: string;
  imageMetadata?: {
    width: number;
    height: number;
    format: string;
  };
}

// ==========================================
// STORAGE SERVICE
// ==========================================

export class StorageService {
  /**
   * Upload file to S3
   */
  async uploadFile(options: UploadOptions): Promise<UploadResult> {
    const {
      userId,
      workspaceId,
      filename,
      mimeType,
      buffer,
      visibility = 'private',
      metadata = {},
    } = options;

    // Generate unique storage key
    const storageKey = this.generateStorageKey(userId, workspaceId, filename);

    // Calculate checksum
    const checksum = this.calculateChecksum(buffer);

    // Process image if needed
    let thumbnailUrl: string | undefined;
    let imageMetadata: UploadResult['imageMetadata'];

    if (this.isImage(mimeType)) {
      const { thumbnail, metadata: imgMetadata } = await this.processImage(buffer);
      imageMetadata = imgMetadata;

      // Upload thumbnail
      if (thumbnail) {
        const thumbnailKey = this.generateThumbnailKey(storageKey);
        await this.uploadToS3(thumbnailKey, thumbnail, 'image/jpeg', visibility);
        thumbnailUrl = await this.getSignedUrl(thumbnailKey);
      }
    }

    // Upload main file
    await this.uploadToS3(storageKey, buffer, mimeType, visibility, metadata);

    // Get URL
    const url = visibility === 'public'
      ? this.getPublicUrl(storageKey)
      : await this.getSignedUrl(storageKey);

    return {
      storageKey,
      url,
      thumbnailUrl,
      size: buffer.length,
      checksum,
      imageMetadata,
    };
  }

  /**
   * Upload buffer to S3
   */
  private async uploadToS3(
    key: string,
    buffer: Buffer,
    mimeType: string,
    visibility: 'private' | 'workspace' | 'public',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: visibility === 'public' ? 'public-read' : 'private',
      Metadata: this.sanitizeMetadata(metadata),
    });

    await s3Client.send(command);
  }

  /**
   * Get presigned URL for private file
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Get public URL
   */
  getPublicUrl(key: string): string {
    return `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.region}.amazonaws.com/${key}`;
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
    });

    await s3Client.send(command);
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: S3_CONFIG.bucket,
        Key: key,
      });
      await s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Process image: Create thumbnail and extract metadata
   */
  private async processImage(buffer: Buffer): Promise<{
    thumbnail?: Buffer;
    metadata: { width: number; height: number; format: string };
  }> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Create thumbnail (300x300)
      const thumbnail = await image
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      return {
        thumbnail,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || 'unknown',
        },
      };
    } catch (error) {
      console.error('[STORAGE_SERVICE] Image processing error:', error);
      return {
        metadata: { width: 0, height: 0, format: 'unknown' },
      };
    }
  }

  /**
   * Generate unique storage key
   */
  private generateStorageKey(
    userId: string,
    workspaceId: string | undefined,
    filename: string
  ): string {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext).substring(0, 50);
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '-');

    if (workspaceId) {
      return `workspaces/${workspaceId}/${userId}/${timestamp}-${randomId}-${sanitizedName}${ext}`;
    }

    return `users/${userId}/${timestamp}-${randomId}-${sanitizedName}${ext}`;
  }

  /**
   * Generate thumbnail key
   */
  private generateThumbnailKey(originalKey: string): string {
    const ext = path.extname(originalKey);
    const baseName = originalKey.substring(0, originalKey.length - ext.length);
    return `${baseName}-thumb.jpg`;
  }

  /**
   * Calculate SHA-256 checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check if MIME type is an image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Sanitize metadata for S3 (remove invalid characters)
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        sanitized[key] = value;
      } else {
        sanitized[key] = JSON.stringify(value);
      }
    }

    return sanitized;
  }

  /**
   * Get allowed MIME types
   */
  static getAllowedMimeTypes(): string[] {
    return [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',

      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',

      // Text
      'text/plain',
      'text/csv',
      'text/markdown',
      'application/json',

      // Archives
      'application/zip',
      'application/x-zip-compressed',
    ];
  }

  /**
   * Get max file size (in bytes)
   */
  static getMaxFileSize(): number {
    return 50 * 1024 * 1024; // 50 MB
  }
}

// Singleton instance
export const storageService = new StorageService();
