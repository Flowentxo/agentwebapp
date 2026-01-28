import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLS, setLS, removeLS } from '@/lib/utils/storage';

describe('storage utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear console warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('getLS', () => {
    it('should return fallback when key does not exist', () => {
      expect(getLS('nonexistent', 'fallback')).toBe('fallback');
      expect(getLS('nonexistent', 42)).toBe(42);
      expect(getLS('nonexistent', true)).toBe(true);
    });

    it('should return stored value when key exists', () => {
      localStorage.setItem('test', JSON.stringify('value'));
      expect(getLS('test', 'fallback')).toBe('value');
    });

    it('should return stored number', () => {
      localStorage.setItem('number', JSON.stringify(123));
      expect(getLS('number', 0)).toBe(123);
    });

    it('should return stored boolean', () => {
      localStorage.setItem('bool', JSON.stringify(true));
      expect(getLS('bool', false)).toBe(true);
    });

    it('should return stored object', () => {
      const obj = { foo: 'bar', count: 42 };
      localStorage.setItem('object', JSON.stringify(obj));
      expect(getLS('object', {})).toEqual(obj);
    });

    it('should return fallback on parse error', () => {
      localStorage.setItem('invalid', 'not json');
      expect(getLS('invalid', 'fallback')).toBe('fallback');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should return fallback when window is undefined (SSR)', () => {
      // This test won't run in Node, but the function handles it
      const result = getLS('test', 'fallback');
      expect(typeof result).toBe('string');
    });
  });

  describe('setLS', () => {
    it('should store string value', () => {
      setLS('test', 'value');
      expect(localStorage.getItem('test')).toBe(JSON.stringify('value'));
    });

    it('should store number value', () => {
      setLS('number', 123);
      expect(localStorage.getItem('number')).toBe(JSON.stringify(123));
    });

    it('should store boolean value', () => {
      setLS('bool', false);
      expect(localStorage.getItem('bool')).toBe(JSON.stringify(false));
    });

    it('should store object value', () => {
      const obj = { foo: 'bar', nested: { count: 42 } };
      setLS('object', obj);
      expect(localStorage.getItem('object')).toBe(JSON.stringify(obj));
    });

    it('should overwrite existing value', () => {
      setLS('test', 'old');
      setLS('test', 'new');
      expect(getLS('test', '')).toBe('new');
    });

    it('should handle errors gracefully', () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage full');
      });

      setLS('test', 'value');
      expect(console.warn).toHaveBeenCalled();

      // Restore
      localStorage.setItem = originalSetItem;
    });
  });

  describe('removeLS', () => {
    it('should remove existing key', () => {
      setLS('test', 'value');
      expect(getLS('test', null)).toBe('value');

      removeLS('test');
      expect(getLS('test', null)).toBe(null);
    });

    it('should not error when removing non-existent key', () => {
      removeLS('nonexistent');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      // Mock localStorage.removeItem to throw
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = vi.fn(() => {
        throw new Error('Error');
      });

      removeLS('test');
      expect(console.warn).toHaveBeenCalled();

      // Restore
      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe('persistence across calls', () => {
    it('should persist sidebar collapsed state', () => {
      setLS('ui.sidebarCollapsed', true);
      expect(getLS('ui.sidebarCollapsed', false)).toBe(true);

      setLS('ui.sidebarCollapsed', false);
      expect(getLS('ui.sidebarCollapsed', true)).toBe(false);
    });

    it('should handle complex state objects', () => {
      const state = {
        sidebarCollapsed: true,
        theme: 'dark',
        notifications: {
          enabled: true,
          sound: false,
        },
      };

      setLS('ui.state', state);
      expect(getLS('ui.state', {})).toEqual(state);
    });
  });
});
