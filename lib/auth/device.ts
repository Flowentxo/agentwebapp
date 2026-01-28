/**
 * SINTRA Auth System - Device Parsing & Intelligence
 * Phase 2: Session & Device Intelligence
 *
 * Uses ua-parser-js to extract device information from User-Agent strings.
 * This enables:
 * - Device-based session tracking
 * - Suspicious login detection (new device alerts)
 * - Security analytics (device type distribution)
 */

import { UAParser } from 'ua-parser-js';
import type { SessionDeviceInfo } from '../db/schema';

// Known bot patterns (extend as needed)
const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /lighthouse/i,
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
];

/**
 * Detect if User-Agent belongs to a bot
 */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

/**
 * Parse User-Agent string into structured device info
 *
 * @param userAgent - The User-Agent header string
 * @returns SessionDeviceInfo object with browser, OS, device, and CPU info
 */
export function parseUserAgent(userAgent: string | null | undefined): SessionDeviceInfo {
  if (!userAgent) {
    return {
      browser: { name: 'Unknown' },
      os: { name: 'Unknown' },
      device: { type: 'unknown' },
      isBot: false,
    };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device type
  let deviceType = result.device.type || 'desktop';
  if (!result.device.type) {
    // If no device type detected, default to desktop for browsers
    if (result.browser.name) {
      deviceType = 'desktop';
    }
  }

  return {
    browser: {
      name: result.browser.name,
      version: result.browser.version,
      major: result.browser.major,
    },
    os: {
      name: result.os.name,
      version: result.os.version,
    },
    device: {
      type: deviceType,
      vendor: result.device.vendor,
      model: result.device.model,
    },
    cpu: {
      architecture: result.cpu.architecture,
    },
    isBot: isBot(userAgent),
  };
}

/**
 * Get a human-readable device description
 *
 * @example "Chrome 120 on Windows 10 (Desktop)"
 * @example "Safari 17.2 on iOS 17.2 (iPhone)"
 * @example "Firefox 121 on macOS 14.2 (Desktop)"
 */
export function getDeviceDescription(deviceInfo: SessionDeviceInfo): string {
  const parts: string[] = [];

  // Browser info
  if (deviceInfo.browser?.name) {
    let browserStr = deviceInfo.browser.name;
    if (deviceInfo.browser.major) {
      browserStr += ` ${deviceInfo.browser.major}`;
    }
    parts.push(browserStr);
  }

  // OS info
  if (deviceInfo.os?.name) {
    let osStr = deviceInfo.os.name;
    if (deviceInfo.os.version) {
      osStr += ` ${deviceInfo.os.version}`;
    }
    parts.push(`on ${osStr}`);
  }

  // Device type/model
  const deviceType = deviceInfo.device?.type || 'unknown';
  const deviceModel = deviceInfo.device?.model;
  const deviceVendor = deviceInfo.device?.vendor;

  if (deviceModel) {
    parts.push(`(${deviceVendor ? `${deviceVendor} ` : ''}${deviceModel})`);
  } else if (deviceType !== 'unknown') {
    // Capitalize first letter
    const typeLabel = deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
    parts.push(`(${typeLabel})`);
  }

  if (deviceInfo.isBot) {
    parts.push('[Bot]');
  }

  return parts.join(' ') || 'Unknown Device';
}

/**
 * Check if two device infos likely represent the same device
 *
 * Used for detecting suspicious logins (same user, different device)
 */
export function isSameDevice(
  a: SessionDeviceInfo | null | undefined,
  b: SessionDeviceInfo | null | undefined
): boolean {
  if (!a || !b) return false;

  // Browser + OS + Device type must match
  const sameBrowser = a.browser?.name === b.browser?.name;
  const sameOS = a.os?.name === b.os?.name;
  const sameDeviceType = a.device?.type === b.device?.type;

  // If we have device model info, use that for more precision
  if (a.device?.model && b.device?.model) {
    return (
      sameBrowser &&
      sameOS &&
      a.device.model === b.device.model &&
      a.device.vendor === b.device.vendor
    );
  }

  return sameBrowser && sameOS && sameDeviceType;
}

/**
 * Get device icon name for UI rendering
 */
export function getDeviceIcon(deviceInfo: SessionDeviceInfo): string {
  const type = deviceInfo.device?.type?.toLowerCase();

  switch (type) {
    case 'mobile':
      return 'smartphone';
    case 'tablet':
      return 'tablet';
    case 'smarttv':
      return 'tv';
    case 'console':
      return 'gamepad-2';
    case 'wearable':
      return 'watch';
    case 'desktop':
    default:
      return 'monitor';
  }
}

/**
 * Extract client IP from request headers
 * Handles various proxy headers (Cloudflare, AWS ALB, Nginx, etc.)
 */
export function extractClientIp(headers: Headers | Record<string, string | undefined>): string {
  // Helper to get header value
  const getHeader = (name: string): string | null | undefined => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    return headers[name] || headers[name.toLowerCase()];
  };

  // Priority order for IP headers
  const ipHeaders = [
    'cf-connecting-ip', // Cloudflare
    'true-client-ip', // Cloudflare Enterprise
    'x-real-ip', // Nginx
    'x-client-ip', // Apache
    'x-forwarded-for', // Standard proxy header
    'x-forwarded', // Older proxies
    'forwarded-for', // Older proxies
    'forwarded', // RFC 7239
  ];

  for (const header of ipHeaders) {
    const value = getHeader(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first (client)
      const ip = value.split(',')[0].trim();
      if (isValidIp(ip)) {
        return ip;
      }
    }
  }

  return 'unknown';
}

/**
 * Basic IP validation
 */
function isValidIp(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}
