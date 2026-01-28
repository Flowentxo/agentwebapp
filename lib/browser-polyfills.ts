/**
 * Browser Compatibility Polyfills
 * Provides graceful degradation for older browsers
 * 
 * This module should be imported early in the application startup
 * to ensure all polyfills are loaded before the main application logic
 */

// ========================================
// 1. FEATURE DETECTION HELPERS
// ========================================

/**
 * Check if a CSS property is supported
 */
export const supportsCSS = (property: string, value?: string): boolean => {
  if (typeof window === 'undefined' || !window.CSS) return false;
  
  if (value) {
    return window.CSS.supports(property, value);
  }
  
  return window.CSS.supports(property);
};

/**
 * Check if an HTML element supports a specific property
 */
export const supportsElement = (element: string, property: string): boolean => {
  if (typeof document === 'undefined') return false;
  
  const testElement = document.createElement(element);
  return property in testElement;
};

/**
 * Check if a JavaScript feature is supported
 */
export const supportsFeature = (feature: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  switch (feature) {
    case 'localStorage':
      try {
        const test = '__storage_test__';
        window.localStorage.setItem(test, test);
        window.localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    
    case 'sessionStorage':
      try {
        const test = '__storage_test__';
        window.sessionStorage.setItem(test, test);
        window.sessionStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    
    case 'fetch':
      return typeof window.fetch === 'function';
    
    case 'promise':
      return typeof window.Promise === 'function';
    
    case 'url':
      try {
        new URL('http://example.com');
        return true;
      } catch {
        return false;
      }
    
    case 'intersectionObserver':
      return typeof window.IntersectionObserver === 'function';
    
    case 'resizeObserver':
      return typeof window.ResizeObserver === 'function';
    
    case 'matchMedia':
      return typeof window.matchMedia === 'function';
    
    case 'customElements':
      return typeof window.customElements !== 'undefined';
    
    default:
      return false;
  }
};

// ========================================
// 2. CSS POLYFILLS
// ========================================

/**
 * Apply CSS class for backdrop-filter support
 */
export const applyBackdropFilterPolyfill = (): void => {
  if (typeof document === 'undefined') return;
  
  const supportsBackdropFilter = supportsCSS('backdrop-filter') || 
                                supportsCSS('-webkit-backdrop-filter');
  
  const html = document.documentElement;
  
  if (supportsBackdropFilter) {
    html.classList.add('supports-backdrop-filter');
  } else {
    html.classList.add('no-backdrop-filter');
  }
};

/**
 * Apply CSS class for CSS Grid support
 */
export const applyCSSGridPolyfill = (): void => {
  if (typeof document === 'undefined') return;
  
  const supportsGrid = supportsCSS('display', 'grid');
  
  const html = document.documentElement;
  
  if (supportsGrid) {
    html.classList.add('supports-grid');
  } else {
    html.classList.add('no-grid');
  }
};

/**
 * Apply CSS class for :has() selector support
 */
export const applyHasSelectorPolyfill = (): void => {
  if (typeof document === 'undefined') return;
  
  const supportsHas = CSS.supports('selector(:has(*))');
  
  const html = document.documentElement;
  
  if (supportsHas) {
    html.classList.add('supports-has-selector');
  } else {
    html.classList.add('no-has-selector');
  }
};

// ========================================
// 3. JAVASCRIPT POLYFILLS
// ========================================

/**
 * Apply localStorage fallback
 */
export const applyLocalStoragePolyfill = (): void => {
  if (typeof window === 'undefined') return;
  
  if (!supportsFeature('localStorage')) {
    // Use cookies as fallback
    window.localStorage = {
      getItem: (key: string): string | null => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === key) {
            return decodeURIComponent(value);
          }
        }
        return null;
      },
      
      setItem: (key: string, value: string): void => {
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expiry.toUTCString()}; path=/`;
      },
      
      removeItem: (key: string): void => {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
      },
      
      clear: (): void => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name] = cookie.trim().split('=');
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        }
      },
      
      length: 0,
      key: (): string | null => null
    } as Storage;
  }
};

/**
 * Apply URL constructor fallback
 */
export const applyURLPolyfill = (): void => {
  if (typeof window === 'undefined') return;
  
  if (!supportsFeature('url')) {
    // Minimal URL polyfill
    if (!window.URL) {
      (window as any).URL = class URL {
        constructor(public url: string, public base?: string) {
          // Basic implementation
        }
        
        toString(): string {
          return this.url;
        }
      };
    }
  }
};

/**
 * Apply fetch API fallback
 */
export const applyFetchPolyfill = (): void => {
  if (typeof window === 'undefined') return;
  
  if (!supportsFeature('fetch')) {
    // Use XMLHttpRequest as fallback for fetch
    (window as any).fetch = (url: string, options?: RequestInit): Promise<Response> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(options?.method || 'GET', url);
        
        // Set headers
        if (options?.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value as string);
          });
        }
        
        xhr.onload = () => {
          const headers = xhr.getAllResponseHeaders();
          const headerMap = new Map<string, string>();
          
          headers.split('\r\n').forEach(line => {
            const parts = line.split(': ');
            if (parts.length === 2) {
              headerMap.set(parts[0].toLowerCase(), parts[1]);
            }
          });
          
          const response = new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(Object.fromEntries(headerMap))
          });
          resolve(response);
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
        
        // Handle body
        const body = options?.body;
        if (typeof body === 'string') {
          xhr.send(body);
        } else if (body instanceof FormData) {
          xhr.send(body);
        } else if (body instanceof Blob) {
          xhr.send(body);
        } else if (body instanceof ArrayBuffer) {
          xhr.send(body);
        } else {
          xhr.send();
        }
      });
    };
  }
};

// ========================================
// 4. THEME AND STORAGE POLYFILLS
// ========================================

/**
 * Apply theme storage fallback
 */
export const applyThemeStoragePolyfill = (): void => {
  if (typeof document === 'undefined') return;
  
  if (!supportsFeature('localStorage')) {
    // Override localStorage methods to include fallback
    const originalSetItem = window.localStorage?.setItem;
    const originalGetItem = window.localStorage?.getItem;
    
    if (window.localStorage) {
      const originalLocalStorage = window.localStorage;
      
      window.localStorage.setItem = (key: string, value: string): void => {
        try {
          originalSetItem?.call(originalLocalStorage, key, value);
        } catch {
          // Fallback to cookies
          const expiry = new Date();
          expiry.setFullYear(expiry.getFullYear() + 1);
          document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expiry.toUTCString()}; path=/`;
        }
      };
      
      window.localStorage.getItem = (key: string): string | null => {
        try {
          return originalGetItem?.call(originalLocalStorage, key) || null;
        } catch {
          // Fallback from cookies
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === key) {
              return decodeURIComponent(value);
            }
          }
          return null;
        }
      };
    }
  }
};

// ========================================
// 5. MEDIA QUERY POLYFILLS
// ========================================

/**
 * Apply matchMedia fallback for older browsers
 */
export const applyMatchMediaPolyfill = (): void => {
  if (typeof window === 'undefined') return;
  
  if (!supportsFeature('matchMedia')) {
    // Minimal matchMedia polyfill
    (window as any).matchMedia = (query: string): MediaQueryList => {
      return {
        matches: false, // Default to no match
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      };
    };
  }
};

// ========================================
// 6. MAIN INITIALIZATION
// ========================================

/**
 * Initialize all browser compatibility polyfills
 */
export const initializePolyfills = (): void => {
  if (typeof document === 'undefined') return;
  
  // Apply CSS polyfills
  applyBackdropFilterPolyfill();
  applyCSSGridPolyfill();
  applyHasSelectorPolyfill();
  
  // Apply JavaScript polyfills
  applyLocalStoragePolyfill();
  applyURLPolyfill();
  applyFetchPolyfill();
  applyThemeStoragePolyfill();
  applyMatchMediaPolyfill();
  
  // Add browser capability classes to html element
  const html = document.documentElement;
  
  // Browser detection (basic)
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) {
    html.classList.add('browser-chrome');
  } else if (userAgent.includes('Firefox')) {
    html.classList.add('browser-firefox');
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    html.classList.add('browser-safari');
  } else if (userAgent.includes('Edge')) {
    html.classList.add('browser-edge');
  }
  
  // Device detection
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    html.classList.add('device-ios');
  } else if (/Android/i.test(userAgent)) {
    html.classList.add('device-android');
  }
  
  // Touch device detection
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    html.classList.add('device-touch');
  }
  
  // Feature support classes
  if (supportsFeature('localStorage')) {
    html.classList.add('feature-localStorage');
  }
  
  if (supportsFeature('fetch')) {
    html.classList.add('feature-fetch');
  }
  
  if (supportsFeature('promise')) {
    html.classList.add('feature-promise');
  }
};

// Auto-initialize when module is imported
initializePolyfills();

// ========================================
// 7. TOUCH EVENT HELPERS
// ========================================

/**
 * Add touch event listeners with fallbacks
 */
export const addTouchEventListeners = (
  element: HTMLElement,
  handlers: {
    onTouchStart?: (e: TouchEvent) => void;
    onTouchMove?: (e: TouchEvent) => void;
    onTouchEnd?: (e: TouchEvent) => void;
  }
): (() => void) => {
  if (typeof document === 'undefined') return () => {};
  
  const listeners: Array<() => void> = [];
  
  // Touch events
  if (handlers.onTouchStart) {
    const listener = (e: TouchEvent) => handlers.onTouchStart!(e);
    element.addEventListener('touchstart', listener);
    listeners.push(() => element.removeEventListener('touchstart', listener));
  }
  
  if (handlers.onTouchMove) {
    const listener = (e: TouchEvent) => handlers.onTouchMove!(e);
    element.addEventListener('touchmove', listener);
    listeners.push(() => element.removeEventListener('touchmove', listener));
  }
  
  if (handlers.onTouchEnd) {
    const listener = (e: TouchEvent) => handlers.onTouchEnd!(e);
    element.addEventListener('touchend', listener);
    listeners.push(() => element.removeEventListener('touchend', listener));
  }
  
  // Return cleanup function
  return () => {
    listeners.forEach(removeListener => removeListener());
  };
};

// ========================================
// 8. UTILITY FUNCTIONS
// ========================================

/**
 * Get browser compatibility information
 */
export const getBrowserInfo = () => {
  if (typeof navigator === 'undefined') return null;
  
  const userAgent = navigator.userAgent;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return {
    userAgent,
    isTouchDevice,
    supportsLocalStorage: supportsFeature('localStorage'),
    supportsFetch: supportsFeature('fetch'),
    supportsCSSGrid: supportsCSS('display', 'grid'),
    supportsBackdropFilter: supportsCSS('backdrop-filter'),
    supportsHasSelector: CSS.supports('selector(:has(*))'),
    platform: navigator.platform,
    language: navigator.language
  };
};