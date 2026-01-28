/**
 * German number formatting utilities for the dashboard.
 * All formatters use German locale with comma as decimal separator.
 */

export const nfDE = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

/**
 * Formats large numbers with "Tsd." or "Mio." suffix.
 * Examples: 5400 → "5,4 Tsd.", 1500000 → "1,5 Mio."
 */
export function formatThousandsDE(n: number): string {
  if (n >= 1000000) {
    return `${nfDE.format(n / 1000000)} Mio.`;
  }
  if (n >= 1000) {
    return `${nfDE.format(n / 1000)} Tsd.`;
  }
  return nfDE.format(n);
}

/**
 * Formats percentages with one decimal place.
 * Example: 96.8 → "96,8 %"
 */
export function formatPercentDE(p: number): string {
  return `${nfDE.format(p)} %`;
}

/**
 * Converts milliseconds to seconds with one decimal place.
 * Example: 1200 → "1,2 s"
 */
export function formatMsToSecOneDecimal(ms: number): string {
  return `${nfDE.format(ms / 1000)} s`;
}

/**
 * Formats trend comparison values.
 * Example: 4.5 → "+4,5 %", -1.2 → "-1,2 %"
 */
export function formatTrendDE(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${nfDE.format(value)} %`;
}

/**
 * Formats relative time in German.
 * Examples: "vor 15 Min.", "vor 2 Std.", "vor 3 Tagen"
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return 'vor 1 Tag';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
