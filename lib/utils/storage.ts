/**
 * localStorage wrapper with SSR safety and type support
 */

/**
 * Get value from localStorage with fallback
 * @param key localStorage key
 * @param fallback default value if key doesn't exist or parse fails
 * @returns parsed value or fallback
 */
export function getLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const item = window.localStorage.getItem(key);
    if (item === null) {
      return fallback;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Failed to read localStorage key "${key}":`, error);
    return fallback;
  }
}

/**
 * Set value in localStorage
 * @param key localStorage key
 * @param value value to store (will be JSON stringified)
 */
export function setLS<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write localStorage key "${key}":`, error);
  }
}

/**
 * Remove value from localStorage
 * @param key localStorage key
 */
export function removeLS(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove localStorage key "${key}":`, error);
  }
}
