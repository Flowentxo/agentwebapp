/**
 * S3 BLOB STORAGE PROVIDER
 *
 * AWS S3 / MinIO compatible blob storage implementation.
 * Used for offloading large workflow logs to object storage.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createLogger } from '@/lib/logger';
import {
  IBlobStorageProvider,
  UploadResult,
  DownloadResult,
  DeleteResult,
  ObjectMetadata,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  ListResult,
} from '@/lib/storage/types';

const logger = createLogger('s3-storage-provider');

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface S3StorageConfig {
  /** S3 bucket name */
  bucket: string;
  /** AWS region */
  region: string;
  /** S3 endpoint (for MinIO or S3-compatible services) */
  endpoint?: string;
  /** AWS Access Key ID */
  accessKeyId?: string;
  /** AWS Secret Access Key */
  secretAccessKey?: string;
  /** Force path style URLs (required for MinIO) */
  forcePathStyle?: boolean;
}

function getS3Config(): S3StorageConfig {
  return {
    bucket: process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'workflow-logs',
    region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || !!process.env.MINIO_ENDPOINT,
  };
}

// ============================================================================
// S3 BLOB STORAGE PROVIDER
// ============================================================================

export class S3BlobStorageProvider implements IBlobStorageProvider {
  readonly name = 's3';
  private client: S3Client;
  private bucket: string;

  constructor(config?: Partial<S3StorageConfig>) {
    const fullConfig = { ...getS3Config(), ...config };
    this.bucket = fullConfig.bucket;

    this.client = new S3Client({
      region: fullConfig.region,
      endpoint: fullConfig.endpoint,
      credentials: fullConfig.accessKeyId && fullConfig.secretAccessKey
        ? {
            accessKeyId: fullConfig.accessKeyId,
            secretAccessKey: fullConfig.secretAccessKey,
          }
        : undefined,
      forcePathStyle: fullConfig.forcePathStyle,
    });

    logger.info('S3BlobStorageProvider initialized', {
      bucket: this.bucket,
      region: fullConfig.region,
      endpoint: fullConfig.endpoint || 'AWS S3',
    });
  }

  /**
   * Upload data to S3
   */
  async upload(
    key: string,
    data: unknown,
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      const bucket = options?.bucket || this.bucket;
      const body = typeof data === 'string' ? data : JSON.stringify(data);
      const size = Buffer.byteLength(body, 'utf-8');

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: options?.contentType || 'application/json',
        Metadata: options?.metadata,
      });

      const response = await this.client.send(command);

      logger.debug('S3 upload successful', { key, size, etag: response.ETag });

      return {
        success: true,
        key,
        size,
        etag: response.ETag,
      };
    } catch (error: any) {
      logger.error('S3 upload failed', { key, error: error.message });
      return {
        success: false,
        key,
        size: 0,
        error: error.message,
      };
    }
  }

  /**
   * Download data from S3
   */
  async download<T = unknown>(
    key: string,
    options?: DownloadOptions
  ): Promise<DownloadResult<T>> {
    try {
      const bucket = options?.bucket || this.bucket;

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        return {
          success: false,
          error: 'Empty response body',
        };
      }

      // Convert stream to string
      const bodyContents = await response.Body.transformToString();
      const data = JSON.parse(bodyContents) as T;

      return {
        success: true,
        data,
        size: response.ContentLength,
        contentType: response.ContentType,
      };
    } catch (error: any) {
      logger.error('S3 download failed', { key, error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete an object from S3
   */
  async delete(key: string): Promise<DeleteResult> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);

      logger.debug('S3 delete successful', { key });

      return {
        success: true,
        key,
      };
    } catch (error: any) {
      logger.error('S3 delete failed', { key, error: error.message });
      return {
        success: false,
        key,
        error: error.message,
      };
    }
  }

  /**
   * Delete multiple objects from S3
   */
  async deleteMany(keys: string[]): Promise<DeleteResult[]> {
    if (keys.length === 0) return [];

    try {
      // S3 allows up to 1000 objects per delete request
      const batches: string[][] = [];
      for (let i = 0; i < keys.length; i += 1000) {
        batches.push(keys.slice(i, i + 1000));
      }

      const results: DeleteResult[] = [];

      for (const batch of batches) {
        const command = new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: batch.map((key) => ({ Key: key })),
          },
        });

        const response = await this.client.send(command);

        // Track successful deletes
        if (response.Deleted) {
          for (const deleted of response.Deleted) {
            results.push({
              success: true,
              key: deleted.Key || '',
            });
          }
        }

        // Track errors
        if (response.Errors) {
          for (const error of response.Errors) {
            results.push({
              success: false,
              key: error.Key || '',
              error: error.Message,
            });
          }
        }
      }

      logger.info('S3 deleteMany completed', {
        requested: keys.length,
        deleted: results.filter((r) => r.success).length,
      });

      return results;
    } catch (error: any) {
      logger.error('S3 deleteMany failed', { error: error.message });
      return keys.map((key) => ({
        success: false,
        key,
        error: error.message,
      }));
    }
  }

  /**
   * Check if an object exists in S3
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get object metadata
   */
  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType,
        etag: response.ETag,
        customMetadata: response.Metadata,
      };
    } catch {
      return null;
    }
  }

  /**
   * List objects in S3
   */
  async list(options?: ListOptions): Promise<ListResult> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: options?.bucket || this.bucket,
        Prefix: options?.prefix,
        MaxKeys: options?.maxKeys || 1000,
        ContinuationToken: options?.continuationToken,
      });

      const response = await this.client.send(command);

      const objects: ObjectMetadata[] = (response.Contents || []).map((item) => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
        etag: item.ETag,
      }));

      return {
        success: true,
        objects,
        isTruncated: response.IsTruncated || false,
        continuationToken: response.NextContinuationToken,
      };
    } catch (error: any) {
      logger.error('S3 list failed', { error: error.message });
      return {
        success: false,
        objects: [],
        isTruncated: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate a pre-signed URL
   */
  async getSignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        MaxKeys: 1,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      logger.error('S3 health check failed', { error: error.message });
      return false;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let s3ProviderInstance: S3BlobStorageProvider | null = null;

export function getS3StorageProvider(
  config?: Partial<S3StorageConfig>
): S3BlobStorageProvider {
  if (!s3ProviderInstance) {
    s3ProviderInstance = new S3BlobStorageProvider(config);
  }
  return s3ProviderInstance;
}

export default S3BlobStorageProvider;
