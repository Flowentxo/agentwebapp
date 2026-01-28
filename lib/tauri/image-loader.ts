/**
 * Custom Image Loader for Tauri Static Export
 *
 * Since Next.js Image Optimization doesn't work with static exports,
 * we use this custom loader that returns the original image URL.
 *
 * For remote images, it passes through the URL directly.
 * For local images, it constructs the correct path.
 */

export interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function tauriImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // If it's already a full URL (remote image), return as-is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // If it's a data URL, return as-is
  if (src.startsWith('data:')) {
    return src;
  }

  // If it's a blob URL, return as-is
  if (src.startsWith('blob:')) {
    return src;
  }

  // For local images, ensure proper path
  // In Tauri, files are served from the root
  if (src.startsWith('/')) {
    return src;
  }

  // Add leading slash for relative paths
  return `/${src}`;
}

/**
 * Helper function to check if we're running in Tauri
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI__' in window || '__TAURI_IPC__' in window;
}

/**
 * Get the API base URL based on environment
 * - In Tauri: Use the production API URL
 * - In Web: Use relative URLs (handled by Next.js rewrites)
 */
export function getApiBaseUrl(): string {
  // Check for Tauri environment
  if (isTauri()) {
    // Use production API URL in Tauri
    return process.env.NEXT_PUBLIC_TAURI_API_URL || 'https://api.flowent.ai';
  }

  // In web mode, use relative URLs or configured URL
  return process.env.NEXT_PUBLIC_API_URL || '';
}

/**
 * Construct full API endpoint URL
 */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (base) {
    return `${base}${normalizedPath}`;
  }

  return normalizedPath;
}
