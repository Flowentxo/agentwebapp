/**
 * Integration Definitions
 *
 * Centralized configuration for all available integrations
 */

import React from 'react';
import { Integration, IntegrationCategory, OAuthProvider } from '@/types/integrations';
import {
  Mail,
  Calendar,
  Cloud,
  MessageSquare,
  Video,
  FileText,
  Github,
  Users,
} from 'lucide-react';

/**
 * All available integrations
 */
export const INTEGRATIONS: Omit<Integration, 'status' | 'connectedUser' | 'error'>[] = [
  // Google Services
  {
    id: 'google-gmail',
    name: 'Gmail',
    provider: 'google' as OAuthProvider,
    service: 'gmail',
    category: 'communication' as IntegrationCategory,
    icon: Mail,
    color: '#EA4335',
    description: 'Connect your Gmail account to send, receive, and manage emails directly from SINTRA.',
    features: [
      'Send and receive emails',
      'Email templates and automation',
      'Smart inbox filtering',
      'Email analytics and tracking',
    ],
    scopes: [
      {
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        description: 'Read your email messages and settings',
        required: true,
      },
      {
        scope: 'https://www.googleapis.com/auth/gmail.send',
        description: 'Send email on your behalf',
        required: true,
      },
      {
        scope: 'https://www.googleapis.com/auth/gmail.compose',
        description: 'Manage drafts and compose messages',
        required: false,
      },
    ],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    provider: 'google' as OAuthProvider,
    service: 'calendar',
    category: 'productivity' as IntegrationCategory,
    icon: Calendar,
    color: '#4285F4',
    description: 'Sync your calendar events and schedule meetings with AI-powered assistance.',
    features: [
      'Two-way calendar sync',
      'Smart meeting scheduling',
      'Event reminders and notifications',
      'Availability tracking',
    ],
    scopes: [
      {
        scope: 'https://www.googleapis.com/auth/calendar',
        description: 'Manage your calendars',
        required: true,
      },
      {
        scope: 'https://www.googleapis.com/auth/calendar.events',
        description: 'View and edit events',
        required: true,
      },
    ],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    provider: 'google' as OAuthProvider,
    service: 'drive',
    category: 'productivity' as IntegrationCategory,
    icon: Cloud,
    color: '#FBBC04',
    description: 'Access, share, and manage your files stored in Google Drive.',
    features: [
      'File upload and download',
      'Folder organization',
      'Share files with team',
      'Real-time collaboration',
    ],
    scopes: [
      {
        scope: 'https://www.googleapis.com/auth/drive.file',
        description: 'View and manage files created by this app',
        required: true,
      },
      {
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        description: 'View files in your Drive',
        required: false,
      },
    ],
  },

  // Microsoft Services
  {
    id: 'microsoft-outlook',
    name: 'Outlook',
    provider: 'microsoft' as OAuthProvider,
    service: 'outlook',
    category: 'communication' as IntegrationCategory,
    icon: Mail,
    color: '#0078D4',
    description: 'Connect Outlook to manage emails and contacts seamlessly.',
    features: [
      'Email management',
      'Contact synchronization',
      'Calendar integration',
      'Task automation',
    ],
    scopes: [
      {
        scope: 'Mail.ReadWrite',
        description: 'Read and write access to your mail',
        required: true,
      },
      {
        scope: 'Mail.Send',
        description: 'Send mail as you',
        required: true,
      },
      {
        scope: 'Contacts.Read',
        description: 'Read your contacts',
        required: false,
      },
    ],
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    provider: 'microsoft' as OAuthProvider,
    service: 'teams',
    category: 'communication' as IntegrationCategory,
    icon: MessageSquare,
    color: '#6264A7',
    description: 'Integrate Microsoft Teams for seamless team communication.',
    features: [
      'Send team messages',
      'Create and join meetings',
      'File sharing',
      'Notification management',
    ],
    scopes: [
      {
        scope: 'Chat.ReadWrite',
        description: 'Read and write access to your chats',
        required: true,
      },
      {
        scope: 'OnlineMeetings.ReadWrite',
        description: 'Create and manage meetings',
        required: true,
      },
    ],
  },

  // Slack
  {
    id: 'slack-workspace',
    name: 'Slack',
    provider: 'slack' as OAuthProvider,
    service: 'workspace',
    category: 'communication' as IntegrationCategory,
    icon: MessageSquare,
    color: '#4A154B',
    description: 'Connect Slack to send messages and manage channels.',
    features: [
      'Send and receive messages',
      'Channel management',
      'File uploads',
      'Bot commands',
    ],
    scopes: [
      {
        scope: 'chat:write',
        description: 'Send messages as you',
        required: true,
      },
      {
        scope: 'channels:read',
        description: 'View channels in your workspace',
        required: true,
      },
      {
        scope: 'files:write',
        description: 'Upload files',
        required: false,
      },
    ],
  },

  // GitHub
  {
    id: 'github-repos',
    name: 'GitHub',
    provider: 'github' as OAuthProvider,
    service: 'repos',
    category: 'development' as IntegrationCategory,
    icon: Github,
    color: '#181717',
    description: 'Connect GitHub for repository management and CI/CD automation.',
    features: [
      'Repository access',
      'Issue tracking',
      'Pull request management',
      'Webhook integration',
    ],
    scopes: [
      {
        scope: 'repo',
        description: 'Full control of private repositories',
        required: true,
      },
      {
        scope: 'read:user',
        description: 'Read user profile data',
        required: true,
      },
      {
        scope: 'workflow',
        description: 'Update GitHub Action workflows',
        required: false,
      },
    ],
  },
];

/**
 * Get integrations by category
 */
export function getIntegrationsByCategory(
  category: IntegrationCategory
): typeof INTEGRATIONS {
  if (category === 'all') {
    return INTEGRATIONS;
  }
  return INTEGRATIONS.filter((integration) => integration.category === category);
}

/**
 * Get integration by ID
 */
export function getIntegrationById(id: string): typeof INTEGRATIONS[0] | undefined {
  return INTEGRATIONS.find((integration) => integration.id === id);
}

/**
 * Get integrations by provider
 */
export function getIntegrationsByProvider(
  provider: OAuthProvider
): typeof INTEGRATIONS {
  return INTEGRATIONS.filter((integration) => integration.provider === provider);
}

/**
 * Integration categories for filtering
 */
export const INTEGRATION_CATEGORIES = [
  { id: 'all', label: 'All Integrations', count: INTEGRATIONS.length },
  {
    id: 'communication',
    label: 'Communication',
    count: INTEGRATIONS.filter((i) => i.category === 'communication').length,
  },
  {
    id: 'productivity',
    label: 'Productivity',
    count: INTEGRATIONS.filter((i) => i.category === 'productivity').length,
  },
  {
    id: 'development',
    label: 'Development',
    count: INTEGRATIONS.filter((i) => i.category === 'development').length,
  },
] as const;
