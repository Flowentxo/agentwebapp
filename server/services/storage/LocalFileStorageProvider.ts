/**
 * LOCAL FILE STORAGE PROVIDER
 *
 * Filesystem-based blob storage for development and testing.
 * Mimics the S3 interface but stores files locally.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
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

const logger = createLogger('local-storage-provider');

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface LocalStorageConfig {
  /** Base directory for storage */
  basePath: string;
  /** Create directories if they don't exist */
  createDirs: boolean;
}

function getLocalConfig(): LocalStorageConfig {
  return {
    basePath: process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), '.data', 'blob-storage'),
    createDirs: true,
  };
}

// ============================================================================
// LOCAL FILE STORAGE PROVIDER
// ============================================================================

export class LocalFileStorageProvider implements IBlobStorageProvider {
  readonly name = 'local';
  private basePath: string;
  private createDirs: boolean;

  constructor(config?: Partial<LocalStorageConfig>) {
    const fullConfig = { ...getLocalConfig(), ...config };
    this.basePath = fullConfig.basePath;
    this.createDirs = fullConfig.createDirs;

    logger.info('LocalFileStorageProvider initialized', {
      basePath: this.basePath,
    });
  }

  /**
   * Get full file path for a key
   */
  private getFilePath(key: string): string {
    // Sanitize key to prevent directory traversal
    const sanitizedKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.basePath, sanitizedKey);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(filePath: string): Promise<void> {
    if (this.createDirs) {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Upload data to local filesystem
   */
  async upload(
    key: string,
    data: unknown,
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      const filePath = this.getFilePath(key);
      await this.ensureDir(filePath);

      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const size = Buffer.byteLength(content, 'utf-8');

      await fs.writeFile(filePath, content, 'utf-8');

      // Generate a simple hash as etag
      const etag = createHash('md5').update(content).digest('hex');

      // Store metadata in a sidecar file
      const metaPath = `${filePath}.meta.json`;
      const metadata = {
        contentType: options?.contentType || 'application/json',
        size,
        etag,
        uploadedAt: new Date().toISOString(),
        customMetadata: options?.metadata,
      };
      await fs.writeFile(metaPath, JSON.stringify(metadata), 'utf-8');

      logger.debug('Local upload successful', { key, size, filePath });

      return {
        success: true,
        key,
        size,
        etag,
      };
    } catch (error: any) {
      logger.error('Local upload failed', { key, error: error.message });
      return {
        success: false,
        key,
        size: 0,
        error: error.message,
      };
    }
  }

  /**
   * Download data from local filesystem
   */
  async download<T = unknown>(
    key: string,
    options?: DownloadOptions
  ): Promise<DownloadResult<T>> {
    try {
      const filePath = this.getFilePath(key);

      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as T;

      // Try to read metadata
      let contentType = 'application/json';
      let size = Buffer.byteLength(content, 'utf-8');

      try {
        const metaPath = `${filePath}.meta.json`;
        const metaContent = await fs.readFile(metaPath, 'utf-8');
        const meta = JSON.parse(metaContent);
        contentType = meta.contentType || contentType;
        size = meta.size || size;
      } catch {
        // Metadata file doesn't exist, use defaults
      }

      return {
        success: true,
        data,
        size,
        contentType,
      };
    } catch (error: any) {
      logger.error('Local download failed', { key, error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a file from local filesystem
   */
  async delete(key: string): Promise<DeleteResult> {
    try {
      const filePath = this.getFilePath(key);

      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(`${filePath}.meta.json`).catch(() => {});

      logger.debug('Local delete successful', { key });

      return {
        success: true,
        key,
      };
    } catch (error: any) {
      logger.error('Local delete failed', { key, error: error.message });
      return {
        success: false,
        key,
        error: error.message,
      };
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMany(keys: string[]): Promise<DeleteResult[]> {
    const results: DeleteResult[] = [];

    for (const key of keys) {
      const result = await this.delete(key);
      results.push(result);
    }

    logger.info('Local deleteMany completed', {
      requested: keys.length,
      deleted: results.filter((r) => r.success).length,
    });

    return results;
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    try {
      const filePath = this.getFilePath(key);
      const stats = await fs.stat(filePath);

      let customMetadata: Record<string, string> | undefined;
      let etag: string | undefined;
      let contentType: string | undefined;

      try {
        const metaPath = `${filePath}.meta.json`;
        const metaContent = await fs.readFile(metaPath, 'utf-8');
        const meta = JSON.parse(metaContent);
        customMetadata = meta.customMetadata;
        etag = meta.etag;
        contentType = meta.contentType;
      } catch {
        // Metadata file doesn't exist
      }

      return {
        key,
        size: stats.size,
        lastModified: stats.mtime,
        contentType,
        etag,
        customMetadata,
      };
    } catch {
      return null;
    }
  }

  /**
   * List files in a directory
   */
  async list(options?: ListOptions): Promise<ListResult> {
    try {
      const prefix = options?.prefix || '';
      const searchPath = this.getFilePath(prefix);
      const maxKeys = options?.maxKeys || 1000;

      const objects: ObjectMetadata[] = [];

      // Recursive directory walker
      const walkDir = async (dir: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            if (objects.length >= maxKeys) return;

            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
              await walkDir(fullPath);
            } else if (!entry.name.endsWith('.meta.json')) {
              const relativePath = path.relative(this.basePath, fullPath);
              const key = relativePath.replace(/\\/g, '/');

              const meta = await this.getMetadata(key);
              if (meta) {
                objects.push(meta);
              }
            }
          }
        } catch {
          // Directory doesn't exist or can't be read
        }
      };

      await walkDir(searchPath);

      return {
        success: true,
        objects,
        isTruncated: objects.length >= maxKeys,
      };
    } catch (error: any) {
      logger.error('Local list failed', { error: error.message });
      return {
        success: false,
        objects: [],
        isTruncated: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate a file:// URL (no signing needed for local)
   */
  async getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    const filePath = this.getFilePath(key);
    return `file://${filePath}`;
  }

  /**
   * Health check - verify base directory is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      const testFile = path.join(this.basePath, '.health-check');
      await fs.writeFile(testFile, 'ok');
      await fs.unlink(testFile);
      return true;
    } catch (error: any) {
      logger.error('Local storage health check failed', { error: error.message });
      return false;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let localProviderInstance: LocalFileStorageProvider | null = null;

export function getLocalStorageProvider(
  config?: Partial<LocalStorageConfig>
): LocalFileStorageProvider {
  if (!localProviderInstance) {
    localProviderInstance = new LocalFileStorageProvider(config);
  }
  return localProviderInstance;
}

export default LocalFileStorageProvider;
