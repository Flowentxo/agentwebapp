'use client';

/**
 * Flowent Inbox v2 - Desktop Notifications Hook
 * Browser Notifications API integration for real-time message alerts
 *
 * Phase 4: Desktop notifications with permission handling
 * - Requests permission on mount
 * - Listens to socket events for new messages
 * - Triggers notifications when tab is hidden and message is from agent
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import type { ChatMessage, Thread } from '@/types/inbox';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

// Agent color mapping for notification icons
const agentColors: Record<string, string> = {
  dexter: '#3b82f6',
  emmie: '#a855f7',
  kai: '#22c55e',
  cassie: '#f59e0b',
};

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  showPreview: boolean;
}

interface UseNotificationsOptions {
  /**
   * Optional: Only listen to notifications for a specific thread
   */
  threadId?: string;
  /**
   * Callback when a notification is clicked
   */
  onNotificationClick?: (threadId: string) => void;
  /**
   * Override default notification settings
   */
  settings?: Partial<NotificationSettings>;
}

interface UseNotificationsReturn {
  /**
   * Current notification permission status
   */
  permission: NotificationPermission;
  /**
   * Whether notifications are supported in this browser
   */
  isSupported: boolean;
  /**
   * Whether notifications are enabled and permission is granted
   */
  isEnabled: boolean;
  /**
   * Request notification permission from the user
   */
  requestPermission: () => Promise<NotificationPermission>;
  /**
   * Manually trigger a notification (for testing)
   */
  showNotification: (title: string, options?: NotificationOptions) => void;
  /**
   * Current notification settings
   */
  settings: NotificationSettings;
  /**
   * Update notification settings
   */
  updateSettings: (updates: Partial<NotificationSettings>) => void;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  showPreview: true,
};

// Storage key for notification settings
const SETTINGS_STORAGE_KEY = 'flowent-notification-settings';

/**
 * Load notification settings from localStorage
 */
function loadSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to load settings:', error);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Save notification settings to localStorage
 */
function saveSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[NOTIFICATIONS] Failed to save settings:', error);
  }
}

/**
 * Hook for managing desktop notifications
 */
export function useNotifications({
  threadId,
  onNotificationClick,
  settings: overrideSettings,
}: UseNotificationsOptions = {}): UseNotificationsReturn {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  // Check if Notification API is supported
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // State
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (!isSupported) return 'denied';
    return (Notification.permission as NotificationPermission) || 'default';
  });

  const [settings, setSettings] = useState<NotificationSettings>(() => ({
    ...loadSettings(),
    ...overrideSettings,
  }));

  // Check if notifications are effectively enabled
  const isEnabled = isSupported && permission === 'granted' && settings.enabled;

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('[NOTIFICATIONS] Notifications not supported in this browser');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      const permissionResult = result as NotificationPermission;
      setPermission(permissionResult);
      console.log('[NOTIFICATIONS] Permission result:', permissionResult);
      return permissionResult;
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to request permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  /**
   * Show a notification
   */
  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isEnabled) {
        console.warn('[NOTIFICATIONS] Cannot show notification - not enabled');
        return;
      }

      try {
        const notification = new Notification(title, {
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'flowent-inbox',
          renotify: true,
          ...options,
        });

        // Handle click
        notification.onclick = () => {
          // Focus the window
          window.focus();

          // Navigate to thread if data is available
          if (options?.data?.threadId) {
            const targetThreadId = options.data.threadId as string;
            onNotificationClick?.(targetThreadId);
            router.push(`/inbox/${targetThreadId}`);
          }

          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        // Play sound if enabled
        if (settings.soundEnabled) {
          playNotificationSound();
        }
      } catch (error) {
        console.error('[NOTIFICATIONS] Failed to show notification:', error);
      }
    },
    [isEnabled, settings.soundEnabled, onNotificationClick, router]
  );

  /**
   * Update notification settings
   */
  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Request permission on mount (only if default)
  useEffect(() => {
    if (isSupported && permission === 'default') {
      // Delay permission request to avoid blocking initial page load
      const timeout = setTimeout(() => {
        requestPermission();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isSupported, permission, requestPermission]);

  // Set up socket listener for new messages
  useEffect(() => {
    if (!isEnabled) return;

    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[NOTIFICATIONS] Socket connected for notifications');
      // Subscribe to user's notification channel
      socket.emit('notifications:subscribe');
    });

    // Listen for new messages
    socket.on('message:new', (message: ChatMessage & { thread?: Thread }) => {
      // Only show notification if:
      // 1. Tab is not visible (user is away)
      // 2. Message is from an agent (not from the user)
      // 3. If threadId is specified, only for that thread
      const shouldNotify =
        document.visibilityState === 'hidden' &&
        message.role === 'agent' &&
        (!threadId || message.threadId === threadId);

      if (!shouldNotify) return;

      const agentName = message.agentName || 'Agent';
      const threadSubject = message.thread?.subject || 'New message';

      // Build notification body
      let body: string;
      if (settings.showPreview) {
        body = message.content.length > 100
          ? message.content.substring(0, 100) + '...'
          : message.content;
      } else {
        body = 'You have a new message';
      }

      showNotification(`${agentName}: ${threadSubject}`, {
        body,
        data: {
          threadId: message.threadId,
          messageId: message.id,
        },
        silent: !settings.soundEnabled,
      });
    });

    // Listen for approval requests
    socket.on('approval:pending', (data: { thread: Thread; approvalId: string }) => {
      if (document.visibilityState !== 'hidden') return;

      showNotification('Approval Required', {
        body: `${data.thread.agentName} needs your approval for: ${data.thread.subject}`,
        data: {
          threadId: data.thread.id,
          approvalId: data.approvalId,
        },
        requireInteraction: true, // Keep notification until user interacts
      });
    });

    // Listen for thread updates (e.g., workflow completed)
    socket.on('thread:update', (thread: Thread) => {
      if (document.visibilityState !== 'hidden') return;
      if (threadId && thread.id !== threadId) return;

      // Only notify for status changes that are noteworthy
      if (thread.status === 'completed' || thread.status === 'suspended') {
        const statusText = thread.status === 'completed' ? 'completed' : 'needs attention';
        showNotification(`Thread ${statusText}`, {
          body: thread.subject,
          data: {
            threadId: thread.id,
          },
        });
      }
    });

    socket.on('error', (error: { message: string }) => {
      console.error('[NOTIFICATIONS] Socket error:', error);
    });

    return () => {
      socket.emit('notifications:unsubscribe');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isEnabled, threadId, settings.showPreview, settings.soundEnabled, showNotification]);

  return {
    permission,
    isSupported,
    isEnabled,
    requestPermission,
    showNotification,
    settings,
    updateSettings,
  };
}

/**
 * Play notification sound
 */
function playNotificationSound(): void {
  try {
    // Create a simple notification beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    // Silently fail - sound is not critical
    console.debug('[NOTIFICATIONS] Could not play sound:', error);
  }
}

/**
 * Lightweight hook to just check notification permission status
 */
export function useNotificationPermission(): NotificationPermission {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission as NotificationPermission);

      // Listen for permission changes
      const checkPermission = () => {
        setPermission(Notification.permission as NotificationPermission);
      };

      // Some browsers don't support onchange, so we poll
      const interval = setInterval(checkPermission, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  return permission;
}

/**
 * Hook to integrate notifications with a specific inbox context
 * This is a convenience wrapper for common inbox notification patterns
 */
export function useInboxNotifications() {
  const router = useRouter();

  const handleNotificationClick = useCallback(
    (threadId: string) => {
      router.push(`/inbox/${threadId}`);
    },
    [router]
  );

  return useNotifications({
    onNotificationClick: handleNotificationClick,
  });
}
