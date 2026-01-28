// Security Utilities - XSS Guards, Safe Downloads, Audit Hash Chain

import crypto from "crypto";

/**
 * Escape HTML special characters to prevent XSS
 * Use server-side when rendering user content
 */
export function escapeHTML(str: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return str.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

/**
 * Sanitize filename for safe downloads
 * Only allows alphanumeric, dots, underscores, hyphens
 */
export function safeDownloadName(name: string): string {
  if (!name) return "file.txt";

  const sanitized = name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 64);

  return sanitized || "file.txt";
}

/**
 * Audit Log Entry (input)
 */
export type AuditEntryInput = {
  actor: string;
  action: string;
  target: string;
  meta?: any;
};

/**
 * Audit Log Entry (stored with hash chain)
 */
export type AuditEntry = AuditEntryInput & {
  ts: string;
  prevHash: string;
  hash: string;
};

/**
 * Audit Logger with Hash Chain
 * Each entry links to previous via SHA-256 hash
 * Tamper-evident append-only log
 */
class AuditLogger {
  private chain: AuditEntry[] = [];
  private readonly MAX_ENTRIES = 500;

  /**
   * Log an audit entry with hash chain
   */
  log(entry: AuditEntryInput): AuditEntry {
    const base = {
      ...entry,
      ts: new Date().toISOString(),
    };

    // Get previous hash (empty string for first entry)
    const prevHash = this.chain.at(-1)?.hash ?? "";

    // Create payload for hashing
    const payload = JSON.stringify({ ...base, prevHash });

    // Compute SHA-256 hash
    const hash = crypto.createHash("sha256").update(payload).digest("hex");

    const auditEntry: AuditEntry = {
      ...base,
      prevHash,
      hash,
    };

    this.chain.push(auditEntry);

    // LRU: Keep only last MAX_ENTRIES
    if (this.chain.length > this.MAX_ENTRIES) {
      this.chain.shift();
    }

    return auditEntry;
  }

  /**
   * Get latest N audit entries
   */
  latest(n: number = 10): AuditEntry[] {
    return this.chain.slice(-n);
  }

  /**
   * Verify hash chain integrity
   * Returns true if all hashes are valid
   */
  verify(): boolean {
    for (let i = 0; i < this.chain.length; i++) {
      const entry = this.chain[i];
      const prevHash = i > 0 ? this.chain[i - 1].hash : "";

      // Recompute hash
      const payload = JSON.stringify({
        actor: entry.actor,
        action: entry.action,
        target: entry.target,
        meta: entry.meta,
        ts: entry.ts,
        prevHash,
      });

      const expectedHash = crypto
        .createHash("sha256")
        .update(payload)
        .digest("hex");

      if (entry.hash !== expectedHash || entry.prevHash !== prevHash) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all entries (for testing)
   */
  getAll(): AuditEntry[] {
    return [...this.chain];
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.chain = [];
  }
}

// Singleton instance
export const audit = new AuditLogger();
