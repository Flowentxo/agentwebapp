import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getDb } from '@/lib/db';
import { calendarIntegrations, calendarEvents } from '@/lib/db/schema-calendar';
import { eq, and, gte } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { getProviderConfig } from '../../lib/integrations/settings';

const createOAuthClient = (clientId: string, clientSecret: string, redirectUri: string) => {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  attendees: Array<{
    email: string;
    name?: string;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
    name?: string;
  };
  meetingLink?: string;
  conferenceData?: any;
  status: string;
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;

  private constructor() {
    // No static client
  }

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  private async getConfig(userId: string) {
    // Try 'google' first, then 'gmail' (fallback if shared)
    // Actually, stick to 'google' as primary for Calendar.
    let config = await getProviderConfig(userId, 'google');
    
    // Fallback to global env vars
    if (!config && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback', // Note: Check redirect URI consistency
        provider: 'google'
      };
    }

    if (!config) {
      throw new Error('Google Calendar configuration not found for this user.');
    }
    return config;
  }

  /**
   * Generate OAuth URL for user authorization
   */

  public async getAuthUrl(userId: string): Promise<string> {
    const config = await this.getConfig(userId);
    const redirectUri = config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
    const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, redirectUri);

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass userId through state
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  public async exchangeCodeForTokens(code: string, userId: string): Promise<any> {
    try {
      const config = await this.getConfig(userId);
      const redirectUri = config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, redirectUri);

      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Missing required tokens');
      }

      const db = getDb();

      // Get user info to store email
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Store integration
      const [integration] = await db
        .insert(calendarIntegrations)
        .values({
          userId,
          provider: 'google',
          email: userInfo.data.email || '',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: new Date(tokens.expiry_date || Date.now() + 3600000),
          enabled: true,
        })
        .returning();

      logger.info(`[GOOGLE_CALENDAR] Integration created for user ${userId}`);
      return integration;
    } catch (error) {
      logger.error('[GOOGLE_CALENDAR] Token exchange failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token if expired
   */
  private async refreshAccessToken(integration: any): Promise<string> {
    try {
      // Need userId to get config. Integration object implies it has userId.
      if (!integration.userId) throw new Error('Integration record missing userId');
      
      const config = await this.getConfig(integration.userId);
      const redirectUri = config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, redirectUri);

      oauth2Client.setCredentials({
        refresh_token: integration.refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('Failed to refresh token');
      }

      // Update in database
      const db = getDb();
      await db
        .update(calendarIntegrations)
        .set({
          accessToken: credentials.access_token,
          tokenExpiry: new Date(credentials.expiry_date || Date.now() + 3600000),
          updatedAt: new Date(),
        })
        .where(eq(calendarIntegrations.id, integration.id));

      return credentials.access_token;
    } catch (error) {
      logger.error('[GOOGLE_CALENDAR] Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  private async getValidAccessToken(integration: any): Promise<string> {
    const now = new Date();
    const expiry = new Date(integration.tokenExpiry);

    // Refresh if token expires in less than 5 minutes
    if (expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
      return await this.refreshAccessToken(integration);
    }

    return integration.accessToken;
  }

  /**
   * Sync upcoming events from Google Calendar
   */
  public async syncUpcomingEvents(userId: string, daysAhead: number = 7): Promise<CalendarEvent[]> {
    try {
      const db = getDb();

      // Get user's integration
      const [integration] = await db
        .select()
        .from(calendarIntegrations)
        .where(
          and(
            eq(calendarIntegrations.userId, userId),
            eq(calendarIntegrations.provider, 'google'),
            eq(calendarIntegrations.enabled, true)
          )
        );

      if (!integration) {
        throw new Error('No Google Calendar integration found');
      }

      // Get valid access token
      const accessToken = await this.getValidAccessToken(integration);
      
      const config = await this.getConfig(userId);
      const redirectUri = config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, redirectUri);
      
      oauth2Client.setCredentials({ access_token: accessToken });

      // Initialize Calendar API
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Fetch events
      const timeMin = new Date();
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + daysAhead);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
      });

      const events = response.data.items || [];
      const syncedEvents: CalendarEvent[] = [];

      // Process and store events
      for (const event of events) {
        if (!event.start?.dateTime || !event.end?.dateTime) continue;

        const calendarEvent = {
          externalId: event.id || '',
          title: event.summary || 'Untitled Event',
          description: event.description,
          location: event.location,
          startTime: new Date(event.start.dateTime),
          endTime: new Date(event.end.dateTime),
          attendees: (event.attendees || []).map(a => ({
            email: a.email || '',
            name: a.displayName,
            responseStatus: a.responseStatus,
          })),
          organizer: event.organizer ? {
            email: event.organizer.email || '',
            name: event.organizer.displayName,
          } : undefined,
          meetingLink: event.hangoutLink,
          conferenceData: event.conferenceData,
          status: event.status || 'confirmed',
        };

        // Upsert event
        const [storedEvent] = await db
          .insert(calendarEvents)
          .values({
            userId,
            integrationId: integration.id,
            externalId: calendarEvent.externalId,
            title: calendarEvent.title,
            description: calendarEvent.description,
            location: calendarEvent.location,
            startTime: calendarEvent.startTime,
            endTime: calendarEvent.endTime,
            attendees: calendarEvent.attendees as any,
            organizer: calendarEvent.organizer as any,
            meetingLink: calendarEvent.meetingLink,
            conferenceData: calendarEvent.conferenceData as any,
            status: calendarEvent.status,
            rawData: event as any,
          })
          .onConflictDoUpdate({
            target: calendarEvents.externalId,
            set: {
              title: calendarEvent.title,
              description: calendarEvent.description,
              startTime: calendarEvent.startTime,
              endTime: calendarEvent.endTime,
              updatedAt: new Date(),
            },
          })
          .returning();

        syncedEvents.push({
          id: storedEvent.id,
          ...calendarEvent,
        });
      }

      // Update last sync time
      await db
        .update(calendarIntegrations)
        .set({ lastSync: new Date() })
        .where(eq(calendarIntegrations.id, integration.id));

      logger.info(`[GOOGLE_CALENDAR] Synced ${syncedEvents.length} events for user ${userId}`);
      return syncedEvents;
    } catch (error) {
      logger.error('[GOOGLE_CALENDAR] Sync failed:', error);
      throw error;
    }
  }

  /**
   * Create a new calendar event
   */
  public async createEvent(
    userId: string,
    eventData: {
      title: string;
      description?: string;
      location?: string;
      startTime: Date | string;
      endTime: Date | string;
      attendees?: string[];
    }
  ): Promise<{ success: boolean; eventId?: string; htmlLink?: string; error?: string }> {
    try {
      const db = getDb();

      // Get user's integration
      const [integration] = await db
        .select()
        .from(calendarIntegrations)
        .where(
          and(
            eq(calendarIntegrations.userId, userId),
            eq(calendarIntegrations.provider, 'google'),
            eq(calendarIntegrations.enabled, true)
          )
        );

      if (!integration) {
        return { success: false, error: 'No Google Calendar integration found. Please connect your Google account first.' };
      }

      // Get valid access token
      const accessToken = await this.getValidAccessToken(integration);
      
      const config = await this.getConfig(userId);
      const redirectUri = config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, redirectUri);
      
      oauth2Client.setCredentials({ access_token: accessToken });

      // Initialize Calendar API
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Prepare event
      const event: any = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: new Date(eventData.startTime).toISOString(),
          timeZone: 'Europe/Berlin',
        },
        end: {
          dateTime: new Date(eventData.endTime).toISOString(),
          timeZone: 'Europe/Berlin',
        },
      };

      if (eventData.attendees && eventData.attendees.length > 0) {
        event.attendees = eventData.attendees.map(email => ({ email }));
      }

      // Create event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all', // Send invites to attendees
      });

      logger.info(`[GOOGLE_CALENDAR] Event created: ${response.data.id}`);

      return {
        success: true,
        eventId: response.data.id || undefined,
        htmlLink: response.data.htmlLink || undefined,
      };
    } catch (error: any) {
      logger.error('[GOOGLE_CALENDAR] Create event failed:', error);
      return { success: false, error: error.message || 'Failed to create calendar event' };
    }
  }

  /**
   * Get upcoming events from database
   */
  public async getUpcomingEvents(userId: string, hours: number = 24): Promise<any[]> {
    const db = getDb();
    const now = new Date();
    const future = new Date();
    future.setHours(future.getHours() + hours);

    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          gte(calendarEvents.startTime, now),
          eq(calendarEvents.status, 'confirmed')
        )
      )
      .orderBy(calendarEvents.startTime)
      .limit(20);

    return events;
  }

  /**
   * Get event by ID
   */
  public async getEventById(eventId: string): Promise<any> {
    const db = getDb();
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId));

    return event;
  }

  /**
   * Disconnect calendar integration
   */
  public async disconnectIntegration(userId: string): Promise<void> {
    const db = getDb();
    await db
      .delete(calendarIntegrations)
      .where(
        and(
          eq(calendarIntegrations.userId, userId),
          eq(calendarIntegrations.provider, 'google')
        )
      );

    logger.info(`[GOOGLE_CALENDAR] Integration disconnected for user ${userId}`);
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance();
