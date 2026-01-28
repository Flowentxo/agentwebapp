/**
 * Authentication Routes
 * Handles login, register, and user info endpoints
 */

import { Router } from 'express'
import { getUserService } from '../services/UserService'
import { generateToken } from '../utils/jwt'
import { authenticate, requireAdmin } from '../middleware/authMiddleware'
import { logger } from '../utils/logger'

export const authRouter = Router()
const userService = getUserService() // Singleton instance

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    logger.info('🔐 === LOGIN ATTEMPT ===')
    logger.info(`   📧 Email: ${email}`)
    logger.info(`   🔑 Password length: ${password?.length || 0}`)

    if (!email || !password) {
      logger.warn('❌ Login failed: Missing email or password')
      return res.status(400).json({ error: 'Email and password required' })
    }

    // Find user
    logger.info('🔍 Step 1: Looking up user...')
    const user = await userService.getUserByEmail(email)

    if (!user) {
      logger.warn(`❌ Login failed: User not found for ${email}`)
      logger.info(`   💡 Hint: Check if user exists in database`)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    logger.info('✅ Step 1 complete: User found')

    // Verify password
    logger.info('🔐 Step 2: Verifying password...')
    const isValid = await userService.verifyPassword(password, user.password)

    if (!isValid) {
      logger.warn(`❌ Login failed: Invalid password for ${email}`)
      logger.info(`   🔑 Password entered: ${password}`)
      logger.info(`   🔒 Hash in database: ${user.password.substring(0, 30)}...`)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    logger.info('✅ Step 2 complete: Password verified')

    // Generate JWT token
    logger.info('🎫 Step 3: Generating JWT token...')
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    logger.info('✅ Step 3 complete: Token generated')

    // Set HTTP-only cookie
    logger.info('🍪 Step 4: Setting authentication cookie...')
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    logger.info('✅ Step 4 complete: Cookie set')

    // Return user info (without password)
    const { password: _, ...userWithoutPassword } = user

    logger.info('🎉 === LOGIN SUCCESSFUL ===')
    logger.info(`   👤 User: ${email}`)
    logger.info(`   🆔 ID: ${user.id}`)
    logger.info(`   👔 Role: ${user.role}`)

    res.json({
      message: 'Login successful',
      user: userWithoutPassword
    })
  } catch (error: any) {
    logger.error('💥 === LOGIN EXCEPTION ===')
    logger.error(`   Error: ${error.message}`)
    logger.error(`   Stack: ${error.stack}`)
    res.status(500).json({ error: 'Login failed' })
  }
})

/**
 * POST /auth/register
 * Register new user (admin only)
 */
authRouter.post('/register', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' })
    }

    // Create user
    const newUser = await userService.createUser({
      email,
      password,
      name,
      role: role || 'user'
    })

    logger.info(`New user created: ${email} (${role})`)

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    })
  } catch (error: any) {
    logger.error('Registration error:', error)
    res.status(400).json({ error: error.message || 'Registration failed' })
  }
})

/**
 * GET /auth/me
 * Get current user info
 */
authRouter.get('/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const user = userService.getUserById(req.user.userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    logger.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to get user info' })
  }
})

/**
 * POST /auth/logout
 * Clear authentication cookie
 */
authRouter.post('/logout', (req, res) => {
  res.clearCookie('token')
  logger.info('User logged out')
  res.json({ message: 'Logout successful' })
})

/**
 * GET /auth/check
 * Check if user is authenticated (no auth required)
 */
authRouter.get('/check', (req, res) => {
  const token = req.cookies?.token
  res.json({ authenticated: !!token })
})
