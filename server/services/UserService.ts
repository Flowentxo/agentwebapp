/**
 * User Service - SINGLETON PATTERN
 * Handles user CRUD operations and authentication
 *
 * CRITICAL: This MUST be a singleton to prevent multiple instances
 * with separate in-memory stores, which causes login failures.
 */

import bcrypt from 'bcryptjs'
import { User, UserCreateInput, UserUpdateInput, UserResponse, sanitizeUser } from '../models/User'
import { logger } from '../utils/logger'

export class UserService {
  private static instance: UserService | null = null
  private users: Map<string, User> = new Map()
  private initialized: boolean = false

  private constructor() {
    // Private constructor to enforce singleton
    logger.info('🔐 UserService singleton instance created')
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
      // Initialize default admin on first access
      UserService.instance.initializeDefaultAdmin()
    }
    return UserService.instance
  }

  /**
   * Initialize default admin user
   * This runs ONCE when the singleton is first created
   */
  private async initializeDefaultAdmin() {
    if (this.initialized) {
      logger.warn('⚠️  Admin already initialized, skipping')
      return
    }

    try {
      const adminId = 'admin-001'
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@localhost'
      const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123'

      // Check if admin already exists
      const existingAdmin = Array.from(this.users.values()).find(u => u.email === adminEmail)
      if (existingAdmin) {
        logger.info('✅ Default admin user already exists')
        this.initialized = true
        return
      }

      // Hash password with bcrypt (salt rounds: 6 for faster performance)
      const hashedPassword = await bcrypt.hash(adminPassword, 6)

      const adminUser: User = {
        id: adminId,
        email: adminEmail,
        password: hashedPassword,
        name: 'System Administrator',
        role: 'admin',
        assignedAgents: [], // Admin has access to all agents
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      this.users.set(adminId, adminUser)
      this.initialized = true

      logger.info('✅ Default admin user created successfully')
      logger.info(`   📧 Email: ${adminEmail}`)
      logger.info(`   🔑 Password: ${adminPassword}`)
      logger.info(`   🔒 Hash: ${hashedPassword.substring(0, 20)}...`)
      logger.info(`   👤 User ID: ${adminId}`)
      logger.info(`   📊 Total users in store: ${this.users.size}`)
    } catch (error: any) {
      logger.error(`❌ Failed to initialize default admin: ${error.message}`)
      throw error
    }
  }

  /**
   * Create a new user
   */
  async createUser(input: UserCreateInput): Promise<UserResponse> {
    try {
      // Check if email already exists
      const existingUser = Array.from(this.users.values()).find(u => u.email === input.email)
      if (existingUser) {
        logger.warn(`⚠️  User creation failed: Email ${input.email} already exists`)
        throw new Error('Email already exists')
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 6)
      logger.info(`🔐 Password hashed for new user: ${input.email}`)

      // Create new user
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newUser: User = {
        id: userId,
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: input.role,
        assignedAgents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      this.users.set(userId, newUser)
      logger.info(`✅ User created successfully: ${input.email} (${userId})`)
      logger.info(`   📊 Total users in store: ${this.users.size}`)

      return sanitizeUser(newUser)
    } catch (error: any) {
      logger.error(`❌ User creation failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): UserResponse | null {
    const user = this.users.get(userId)
    if (!user) {
      logger.warn(`⚠️  User not found by ID: ${userId}`)
      return null
    }
    return sanitizeUser(user)
  }

  /**
   * Get user by email (for login) - RETURNS FULL USER WITH PASSWORD
   */
  async getUserByEmail(email: string): Promise<User | null> {
    logger.info(`🔍 Looking up user by email: ${email}`)
    logger.info(`   📊 Total users in store: ${this.users.size}`)

    const user = Array.from(this.users.values()).find(u => u.email === email)

    if (!user) {
      logger.warn(`⚠️  User not found: ${email}`)
      logger.info(`   Available users: ${Array.from(this.users.values()).map(u => u.email).join(', ')}`)
      return null
    }

    logger.info(`✅ User found: ${email} (${user.id})`)
    logger.info(`   🔒 Has password hash: ${user.password ? 'YES' : 'NO'}`)
    logger.info(`   🔒 Hash preview: ${user.password?.substring(0, 20)}...`)

    return user
  }

  /**
   * Get all users
   */
  getAllUsers(): UserResponse[] {
    const users = Array.from(this.users.values()).map(sanitizeUser)
    logger.info(`📊 Retrieved ${users.length} users`)
    return users
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: UserUpdateInput): Promise<UserResponse> {
    try {
      const user = this.users.get(userId)
      if (!user) {
        logger.warn(`⚠️  Update failed: User ${userId} not found`)
        throw new Error('User not found')
      }

      // Check if email is being changed and already exists
      if (updates.email && updates.email !== user.email) {
        const existingUser = Array.from(this.users.values()).find(u => u.email === updates.email)
        if (existingUser) {
          logger.warn(`⚠️  Update failed: Email ${updates.email} already exists`)
          throw new Error('Email already exists')
        }
      }

      // Hash password if being updated
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 6)
        logger.info(`🔐 Password updated for user: ${user.email}`)
      }

      // Update user
      const updatedUser: User = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString()
      }

      this.users.set(userId, updatedUser)
      logger.info(`✅ User updated successfully: ${updatedUser.email} (${userId})`)

      return sanitizeUser(updatedUser)
    } catch (error: any) {
      logger.error(`❌ User update failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): boolean {
    const user = this.users.get(userId)
    if (!user) {
      logger.warn(`⚠️  Delete failed: User ${userId} not found`)
      return false
    }

    const deleted = this.users.delete(userId)
    if (deleted) {
      logger.info(`✅ User deleted successfully: ${user.email} (${userId})`)
      logger.info(`   📊 Total users remaining: ${this.users.size}`)
    }
    return deleted
  }

  /**
   * Verify password - CRITICAL FOR LOGIN
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      logger.info('🔐 Verifying password...')
      logger.info(`   Plain password length: ${plainPassword.length}`)
      logger.info(`   Hash preview: ${hashedPassword.substring(0, 20)}...`)

      const isValid = await bcrypt.compare(plainPassword, hashedPassword)

      if (isValid) {
        logger.info('✅ Password verification: SUCCESS')
      } else {
        logger.warn('❌ Password verification: FAILED')
      }

      return isValid
    } catch (error: any) {
      logger.error(`❌ Password verification error: ${error.message}`)
      return false
    }
  }

  /**
   * Assign agents to user
   */
  async assignAgentsToUser(userId: string, agentIds: string[]): Promise<UserResponse> {
    const user = this.users.get(userId)
    if (!user) {
      logger.warn(`⚠️  Agent assignment failed: User ${userId} not found`)
      throw new Error('User not found')
    }

    user.assignedAgents = agentIds
    user.updatedAt = new Date().toISOString()

    this.users.set(userId, user)
    logger.info(`✅ Agents assigned to user ${user.email}: ${agentIds.join(', ')}`)

    return sanitizeUser(user)
  }

  /**
   * Check if user has access to agent
   */
  canUserAccessAgent(userId: string, agentId: string): boolean {
    const user = this.users.get(userId)
    if (!user) {
      logger.warn(`⚠️  Access check failed: User ${userId} not found`)
      return false
    }

    // Admins have access to all agents
    if (user.role === 'admin') {
      logger.info(`✅ Admin access granted: ${user.email} → ${agentId}`)
      return true
    }

    // Regular users only have access to assigned agents
    const hasAccess = user.assignedAgents.includes(agentId)
    if (hasAccess) {
      logger.info(`✅ User access granted: ${user.email} → ${agentId}`)
    } else {
      logger.warn(`⚠️  User access denied: ${user.email} → ${agentId}`)
    }
    return hasAccess
  }

  /**
   * Debug: Get user store info
   */
  getStoreInfo(): { totalUsers: number; users: string[] } {
    return {
      totalUsers: this.users.size,
      users: Array.from(this.users.values()).map(u => `${u.email} (${u.id})`)
    }
  }
}

// Export singleton instance getter
export const getUserService = () => UserService.getInstance()
