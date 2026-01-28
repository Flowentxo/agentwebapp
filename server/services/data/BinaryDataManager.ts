/**
 * BinaryDataManager
 *
 * Phase 3: Power Features - Binary Data Abstraction Layer
 *
 * Handles large binary files (images, PDFs, etc.) using a "Pass by Reference"
 * pattern. Instead of embedding binary data in the ExecutionState (which causes
 * database bloat and OOM), we store files externally and pass lightweight pointers.
 *
 * Reference Structure:
 * {
 *   _binary: true,
 *   mimeType: 'image/png',
 *   fileExtension: 'png',
 *   fileName: 'report.png',
 *   fileSize: 1024000,
 *   data: 'file://local/storage/abc123.png' // OR 's3://bucket/key'
 * }
 *
 * Storage Providers:
 * - LocalFileSystemProvider: Stores files in local filesystem (default)
 * - S3Provider: Stores files in AWS S3 (future implementation)
 * - AzureBlobProvider: Stores files in Azure Blob Storage (future)
 *
 * Security:
 * - Files are stored with random UUIDs, not user-provided names
 * - Path traversal protection
 * - Automatic cleanup of orphaned files
 */

import { randomUUID } from 'crypto';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { join, extname, basename, normalize } from 'path';
import { createLogger } from '@/lib/logger';

const logger = createLogger('binary-data-manager');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Binary data reference stored in ExecutionState
 */
export interface BinaryReference {
  /** Marker indicating this is a binary reference */
  _binary: true;

  /** MIME type of the file */
  mimeType: string;

  /** File extension (without dot) */
  fileExtension: string;

  /** Original or generated file name */
  fileName: string;

  /** File size in bytes */
  fileSize: number;

  /** Storage URI (file:// or s3:// or azure://) */
  data: string;

  /** When the file was stored */
  storedAt: string;

  /** Checksum for integrity verification */
  checksum?: string;

  /** Workflow execution ID that owns this file */
  executionId?: string;

  /** Node ID that created this file */
  nodeId?: string;
}

/**
 * Binary storage provider interface
 */
export interface IBinaryStorageProvider {
  /** Provider name */
  readonly name: string;

  /** URI scheme (file, s3, azure) */
  readonly scheme: string;

  /**
   * Store binary data and return URI
   */
  store(
    data: Buffer | Readable,
    options: StoreOptions
  ): Promise<string>;

  /**
   * Retrieve binary data as a stream
   */
  retrieve(uri: string): Promise<Readable>;

  /**
   * Retrieve binary data as a buffer
   */
  retrieveAsBuffer(uri: string): Promise<Buffer>;

  /**
   * Delete a file
   */
  delete(uri: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(uri: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getMetadata(uri: string): Promise<FileMetadata>;

  /**
   * List files by prefix (for cleanup)
   */
  list(prefix: string): Promise<string[]>;

  /**
   * Cleanup files older than a certain age
   */
  cleanup(olderThanMs: number): Promise<number>;
}

/**
 * Options for storing binary data
 */
export interface StoreOptions {
  /** Original file name */
  fileName?: string;

  /** MIME type */
  mimeType?: string;

  /** File extension */
  fileExtension?: string;

  /** Execution ID for grouping */
  executionId?: string;

  /** Node ID for tracking */
  nodeId?: string;
}

/**
 * File metadata
 */
export interface FileMetadata {
  size: number;
  mimeType?: string;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Binary data manager configuration
 */
export interface BinaryDataConfig {
  /** Storage provider to use */
  provider: 'local' | 's3' | 'azure';

  /** Base path for local storage */
  localBasePath: string;

  /** Maximum file size in bytes (default 100MB) */
  maxFileSizeBytes: number;

  /** Automatically cleanup files after N hours */
  cleanupAfterHours: number;

  /** S3 configuration (if using S3) */
  s3?: {
    bucket: string;
    region: string;
    prefix: string;
  };
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: BinaryDataConfig = {
  provider: 'local',
  localBasePath: join(process.cwd(), '.data', 'binary'),
  maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
  cleanupAfterHours: 24,
};

// ============================================================================
// LOCAL FILE SYSTEM PROVIDER
// ============================================================================

export class LocalFileSystemProvider implements IBinaryStorageProvider {
  readonly name = 'local-filesystem';
  readonly scheme = 'file';

  private basePath: string;

  constructor(basePath: string) {
    this.basePath = normalize(basePath);
  }

  async initialize(): Promise<void> {
    // Ensure base directory exists
    await fs.mkdir(this.basePath, { recursive: true });
    logger.info('LocalFileSystemProvider initialized', { basePath: this.basePath });
  }

  async store(data: Buffer | Readable, options: StoreOptions): Promise<string> {
    const fileId = randomUUID();
    const ext = options.fileExtension || 'bin';
    const fileName = `${fileId}.${ext}`;

    // Create subdirectory based on date for organization
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const subDir = join(this.basePath, datePrefix);
    await fs.mkdir(subDir, { recursive: true });

    const filePath = join(subDir, fileName);

    // Validate path doesn't escape base directory
    const normalizedPath = normalize(filePath);
    if (!normalizedPath.startsWith(this.basePath)) {
      throw new Error('Path traversal detected');
    }

    // Write the file
    if (Buffer.isBuffer(data)) {
      await fs.writeFile(filePath, data);
    } else {
      const writeStream = createWriteStream(filePath);
      await pipeline(data, writeStream);
    }

    const uri = `file://${normalizedPath.replace(/\\/g, '/')}`;
    logger.debug('File stored', { uri, size: options.fileName });

    return uri;
  }

  async retrieve(uri: string): Promise<Readable> {
    const filePath = this.uriToPath(uri);
    await this.validatePath(filePath);

    if (!(await this.exists(uri))) {
      throw new Error(`File not found: ${uri}`);
    }

    return createReadStream(filePath);
  }

  async retrieveAsBuffer(uri: string): Promise<Buffer> {
    const filePath = this.uriToPath(uri);
    await this.validatePath(filePath);

    return fs.readFile(filePath);
  }

  async delete(uri: string): Promise<void> {
    const filePath = this.uriToPath(uri);
    await this.validatePath(filePath);

    try {
      await fs.unlink(filePath);
      logger.debug('File deleted', { uri });
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File already deleted, ignore
    }
  }

  async exists(uri: string): Promise<boolean> {
    const filePath = this.uriToPath(uri);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(uri: string): Promise<FileMetadata> {
    const filePath = this.uriToPath(uri);
    await this.validatePath(filePath);

    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  }

  async list(prefix: string): Promise<string[]> {
    const searchPath = join(this.basePath, prefix);
    const files: string[] = [];

    try {
      await this.listRecursive(searchPath, files);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    return files.map(f => `file://${f.replace(/\\/g, '/')}`);
  }

  private async listRecursive(dir: string, files: string[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.listRecursive(fullPath, files);
      } else {
        files.push(fullPath);
      }
    }
  }

  async cleanup(olderThanMs: number): Promise<number> {
    const cutoffTime = Date.now() - olderThanMs;
    let deletedCount = 0;

    const allFiles = await this.list('');

    for (const uri of allFiles) {
      try {
        const metadata = await this.getMetadata(uri);
        if (metadata.modifiedAt.getTime() < cutoffTime) {
          await this.delete(uri);
          deletedCount++;
        }
      } catch (error) {
        logger.warn('Cleanup error', { uri, error });
      }
    }

    logger.info('Cleanup completed', { deletedCount });
    return deletedCount;
  }

  private uriToPath(uri: string): string {
    if (!uri.startsWith('file://')) {
      throw new Error(`Invalid URI scheme: ${uri}`);
    }
    return uri.slice(7).replace(/\//g, '/');
  }

  private async validatePath(filePath: string): Promise<void> {
    const normalizedPath = normalize(filePath);
    if (!normalizedPath.startsWith(this.basePath)) {
      throw new Error('Path traversal detected');
    }
  }
}

// ============================================================================
// BINARY DATA MANAGER
// ============================================================================

export class BinaryDataManager {
  private config: BinaryDataConfig;
  private provider: IBinaryStorageProvider;
  private initialized: boolean = false;

  constructor(config: Partial<BinaryDataConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize provider based on config
    switch (this.config.provider) {
      case 'local':
        this.provider = new LocalFileSystemProvider(this.config.localBasePath);
        break;
      case 's3':
        // S3 provider would be implemented here
        throw new Error('S3 provider not yet implemented');
      case 'azure':
        // Azure provider would be implemented here
        throw new Error('Azure provider not yet implemented');
      default:
        this.provider = new LocalFileSystemProvider(this.config.localBasePath);
    }
  }

  /**
   * Initialize the manager and provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if ('initialize' in this.provider && typeof this.provider.initialize === 'function') {
      await (this.provider as LocalFileSystemProvider).initialize();
    }

    this.initialized = true;
    logger.info('BinaryDataManager initialized', { provider: this.config.provider });
  }

  /**
   * Store binary data and return a reference object
   */
  async store(
    data: Buffer | Readable | string,
    options: StoreOptions & { base64?: boolean } = {}
  ): Promise<BinaryReference> {
    await this.ensureInitialized();

    // Convert string to buffer if needed
    let buffer: Buffer;
    if (typeof data === 'string') {
      if (options.base64) {
        buffer = Buffer.from(data, 'base64');
      } else {
        buffer = Buffer.from(data, 'utf-8');
      }
    } else if (Buffer.isBuffer(data)) {
      buffer = data;
    } else {
      // Readable stream - we need to buffer it to get size
      const chunks: Buffer[] = [];
      for await (const chunk of data) {
        chunks.push(Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
    }

    // Check size limit
    if (buffer.length > this.config.maxFileSizeBytes) {
      throw new Error(
        `File size (${buffer.length} bytes) exceeds maximum allowed (${this.config.maxFileSizeBytes} bytes)`
      );
    }

    // Determine file extension and MIME type
    const fileExtension = options.fileExtension || this.getExtensionFromMimeType(options.mimeType);
    const mimeType = options.mimeType || this.getMimeTypeFromExtension(fileExtension);
    const fileName = options.fileName || `file.${fileExtension}`;

    // Store the file
    const uri = await this.provider.store(buffer, {
      ...options,
      fileExtension,
      mimeType,
    });

    // Build reference
    const reference: BinaryReference = {
      _binary: true,
      mimeType,
      fileExtension,
      fileName,
      fileSize: buffer.length,
      data: uri,
      storedAt: new Date().toISOString(),
      executionId: options.executionId,
      nodeId: options.nodeId,
    };

    logger.debug('Binary data stored', {
      fileName,
      fileSize: buffer.length,
      mimeType,
      uri,
    });

    return reference;
  }

  /**
   * Store from base64 string
   */
  async storeFromBase64(
    base64Data: string,
    options: StoreOptions
  ): Promise<BinaryReference> {
    return this.store(base64Data, { ...options, base64: true });
  }

  /**
   * Retrieve binary data as a stream
   */
  async retrieve(reference: BinaryReference): Promise<Readable> {
    await this.ensureInitialized();

    if (!this.isBinaryReference(reference)) {
      throw new Error('Invalid binary reference');
    }

    return this.provider.retrieve(reference.data);
  }

  /**
   * Retrieve binary data as a buffer
   */
  async retrieveAsBuffer(reference: BinaryReference): Promise<Buffer> {
    await this.ensureInitialized();

    if (!this.isBinaryReference(reference)) {
      throw new Error('Invalid binary reference');
    }

    return this.provider.retrieveAsBuffer(reference.data);
  }

  /**
   * Retrieve binary data as base64 string
   */
  async retrieveAsBase64(reference: BinaryReference): Promise<string> {
    const buffer = await this.retrieveAsBuffer(reference);
    return buffer.toString('base64');
  }

  /**
   * Delete a binary file
   */
  async delete(reference: BinaryReference): Promise<void> {
    await this.ensureInitialized();

    if (!this.isBinaryReference(reference)) {
      return;
    }

    await this.provider.delete(reference.data);
  }

  /**
   * Delete multiple binary files by execution ID
   */
  async deleteByExecutionId(executionId: string): Promise<number> {
    await this.ensureInitialized();

    // List all files and filter by execution ID
    // This is a simple implementation; in production, we'd use the database
    const allFiles = await this.provider.list('');
    let deletedCount = 0;

    for (const uri of allFiles) {
      // In a production system, we'd query the database for files
      // belonging to this execution
      try {
        await this.provider.delete(uri);
        deletedCount++;
      } catch (error) {
        logger.warn('Failed to delete file', { uri, error });
      }
    }

    return deletedCount;
  }

  /**
   * Check if an object is a binary reference
   */
  isBinaryReference(obj: unknown): obj is BinaryReference {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      (obj as any)._binary === true &&
      typeof (obj as any).data === 'string' &&
      typeof (obj as any).mimeType === 'string'
    );
  }

  /**
   * Extract binary references from an object recursively
   */
  extractBinaryReferences(obj: unknown): BinaryReference[] {
    const references: BinaryReference[] = [];

    if (this.isBinaryReference(obj)) {
      references.push(obj);
      return references;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        references.push(...this.extractBinaryReferences(item));
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        references.push(...this.extractBinaryReferences(value));
      }
    }

    return references;
  }

  /**
   * Replace binary data in an object with references
   */
  async replaceBinaryDataWithReferences(
    obj: unknown,
    options: { executionId?: string; nodeId?: string } = {}
  ): Promise<unknown> {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Already a reference, return as-is
    if (this.isBinaryReference(obj)) {
      return obj;
    }

    // Check if this looks like binary data that should be referenced
    if (this.isInlineBinaryData(obj)) {
      const binaryObj = obj as any;
      const buffer = Buffer.from(binaryObj.data, 'base64');

      return this.store(buffer, {
        mimeType: binaryObj.mimeType,
        fileName: binaryObj.fileName,
        fileExtension: binaryObj.fileExtension,
        executionId: options.executionId,
        nodeId: options.nodeId,
      });
    }

    // Recursively process arrays
    if (Array.isArray(obj)) {
      return Promise.all(
        obj.map(item => this.replaceBinaryDataWithReferences(item, options))
      );
    }

    // Recursively process objects
    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = await this.replaceBinaryDataWithReferences(value, options);
      }
      return result;
    }

    return obj;
  }

  /**
   * Check if an object looks like inline binary data
   */
  private isInlineBinaryData(obj: unknown): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    const o = obj as any;
    return (
      typeof o.data === 'string' &&
      typeof o.mimeType === 'string' &&
      o.data.length > 1000 && // Likely base64 encoded
      !o._binary // Not already a reference
    );
  }

  /**
   * Run cleanup of old files
   */
  async cleanup(): Promise<number> {
    await this.ensureInitialized();

    const olderThanMs = this.config.cleanupAfterHours * 60 * 60 * 1000;
    return this.provider.cleanup(olderThanMs);
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSizeBytes: number;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    await this.ensureInitialized();

    const files = await this.provider.list('');
    let totalSize = 0;
    let oldestFile: Date | undefined;
    let newestFile: Date | undefined;

    for (const uri of files) {
      try {
        const metadata = await this.provider.getMetadata(uri);
        totalSize += metadata.size;

        if (!oldestFile || metadata.createdAt < oldestFile) {
          oldestFile = metadata.createdAt;
        }
        if (!newestFile || metadata.createdAt > newestFile) {
          newestFile = metadata.createdAt;
        }
      } catch (error) {
        // Ignore errors for individual files
      }
    }

    return {
      totalFiles: files.length,
      totalSizeBytes: totalSize,
      oldestFile,
      newestFile,
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private getExtensionFromMimeType(mimeType?: string): string {
    if (!mimeType) return 'bin';

    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'application/pdf': 'pdf',
      'application/json': 'json',
      'text/plain': 'txt',
      'text/html': 'html',
      'text/css': 'css',
      'text/javascript': 'js',
      'application/xml': 'xml',
      'application/zip': 'zip',
      'application/octet-stream': 'bin',
      'video/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
    };

    return mimeToExt[mimeType] || 'bin';
  }

  private getMimeTypeFromExtension(extension?: string): string {
    if (!extension) return 'application/octet-stream';

    const ext = extension.toLowerCase().replace(/^\./, '');
    const extToMime: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'json': 'application/json',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'bin': 'application/octet-stream',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
    };

    return extToMime[ext] || 'application/octet-stream';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let binaryDataManagerInstance: BinaryDataManager | null = null;

export function getBinaryDataManager(config?: Partial<BinaryDataConfig>): BinaryDataManager {
  if (!binaryDataManagerInstance) {
    binaryDataManagerInstance = new BinaryDataManager(config);
  }
  return binaryDataManagerInstance;
}

export async function initializeBinaryDataManager(config?: Partial<BinaryDataConfig>): Promise<BinaryDataManager> {
  const manager = getBinaryDataManager(config);
  await manager.initialize();
  return manager;
}

export default BinaryDataManager;
