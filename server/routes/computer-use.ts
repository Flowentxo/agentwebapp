/**
 * COMPUTER USE AGENT API ROUTES
 *
 * Endpoints for browser automation and web scraping
 */

import { Router, Request, Response } from 'express';
import { computerUseAgent, AutomationTask } from '../services/ComputerUseAgentService';

const router = Router();

// ============================================================
// SESSION MANAGEMENT
// ============================================================

/**
 * POST /api/computer-use/sessions
 * Create new browser session
 */
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { headless = true, viewport } = req.body;

    const sessionId = await computerUseAgent.createSession({
      headless,
      viewport,
    });

    res.json({
      success: true,
      sessionId,
      message: 'Browser session created',
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Failed to create session:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/computer-use/sessions
 * Get all active sessions
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const sessions = computerUseAgent.getActiveSessions();

    res.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Failed to get sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/computer-use/sessions/:sessionId
 * Get session info
 */
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = computerUseAgent.getSessionInfo(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Failed to get session:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/computer-use/sessions/:sessionId
 * Close session
 */
router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await computerUseAgent.closeSession(sessionId);

    res.json({
      success: true,
      message: 'Session closed',
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Failed to close session:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// AUTOMATION ACTIONS
// ============================================================

/**
 * POST /api/computer-use/navigate
 * Navigate to URL
 */
router.post('/navigate', async (req: Request, res: Response) => {
  try {
    const { sessionId, url, options } = req.body;

    if (!sessionId || !url) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and url are required',
      });
    }

    const result = await computerUseAgent.navigate(sessionId, url, options);

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Navigation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/computer-use/click
 * Click element
 */
router.post('/click', async (req: Request, res: Response) => {
  try {
    const { sessionId, selector, index, timeout } = req.body;

    if (!sessionId || !selector) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and selector are required',
      });
    }

    const result = await computerUseAgent.click(sessionId, {
      selector,
      index,
      timeout,
    });

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Click failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/computer-use/type
 * Type text into input
 */
router.post('/type', async (req: Request, res: Response) => {
  try {
    const { sessionId, selector, text, delay, timeout } = req.body;

    if (!sessionId || !selector || !text) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, selector, and text are required',
      });
    }

    const result = await computerUseAgent.type(
      sessionId,
      { selector, timeout },
      text,
      { delay }
    );

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Type failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/computer-use/fill-form
 * Fill form with data
 */
router.post('/fill-form', async (req: Request, res: Response) => {
  try {
    const { sessionId, formData } = req.body;

    if (!sessionId || !formData) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and formData are required',
      });
    }

    const result = await computerUseAgent.fillForm(sessionId, formData);

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Fill form failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/computer-use/screenshot
 * Take screenshot
 */
router.post('/screenshot', async (req: Request, res: Response) => {
  try {
    const { sessionId, fullPage, quality, type } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
      });
    }

    const result = await computerUseAgent.screenshot(sessionId, {
      fullPage,
      quality,
      type,
    });

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Screenshot failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/computer-use/scrape
 * Scrape data from page
 */
router.post('/scrape', async (req: Request, res: Response) => {
  try {
    const { sessionId, selector, attribute, multiple } = req.body;

    if (!sessionId || !selector) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and selector are required',
      });
    }

    const result = await computerUseAgent.scrape(sessionId, {
      selector,
      attribute,
      multiple,
    });

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Scrape failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/computer-use/execute-script
 * Execute custom JavaScript
 */
router.post('/execute-script', async (req: Request, res: Response) => {
  try {
    const { sessionId, script } = req.body;

    if (!sessionId || !script) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and script are required',
      });
    }

    const result = await computerUseAgent.executeScript(sessionId, script);

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Execute script failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/computer-use/wait
 * Wait for selector or time
 */
router.post('/wait', async (req: Request, res: Response) => {
  try {
    const { sessionId, selector, timeout } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
      });
    }

    const result = await computerUseAgent.wait(sessionId, {
      selector,
      timeout,
    });

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Wait failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/computer-use/workflow
 * Execute automation workflow
 */
router.post('/workflow', async (req: Request, res: Response) => {
  try {
    const { sessionId, tasks } = req.body;

    if (!sessionId || !tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and tasks array are required',
      });
    }

    const result = await computerUseAgent.executeWorkflow(
      sessionId,
      tasks as AutomationTask[]
    );

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error: any) {
    console.error('[COMPUTER_USE_API] Workflow execution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
