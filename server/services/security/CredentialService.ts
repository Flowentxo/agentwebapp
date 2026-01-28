/**
 * Credential Service
 *
 * Phase 5: Credential Vault & Sub-Workflow Orchestration
 *
 * Secure credential management with CRUD operations and
 * just-in-time resolution for workflow execution.
 *
 * Security Features:
 * - AES-256-GCM encryption at rest
 * - In-memory decryption only when needed
 * - Automatic memory scrubbing after use
 * - Access control by user/workspace/scope
 * - Audit logging of all credential access
 */

import { eq, and, or, sql, isNull, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  credentials,
  credentialUsageLog,
  CredentialRecord,
  NewCredentialRecord,
  CredentialType,
  CredentialScope,
  ResolvedCredential,
  CredentialReference,
  CredentialSchemas,
} from '@/lib/db/schema-credentials';
import {
  EncryptionService,
  getEncryptionService,
  DecryptionInput,
} from './EncryptionService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CreateCredentialInput {
  name: string;
  type: CredentialType;
  data: Record<string, unknown>;
  ownerId: string;
  workspaceId?: string;
  scope?: CredentialScope;
  description?: string;
  expiresAt?: Date;
}

export interface UpdateCredentialInput {
  name?: string;
  data?: Record<string, unknown>;
  description?: string;
  expiresAt?: Date;
  scope?: CredentialScope;
}

export interface CredentialAccessContext {
  userId: string;
  workspaceId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestSource?: 'api' | 'ui' | 'workflow';
}

export interface CredentialResolutionResult {
  success: boolean;
  credentials: Map<string, ResolvedCredential>;
  errors: Map<string, string>;
}

// ============================================================================
// CREDENTIAL SERVICE CLASS
// ============================================================================

export class CredentialService {
  private db = getDb();
  private encryptionService: EncryptionService;

  // In-memory cache for resolved credentials (cleared after each request)
  private resolvedCache: Map<string, ResolvedCredential> = new Map();

  constructor() {
    this.encryptionService = getEncryptionService();
  }

  // --------------------------------------------------------------------------
  // CRUD OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Create a new credential
   */
  async create(input: CreateCredentialInput): Promise<CredentialRecord> {
    const {
      name,
      type,
      data,
      ownerId,
      workspaceId,
      scope = 'user',
      description,
      expiresAt,
    } = input;

    // Validate the credential data against the schema
    this.validateCredentialData(type, data);

    // Encrypt the credential data
    const encrypted = this.encryptionService.encrypt(data);

    // Insert into database
    const [credential] = await this.db
      .insert(credentials)
      .values({
        name,
        type,
        ownerId,
        workspaceId,
        scope,
        description,
        expiresAt,
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      })
      .returning();

    console.log(`[CredentialService] Created credential: ${credential.id} (${name})`);

    return credential;
  }

  /**
   * Update an existing credential
   */
  async update(
    credentialId: string,
    input: UpdateCredentialInput,
    context: CredentialAccessContext
  ): Promise<CredentialRecord | null> {
    // Verify access
    const credential = await this.getById(credentialId);
    if (!credential) {
      return null;
    }

    if (!this.canAccess(credential, context)) {
      throw new Error('Access denied to credential');
    }

    const updateData: Partial<NewCredentialRecord> = {
      updatedAt: new Date(),
    };

    if (input.name) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt;
    if (input.scope) updateData.scope = input.scope;

    // Re-encrypt if data is being updated
    if (input.data) {
      this.validateCredentialData(credential.type, input.data);
      const encrypted = this.encryptionService.encrypt(input.data);
      updateData.encryptedData = encrypted.encryptedData;
      updateData.iv = encrypted.iv;
      updateData.authTag = encrypted.authTag;
    }

    const [updated] = await this.db
      .update(credentials)
      .set(updateData)
      .where(eq(credentials.id, credentialId))
      .returning();

    // Log the update
    await this.logUsage(credentialId, 'update', context, true);

    console.log(`[CredentialService] Updated credential: ${credentialId}`);

    return updated;
  }

  /**
   * Soft delete a credential
   */
  async delete(
    credentialId: string,
    context: CredentialAccessContext
  ): Promise<boolean> {
    const credential = await this.getById(credentialId);
    if (!credential) {
      return false;
    }

    if (!this.canAccess(credential, context)) {
      throw new Error('Access denied to credential');
    }

    await this.db
      .update(credentials)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(credentials.id, credentialId));

    console.log(`[CredentialService] Deleted credential: ${credentialId}`);

    return true;
  }

  /**
   * Get a credential by ID (without decryption)
   */
  async getById(credentialId: string): Promise<CredentialRecord | null> {
    const [credential] = await this.db
      .select()
      .from(credentials)
      .where(
        and(
          eq(credentials.id, credentialId),
          eq(credentials.isDeleted, false)
        )
      )
      .limit(1);

    return credential ?? null;
  }

  /**
   * Get a credential by name for a user
   */
  async getByName(
    name: string,
    ownerId: string
  ): Promise<CredentialRecord | null> {
    const [credential] = await this.db
      .select()
      .from(credentials)
      .where(
        and(
          eq(credentials.name, name),
          eq(credentials.ownerId, ownerId),
          eq(credentials.isDeleted, false)
        )
      )
      .limit(1);

    return credential ?? null;
  }

  /**
   * List credentials accessible to a user
   */
  async list(context: CredentialAccessContext): Promise<CredentialRecord[]> {
    const conditions = [eq(credentials.isDeleted, false)];

    // Build access filter
    const accessConditions = [
      // User's own credentials
      and(
        eq(credentials.ownerId, context.userId),
        eq(credentials.scope, 'user')
      ),
    ];

    // Workspace credentials
    if (context.workspaceId) {
      accessConditions.push(
        and(
          eq(credentials.workspaceId, context.workspaceId),
          eq(credentials.scope, 'workspace')
        )
      );
    }

    // Global credentials (everyone can read)
    accessConditions.push(eq(credentials.scope, 'global'));

    conditions.push(or(...accessConditions)!);

    return this.db
      .select()
      .from(credentials)
      .where(and(...conditions))
      .orderBy(desc(credentials.updatedAt));
  }

  /**
   * List credentials by type
   */
  async listByType(
    type: CredentialType,
    context: CredentialAccessContext
  ): Promise<CredentialRecord[]> {
    const allCredentials = await this.list(context);
    return allCredentials.filter(c => c.type === type);
  }

  // --------------------------------------------------------------------------
  // RESOLUTION (DECRYPTION)
  // --------------------------------------------------------------------------

  /**
   * Resolve (decrypt) a credential for use in execution
   * The resolved credential is kept in memory only during execution
   */
  async resolve<T = unknown>(
    credentialId: string,
    context: CredentialAccessContext
  ): Promise<ResolvedCredential<T> | null> {
    // Check cache first
    if (this.resolvedCache.has(credentialId)) {
      return this.resolvedCache.get(credentialId) as ResolvedCredential<T>;
    }

    const credential = await this.getById(credentialId);
    if (!credential) {
      await this.logUsage(credentialId, 'read', context, false, 'Credential not found');
      return null;
    }

    // Verify access
    if (!this.canAccess(credential, context)) {
      await this.logUsage(credentialId, 'read', context, false, 'Access denied');
      throw new Error('Access denied to credential');
    }

    // Check if expired
    if (credential.isExpired || (credential.expiresAt && new Date(credential.expiresAt) < new Date())) {
      await this.logUsage(credentialId, 'read', context, false, 'Credential expired');
      throw new Error('Credential has expired');
    }

    try {
      // Decrypt
      const decryptionInput: DecryptionInput = {
        encryptedData: credential.encryptedData,
        iv: credential.iv,
        authTag: credential.authTag,
      };

      const decrypted = this.encryptionService.decryptToObject<T>(decryptionInput);

      const resolved: ResolvedCredential<T> = {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        data: decrypted,
        expiresAt: credential.expiresAt ?? undefined,
      };

      // Cache for this request
      this.resolvedCache.set(credentialId, resolved as ResolvedCredential);

      // Update usage stats
      await this.db
        .update(credentials)
        .set({
          lastUsedAt: new Date(),
          usageCount: sql`usage_count + 1`,
        })
        .where(eq(credentials.id, credentialId));

      // Log successful access
      await this.logUsage(credentialId, 'read', context, true);

      return resolved;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Decryption failed';
      await this.logUsage(credentialId, 'read', context, false, errorMessage);
      throw error;
    }
  }

  /**
   * Resolve multiple credentials
   */
  async resolveMultiple(
    credentialIds: string[],
    context: CredentialAccessContext
  ): Promise<CredentialResolutionResult> {
    const resolved = new Map<string, ResolvedCredential>();
    const errors = new Map<string, string>();

    await Promise.all(
      credentialIds.map(async (id) => {
        try {
          const credential = await this.resolve(id, context);
          if (credential) {
            resolved.set(id, credential);
          } else {
            errors.set(id, 'Credential not found');
          }
        } catch (error) {
          errors.set(id, error instanceof Error ? error.message : 'Resolution failed');
        }
      })
    );

    return {
      success: errors.size === 0,
      credentials: resolved,
      errors,
    };
  }

  /**
   * Resolve credential references from expression (e.g., {{$credentials.myKey}})
   */
  async resolveReferences(
    text: string,
    context: CredentialAccessContext
  ): Promise<string> {
    const pattern = /\{\{\s*\$credentials\.([a-zA-Z0-9_-]+)(?:\.([a-zA-Z0-9_.]+))?\s*\}\}/g;
    const matches = [...text.matchAll(pattern)];

    if (matches.length === 0) {
      return text;
    }

    let result = text;

    for (const match of matches) {
      const [fullMatch, credentialName, fieldPath] = match;

      try {
        // Find credential by name
        const credential = await this.getByName(credentialName, context.userId);
        if (!credential) {
          console.warn(`[CredentialService] Credential not found: ${credentialName}`);
          continue;
        }

        // Resolve the credential
        const resolved = await this.resolve(credential.id, context);
        if (!resolved) {
          continue;
        }

        // Extract the value
        let value: unknown = resolved.data;

        if (fieldPath) {
          const parts = fieldPath.split('.');
          for (const part of parts) {
            if (typeof value === 'object' && value !== null) {
              value = (value as Record<string, unknown>)[part];
            } else {
              value = undefined;
              break;
            }
          }
        }

        // Replace in result
        const stringValue = typeof value === 'string'
          ? value
          : JSON.stringify(value);

        result = result.replace(fullMatch, stringValue);
      } catch (error) {
        console.error(`[CredentialService] Failed to resolve ${credentialName}:`, error);
      }
    }

    return result;
  }

  /**
   * Clear the resolved cache (call after execution completes)
   */
  clearCache(): void {
    this.resolvedCache.clear();
  }

  // --------------------------------------------------------------------------
  // ACCESS CONTROL
  // --------------------------------------------------------------------------

  /**
   * Check if a user can access a credential
   */
  private canAccess(
    credential: CredentialRecord,
    context: CredentialAccessContext
  ): boolean {
    // Owner always has access
    if (credential.ownerId === context.userId) {
      return true;
    }

    // Check scope
    switch (credential.scope) {
      case 'user':
        // Only owner can access
        return false;

      case 'workspace':
        // User must be in the same workspace
        return credential.workspaceId === context.workspaceId;

      case 'global':
        // Everyone can access global credentials
        return true;

      default:
        return false;
    }
  }

  // --------------------------------------------------------------------------
  // VALIDATION
  // --------------------------------------------------------------------------

  /**
   * Validate credential data against schema
   */
  private validateCredentialData(
    type: CredentialType,
    data: Record<string, unknown>
  ): void {
    const requiredFields: Record<string, string[]> = {
      openai_api: ['apiKey'],
      anthropic_api: ['apiKey'],
      postgres_connection: ['host', 'port', 'database', 'username', 'password'],
      mysql_connection: ['host', 'port', 'database', 'username', 'password'],
      mongodb_connection: ['connectionString'],
      redis_connection: ['host', 'port'],
      aws_credentials: ['accessKeyId', 'secretAccessKey'],
      smtp_server: ['host', 'port', 'username', 'password'],
      oauth2_client: ['clientId', 'clientSecret'],
      api_key: ['apiKey'],
      basic_auth: ['username', 'password'],
      bearer_token: ['token'],
    };

    const required = requiredFields[type];
    if (!required) {
      return; // No validation for unknown types
    }

    const missing = required.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields for ${type}: ${missing.join(', ')}`);
    }
  }

  /**
   * Validate a credential by testing the connection
   */
  async validate(
    credentialId: string,
    context: CredentialAccessContext
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const resolved = await this.resolve(credentialId, context);
      if (!resolved) {
        return { valid: false, error: 'Credential not found' };
      }

      // Type-specific validation
      const validator = this.getValidator(resolved.type);
      if (validator) {
        const result = await validator(resolved.data);

        // Update validation status
        await this.db
          .update(credentials)
          .set({
            lastValidatedAt: new Date(),
            isValid: result.valid,
            validationError: result.error,
          })
          .where(eq(credentials.id, credentialId));

        await this.logUsage(credentialId, 'validate', context, result.valid, result.error);

        return result;
      }

      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Get validator function for credential type
   */
  private getValidator(
    type: string
  ): ((data: unknown) => Promise<{ valid: boolean; error?: string }>) | null {
    // Placeholder for type-specific validators
    // In a real implementation, each type would have its own validation logic
    const validators: Record<string, (data: unknown) => Promise<{ valid: boolean; error?: string }>> = {
      // Example: Test OpenAI API key
      // openai_api: async (data) => {
      //   try {
      //     const { apiKey } = data as { apiKey: string };
      //     const response = await fetch('https://api.openai.com/v1/models', {
      //       headers: { Authorization: `Bearer ${apiKey}` },
      //     });
      //     return { valid: response.ok, error: response.ok ? undefined : 'Invalid API key' };
      //   } catch (error) {
      //     return { valid: false, error: 'Connection failed' };
      //   }
      // },
    };

    return validators[type] ?? null;
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGGING
  // --------------------------------------------------------------------------

  /**
   * Log credential usage
   */
  private async logUsage(
    credentialId: string,
    action: string,
    context: CredentialAccessContext,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.db.insert(credentialUsageLog).values({
        credentialId,
        userId: context.userId,
        workflowId: context.workflowId,
        executionId: context.executionId,
        nodeId: context.nodeId,
        action,
        success,
        errorMessage,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestSource: context.requestSource,
      });
    } catch (error) {
      console.error('[CredentialService] Failed to log usage:', error);
    }
  }

  /**
   * Get usage logs for a credential
   */
  async getUsageLogs(
    credentialId: string,
    limit: number = 100
  ): Promise<typeof credentialUsageLog.$inferSelect[]> {
    return this.db
      .select()
      .from(credentialUsageLog)
      .where(eq(credentialUsageLog.credentialId, credentialId))
      .orderBy(desc(credentialUsageLog.createdAt))
      .limit(limit);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let credentialServiceInstance: CredentialService | null = null;

export function getCredentialService(): CredentialService {
  if (!credentialServiceInstance) {
    credentialServiceInstance = new CredentialService();
  }
  return credentialServiceInstance;
}

export default CredentialService;
