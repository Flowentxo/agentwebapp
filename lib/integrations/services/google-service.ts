/**
 * Google Integration Service
 * Handles Gmail, Calendar, Drive, Contacts, Tasks, Sheets, Analytics, YouTube
 */

import { BaseIntegrationService, PaginatedResponse, ApiRequestOptions } from './base-service';

// ============================================
// GMAIL TYPES
// ============================================
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    mimeType: string;
    body?: { data?: string; size: number };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string; size: number };
    }>;
  };
  sizeEstimate: number;
  historyId: string;
  internalDate: string;
}

export interface GmailThread {
  id: string;
  historyId: string;
  messages: GmailMessage[];
}

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
  type: 'system' | 'user';
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

export interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  replyToMessageId?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    mimeType: string;
  }>;
}

// ============================================
// CALENDAR TYPES
// ============================================
export interface CalendarEvent {
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator: { email: string; displayName?: string };
  organizer: { email: string; displayName?: string };
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  recurrence?: string[];
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    optional?: boolean;
  }>;
  conferenceData?: {
    conferenceId: string;
    conferenceSolution: { name: string; iconUri: string };
    entryPoints: Array<{ entryPointType: string; uri: string; label?: string }>;
  };
}

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  primary?: boolean;
}

export interface CreateEventOptions {
  calendarId?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
  conferenceData?: {
    createRequest: { requestId: string; conferenceSolutionKey: { type: string } };
  };
}

// ============================================
// DRIVE TYPES
// ============================================
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  description?: string;
  starred: boolean;
  trashed: boolean;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  owners?: Array<{ emailAddress: string; displayName: string }>;
  permissions?: Array<{
    id: string;
    type: string;
    role: string;
    emailAddress?: string;
  }>;
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: 'application/vnd.google-apps.folder';
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
}

// ============================================
// CONTACTS TYPES
// ============================================
export interface GoogleContact {
  resourceName: string;
  etag: string;
  names?: Array<{
    displayName: string;
    givenName?: string;
    familyName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
  }>;
  photos?: Array<{
    url: string;
  }>;
}

// ============================================
// GOOGLE SERVICE CLASS
// ============================================
export class GoogleService extends BaseIntegrationService {
  constructor() {
    super('google');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;

    // Gmail format
    if ('messages' in response) {
      return {
        items: (response.messages || []) as T[],
        nextCursor: response.nextPageToken as string | undefined,
        hasMore: !!response.nextPageToken,
        total: response.resultSizeEstimate as number,
      };
    }

    // Calendar format
    if ('items' in response) {
      return {
        items: (response.items || []) as T[],
        nextCursor: response.nextPageToken as string | undefined,
        hasMore: !!response.nextPageToken,
      };
    }

    // Drive format
    if ('files' in response) {
      return {
        items: (response.files || []) as T[],
        nextCursor: response.nextPageToken as string | undefined,
        hasMore: !!response.nextPageToken,
      };
    }

    // Contacts format
    if ('connections' in response) {
      return {
        items: (response.connections || []) as T[],
        nextCursor: response.nextPageToken as string | undefined,
        hasMore: !!response.nextPageToken,
        total: response.totalItems as number,
      };
    }

    return { items: [], hasMore: false };
  }

  protected getCursorParam(cursor: string): Record<string, string> {
    return { pageToken: cursor };
  }

  async testConnection(userId: string, service: string = 'default'): Promise<boolean> {
    try {
      await this.request(userId, '/oauth2/v3/userinfo', {}, service);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // GMAIL METHODS
  // ============================================

  /**
   * List Gmail messages
   */
  async listMessages(
    userId: string,
    options: {
      q?: string;
      labelIds?: string[];
      maxResults?: number;
      includeSpamTrash?: boolean;
    } = {}
  ): Promise<GmailMessage[]> {
    const params: Record<string, string | number | boolean | undefined> = {
      maxResults: options.maxResults || 50,
      includeSpamTrash: options.includeSpamTrash || false,
    };

    if (options.q) params.q = options.q;
    if (options.labelIds) params.labelIds = options.labelIds.join(',');

    const response = await this.request<{ messages: Array<{ id: string; threadId: string }> }>(
      userId,
      'https://gmail.googleapis.com/gmail/v1/users/me/messages',
      { params }
    );

    // Fetch full message details
    const messages: GmailMessage[] = [];
    for (const msg of response.data.messages?.slice(0, 20) || []) {
      const fullMsg = await this.getMessage(userId, msg.id);
      messages.push(fullMsg);
    }

    return messages;
  }

  /**
   * Get single Gmail message
   */
  async getMessage(userId: string, messageId: string): Promise<GmailMessage> {
    const response = await this.request<GmailMessage>(
      userId,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
      { params: { format: 'full' } }
    );
    return response.data;
  }

  /**
   * Get Gmail thread
   */
  async getThread(userId: string, threadId: string): Promise<GmailThread> {
    const response = await this.request<GmailThread>(
      userId,
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
      { params: { format: 'full' } }
    );
    return response.data;
  }

  /**
   * List Gmail labels
   */
  async listLabels(userId: string): Promise<GmailLabel[]> {
    const response = await this.request<{ labels: GmailLabel[] }>(
      userId,
      'https://gmail.googleapis.com/gmail/v1/users/me/labels'
    );
    return response.data.labels || [];
  }

  /**
   * Send email via Gmail
   */
  async sendEmail(userId: string, options: SendEmailOptions): Promise<GmailMessage> {
    const raw = this.buildRawEmail(options);

    const response = await this.request<GmailMessage>(
      userId,
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        body: { raw },
      }
    );

    return response.data;
  }

  /**
   * Build raw email message (RFC 2822)
   */
  private buildRawEmail(options: SendEmailOptions): string {
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const cc = options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : '';
    const bcc = options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : '';

    const boundary = `boundary_${Date.now()}`;
    const contentType = options.isHtml ? 'text/html' : 'text/plain';

    let message = '';
    message += `To: ${to}\r\n`;
    if (cc) message += `Cc: ${cc}\r\n`;
    if (bcc) message += `Bcc: ${bcc}\r\n`;
    message += `Subject: ${options.subject}\r\n`;
    message += `MIME-Version: 1.0\r\n`;

    if (options.attachments && options.attachments.length > 0) {
      message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
      message += `--${boundary}\r\n`;
      message += `Content-Type: ${contentType}; charset="UTF-8"\r\n\r\n`;
      message += `${options.body}\r\n\r\n`;

      for (const attachment of options.attachments) {
        message += `--${boundary}\r\n`;
        message += `Content-Type: ${attachment.mimeType}\r\n`;
        message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        message += `Content-Transfer-Encoding: base64\r\n\r\n`;
        message += `${attachment.content}\r\n`;
      }

      message += `--${boundary}--`;
    } else {
      message += `Content-Type: ${contentType}; charset="UTF-8"\r\n\r\n`;
      message += options.body;
    }

    return Buffer.from(message).toString('base64url');
  }

  /**
   * Modify message labels
   */
  async modifyMessageLabels(
    userId: string,
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ): Promise<GmailMessage> {
    const response = await this.request<GmailMessage>(
      userId,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        body: { addLabelIds, removeLabelIds },
      }
    );
    return response.data;
  }

  /**
   * Mark message as read
   */
  async markAsRead(userId: string, messageId: string): Promise<void> {
    await this.modifyMessageLabels(userId, messageId, undefined, ['UNREAD']);
  }

  /**
   * Mark message as unread
   */
  async markAsUnread(userId: string, messageId: string): Promise<void> {
    await this.modifyMessageLabels(userId, messageId, ['UNREAD']);
  }

  /**
   * Archive message
   */
  async archiveMessage(userId: string, messageId: string): Promise<void> {
    await this.modifyMessageLabels(userId, messageId, undefined, ['INBOX']);
  }

  /**
   * Trash message
   */
  async trashMessage(userId: string, messageId: string): Promise<void> {
    await this.request(
      userId,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
      { method: 'POST' }
    );
  }

  // ============================================
  // CALENDAR METHODS
  // ============================================

  /**
   * List calendars
   */
  async listCalendars(userId: string): Promise<Calendar[]> {
    const response = await this.request<{ items: Calendar[] }>(
      userId,
      'https://www.googleapis.com/calendar/v3/users/me/calendarList'
    );
    return response.data.items || [];
  }

  /**
   * Get primary calendar
   */
  async getPrimaryCalendar(userId: string): Promise<Calendar | null> {
    const calendars = await this.listCalendars(userId);
    return calendars.find(c => c.primary) || null;
  }

  /**
   * List calendar events
   */
  async listEvents(
    userId: string,
    options: {
      calendarId?: string;
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
      singleEvents?: boolean;
      orderBy?: 'startTime' | 'updated';
      q?: string;
    } = {}
  ): Promise<CalendarEvent[]> {
    const calendarId = options.calendarId || 'primary';

    const params: Record<string, string | number | boolean | undefined> = {
      maxResults: options.maxResults || 100,
      singleEvents: options.singleEvents !== false,
      orderBy: options.orderBy || 'startTime',
    };

    if (options.timeMin) params.timeMin = options.timeMin.toISOString();
    if (options.timeMax) params.timeMax = options.timeMax.toISOString();
    if (options.q) params.q = options.q;

    const response = await this.request<{ items: CalendarEvent[] }>(
      userId,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      { params }
    );

    return response.data.items || [];
  }

  /**
   * Get single event
   */
  async getEvent(userId: string, eventId: string, calendarId: string = 'primary'): Promise<CalendarEvent> {
    const response = await this.request<CalendarEvent>(
      userId,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
    );
    return response.data;
  }

  /**
   * Create calendar event
   */
  async createEvent(userId: string, options: CreateEventOptions): Promise<CalendarEvent> {
    const calendarId = options.calendarId || 'primary';

    const params: Record<string, string | number | boolean | undefined> = {};
    if (options.conferenceData) {
      params.conferenceDataVersion = 1;
    }

    const response = await this.request<CalendarEvent>(
      userId,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: options,
        params,
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
    updates: Partial<CreateEventOptions>,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    const response = await this.request<CalendarEvent>(
      userId,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
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
  async deleteEvent(userId: string, eventId: string, calendarId: string = 'primary'): Promise<void> {
    await this.request(
      userId,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents(userId: string, days: number = 7): Promise<CalendarEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.listEvents(userId, {
      timeMin: now,
      timeMax: future,
      orderBy: 'startTime',
    });
  }

  // ============================================
  // DRIVE METHODS
  // ============================================

  /**
   * List Drive files
   */
  async listFiles(
    userId: string,
    options: {
      q?: string;
      folderId?: string;
      pageSize?: number;
      orderBy?: string;
      fields?: string;
    } = {}
  ): Promise<DriveFile[]> {
    let query = options.q || '';

    if (options.folderId) {
      query = query ? `${query} and '${options.folderId}' in parents` : `'${options.folderId}' in parents`;
    }

    // Exclude trashed files by default
    if (!query.includes('trashed')) {
      query = query ? `${query} and trashed = false` : 'trashed = false';
    }

    const response = await this.request<{ files: DriveFile[] }>(
      userId,
      'https://www.googleapis.com/drive/v3/files',
      {
        params: {
          q: query || undefined,
          pageSize: options.pageSize || 100,
          orderBy: options.orderBy || 'modifiedTime desc',
          fields: options.fields || 'files(id,name,mimeType,description,starred,trashed,parents,webViewLink,webContentLink,iconLink,thumbnailLink,createdTime,modifiedTime,size,owners)',
        },
      }
    );

    return response.data.files || [];
  }

  /**
   * Get file metadata
   */
  async getFile(userId: string, fileId: string): Promise<DriveFile> {
    const response = await this.request<DriveFile>(
      userId,
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        params: {
          fields: 'id,name,mimeType,description,starred,trashed,parents,webViewLink,webContentLink,iconLink,thumbnailLink,createdTime,modifiedTime,size,owners,permissions',
        },
      }
    );
    return response.data;
  }

  /**
   * Download file content
   */
  async downloadFile(userId: string, fileId: string): Promise<Blob> {
    const { token } = await this.getAccessToken(userId);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
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
    parentId?: string
  ): Promise<DriveFolder> {
    const metadata: Record<string, unknown> = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId) {
      metadata.parents = [parentId];
    }

    const response = await this.request<DriveFolder>(
      userId,
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        body: metadata,
      }
    );

    return response.data;
  }

  /**
   * Search files
   */
  async searchFiles(userId: string, query: string): Promise<DriveFile[]> {
    return this.listFiles(userId, {
      q: `fullText contains '${query.replace(/'/g, "\\'")}'`,
    });
  }

  // ============================================
  // CONTACTS METHODS
  // ============================================

  /**
   * List contacts
   */
  async listContacts(
    userId: string,
    options: { pageSize?: number; personFields?: string } = {}
  ): Promise<GoogleContact[]> {
    const response = await this.request<{ connections: GoogleContact[] }>(
      userId,
      'https://people.googleapis.com/v1/people/me/connections',
      {
        params: {
          pageSize: options.pageSize || 100,
          personFields: options.personFields || 'names,emailAddresses,phoneNumbers,organizations,photos',
        },
      }
    );

    return response.data.connections || [];
  }

  /**
   * Search contacts
   */
  async searchContacts(userId: string, query: string): Promise<GoogleContact[]> {
    const response = await this.request<{ results: Array<{ person: GoogleContact }> }>(
      userId,
      'https://people.googleapis.com/v1/people:searchContacts',
      {
        params: {
          query,
          readMask: 'names,emailAddresses,phoneNumbers,organizations,photos',
        },
      }
    );

    return response.data.results?.map(r => r.person) || [];
  }
}

// Export singleton instance
export const googleService = new GoogleService();
