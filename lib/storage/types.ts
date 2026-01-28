/**
 * BLOB STORAGE TYPES & INTERFACES
 *
 * Generic interfaces for blob storage providers.
 * Supports S3, MinIO, local filesystem, and other implementations.
 */

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Result of an upload operation
 */
export interface UploadResult {
  success: boolean;
  key: string;
  size: number;
  etag?: string;
  url?: string;
  error?: string;
}

/**
 * Result of a download operation
 */
export interface DownloadResult<T = unknown> {
  success: boolean;
  data?: T;
  size?: number;
  contentType?: string;
  error?: string;
}

/**
 * Result of a delete operation
 */
export interface DeleteResult {
  success: boolean;
  key: string;
  error?: string;
}

/**
 * Metadata for stored objects
 */
export interface ObjectMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  etag?: string;
  customMetadata?: Record<string, string>;
}

/**
 * Options for upload operations
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  /** If true, compress data before upload */
  compress?: boolean;
  /** Custom bucket/container override */
  bucket?: string;
}

/**
 * Options for download operations
 */
export interface DownloadOptions {
  /** If true, decompress data after download */
  decompress?: boolean;
  /** Custom bucket/container override */
  bucket?: string;
}

/**
 * Options for list operations
 */
export interface ListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
  bucket?: string;
}

/**
 * Result of a list operation
 */
export interface ListResult {
  success: boolean;
  objects: ObjectMetadata[];
  isTruncated: boolean;
  continuationToken?: string;
  error?: string;
}

// ============================================================================
// BLOB STORAGE PROVIDER INTERFACE
// ============================================================================

/**
 * Generic blob storage provider interface
 *
 * Implementations:
 * - S3BlobStorageProvider (AWS S3 / MinIO)
 * - LocalFileStorageProvider (Local filesystem for dev/testing)
 * - AzureBlobStorageProvider (Azure Blob Storage)
 * - GCSBlobStorageProvider (Google Cloud Storage)
 */
export interface IBlobStorageProvider {
  /**
   * Provider name for logging/debugging
   */
  readonly name: string;

  /**
   * Upload data to blob storage
   *
   * @param key - Unique key/path for the object
   * @param data - Data to upload (will be JSON serialized if object)
   * @param options - Upload options
   */
  upload(
    key: string,
    data: unknown,
    options?: UploadOptions
  ): Promise<UploadResult>;

  /**
   * Download data from blob storage
   *
   * @param key - Key/path of the object to download
   * @param options - Download options
   */
  download<T = unknown>(
    key: string,
    options?: DownloadOptions
  ): Promise<DownloadResult<T>>;

  /**
   * Delete an object from blob storage
   *
   * @param key - Key/path of the object to delete
   */
  delete(key: string): Promise<DeleteResult>;

  /**
   * Delete multiple objects from blob storage
   *
   * @param keys - Array of keys to delete
   */
  deleteMany(keys: string[]): Promise<DeleteResult[]>;

  /**
   * Check if an object exists
   *
   * @param key - Key/path to check
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get object metadata without downloading content
   *
   * @param key - Key/path of the object
   */
  getMetadata(key: string): Promise<ObjectMetadata | null>;

  /**
   * List objects with optional prefix filter
   *
   * @param options - List options
   */
  list(options?: ListOptions): Promise<ListResult>;

  /**
   * Generate a pre-signed URL for direct access
   *
   * @param key - Key/path of the object
   * @param expiresInSeconds - URL expiration time
   */
  getSignedUrl?(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Health check for the storage provider
   */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// LOG STORAGE TYPES
// ============================================================================

/**
 * Pointer object stored in PostgreSQL when data is offloaded to blob storage
 */
export interface StoragePointer {
  /** Indicates data is stored externally */
  _storage: 's3' | 'local' | 'azure' | 'gcs';
  /** Key/path in the storage provider */
  key: string;
  /** Original size in bytes */
  size: number;
  /** Timestamp when offloaded */
  offloadedAt: string;
  /** Optional content hash for integrity */
  hash?: string;
}

/**
 * Check if a value is a storage pointer
 */
export function isStoragePointer(value: unknown): value is StoragePointer {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj._storage === 'string' &&
    typeof obj.key === 'string' &&
    typeof obj.size === 'number'
  );
}

/**
 * Log storage configuration
 */
export interface LogStorageConfig {
  /** Size threshold in bytes for offloading to blob storage (default: 10KB) */
  sizeThresholdBytes: number;
  /** Base path prefix for log storage */
  basePath: string;
  /** Whether to compress data before storage */
  compressLogs: boolean;
  /** Provider type to use */
  provider: 's3' | 'local' | 'auto';
}

/**
 * Default log storage configuration
 */
export const DEFAULT_LOG_STORAGE_CONFIG: LogStorageConfig = {
  sizeThresholdBytes: 10 * 1024, // 10KB
  basePath: 'logs',
  compressLogs: false,
  provider: 'auto',
};

// ============================================================================
// RETENTION POLICY TYPES
// ============================================================================

/**
 * Log retention policy configuration
 */
export interface RetentionPolicyConfig {
  /** Days after which to prune log data (keep metadata) */
  pruneAfterDays: number;
  /** Days after which to hard delete logs */
  deleteAfterDays: number;
  /** Extended retention for error logs */
  errorRetentionDays: number;
  /** Batch size for processing */
  batchSize: number;
  /** Whether to also delete blob storage data */
  deleteBlobs: boolean;
}

/**
 * Default retention policy
 */
export const DEFAULT_RETENTION_POLICY: RetentionPolicyConfig = {
  pruneAfterDays: 7,
  deleteAfterDays: 90,
  errorRetentionDays: 30,
  batchSize: 1000,
  deleteBlobs: true,
};

/**
 * Result of a retention run
 */
export interface RetentionRunResult {
  success: boolean;
  prunedCount: number;
  deletedCount: number;
  blobsDeleted: number;
  errors: string[];
  durationMs: number;
}

// ============================================================================
// STORAGE PROVIDER FACTORY TYPE
// ============================================================================

/**
 * Factory function type for creating storage providers
 */
export type BlobStorageProviderFactory = (
  config?: Record<string, unknown>
) => IBlobStorageProvider;
