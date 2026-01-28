/**
 * COMMAND CENTER - Integration Service
 *
 * Integrates external services (Calendar, Email, CRM) for context
 */

import axios from 'axios';

// =====================================================
// TYPES
// =====================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  isRecurring: boolean;
}

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: Date;
  isUnread: boolean;
  isUrgent: boolean;
  labels: string[];
}

export interface CRMContact {
  id: string;
  name: string;
  email: string;
  company?: string;
  lastInteraction?: Date;
  tags: string[];
  status: 'lead' | 'customer' | 'partner';
}

export interface IntegrationStatus {
  calendar: boolean;
  email: boolean;
  crm: boolean;
}

// =====================================================
// CALENDAR INTEGRATION (Google Calendar)
// =====================================================

/**
 * Get upcoming calendar events
 */
export async function getUpcomingEvents(
  userId: string,
  options: {
    limit?: number;
    hoursAhead?: number;
  } = {}
): Promise<CalendarEvent[]> {
  const limit = options.limit || 5;
  const hoursAhead = options.hoursAhead || 24;

  try {
    // In production: Call Google Calendar API
    // const response = await axios.get(`/api/integrations/calendar/events`, {
    //   params: { userId, limit, hoursAhead }
    // });
    // return response.data;

    // Mock data for now
    const now = new Date();
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        title: 'Team Standup',
        description: 'Daily sync with the team',
        startTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
        endTime: new Date(now.getTime() + 90 * 60 * 1000), // 1.5 hours from now
        attendees: ['team@company.com'],
        isRecurring: true,
      },
      {
        id: '2',
        title: 'Client Demo',
        description: 'Product demonstration for new client',
        startTime: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3 hours from now
        endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
        attendees: ['client@acme.com', 'sales@company.com'],
        location: 'Zoom',
        isRecurring: false,
      },
    ];

    return mockEvents.slice(0, limit);
  } catch (error) {
    console.error('[INTEGRATION] Failed to fetch calendar events:', error);
    return [];
  }
}

/**
 * Get next meeting (most imminent)
 */
export async function getNextMeeting(userId: string): Promise<CalendarEvent | null> {
  const events = await getUpcomingEvents(userId, { limit: 1 });
  return events[0] || null;
}

/**
 * Check if user has meeting soon (within X minutes)
 */
export async function hasMeetingSoon(
  userId: string,
  withinMinutes: number = 15
): Promise<{ hasMeeting: boolean; meeting?: CalendarEvent }> {
  const events = await getUpcomingEvents(userId, { limit: 5, hoursAhead: 1 });

  const now = new Date();
  const threshold = new Date(now.getTime() + withinMinutes * 60 * 1000);

  const upcomingMeeting = events.find(
    event => event.startTime <= threshold && event.startTime > now
  );

  return {
    hasMeeting: !!upcomingMeeting,
    meeting: upcomingMeeting,
  };
}

// =====================================================
// EMAIL INTEGRATION (Gmail)
// =====================================================

/**
 * Get unread emails
 */
export async function getUnreadEmails(
  userId: string,
  options: {
    limit?: number;
    urgentOnly?: boolean;
  } = {}
): Promise<EmailMessage[]> {
  const limit = options.limit || 10;

  try {
    // In production: Call Gmail API
    // const response = await axios.get(`/api/integrations/email/unread`, {
    //   params: { userId, limit, urgentOnly: options.urgentOnly }
    // });
    // return response.data;

    // Mock data
    const mockEmails: EmailMessage[] = [
      {
        id: '1',
        from: 'john@client.com',
        subject: 'Urgent: Production issue needs attention',
        snippet: 'We\'re experiencing critical errors in production...',
        receivedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        isUnread: true,
        isUrgent: true,
        labels: ['important', 'urgent'],
      },
      {
        id: '2',
        from: 'sarah@team.com',
        subject: 'Q4 Planning Meeting Notes',
        snippet: 'Here are the notes from today\'s planning session...',
        receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isUnread: true,
        isUrgent: false,
        labels: ['team'],
      },
    ];

    return options.urgentOnly
      ? mockEmails.filter(e => e.isUrgent).slice(0, limit)
      : mockEmails.slice(0, limit);
  } catch (error) {
    console.error('[INTEGRATION] Failed to fetch emails:', error);
    return [];
  }
}

/**
 * Get unread count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const emails = await getUnreadEmails(userId);
  return emails.length;
}

/**
 * Get urgent emails count
 */
export async function getUrgentEmailsCount(userId: string): Promise<number> {
  const emails = await getUnreadEmails(userId, { urgentOnly: true });
  return emails.length;
}

/**
 * Check if user has urgent emails
 */
export async function hasUrgentEmails(userId: string): Promise<boolean> {
  const count = await getUrgentEmailsCount(userId);
  return count > 0;
}

// =====================================================
// CRM INTEGRATION (Generic)
// =====================================================

/**
 * Get recent CRM contacts
 */
export async function getRecentContacts(
  userId: string,
  limit: number = 5
): Promise<CRMContact[]> {
  try {
    // In production: Call CRM API (Salesforce, HubSpot, etc.)
    // const response = await axios.get(`/api/integrations/crm/contacts`, {
    //   params: { userId, limit }
    // });
    // return response.data;

    // Mock data
    const mockContacts: CRMContact[] = [
      {
        id: '1',
        name: 'John Smith',
        email: 'john@acme.com',
        company: 'Acme Corp',
        lastInteraction: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        tags: ['hot-lead', 'enterprise'],
        status: 'lead',
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        email: 'sarah@techco.com',
        company: 'TechCo',
        lastInteraction: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        tags: ['customer', 'annual-contract'],
        status: 'customer',
      },
    ];

    return mockContacts.slice(0, limit);
  } catch (error) {
    console.error('[INTEGRATION] Failed to fetch CRM contacts:', error);
    return [];
  }
}

/**
 * Get contacts that need follow-up (no interaction in X days)
 */
export async function getContactsNeedingFollowUp(
  userId: string,
  daysSinceLastContact: number = 7
): Promise<CRMContact[]> {
  const contacts = await getRecentContacts(userId, 20);

  const threshold = new Date(Date.now() - daysSinceLastContact * 24 * 60 * 60 * 1000);

  return contacts.filter(
    contact =>
      contact.lastInteraction &&
      contact.lastInteraction < threshold &&
      contact.status === 'lead'
  );
}

// =====================================================
// INTEGRATION STATUS
// =====================================================

/**
 * Check which integrations are active for user
 */
export async function getIntegrationStatus(userId: string): Promise<IntegrationStatus> {
  // In production: Check OAuth tokens, API keys, etc.

  return {
    calendar: true, // Mock: Calendar is connected
    email: true, // Mock: Email is connected
    crm: false, // Mock: CRM not connected
  };
}

/**
 * Get integration health (are APIs responding?)
 */
export async function checkIntegrationHealth(): Promise<{
  calendar: { status: 'ok' | 'error'; latency?: number };
  email: { status: 'ok' | 'error'; latency?: number };
  crm: { status: 'ok' | 'error'; latency?: number };
}> {
  // In production: Ping each service

  return {
    calendar: { status: 'ok', latency: 120 },
    email: { status: 'ok', latency: 95 },
    crm: { status: 'ok', latency: 150 },
  };
}

// =====================================================
// UNIFIED CONTEXT
// =====================================================

/**
 * Get all integration data in one call
 */
export async function getIntegratedContext(userId: string): Promise<{
  upcomingMeetings: CalendarEvent[];
  unreadEmails: EmailMessage[];
  urgentEmails: EmailMessage[];
  recentContacts: CRMContact[];
  followUpNeeded: CRMContact[];
  integrationStatus: IntegrationStatus;
}> {
  // Fetch all in parallel for performance
  const [
    upcomingMeetings,
    unreadEmails,
    urgentEmails,
    recentContacts,
    followUpNeeded,
    integrationStatus,
  ] = await Promise.all([
    getUpcomingEvents(userId, { limit: 3 }),
    getUnreadEmails(userId, { limit: 5 }),
    getUnreadEmails(userId, { urgentOnly: true, limit: 5 }),
    getRecentContacts(userId, 5),
    getContactsNeedingFollowUp(userId, 7),
    getIntegrationStatus(userId),
  ]);

  return {
    upcomingMeetings,
    unreadEmails,
    urgentEmails,
    recentContacts,
    followUpNeeded,
    integrationStatus,
  };
}

// =====================================================
// SMART SUGGESTIONS FROM INTEGRATIONS
// =====================================================

/**
 * Generate suggestions based on integrated data
 */
export async function getIntegrationSuggestions(userId: string): Promise<
  Array<{
    id: string;
    title: string;
    description: string;
    command?: string;
    priority: 'high' | 'medium' | 'low';
    source: 'calendar' | 'email' | 'crm';
  }>
> {
  const context = await getIntegratedContext(userId);
  const suggestions: Array<{
    id: string;
    title: string;
    description: string;
    command?: string;
    priority: 'high' | 'medium' | 'low';
    source: 'calendar' | 'email' | 'crm';
  }> = [];

  // Meeting preparations
  if (context.upcomingMeetings.length > 0) {
    const nextMeeting = context.upcomingMeetings[0];
    const minutesUntil = Math.floor(
      (nextMeeting.startTime.getTime() - Date.now()) / (60 * 1000)
    );

    if (minutesUntil <= 30) {
      suggestions.push({
        id: 'meeting-prep-1',
        title: `Prepare for: ${nextMeeting.title}`,
        description: `Meeting starts in ${minutesUntil} minutes`,
        command: `Prepare briefing for meeting "${nextMeeting.title}"`,
        priority: 'high',
        source: 'calendar',
      });
    }
  }

  // Urgent emails
  if (context.urgentEmails.length > 0) {
    suggestions.push({
      id: 'urgent-email-1',
      title: `${context.urgentEmails.length} urgent emails`,
      description: context.urgentEmails[0].subject,
      command: 'Show urgent emails',
      priority: 'high',
      source: 'email',
    });
  }

  // Follow-up reminders
  if (context.followUpNeeded.length > 0) {
    suggestions.push({
      id: 'crm-followup-1',
      title: `Follow up with ${context.followUpNeeded[0].name}`,
      description: `No contact in ${Math.floor((Date.now() - (context.followUpNeeded[0].lastInteraction?.getTime() || 0)) / (24 * 60 * 60 * 1000))} days`,
      command: `Draft follow-up email for ${context.followUpNeeded[0].name}`,
      priority: 'medium',
      source: 'crm',
    });
  }

  return suggestions;
}
