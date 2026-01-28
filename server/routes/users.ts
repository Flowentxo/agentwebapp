/**
 * User Management Routes
 * Admin-only endpoints for managing users and agent assignments
 *
 * SECURITY: Protected with authentication, admin role, rate limiting
 */

import { Router } from 'express'
import { getUserService } from '../services/UserService'
import { authenticate, requireAdmin, requireAdminIP } from '../middleware/authMiddleware'
import { adminLimiter } from '../middleware/rate-limiter'
import { logger } from '../utils/logger'
import bcrypt from 'bcryptjs'

export const userRouter = Router()
const userService = getUserService() // Singleton instance

// Apply rate limiting to all user management routes
userRouter.use(adminLimiter)

// Public routes for user profile management (require authentication but not admin)
userRouter.put('/update-email', authenticate, async (req, res) => {
  try {
    const { email } = req.body
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const updatedUser = await userService.updateUser(userId, { email })
    logger.info(`User ${userId} updated email to: ${email}`)
    res.json({ user: updatedUser })
  } catch (error: any) {
    logger.error('Update email error:', error)
    res.status(400).json({ error: error.message || 'Failed to update email' })
  }
})

userRouter.put('/update-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    // Get user by ID instead of email (email might have changed)
    const userById = userService.getUserById(userId)
    if (!userById) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get full user with password
    const user = await userService.getUserByEmail(userById.email)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify current password
    const isValid = await userService.verifyPassword(currentPassword, user.password)
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await userService.updateUser(userId, { password: hashedPassword })
    logger.info(`User ${userId} updated password`)
    res.json({ message: 'Password updated successfully' })
  } catch (error: any) {
    logger.error('Update password error:', error)
    res.status(400).json({ error: error.message || 'Failed to update password' })
  }
})

// All routes below require admin authentication
userRouter.use(authenticate, requireAdmin)

/**
 * GET /users
 * Get all users
 */
userRouter.get('/', async (req, res) => {
  try {
    const users = userService.getAllUsers()
    res.json({ users })
  } catch (error) {
    logger.error('Get users error:', error)
    res.status(500).json({ error: 'Failed to get users' })
  }
})

/**
 * GET /users/:id
 * Get specific user
 */
userRouter.get('/:id', async (req, res) => {
  try {
    const user = userService.getUserById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ user })
  } catch (error) {
    logger.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to get user' })
  }
})

/**
 * PUT /users/:id
 * Update user
 */
userRouter.put('/:id', async (req, res) => {
  try {
    const { email, name, role } = req.body

    const updatedUser = await userService.updateUser(req.params.id, {
      email,
      name,
      role
    })

    logger.info(`User updated: ${updatedUser.email}`)
    res.json({ user: updatedUser })
  } catch (error: any) {
    logger.error('Update user error:', error)
    res.status(400).json({ error: error.message || 'Failed to update user' })
  }
})

/**
 * DELETE /users/:id
 * Delete user
 */
userRouter.delete('/:id', async (req, res) => {
  try {
    // Prevent deleting yourself
    if (req.user?.userId === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    const deleted = userService.deleteUser(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' })
    }

    logger.info(`User deleted: ${req.params.id}`)
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    logger.error('Delete user error:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

/**
 * GET /users/:id/agents
 * Get user's assigned agents
 */
userRouter.get('/:id/agents', async (req, res) => {
  try {
    const user = userService.getUserById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ assignedAgents: user.assignedAgents })
  } catch (error) {
    logger.error('Get user agents error:', error)
    res.status(500).json({ error: 'Failed to get user agents' })
  }
})

/**
 * PUT /users/:id/agents
 * Update user's assigned agents
 */
userRouter.put('/:id/agents', async (req, res) => {
  try {
    const { agentIds } = req.body

    if (!Array.isArray(agentIds)) {
      return res.status(400).json({ error: 'agentIds must be an array' })
    }

    const updatedUser = await userService.assignAgentsToUser(req.params.id, agentIds)

    logger.info(`Agents assigned to user ${updatedUser.email}: ${agentIds.join(', ')}`)
    res.json({ user: updatedUser })
  } catch (error: any) {
    logger.error('Assign agents error:', error)
    res.status(400).json({ error: error.message || 'Failed to assign agents' })
  }
})
