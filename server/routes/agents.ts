import { Router } from 'express'
import { IntegratedAgentService } from '../services/IntegratedAgentService'
import { logger } from '../utils/logger'

export const agentRouter = Router()
const agentService = new IntegratedAgentService()

// GET all agents
agentRouter.get('/', async (req, res) => {
  try {
    const agents = await agentService.getAllAgents()
    res.json(agents)
  } catch (error) {
    logger.error('Error fetching agents:', error)
    res.status(500).json({ error: 'Failed to fetch agents' })
  }
})

// GET agent by ID
agentRouter.get('/:id', async (req, res) => {
  try {
    const agent = await agentService.getAgentById(req.params.id)
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }
    res.json(agent)
  } catch (error) {
    logger.error('Error fetching agent:', error)
    res.status(500).json({ error: 'Failed to fetch agent' })
  }
})

// POST start agent
agentRouter.post('/:id/start', async (req, res) => {
  try {
    const agent = await agentService.startAgent(req.params.id)
    logger.info(`Agent ${req.params.id} started`)
    res.json(agent)
  } catch (error) {
    logger.error('Error starting agent:', error)
    res.status(500).json({ error: 'Failed to start agent' })
  }
})

// POST stop agent
agentRouter.post('/:id/stop', async (req, res) => {
  try {
    const agent = await agentService.stopAgent(req.params.id)
    logger.info(`Agent ${req.params.id} stopped`)
    res.json(agent)
  } catch (error) {
    logger.error('Error stopping agent:', error)
    res.status(500).json({ error: 'Failed to stop agent' })
  }
})

// POST restart agent
agentRouter.post('/:id/restart', async (req, res) => {
  try {
    const agent = await agentService.restartAgent(req.params.id)
    logger.info(`Agent ${req.params.id} restarted`)
    res.json(agent)
  } catch (error) {
    logger.error('Error restarting agent:', error)
    res.status(500).json({ error: 'Failed to restart agent' })
  }
})

// GET agent logs
agentRouter.get('/:id/logs', async (req, res) => {
  try {
    const logs = await agentService.getAgentLogs(req.params.id)
    res.json(logs)
  } catch (error) {
    logger.error('Error fetching logs:', error)
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// PUT update agent config
agentRouter.put('/:id/config', async (req, res) => {
  try {
    const agent = await agentService.updateAgentConfig(req.params.id, req.body)
    logger.info(`Agent ${req.params.id} config updated`)
    res.json(agent)
  } catch (error) {
    logger.error('Error updating config:', error)
    res.status(500).json({ error: 'Failed to update config' })
  }
})

// GET system metrics
agentRouter.get('/system/metrics', async (req, res) => {
  try {
    const metrics = await agentService.getSystemMetrics()
    res.json(metrics)
  } catch (error) {
    logger.error('Error fetching metrics:', error)
    res.status(500).json({ error: 'Failed to fetch metrics' })
  }
})

