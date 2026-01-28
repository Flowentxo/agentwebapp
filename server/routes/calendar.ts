import { Router } from 'express';
import { googleCalendarService } from '../services/GoogleCalendarService';
import { getDb } from '@/lib/db';
import { calendarIntegrations } from '@/lib/db/schema-calendar';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/calendar/status
 * Check if user has calendar connected
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const db = getDb();
    const [integration] = await db
      .select()
      .from(calendarIntegrations)
      .where(
        and(
          eq(calendarIntegrations.userId, userId),
          eq(calendarIntegrations.enabled, true)
        )
      )
      .limit(1);

    res.json({
      connected: !!integration,
      email: integration?.email || null,
      provider: integration?.provider || null,
      lastSync: integration?.lastSync || null,
    });
  } catch (error) {
    logger.error('[CALENDAR_STATUS]', error);
    res.status(500).json({ error: 'Failed to check calendar status' });
  }
});

/**
 * GET /api/calendar/auth
 * Get OAuth URL to initiate Google Calendar connection
 */
router.get('/auth', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const authUrl = googleCalendarService.getAuthUrl(userId);

    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize calendar access'
    });
  } catch (error) {
    logger.error('[CALENDAR_AUTH]', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

/**
 * POST /api/calendar/callback
 * Handle OAuth callback from Google
 */
router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ error: 'Authorization code and state required' });
    }

    const userId = state; // state contains userId

    const integration = await googleCalendarService.exchangeCodeForTokens(code, userId);

    res.json({
      success: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        email: integration.email,
        enabled: integration.enabled,
      },
      message: 'Calendar connected successfully'
    });
  } catch (error) {
    logger.error('[CALENDAR_CALLBACK]', error);
    res.status(500).json({ error: 'Failed to connect calendar' });
  }
});

/**
 * POST /api/calendar/sync
 * Manually trigger calendar sync
 */
router.post('/sync', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const { daysAhead = 7 } = req.body;

    const events = await googleCalendarService.syncUpcomingEvents(userId, daysAhead);

    res.json({
      success: true,
      synced: events.length,
      events,
      message: `Synced ${events.length} events`
    });
  } catch (error: any) {
    logger.error('[CALENDAR_SYNC]', error);

    if (error.message.includes('No Google Calendar integration')) {
      return res.status(404).json({ error: 'Calendar not connected' });
    }

    res.status(500).json({ error: 'Failed to sync calendar' });
  }
});

/**
 * GET /api/calendar/events
 * Get upcoming events from database
 */
router.get('/events', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const hours = parseInt(req.query.hours as string) || 24;

    const events = await googleCalendarService.getUpcomingEvents(userId, hours);

    res.json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    logger.error('[CALENDAR_EVENTS]', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * GET /api/calendar/events/:eventId
 * Get specific event by ID
 */
router.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await googleCalendarService.getEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({
      success: true,
      event
    });
  } catch (error) {
    logger.error('[CALENDAR_EVENT_BY_ID]', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * DELETE /api/calendar/disconnect
 * Disconnect Google Calendar integration
 */
router.delete('/disconnect', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    await googleCalendarService.disconnectIntegration(userId);

    res.json({
      success: true,
      message: 'Calendar disconnected successfully'
    });
  } catch (error) {
    logger.error('[CALENDAR_DISCONNECT]', error);
    res.status(500).json({ error: 'Failed to disconnect calendar' });
  }
});

export default router;
