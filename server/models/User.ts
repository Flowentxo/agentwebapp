/**
 * User Model
 * Defines user structure and database schema
 */

export interface User {
  id: string
  email: string
  password: string // Hashed
  name: string
  role: 'admin' | 'user'
  assignedAgents: string[] // Agent IDs
  createdAt: string
  updatedAt: string
}

export interface UserCreateInput {
  email: string
  password: string
  name: string
  role: 'admin' | 'user'
}

export interface UserUpdateInput {
  email?: string
  password?: string
  name?: string
  role?: 'admin' | 'user'
  assignedAgents?: string[]
}

export interface UserResponse {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  assignedAgents: string[]
  createdAt: string
  updatedAt: string
}

// Remove password from user object
export function sanitizeUser(user: User): UserResponse {
  const { password, ...sanitized } = user
  return sanitized
}
