import { getDb } from '../db/connection';
import { integrationSettings, IntegrationSettings } from '../db/schema-integrations';
import { eq, and } from 'drizzle-orm';
import { encryptPassword, decryptPassword } from '../security/encryption';

export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

/**
 * Save provider configuration for a user
 */
export async function saveProviderConfig(
  userId: string, 
  provider: string, 
  config: ProviderConfig
): Promise<void> {
  const db = getDb();
  
  // Encrypt sensitive data
  const encryptedConfig = {
    ...config,
    clientSecret: encryptPassword(config.clientSecret)
  };

  // Check if exists
  const existing = await getProviderConfigRecord(userId, provider);

  if (existing) {
    await db.update(integrationSettings)
      .set({
        settings: encryptedConfig,
        updatedAt: new Date()
      })
      .where(eq(integrationSettings.id, existing.id));
  } else {
    await db.insert(integrationSettings).values({
      userId,
      provider,
      settings: encryptedConfig
    });
  }
}

/**
 * Get decrypted provider configuration
 */
export async function getProviderConfig(
  userId: string, 
  provider: string
): Promise<ProviderConfig | null> {
  const record = await getProviderConfigRecord(userId, provider);
  
  if (!record || !record.settings) return null;
  
  const settings = record.settings as any;
  
  if (!settings.clientId || !settings.clientSecret) return null;

  try {
    return {
      clientId: settings.clientId,
      clientSecret: decryptPassword(settings.clientSecret),
      redirectUri: settings.redirectUri
    };
  } catch (error) {
    console.error(`[CONFIG] Failed to decrypt secret for ${provider}`, error);
    return null;
  }
}

/**
 * Check if configuration exists (without revealing secrets)
 */
export async function hasProviderConfig(
  userId: string, 
  provider: string
): Promise<boolean> {
  const config = await getProviderConfigRecord(userId, provider);
  return !!config;
}

// Helper
async function getProviderConfigRecord(userId: string, provider: string) {
  const db = getDb();
  const [record] = await db
    .select()
    .from(integrationSettings)
    .where(
      and(
        eq(integrationSettings.userId, userId),
        eq(integrationSettings.provider, provider)
      )
    )
    .limit(1);
  return record;
}
