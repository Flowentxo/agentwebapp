/**
 * User Service - Domain-Driven Design Refactored Version
 * 
 * Key Improvements:
 * 1. Domain-based organization (core/user domain)
 * 2. Proper dependency injection
 * 3. Repository pattern for data access
 * 4. Better error handling with custom error types
 * 5. Comprehensive logging
 * 6. Improved TypeScript types
 */

import bcrypt from 'bcryptjs';
import { injectable, singleton } from 'tsyringe';
import { Logger } from '../../../shared/utils/logger';
import { ValidationError, NotFoundError, ConflictError } from '../../../shared/errors/ApplicationError';
import { UserRepository } from './UserRepository';
import { User, UserCreateInput, UserUpdateInput, UserResponse, UserRole } from './types';

export interface IUserService {
  createUser(input: UserCreateInput): Promise<UserResponse>;
  getUserById(userId: string): Promise<UserResponse>;
  getUserByEmail(email: string): Promise<User>;
  updateUser(userId: string, updates: UserUpdateInput): Promise<UserResponse>;
  deleteUser(userId: string): Promise<void>;
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
  assignAgentsToUser(userId: string, agentIds: string[]): Promise<UserResponse>;
  canUserAccessAgent(userId: string, agentId: string): Promise<boolean>;
}

@injectable()
@singleton()
export class UserService implements IUserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {
    this.logger.info('UserService initialized with dependency injection');
  }

  /**
   * Create a new user with validation and business logic
   */
  async createUser(input: UserCreateInput): Promise<UserResponse> {
    try {
      // Input validation
      this.validateUserInput(input);

      // Check for existing user
      const existingUser = await this.userRepository.findByEmail(input.email);
      if (existingUser) {
        throw new ConflictError(`User with email ${input.email} already exists`);
      }

      // Hash password
      const hashedPassword = await this.hashPassword(input.password);

      // Create user entity
      const user: User = {
        id: this.generateUserId(),
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: input.role || 'user',
        assignedAgents: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
          loginCount: 0
        },
        settings: {
          notificationsEnabled: true,
          theme: 'dark',
          language: 'en'
        }
      };

      // Save to repository
      const savedUser = await this.userRepository.save(user);
      
      this.logger.info(`User created successfully`, {
        userId: savedUser.id,
        email: savedUser.email,
        role: savedUser.role
      });

      return this.mapToResponse(savedUser);
    } catch (error) {
      this.logger.error('Failed to create user', { error, input: { email: input.email } });
      throw error;
    }
  }

  /**
   * Get user by ID with proper error handling
   */
  async getUserById(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return this.mapToResponse(user);
  }

  /**
   * Get user by email (full entity, includes password)
   * Used for authentication purposes
   */
  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      throw new NotFoundError(`User with email ${email} not found`);
    }

    this.logger.debug('User retrieved by email', {
      userId: user.id,
      email: user.email,
      hasPassword: !!user.password
    });

    return user;
  }

  /**
   * Update user with validation and business logic
   */
  async updateUser(userId: string, updates: UserUpdateInput): Promise<UserResponse> {
    try {
      // Get existing user
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      // Validate updates
      this.validateUserUpdate(updates, existingUser);

      // Check email uniqueness if changing email
      if (updates.email && updates.email !== existingUser.email) {
        const emailExists = await this.userRepository.findByEmail(updates.email);
        if (emailExists) {
          throw new ConflictError(`Email ${updates.email} already in use`);
        }
      }

      // Hash password if being updated
      let hashedPassword = existingUser.password;
      if (updates.password) {
        hashedPassword = await this.hashPassword(updates.password);
      }

      // Apply updates
      const updatedUser: User = {
        ...existingUser,
        ...updates,
        password: hashedPassword,
        metadata: {
          ...existingUser.metadata,
          updatedAt: new Date()
        }
      };

      // Save updated user
      const savedUser = await this.userRepository.save(updatedUser);
      
      this.logger.info(`User updated successfully`, {
        userId: savedUser.id,
        updatedFields: Object.keys(updates)
      });

      return this.mapToResponse(savedUser);
    } catch (error) {
      this.logger.error('Failed to update user', { error, userId, updates });
      throw error;
    }
  }

  /**
   * Delete user with proper cleanup
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    await this.userRepository.delete(userId);
    
    this.logger.info(`User deleted successfully`, {
      userId,
      email: user.email
    });
  }

  /**
   * Verify password with secure comparison
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      
      this.logger.debug('Password verification result', {
        isValid,
        passwordLength: plainPassword.length
      });

      return isValid;
    } catch (error) {
      this.logger.error('Password verification failed', { error });
      return false;
    }
  }

  /**
   * Assign agents to user with validation
   */
  async assignAgentsToUser(userId: string, agentIds: string[]): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Validate agent IDs (in real implementation, would check against agent service)
    const validAgentIds = agentIds.filter(id => this.isValidAgentId(id));
    
    const updatedUser: User = {
      ...user,
      assignedAgents: [...new Set([...user.assignedAgents, ...validAgentIds])],
      metadata: {
        ...user.metadata,
        updatedAt: new Date()
      }
    };

    const savedUser = await this.userRepository.save(updatedUser);
    
    this.logger.info('Agents assigned to user', {
      userId,
      assignedAgents: savedUser.assignedAgents.length,
      newAgents: validAgentIds.length
    });

    return this.mapToResponse(savedUser);
  }

  /**
   * Check if user has access to specific agent
   */
  async canUserAccessAgent(userId: string, agentId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      this.logger.warn('Access check failed: User not found', { userId });
      return false;
    }

    // Admins have access to all agents
    if (user.role === 'admin') {
      this.logger.debug('Admin access granted', { userId, agentId });
      return true;
    }

    // Regular users only have access to assigned agents
    const hasAccess = user.assignedAgents.includes(agentId);
    
    this.logger.debug('User access check result', {
      userId,
      agentId,
      hasAccess,
      assignedAgents: user.assignedAgents
    });

    return hasAccess;
  }

  // Private helper methods
  private validateUserInput(input: UserCreateInput): void {
    if (!input.email || !input.email.includes('@')) {
      throw new ValidationError('Invalid email address');
    }

    if (!input.password || input.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }
  }

  private validateUserUpdate(updates: UserUpdateInput, existingUser: User): void {
    if (updates.email && !updates.email.includes('@')) {
      throw new ValidationError('Invalid email address');
    }

    if (updates.password && updates.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Prevent role escalation (in real app, would check permissions)
    if (updates.role && updates.role === 'admin' && existingUser.role !== 'admin') {
      throw new ValidationError('Cannot assign admin role without proper permissions');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10; // Increased from 6 for better security
    return await bcrypt.hash(password, saltRounds);
  }

  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  private isValidAgentId(agentId: string): boolean {
    // In real implementation, would validate against agent service
    return agentId.startsWith('agent-') && agentId.length > 10;
  }

  private mapToResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      assignedAgents: user.assignedAgents,
      metadata: user.metadata,
      settings: user.settings
    };
  }

  /**
   * Business method: Get user statistics
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    byRole: Record<UserRole, number>;
    activeUsers: number;
  }> {
    const users = await this.userRepository.findAll();
    
    const byRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<UserRole, number>);

    const activeUsers = users.filter(user => 
      user.metadata.lastLoginAt && 
      new Date(user.metadata.lastLoginAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
    ).length;

    return {
      totalUsers: users.length,
      byRole,
      activeUsers
    };
  }

  /**
   * Business method: Update user last login
   */
  async recordUserLogin(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    
    if (user) {
      user.metadata.lastLoginAt = new Date();
      user.metadata.loginCount = (user.metadata.loginCount || 0) + 1;
      
      await this.userRepository.save(user);
      
      this.logger.debug('User login recorded', {
        userId,
        loginCount: user.metadata.loginCount
      });
    }
  }
}

// Factory function for dependency injection
export const createUserService = (
  userRepository: UserRepository,
  logger: Logger
): IUserService => {
  return new UserService(userRepository, logger);
};