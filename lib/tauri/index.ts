/**
 * Tauri Integration Module
 *
 * Provides utilities for detecting Tauri environment and
 * calling Tauri-specific APIs from the frontend.
 */

// Re-export image loader utilities
export { default as tauriImageLoader, isTauri, getApiBaseUrl, apiUrl } from './image-loader';

/**
 * Check if the app is running in Tauri desktop environment
 */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI__' in window || '__TAURI_IPC__' in window;
}

/**
 * Check if the app is running in a web browser
 */
export function isWeb(): boolean {
  return !isDesktop();
}

/**
 * Get the current platform
 */
export async function getPlatform(): Promise<'windows' | 'macos' | 'linux' | 'web'> {
  if (!isDesktop()) return 'web';

  try {
    const { platform } = await import('@tauri-apps/plugin-os');
    const os = await platform();
    if (os === 'windows') return 'windows';
    if (os === 'macos') return 'macos';
    if (os === 'linux') return 'linux';
    return 'web';
  } catch {
    return 'web';
  }
}

/**
 * Get app version (Tauri or package.json)
 */
export async function getAppVersion(): Promise<string> {
  if (isDesktop()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<string>('get_app_version');
    } catch {
      return '1.0.0';
    }
  }
  return process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
}

/**
 * Open URL in external browser (works in both Tauri and web)
 */
export async function openExternal(url: string): Promise<void> {
  if (isDesktop()) {
    try {
      const { open } = await import('@tauri-apps/plugin-opener');
      await open(url);
      return;
    } catch {
      // Fall through to web implementation
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Show desktop notification
 */
export async function showNotification(title: string, body: string): Promise<void> {
  if (isDesktop()) {
    try {
      const { sendNotification, isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');

      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      if (permissionGranted) {
        await sendNotification({ title, body });
        return;
      }
    } catch {
      // Fall through to web implementation
    }
  }

  // Web fallback using browser notifications
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (isDesktop()) {
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      await writeText(text);
      return true;
    } catch {
      // Fall through to web implementation
    }
  }

  // Web fallback
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read text from clipboard
 */
export async function readFromClipboard(): Promise<string | null> {
  if (isDesktop()) {
    try {
      const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
      return await readText();
    } catch {
      // Fall through to web implementation
    }
  }

  // Web fallback
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

/**
 * Show file open dialog
 */
export async function openFileDialog(options?: {
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string[] | null> {
  if (!isDesktop()) {
    console.warn('File dialog is only available in desktop mode');
    return null;
  }

  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const result = await open({
      multiple: options?.multiple ?? false,
      filters: options?.filters,
    });

    if (result === null) return null;
    return Array.isArray(result) ? result : [result];
  } catch {
    return null;
  }
}

/**
 * Show file save dialog
 */
export async function saveFileDialog(options?: {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string | null> {
  if (!isDesktop()) {
    console.warn('Save dialog is only available in desktop mode');
    return null;
  }

  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    return await save({
      defaultPath: options?.defaultPath,
      filters: options?.filters,
    });
  } catch {
    return null;
  }
}
