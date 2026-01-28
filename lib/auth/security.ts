/**
 * SINTRA Auth System - Security Module
 * Phase 2, Punkt 3: New Device Detection & Alerts
 *
 * Tracks known devices and sends security alerts for new device logins.
 */

import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { userKnownDevices, type SessionDeviceInfo } from '../db/schema';
import { parseUserAgent, getDeviceDescription } from './device';
import { sendNewDeviceLoginEmail } from './mailer';
import { logAuth } from './logger';

// =====================================================
// Types
// =====================================================

export interface DeviceCheckRequest {
  userId: string;
  userEmail: string;
  userAgent: string;
  ipAddress: string;
  deviceInfo?: SessionDeviceInfo;
}

export interface DeviceCheckResult {
  isNewDevice: boolean;
  deviceHash: string;
  deviceId?: string;
  alertSent: boolean;
}

// =====================================================
// Device Fingerprinting
// =====================================================

/**
 * Generate a device fingerprint hash from User-Agent and IP range.
 *
 * We use:
 * - Full User-Agent string (browser, OS, device)
 * - IP address prefix (first 3 octets for IPv4, first 4 groups for IPv6)
 *
 * This provides a balance between:
 * - Security (detecting truly different devices)
 * - Usability (not alerting for minor IP changes within same network)
 */
export function generateDeviceHash(userAgent: string, ipAddress: string): string {
  // Normalize User-Agent
  const normalizedUA = userAgent.toLowerCase().trim();

  // Get IP prefix (first 3 octets for IPv4, or simplified IPv6)
  const ipPrefix = getIpPrefix(ipAddress);

  // Combine and hash
  const fingerprint = `${normalizedUA}|${ipPrefix}`;
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Get the prefix of an IP address for fingerprinting.
 * For IPv4: first 3 octets (e.g., "192.168.1")
 * For IPv6: first 4 groups
 */
function getIpPrefix(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length >= 3) {
      return parts.slice(0, 3).join('.');
    }
    return ip;
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(':');
    }
    return ip;
  }

  return ip;
}

// =====================================================
// Device Detection & Notification
// =====================================================

/**
 * Check if a device is known for a user and send alert if new.
 *
 * This function:
 * 1. Generates a device fingerprint hash
 * 2. Checks if this hash exists in user_known_devices
 * 3. If known: Updates lastSeenAt
 * 4. If new: Creates record and sends security email
 *
 * @param request - Device check request with user and device info
 * @returns Result indicating if device is new and if alert was sent
 */
export async function checkAndNotifyNewDevice(
  request: DeviceCheckRequest
): Promise<DeviceCheckResult> {
  const { userId, userEmail, userAgent, ipAddress } = request;

  // Generate device fingerprint
  const deviceHash = generateDeviceHash(userAgent, ipAddress);

  // Parse device info if not provided
  const deviceInfo = request.deviceInfo || parseUserAgent(userAgent);

  const db = getDb();

  try {
    // Check if device is known
    const existingDevice = await db
      .select()
      .from(userKnownDevices)
      .where(
        and(
          eq(userKnownDevices.userId, userId),
          eq(userKnownDevices.deviceHash, deviceHash)
        )
      )
      .limit(1);

    if (existingDevice.length > 0) {
      // Known device - update lastSeenAt
      const device = existingDevice[0];

      await db
        .update(userKnownDevices)
        .set({ lastSeenAt: new Date() })
        .where(eq(userKnownDevices.id, device.id));

      logAuth('device_recognized', {
        userId,
        deviceHash: deviceHash.substring(0, 16) + '...',
        deviceId: device.id,
      });

      return {
        isNewDevice: false,
        deviceHash,
        deviceId: device.id,
        alertSent: false,
      };
    }

    // New device - create record
    const [newDevice] = await db
      .insert(userKnownDevices)
      .values({
        userId,
        deviceHash,
        userAgent,
        ipAddress,
        deviceInfo,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      })
      .returning();

    logAuth('new_device_detected', {
      userId,
      deviceHash: deviceHash.substring(0, 16) + '...',
      deviceId: newDevice.id,
      deviceDescription: getDeviceDescription(deviceInfo),
    });

    // Send security alert email (fire-and-forget)
    let alertSent = false;
    try {
      await sendNewDeviceLoginEmail(userEmail, {
        deviceDescription: getDeviceDescription(deviceInfo),
        ipAddress,
        browser: deviceInfo.browser?.name || 'Unknown Browser',
        os: deviceInfo.os?.name || 'Unknown OS',
        deviceType: deviceInfo.device?.type || 'desktop',
        loginTime: new Date(),
      });

      // Mark alert as sent
      await db
        .update(userKnownDevices)
        .set({ alertSentAt: new Date() })
        .where(eq(userKnownDevices.id, newDevice.id));

      alertSent = true;

      logAuth('new_device_alert_sent', {
        userId,
        email: userEmail,
        deviceId: newDevice.id,
      });
    } catch (emailError) {
      // Log but don't fail the login
      console.error('[SECURITY] Failed to send new device alert:', emailError);
      logAuth('new_device_alert_failed', {
        userId,
        deviceId: newDevice.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return {
      isNewDevice: true,
      deviceHash,
      deviceId: newDevice.id,
      alertSent,
    };
  } catch (error) {
    // Log but don't fail the login
    console.error('[SECURITY] Device check error:', error);
    logAuth('device_check_error', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      isNewDevice: false, // Assume known to avoid blocking
      deviceHash,
      alertSent: false,
    };
  }
}

// =====================================================
// Device Management
// =====================================================

/**
 * Get all known devices for a user
 */
export async function getUserKnownDevices(userId: string) {
  const db = getDb();

  return db
    .select()
    .from(userKnownDevices)
    .where(eq(userKnownDevices.userId, userId))
    .orderBy(userKnownDevices.lastSeenAt);
}

/**
 * Revoke trust for a device (mark as untrusted)
 */
export async function revokeDeviceTrust(deviceId: string, userId: string): Promise<boolean> {
  const db = getDb();

  const result = await db
    .update(userKnownDevices)
    .set({
      isTrusted: false,
      trustRevokedAt: new Date(),
    })
    .where(
      and(
        eq(userKnownDevices.id, deviceId),
        eq(userKnownDevices.userId, userId)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Remove a known device entirely
 */
export async function removeKnownDevice(deviceId: string, userId: string): Promise<boolean> {
  const db = getDb();

  const result = await db
    .delete(userKnownDevices)
    .where(
      and(
        eq(userKnownDevices.id, deviceId),
        eq(userKnownDevices.userId, userId)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Clear all known devices for a user (security action)
 */
export async function clearAllKnownDevices(userId: string): Promise<number> {
  const db = getDb();

  const result = await db
    .delete(userKnownDevices)
    .where(eq(userKnownDevices.userId, userId))
    .returning();

  return result.length;
}

/**
 * Check if a specific device hash is trusted for a user
 */
export async function isDeviceTrusted(
  userId: string,
  deviceHash: string
): Promise<boolean> {
  const db = getDb();

  const device = await db
    .select()
    .from(userKnownDevices)
    .where(
      and(
        eq(userKnownDevices.userId, userId),
        eq(userKnownDevices.deviceHash, deviceHash)
      )
    )
    .limit(1);

  if (device.length === 0) return false;
  return device[0].isTrusted;
}
