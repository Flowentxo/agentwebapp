/**
 * Security API Client
 *
 * Centralizes all security-related API calls for the frontend
 */

// ============================================
// TYPES
// ============================================

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: string;
}

export interface TwoFactorSetupResponse {
  success: boolean;
  secret: string;
  otpAuthUrl: string;
  issuer: string;
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  message: string;
  backupCodes: string[];
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string;
  environment: string;
  scopes: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  rateLimit: number;
  status: "active" | "expired" | "revoked";
  createdAt: string;
}

export interface Session {
  id: string;
  device: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  ip: string;
  location: string;
  country: string;
  loginTime: string;
  current: boolean;
  trusted: boolean;
  lastActive: string;
}

export interface IPAllowlistEntry {
  ip: string;
  label: string;
  addedAt: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actionDescription: string;
  ip: string;
  userAgent: string;
  details: Record<string, unknown>;
  timestamp: string;
  timestampFormatted: string;
}

// ============================================
// API CLIENT
// ============================================

const API_BASE = "/api/settings/security";

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // In production, get user ID from auth context
      "x-user-id": localStorage.getItem("userId") || "demo-user",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

// ============================================
// 2FA API
// ============================================

export const twoFactorApi = {
  /** Get 2FA status */
  async getStatus() {
    return apiRequest<{
      enabled: boolean;
      hasBackupCodes: boolean;
      unusedBackupCodes: number;
    }>("/2fa");
  },

  /** Initialize 2FA setup - returns QR code data */
  async initSetup() {
    return apiRequest<TwoFactorSetupResponse>("/2fa", {
      method: "POST",
    });
  },

  /** Verify TOTP code and enable 2FA */
  async verify(code: string) {
    return apiRequest<TwoFactorVerifyResponse>("/2fa", {
      method: "PUT",
      body: JSON.stringify({ code }),
    });
  },

  /** Disable 2FA */
  async disable(code: string) {
    return apiRequest<{ success: boolean }>("/2fa", {
      method: "DELETE",
      body: JSON.stringify({ code }),
    });
  },
};

// ============================================
// BACKUP CODES API
// ============================================

export const backupCodesApi = {
  /** Get backup codes status */
  async getStatus() {
    return apiRequest<{
      codes: Array<{ index: number; used: boolean; preview: string }>;
      totalCodes: number;
      remainingCodes: number;
    }>("/2fa/backup-codes");
  },

  /** Regenerate backup codes */
  async regenerate() {
    return apiRequest<{
      success: boolean;
      codes: string[];
    }>("/2fa/backup-codes", {
      method: "POST",
    });
  },

  /** Download backup codes */
  async download() {
    return apiRequest<{
      success: boolean;
      content: string;
      filename: string;
      unusedCodes: string[];
    }>("/2fa/backup-codes", {
      method: "DELETE",
    });
  },
};

// ============================================
// API KEYS API
// ============================================

export const apiKeysApi = {
  /** List all API keys */
  async list() {
    return apiRequest<{
      keys: ApiKey[];
      count: number;
    }>("/api-keys");
  },

  /** Create new API key */
  async create(data: {
    name: string;
    scopes: string[];
    environment?: string;
    expiresIn?: string;
    rateLimit?: number;
    description?: string;
  }) {
    return apiRequest<{
      success: boolean;
      key: ApiKey & { fullKey: string };
    }>("/api-keys", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** Update API key */
  async update(
    id: string,
    data: {
      name?: string;
      scopes?: string[];
      rateLimit?: number;
      description?: string;
    }
  ) {
    return apiRequest<{
      success: boolean;
      key: ApiKey;
    }>("/api-keys", {
      method: "PUT",
      body: JSON.stringify({ id, ...data }),
    });
  },

  /** Revoke API key */
  async revoke(id: string, reason?: string) {
    return apiRequest<{ success: boolean }>(`/api-keys?id=${id}&reason=${reason || ""}`, {
      method: "DELETE",
    });
  },

  /** Delete API key permanently */
  async delete(id: string) {
    return apiRequest<{ success: boolean }>(`/api-keys?id=${id}&permanent=true`, {
      method: "DELETE",
    });
  },

  /** Rotate single API key */
  async rotate(id: string) {
    return apiRequest<{
      success: boolean;
      key: ApiKey & { fullKey: string };
    }>(`/api-keys/${id}/rotate`, {
      method: "POST",
    });
  },

  /** Rotate all API keys (emergency) */
  async rotateAll(reason?: string) {
    return apiRequest<{
      success: boolean;
      rotatedCount: number;
      keys: Array<{ id: string; name: string; newKey: string }>;
    }>("/tokens/rotate-all", {
      method: "POST",
      body: JSON.stringify({
        confirm: "ROTATE_ALL_TOKENS",
        reason,
      }),
    });
  },
};

// ============================================
// SESSIONS API
// ============================================

export const sessionsApi = {
  /** List all active sessions */
  async list() {
    return apiRequest<{
      sessions: Session[];
      count: number;
      currentSessionId: string | null;
    }>("/sessions");
  },

  /** Terminate a session */
  async terminate(sessionId: string) {
    return apiRequest<{ success: boolean }>(`/sessions?id=${sessionId}`, {
      method: "DELETE",
    });
  },

  /** Terminate all other sessions */
  async terminateAll() {
    return apiRequest<{ success: boolean }>("/sessions?id=all", {
      method: "DELETE",
    });
  },

  /** Update session trust level */
  async updateTrust(sessionId: string, trusted: boolean) {
    return apiRequest<{ success: boolean }>("/sessions", {
      method: "PUT",
      body: JSON.stringify({ sessionId, trusted }),
    });
  },
};

// ============================================
// IP ALLOWLIST API
// ============================================

export const ipAllowlistApi = {
  /** Get IP allowlist configuration */
  async get() {
    return apiRequest<{
      enabled: boolean;
      entries: IPAllowlistEntry[];
      count: number;
    }>("/ip-allowlist");
  },

  /** Add IP to allowlist */
  async add(ip: string, label?: string) {
    return apiRequest<{
      success: boolean;
      entry: IPAllowlistEntry;
    }>("/ip-allowlist", {
      method: "POST",
      body: JSON.stringify({ ip, label }),
    });
  },

  /** Remove IP from allowlist */
  async remove(ip: string) {
    return apiRequest<{
      success: boolean;
      remaining: number;
    }>(`/ip-allowlist?ip=${encodeURIComponent(ip)}`, {
      method: "DELETE",
    });
  },

  /** Toggle allowlist on/off */
  async setEnabled(enabled: boolean) {
    return apiRequest<{ success: boolean }>("/ip-allowlist", {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
  },

  /** Bulk import IPs */
  async import(entries: string[]) {
    return apiRequest<{
      success: boolean;
      imported: number;
      invalid: string[];
    }>("/ip-allowlist", {
      method: "PUT",
      body: JSON.stringify({ import: entries }),
    });
  },

  /** Export IPs to CSV */
  async export() {
    return apiRequest<{
      success: boolean;
      content: string;
      filename: string;
    }>("/ip-allowlist?export=true", {
      method: "DELETE",
    });
  },
};

// ============================================
// PASSWORD API
// ============================================

export const passwordApi = {
  /** Get password info */
  async getInfo() {
    return apiRequest<{
      lastChangedAt: string;
      daysSinceChange: number;
      shouldChange: boolean;
    }>("/password");
  },

  /** Change password */
  async change(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    logoutOtherSessions?: boolean;
  }) {
    return apiRequest<{ success: boolean }>("/password", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /** Check password strength */
  async checkStrength(password: string) {
    return apiRequest<{
      score: number;
      feedback: string[];
      meetsRequirements: boolean;
      strength: string;
    }>("/password", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },
};

// ============================================
// AUDIT API
// ============================================

export const auditApi = {
  /** Get audit events */
  async list(options?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    category?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.startDate) params.set("startDate", options.startDate);
    if (options?.endDate) params.set("endDate", options.endDate);
    if (options?.category) params.set("category", options.category);

    return apiRequest<{
      events: AuditEvent[];
      pagination: {
        page: number;
        totalPages: number;
        totalCount: number;
      };
    }>(`/audit?${params.toString()}`);
  },

  /** Export audit log */
  async export(options?: {
    startDate?: string;
    endDate?: string;
    format?: "csv" | "json";
  }) {
    return apiRequest<{
      success: boolean;
      content: string;
      filename: string;
      eventCount: number;
    }>("/audit", {
      method: "POST",
      body: JSON.stringify(options),
    });
  },
};
