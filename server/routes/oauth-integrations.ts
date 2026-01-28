/**
 * OAUTH INTEGRATIONS - API ROUTES
 *
 * Handles OAuth flows for Gmail, Slack, and other integrations
 */

import { Router, Request, Response } from 'express';
import { gmailOAuthService } from '../services/GmailOAuthService';
import { getDb } from '../../lib/db/connection';
import { oauthConnections } from '../../lib/db/schema-integrations';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * Get user ID from request
 */
function getUserId(req: Request): string {
  return req.headers['x-user-id'] as string || 'demo-user';
}

// ========================================
// GMAIL OAUTH
// ========================================

/**
 * GET /api/integrations/gmail/connect
 *
 * Initiate Gmail OAuth flow
 */
router.get('/gmail/connect', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const authUrl = gmailOAuthService.getAuthUrl(userId);

    res.json({ authUrl });
  } catch (error: any) {
    console.error('[OAUTH_GMAIL_CONNECT]', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

/**
 * GET /api/integrations/gmail/callback
 *
 * Handle Gmail OAuth callback
 */
router.get('/gmail/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    // Decode state to get userId
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const userId = stateData.userId;

    // Handle callback
    const result = await gmailOAuthService.handleCallback(code, userId);

    if (!result.success) {
      return res.status(500).send(`OAuth failed: ${result.error}`);
    }

    // Redirect to success page
    res.redirect('/settings/integrations?connected=gmail');
  } catch (error: any) {
    console.error('[OAUTH_GMAIL_CALLBACK]', error);
    res.status(500).send('OAuth callback failed');
  }
});

/**
 * GET /api/integrations/gmail/status
 *
 * Check if Gmail is connected
 */
router.get('/gmail/status', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const isConnected = await gmailOAuthService.isConnected(userId);

    res.json({ connected: isConnected });
  } catch (error: any) {
    console.error('[OAUTH_GMAIL_STATUS]', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

/**
 * POST /api/integrations/gmail/disconnect
 *
 * Disconnect Gmail
 */
router.post('/gmail/disconnect', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await gmailOAuthService.disconnect(userId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[OAUTH_GMAIL_DISCONNECT]', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// ========================================
// SLACK OAUTH (Placeholder)
// ========================================

/**
 * GET /api/integrations/slack/connect
 */
router.get('/slack/connect', (req: Request, res: Response) => {
  // TODO: Implement Slack OAuth
  res.status(501).json({ error: 'Slack OAuth not yet implemented' });
});

/**
 * GET /api/integrations/slack/callback
 */
router.get('/slack/callback', (req: Request, res: Response) => {
  // TODO: Implement Slack OAuth callback
  res.status(501).json({ error: 'Slack OAuth not yet implemented' });
});

/**
 * GET /api/integrations/slack/status
 */
router.get('/slack/status', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const db = getDb();

    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, 'slack'),
          eq(oauthConnections.isActive, true)
        )
      )
      .limit(1);

    res.json({ connected: !!connection });
  } catch (error: any) {
    console.error('[OAUTH_SLACK_STATUS]', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// ========================================
// GENERAL ENDPOINTS
// ========================================

/**
 * GET /api/integrations
 *
 * Get all integrations status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const db = getDb();

    const connections = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.isActive, true)
        )
      );

    const integrations = {
      gmail: connections.some(c => c.provider === 'gmail'),
      slack: connections.some(c => c.provider === 'slack'),
      calendar: connections.some(c => c.provider === 'calendar'),
    };

    res.json({ integrations, connections });
  } catch (error: any) {
    console.error('[OAUTH_INTEGRATIONS_LIST]', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

export default router;
