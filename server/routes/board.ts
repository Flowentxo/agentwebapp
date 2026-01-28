import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Mock data store
interface BoardCard {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'pending' | 'stopped' | 'archived';
  tags: string[];
  statusBadge: 'success' | 'warning' | 'error';
  owner: string;
  lastModified: string;
  createdAt: string;
  metrics?: {
    successRate: number;
    errorRate: number;
    runtime: number;
    requests: number;
  };
}

interface ActivityEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  fromStatus?: string;
  toStatus?: string;
}

// Mock board cards (based on agents)
let boardCards: BoardCard[] = [
  {
    id: 'card-dexter',
    name: 'Dexter - Data Analyst',
    description: 'AI-powered data analysis and insights generation',
    status: 'active',
    tags: ['analytics', 'data', 'ai'],
    statusBadge: 'success',
    owner: 'System',
    lastModified: new Date().toISOString(),
    createdAt: '2025-01-01T00:00:00Z',
    metrics: {
      successRate: 98.5,
      errorRate: 1.5,
      runtime: 1234,
      requests: 5678
    }
  },
  {
    id: 'card-cassie',
    name: 'Cassie - Customer Support',
    description: 'Automated customer support and ticket management',
    status: 'active',
    tags: ['support', 'crm', 'communication'],
    statusBadge: 'success',
    owner: 'System',
    lastModified: new Date().toISOString(),
    createdAt: '2025-01-01T00:00:00Z',
    metrics: {
      successRate: 96.2,
      errorRate: 3.8,
      runtime: 2345,
      requests: 3456
    }
  },
  {
    id: 'card-emmie',
    name: 'Emmie - Email Manager',
    description: 'Email automation and campaign management',
    status: 'active',
    tags: ['email', 'marketing', 'automation'],
    statusBadge: 'success',
    owner: 'System',
    lastModified: new Date().toISOString(),
    createdAt: '2025-01-01T00:00:00Z',
    metrics: {
      successRate: 99.1,
      errorRate: 0.9,
      runtime: 890,
      requests: 4567
    }
  },
  {
    id: 'card-aura',
    name: 'Aura - Workflow Orchestrator',
    description: 'Intelligent workflow automation and orchestration',
    status: 'active',
    tags: ['workflows', 'automation', 'orchestration'],
    statusBadge: 'success',
    owner: 'System',
    lastModified: new Date().toISOString(),
    createdAt: '2025-01-01T00:00:00Z',
    metrics: {
      successRate: 97.8,
      errorRate: 2.2,
      runtime: 1567,
      requests: 2345
    }
  },
  {
    id: 'card-integration-slack',
    name: 'Slack Integration',
    description: 'Real-time notifications and team collaboration',
    status: 'pending',
    tags: ['integration', 'slack', 'communication'],
    statusBadge: 'warning',
    owner: 'Admin',
    lastModified: new Date(Date.now() - 3600000).toISOString(),
    createdAt: '2025-01-10T00:00:00Z'
  },
  {
    id: 'card-backup-service',
    name: 'Automated Backup Service',
    description: 'Daily backup and disaster recovery system',
    status: 'stopped',
    tags: ['backup', 'maintenance', 'infrastructure'],
    statusBadge: 'error',
    owner: 'DevOps',
    lastModified: new Date(Date.now() - 86400000).toISOString(),
    createdAt: '2024-12-15T00:00:00Z'
  }
];

// Mock activity log
let activityLog: ActivityEntry[] = [
  {
    id: 'activity-1',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    user: 'System',
    action: 'updated',
    target: 'Dexter - Data Analyst',
    fromStatus: 'pending',
    toStatus: 'active'
  },
  {
    id: 'activity-2',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    user: 'Admin',
    action: 'created',
    target: 'Slack Integration'
  },
  {
    id: 'activity-3',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    user: 'DevOps',
    action: 'updated',
    target: 'Automated Backup Service',
    fromStatus: 'active',
    toStatus: 'stopped'
  },
  {
    id: 'activity-4',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    user: 'System',
    action: 'updated',
    target: 'Cassie - Customer Support',
    fromStatus: 'pending',
    toStatus: 'active'
  }
];

/**
 * GET /api/board
 * Returns all board cards and statistics
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    logger.info('Fetching board data');

    // Calculate stats
    const activeCards = boardCards.filter(c => c.status === 'active');
    const inactiveCards = boardCards.filter(c => c.status === 'stopped' || c.status === 'archived');

    // Count incidents in last 24h (cards with error badge or stopped status)
    const incidents24h = activityLog.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      const oneDayAgo = Date.now() - 86400000;
      return entryTime > oneDayAgo && (entry.action === 'updated' && entry.toStatus === 'stopped');
    }).length;

    // Calculate overall success rate
    const cardsWithMetrics = boardCards.filter(c => c.metrics);
    const avgSuccessRate = cardsWithMetrics.length > 0
      ? cardsWithMetrics.reduce((sum, c) => sum + (c.metrics?.successRate || 0), 0) / cardsWithMetrics.length
      : 0;

    const stats = {
      activeAgents: activeCards.length,
      inactiveAgents: inactiveCards.length,
      incidents24h,
      successRate: Math.round(avgSuccessRate * 10) / 10
    };

    return res.status(200).json({
      cards: boardCards,
      stats
    });
  } catch (error) {
    logger.error('Failed to fetch board data:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/board/activity
 * Returns activity log entries
 */
router.get('/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const { since } = req.query;
    logger.info(`Fetching board activity (since: ${since})`);

    let filteredActivity = [...activityLog];

    // Filter by time if provided
    if (since === '24h') {
      const oneDayAgo = Date.now() - 86400000;
      filteredActivity = activityLog.filter(entry => {
        return new Date(entry.timestamp).getTime() > oneDayAgo;
      });
    }

    // Sort by timestamp (newest first)
    filteredActivity.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return res.status(200).json({
      activities: filteredActivity
    });
  } catch (error) {
    logger.error('Failed to fetch board activity:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/board/:cardId
 * Updates a board card (e.g., status change)
 */
router.put('/:cardId', authenticate, async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const { status } = req.body;

    logger.info(`Updating card ${cardId} to status ${status}`);

    const cardIndex = boardCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return res.status(404).json({
        error: 'Card not found'
      });
    }

    const card = boardCards[cardIndex];
    const oldStatus = card.status;

    // Update card
    boardCards[cardIndex] = {
      ...card,
      status,
      lastModified: new Date().toISOString(),
      statusBadge: status === 'active' ? 'success' :
                   status === 'pending' ? 'warning' : 'error'
    };

    // Add activity entry
    const user = (req as any).user?.email || 'User';
    activityLog.unshift({
      id: `activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      action: 'updated',
      target: card.name,
      fromStatus: oldStatus,
      toStatus: status
    });

    // Keep only last 50 activity entries
    if (activityLog.length > 50) {
      activityLog = activityLog.slice(0, 50);
    }

    return res.status(200).json({
      success: true,
      card: boardCards[cardIndex]
    });
  } catch (error) {
    logger.error('Failed to update card:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/board/:cardId
 * Deletes a board card
 */
router.delete('/:cardId', authenticate, async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;

    logger.info(`Deleting card ${cardId}`);

    const cardIndex = boardCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return res.status(404).json({
        error: 'Card not found'
      });
    }

    const card = boardCards[cardIndex];

    // Remove card
    boardCards.splice(cardIndex, 1);

    // Add activity entry
    const user = (req as any).user?.email || 'User';
    activityLog.unshift({
      id: `activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      action: 'deleted',
      target: card.name
    });

    // Keep only last 50 activity entries
    if (activityLog.length > 50) {
      activityLog = activityLog.slice(0, 50);
    }

    return res.status(200).json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete card:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as boardRouter };
