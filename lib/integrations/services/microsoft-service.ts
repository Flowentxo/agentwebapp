/**
 * Microsoft Integration Service
 * Handles Outlook Mail, Calendar, OneDrive, Contacts
 */

import { BaseIntegrationService, PaginatedResponse } from './base-service';

// ============================================
// OUTLOOK MAIL TYPES
// ============================================
export interface OutlookMessage {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  receivedDateTime: string;
  sentDateTime: string;
  hasAttachments: boolean;
  internetMessageId: string;
  subject: string;
  bodyPreview: string;
  importance: 'low' | 'normal' | 'high';
  parentFolderId: string;
  conversationId: string;
  conversationIndex: string;
  isDeliveryReceiptRequested: boolean;
  isReadReceiptRequested: boolean;
  isRead: boolean;
  isDraft: boolean;
  webLink: string;
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  sender: {
    emailAddress: { name: string; address: string };
  };
  from: {
    emailAddress: { name: string; address: string };
  };
  toRecipients: Array<{
    emailAddress: { name: string; address: string };
  }>;
  ccRecipients: Array<{
    emailAddress: { name: string; address: string };
  }>;
  bccRecipients: Array<{
    emailAddress: { name: string; address: string };
  }>;
  replyTo: Array<{
    emailAddress: { name: string; address: string };
  }>;
  categories: string[];
  flag: {
    flagStatus: 'notFlagged' | 'complete' | 'flagged';
  };
}

export interface OutlookMailFolder {
  id: string;
  displayName: string;
  parentFolderId: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  isHidden: boolean;
}

export interface SendOutlookEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  importance?: 'low' | 'normal' | 'high';
  saveToSentItems?: boolean;
  attachments?: Array<{
    name: string;
    contentType: string;
    contentBytes: string; // base64
  }>;
}

// ============================================
// CALENDAR TYPES
// ============================================
export interface OutlookEvent {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  iCalUId: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  importance: 'low' | 'normal' | 'high';
  sensitivity: 'normal' | 'personal' | 'private' | 'confidential';
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location: {
    displayName: string;
    locationType: string;
    uniqueId?: string;
    uniqueIdType?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      countryOrRegion?: string;
      postalCode?: string;
    };
  };
  locations: Array<{
    displayName: string;
  }>;
  isAllDay: boolean;
  isCancelled: boolean;
  isOrganizer: boolean;
  responseRequested: boolean;
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  type: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  webLink: string;
  onlineMeetingUrl?: string;
  isOnlineMeeting: boolean;
  onlineMeetingProvider?: 'teamsForBusiness' | 'skypeForBusiness' | 'skypeForConsumer';
  attendees: Array<{
    type: 'required' | 'optional' | 'resource';
    status: {
      response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
      time: string;
    };
    emailAddress: { name: string; address: string };
  }>;
  organizer: {
    emailAddress: { name: string; address: string };
  };
  recurrence?: {
    pattern: {
      type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
      interval: number;
      daysOfWeek?: string[];
    };
    range: {
      type: 'endDate' | 'noEnd' | 'numbered';
      startDate: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
}

export interface OutlookCalendar {
  id: string;
  name: string;
  color: string;
  changeKey: string;
  canShare: boolean;
  canViewPrivateItems: boolean;
  canEdit: boolean;
  owner: {
    name: string;
    address: string;
  };
  isDefaultCalendar?: boolean;
}

export interface CreateOutlookEventOptions {
  calendarId?: string;
  subject: string;
  body?: { contentType: 'text' | 'html'; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  attendees?: Array<{
    type?: 'required' | 'optional';
    emailAddress: { address: string; name?: string };
  }>;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: 'teamsForBusiness';
  isAllDay?: boolean;
  showAs?: 'free' | 'tentative' | 'busy' | 'oof';
  importance?: 'low' | 'normal' | 'high';
  recurrence?: OutlookEvent['recurrence'];
}

// ============================================
// ONEDRIVE TYPES
// ============================================
export interface OneDriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  file?: {
    mimeType: string;
    hashes?: {
      quickXorHash?: string;
      sha1Hash?: string;
    };
  };
  folder?: {
    childCount: number;
  };
  parentReference: {
    id: string;
    driveId: string;
    driveType: string;
    path: string;
  };
  createdBy: {
    user: { displayName: string; email?: string };
  };
  lastModifiedBy: {
    user: { displayName: string; email?: string };
  };
  '@microsoft.graph.downloadUrl'?: string;
}

// ============================================
// CONTACTS TYPES
// ============================================
export interface OutlookContact {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  title?: string;
  jobTitle?: string;
  companyName?: string;
  department?: string;
  officeLocation?: string;
  businessHomePage?: string;
  emailAddresses: Array<{
    name?: string;
    address: string;
  }>;
  businessPhones: string[];
  homePhones: string[];
  mobilePhone?: string;
  personalNotes?: string;
  categories: string[];
  birthday?: string;
  homeAddress?: {
    street?: string;
    city?: string;
    state?: string;
    countryOrRegion?: string;
    postalCode?: string;
  };
  businessAddress?: {
    street?: string;
    city?: string;
    state?: string;
    countryOrRegion?: string;
    postalCode?: string;
  };
}

// ============================================
// MICROSOFT SERVICE CLASS
// ============================================
export class MicrosoftService extends BaseIntegrationService {
  constructor() {
    super('outlook');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;

    return {
      items: (response.value || []) as T[],
      nextCursor: response['@odata.nextLink'] as string | undefined,
      hasMore: !!response['@odata.nextLink'],
      total: response['@odata.count'] as number | undefined,
    };
  }

  protected getCursorParam(cursor: string): Record<string, string> {
    // Microsoft uses full URL as next link, so we extract $skip
    try {
      const url = new URL(cursor);
      const skip = url.searchParams.get('$skip');
      return skip ? { $skip: skip } : {};
    } catch {
      return {};
    }
  }

  async testConnection(userId: string, service: string = 'default'): Promise<boolean> {
    try {
      await this.request(userId, '/me', {}, service);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // USER INFO
  // ============================================

  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<{
    id: string;
    displayName: string;
    mail: string;
    userPrincipalName: string;
    jobTitle?: string;
    officeLocation?: string;
  }> {
    const response = await this.request(userId, '/me');
    return response.data as any;
  }

  // ============================================
  // OUTLOOK MAIL METHODS
  // ============================================

  /**
   * List mail folders
   */
  async listMailFolders(userId: string): Promise<OutlookMailFolder[]> {
    const response = await this.request<{ value: OutlookMailFolder[] }>(
      userId,
      '/me/mailFolders'
    );
    return response.data.value || [];
  }

  /**
   * List messages
   */
  async listMessages(
    userId: string,
    options: {
      folderId?: string;
      top?: number;
      skip?: number;
      filter?: string;
      orderBy?: string;
      search?: string;
    } = {}
  ): Promise<OutlookMessage[]> {
    const folder = options.folderId || 'inbox';
    const endpoint = `/me/mailFolders/${folder}/messages`;

    const params: Record<string, string | number | boolean | undefined> = {
      $top: options.top || 50,
      $orderby: options.orderBy || 'receivedDateTime desc',
    };

    if (options.skip) params.$skip = options.skip;
    if (options.filter) params.$filter = options.filter;
    if (options.search) params.$search = `"${options.search}"`;

    const response = await this.request<{ value: OutlookMessage[] }>(
      userId,
      endpoint,
      { params }
    );

    return response.data.value || [];
  }

  /**
   * Get single message
   */
  async getMessage(userId: string, messageId: string): Promise<OutlookMessage> {
    const response = await this.request<OutlookMessage>(
      userId,
      `/me/messages/${messageId}`
    );
    return response.data;
  }

  /**
   * Send email
   */
  async sendEmail(userId: string, options: SendOutlookEmailOptions): Promise<void> {
    const toRecipients = (Array.isArray(options.to) ? options.to : [options.to]).map(email => ({
      emailAddress: { address: email },
    }));

    const ccRecipients = options.cc
      ? (Array.isArray(options.cc) ? options.cc : [options.cc]).map(email => ({
          emailAddress: { address: email },
        }))
      : [];

    const bccRecipients = options.bcc
      ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]).map(email => ({
          emailAddress: { address: email },
        }))
      : [];

    const message: Record<string, unknown> = {
      subject: options.subject,
      body: {
        contentType: options.isHtml ? 'html' : 'text',
        content: options.body,
      },
      toRecipients,
      ccRecipients,
      bccRecipients,
      importance: options.importance || 'normal',
    };

    if (options.attachments && options.attachments.length > 0) {
      message.attachments = options.attachments.map(att => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.name,
        contentType: att.contentType,
        contentBytes: att.contentBytes,
      }));
    }

    await this.request(
      userId,
      '/me/sendMail',
      {
        method: 'POST',
        body: {
          message,
          saveToSentItems: options.saveToSentItems !== false,
        },
      }
    );
  }

  /**
   * Reply to message
   */
  async replyToMessage(
    userId: string,
    messageId: string,
    comment: string,
    replyAll: boolean = false
  ): Promise<void> {
    const endpoint = replyAll
      ? `/me/messages/${messageId}/replyAll`
      : `/me/messages/${messageId}/reply`;

    await this.request(userId, endpoint, {
      method: 'POST',
      body: { comment },
    });
  }

  /**
   * Forward message
   */
  async forwardMessage(
    userId: string,
    messageId: string,
    toRecipients: string[],
    comment?: string
  ): Promise<void> {
    await this.request(
      userId,
      `/me/messages/${messageId}/forward`,
      {
        method: 'POST',
        body: {
          comment,
          toRecipients: toRecipients.map(email => ({
            emailAddress: { address: email },
          })),
        },
      }
    );
  }

  /**
   * Mark message as read/unread
   */
  async updateMessageReadStatus(
    userId: string,
    messageId: string,
    isRead: boolean
  ): Promise<void> {
    await this.request(
      userId,
      `/me/messages/${messageId}`,
      {
        method: 'PATCH',
        body: { isRead },
      }
    );
  }

  /**
   * Delete message
   */
  async deleteMessage(userId: string, messageId: string): Promise<void> {
    await this.request(
      userId,
      `/me/messages/${messageId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Move message to folder
   */
  async moveMessage(
    userId: string,
    messageId: string,
    destinationFolderId: string
  ): Promise<OutlookMessage> {
    const response = await this.request<OutlookMessage>(
      userId,
      `/me/messages/${messageId}/move`,
      {
        method: 'POST',
        body: { destinationId: destinationFolderId },
      }
    );
    return response.data;
  }

  // ============================================
  // CALENDAR METHODS
  // ============================================

  /**
   * List calendars
   */
  async listCalendars(userId: string): Promise<OutlookCalendar[]> {
    const response = await this.request<{ value: OutlookCalendar[] }>(
      userId,
      '/me/calendars'
    );
    return response.data.value || [];
  }

  /**
   * Get default calendar
   */
  async getDefaultCalendar(userId: string): Promise<OutlookCalendar> {
    const response = await this.request<OutlookCalendar>(
      userId,
      '/me/calendar'
    );
    return response.data;
  }

  /**
   * List calendar events
   */
  async listEvents(
    userId: string,
    options: {
      calendarId?: string;
      startDateTime?: Date;
      endDateTime?: Date;
      top?: number;
      filter?: string;
      orderBy?: string;
    } = {}
  ): Promise<OutlookEvent[]> {
    const calendarId = options.calendarId || 'calendar';
    let endpoint = `/me/calendars/${calendarId}/events`;

    // Use calendarView for date range queries
    if (options.startDateTime && options.endDateTime) {
      endpoint = `/me/calendarView`;
    }

    const params: Record<string, string | number | boolean | undefined> = {
      $top: options.top || 100,
      $orderby: options.orderBy || 'start/dateTime',
    };

    if (options.startDateTime) {
      params.startDateTime = options.startDateTime.toISOString();
    }
    if (options.endDateTime) {
      params.endDateTime = options.endDateTime.toISOString();
    }
    if (options.filter) {
      params.$filter = options.filter;
    }

    const response = await this.request<{ value: OutlookEvent[] }>(
      userId,
      endpoint,
      { params }
    );

    return response.data.value || [];
  }

  /**
   * Get single event
   */
  async getEvent(userId: string, eventId: string): Promise<OutlookEvent> {
    const response = await this.request<OutlookEvent>(
      userId,
      `/me/events/${eventId}`
    );
    return response.data;
  }

  /**
   * Create calendar event
   */
  async createEvent(userId: string, options: CreateOutlookEventOptions): Promise<OutlookEvent> {
    const calendarId = options.calendarId || 'calendar';

    const response = await this.request<OutlookEvent>(
      userId,
      `/me/calendars/${calendarId}/events`,
      {
        method: 'POST',
        body: options,
      }
    );

    return response.data;
  }

  /**
   * Update calendar event
   */
  async updateEvent(
    userId: string,
    eventId: string,
    updates: Partial<CreateOutlookEventOptions>
  ): Promise<OutlookEvent> {
    const response = await this.request<OutlookEvent>(
      userId,
      `/me/events/${eventId}`,
      {
        method: 'PATCH',
        body: updates,
      }
    );
    return response.data;
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    await this.request(
      userId,
      `/me/events/${eventId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Accept/Decline/Tentative event
   */
  async respondToEvent(
    userId: string,
    eventId: string,
    response: 'accept' | 'decline' | 'tentativelyAccept',
    comment?: string,
    sendResponse: boolean = true
  ): Promise<void> {
    await this.request(
      userId,
      `/me/events/${eventId}/${response}`,
      {
        method: 'POST',
        body: {
          comment,
          sendResponse,
        },
      }
    );
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(userId: string, days: number = 7): Promise<OutlookEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.listEvents(userId, {
      startDateTime: now,
      endDateTime: future,
    });
  }

  // ============================================
  // ONEDRIVE METHODS
  // ============================================

  /**
   * List OneDrive items
   */
  async listDriveItems(
    userId: string,
    options: {
      folderId?: string;
      top?: number;
      orderBy?: string;
    } = {}
  ): Promise<OneDriveItem[]> {
    const folder = options.folderId || 'root';
    const endpoint = folder === 'root'
      ? '/me/drive/root/children'
      : `/me/drive/items/${folder}/children`;

    const params: Record<string, string | number | boolean | undefined> = {
      $top: options.top || 100,
      $orderby: options.orderBy || 'lastModifiedDateTime desc',
    };

    const response = await this.request<{ value: OneDriveItem[] }>(
      userId,
      endpoint,
      { params }
    );

    return response.data.value || [];
  }

  /**
   * Get drive item
   */
  async getDriveItem(userId: string, itemId: string): Promise<OneDriveItem> {
    const response = await this.request<OneDriveItem>(
      userId,
      `/me/drive/items/${itemId}`
    );
    return response.data;
  }

  /**
   * Search OneDrive
   */
  async searchDrive(userId: string, query: string): Promise<OneDriveItem[]> {
    const response = await this.request<{ value: OneDriveItem[] }>(
      userId,
      `/me/drive/root/search(q='${encodeURIComponent(query)}')`
    );
    return response.data.value || [];
  }

  /**
   * Download file
   */
  async downloadDriveItem(userId: string, itemId: string): Promise<Blob> {
    const { token } = await this.getAccessToken(userId);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Create folder
   */
  async createFolder(
    userId: string,
    name: string,
    parentId: string = 'root'
  ): Promise<OneDriveItem> {
    const endpoint = parentId === 'root'
      ? '/me/drive/root/children'
      : `/me/drive/items/${parentId}/children`;

    const response = await this.request<OneDriveItem>(
      userId,
      endpoint,
      {
        method: 'POST',
        body: {
          name,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        },
      }
    );

    return response.data;
  }

  // ============================================
  // CONTACTS METHODS
  // ============================================

  /**
   * List contacts
   */
  async listContacts(
    userId: string,
    options: { top?: number; filter?: string } = {}
  ): Promise<OutlookContact[]> {
    const params: Record<string, string | number | boolean | undefined> = {
      $top: options.top || 100,
      $orderby: 'displayName',
    };

    if (options.filter) params.$filter = options.filter;

    const response = await this.request<{ value: OutlookContact[] }>(
      userId,
      '/me/contacts',
      { params }
    );

    return response.data.value || [];
  }

  /**
   * Get contact
   */
  async getContact(userId: string, contactId: string): Promise<OutlookContact> {
    const response = await this.request<OutlookContact>(
      userId,
      `/me/contacts/${contactId}`
    );
    return response.data;
  }

  /**
   * Create contact
   */
  async createContact(
    userId: string,
    contact: Partial<OutlookContact>
  ): Promise<OutlookContact> {
    const response = await this.request<OutlookContact>(
      userId,
      '/me/contacts',
      {
        method: 'POST',
        body: contact,
      }
    );
    return response.data;
  }

  /**
   * Update contact
   */
  async updateContact(
    userId: string,
    contactId: string,
    updates: Partial<OutlookContact>
  ): Promise<OutlookContact> {
    const response = await this.request<OutlookContact>(
      userId,
      `/me/contacts/${contactId}`,
      {
        method: 'PATCH',
        body: updates,
      }
    );
    return response.data;
  }

  /**
   * Delete contact
   */
  async deleteContact(userId: string, contactId: string): Promise<void> {
    await this.request(
      userId,
      `/me/contacts/${contactId}`,
      { method: 'DELETE' }
    );
  }
}

// Export singleton instance
export const microsoftService = new MicrosoftService();
