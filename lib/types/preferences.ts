/**
 * User Preferences Types
 * Apple-inspired personalization system
 */

export type ViewMode = 'compact' | 'detailed' | 'cards';
export type TimeFormat = '12h' | '24h';
export type Theme = 'dark' | 'light' | 'auto';

export interface DashboardMetric {
  id: string;
  enabled: boolean;
  order: number;
}

export interface UserPreferences {
  // Personal
  displayName?: string;
  avatarUrl?: string;

  // Dashboard Layout
  viewMode: ViewMode;
  compactMode: boolean;
  showGreeting: boolean;
  showInsights: boolean;
  showQuickActions: boolean;
  showRecentActivity: boolean;

  // Metrics Configuration
  metrics: DashboardMetric[];

  // Agents
  favoriteAgents: string[]; // Agent IDs
  pinnedAgents: string[]; // Agent IDs shown at top

  // Appearance
  theme: Theme;
  reducedMotion: boolean;
  timeFormat: TimeFormat;

  // Behavior
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  notifications: {
    enabled: boolean;
    criticalOnly: boolean;
    sound: boolean;
  };

  // Intelligence
  smartRecommendations: boolean;
  predictiveInsights: boolean;
  autoActions: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  // Personal
  displayName: undefined,
  avatarUrl: undefined,

  // Dashboard Layout
  viewMode: 'detailed',
  compactMode: false,
  showGreeting: true,
  showInsights: true,
  showQuickActions: true,
  showRecentActivity: true,

  // Metrics Configuration
  metrics: [
    { id: 'requests', enabled: true, order: 0 },
    { id: 'successRate', enabled: true, order: 1 },
    { id: 'responseTime', enabled: true, order: 2 },
    { id: 'issues', enabled: true, order: 3 },
  ],

  // Agents
  favoriteAgents: [],
  pinnedAgents: [],

  // Appearance
  theme: 'dark',
  reducedMotion: false,
  timeFormat: '24h',

  // Behavior
  autoRefresh: true,
  refreshInterval: 30,
  notifications: {
    enabled: true,
    criticalOnly: false,
    sound: false,
  },

  // Intelligence
  smartRecommendations: true,
  predictiveInsights: true,
  autoActions: false,
};
