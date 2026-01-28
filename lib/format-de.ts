/**
 * German number formatting utilities
 * Consistent de-DE formatting across the application
 */

/**
 * Format number with German locale (thousands separator: ., decimal: ,)
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string (e.g., "5.432" or "5,4")
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format number with abbreviated suffix (Tsd. / Mio. / Mrd.)
 * @param value - Number to format
 * @returns Formatted string (e.g., "5,4 Tsd.")
 */
export function formatNumberCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${formatNumber(value / 1_000_000_000, 1)} Mrd.`;
  }
  if (value >= 1_000_000) {
    return `${formatNumber(value / 1_000_000, 1)} Mio.`;
  }
  if (value >= 1_000) {
    return `${formatNumber(value / 1_000, 1)} Tsd.`;
  }
  return formatNumber(value);
}

/**
 * Format percentage with German locale (e.g., "95,3 %")
 * @param value - Percentage value (e.g., 95.3)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with % sign
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)} %`;
}

/**
 * Format time in seconds (e.g., "0,8 s")
 * @param seconds - Time in seconds
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with unit
 */
export function formatSeconds(seconds: number, decimals: number = 1): string {
  return `${formatNumber(seconds, decimals)} s`;
}

/**
 * Format time in milliseconds (e.g., "850 ms")
 * @param milliseconds - Time in milliseconds
 * @returns Formatted string with unit
 */
export function formatMilliseconds(milliseconds: number): string {
  return `${formatNumber(milliseconds)} ms`;
}

/**
 * Format date/time with German locale
 * @param date - Date to format
 * @param includeTime - Include time (default: true)
 * @returns Formatted string (e.g., "23.10.2025, 14:30")
 */
export function formatDateTime(date: Date, includeTime: boolean = true): string {
  if (includeTime) {
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format time only (e.g., "14:30")
 * @param date - Date to format
 * @returns Formatted time string
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "vor 5 Min.")
 * @param date - Date to compare
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'gerade eben';
  }
  if (minutes < 60) {
    return `vor ${minutes} Min.`;
  }
  if (hours < 24) {
    return `vor ${hours} Std.`;
  }
  if (days < 7) {
    return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
  }
  return formatDateTime(date, false);
}
