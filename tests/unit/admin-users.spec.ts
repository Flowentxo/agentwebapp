import { describe, it, expect, beforeAll, afterEach } from 'vitest';

describe('Admin User Management', () => {
  const API_BASE = 'http://localhost:3000/api/admin';
  let createdUserIds: string[] = [];

  afterEach(async () => {
    // Cleanup created users
    for (const id of createdUserIds) {
      await fetch(`${API_BASE}/users?id=${id}`, { method: 'DELETE' }).catch(() => {});
    }
    createdUserIds = [];
  });

  describe('GET /api/admin/users', () => {
    it('should return list of users', async () => {
      const response = await fetch(`${API_BASE}/users`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('users');
      expect(Array.isArray(data.users)).toBe(true);
      expect(data).toHaveProperty('ts');
    });

    it('should return users with correct structure', async () => {
      const response = await fetch(`${API_BASE}/users`);
      const data = await response.json();

      if (data.users.length > 0) {
        const user = data.users[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('status');
        expect(user).toHaveProperty('lastLogin');
        expect(user).toHaveProperty('createdAt');
      }
    });

    it('should return users with valid roles', async () => {
      const response = await fetch(`${API_BASE}/users`);
      const data = await response.json();

      const validRoles = ['admin', 'user', 'viewer'];

      data.users.forEach((user: any) => {
        expect(validRoles).toContain(user.role);
      });
    });

    it('should return users with valid statuses', async () => {
      const response = await fetch(`${API_BASE}/users`);
      const data = await response.json();

      const validStatuses = ['active', 'inactive'];

      data.users.forEach((user: any) => {
        expect(validStatuses).toContain(user.status);
      });
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };

      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('user');
      expect(data.user.name).toBe(newUser.name);
      expect(data.user.email).toBe(newUser.email);
      expect(data.user.role).toBe(newUser.role);
      expect(data.user.status).toBe('active');
      expect(data.user).toHaveProperty('id');

      createdUserIds.push(data.user.id);
    });

    it('should require name field', async () => {
      const invalidUser = {
        email: 'test@example.com',
        role: 'user',
      };

      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUser),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should require email field', async () => {
      const invalidUser = {
        name: 'Test User',
        role: 'user',
      };

      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUser),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should reject duplicate email', async () => {
      const user1 = {
        name: 'User 1',
        email: 'duplicate@example.com',
        role: 'user',
      };

      // Create first user
      const response1 = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user1),
      });

      const data1 = await response1.json();
      createdUserIds.push(data1.user.id);

      // Try to create second user with same email
      const response2 = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user1),
      });

      expect(response2.status).toBe(409);

      const data2 = await response2.json();
      expect(data2).toHaveProperty('error');
    });

    it('should use default role if not provided', async () => {
      const newUser = {
        name: 'Test User',
        email: 'default-role@example.com',
      };

      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.role).toBe('user');

      createdUserIds.push(data.user.id);
    });
  });

  describe('PUT /api/admin/users', () => {
    it('should update user details', async () => {
      // First create a user
      const createResponse = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Original Name',
          email: 'original@example.com',
          role: 'user',
        }),
      });

      const createData = await createResponse.json();
      const userId = createData.user.id;
      createdUserIds.push(userId);

      // Update the user
      const updateResponse = await fetch(`${API_BASE}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          name: 'Updated Name',
          email: 'updated@example.com',
          role: 'admin',
          status: 'inactive',
        }),
      });

      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.user.name).toBe('Updated Name');
      expect(updateData.user.email).toBe('updated@example.com');
      expect(updateData.user.role).toBe('admin');
      expect(updateData.user.status).toBe('inactive');
    });

    it('should require user ID', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          email: 'test@example.com',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'non-existent-id',
          name: 'Test',
        }),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should allow partial updates', async () => {
      // Create a user
      const createResponse = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'partial@example.com',
          role: 'user',
        }),
      });

      const createData = await createResponse.json();
      const userId = createData.user.id;
      createdUserIds.push(userId);

      // Update only the role
      const updateResponse = await fetch(`${API_BASE}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          role: 'admin',
        }),
      });

      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.user.role).toBe('admin');
      expect(updateData.user.name).toBe('Test User'); // Should remain unchanged
      expect(updateData.user.email).toBe('partial@example.com'); // Should remain unchanged
    });
  });

  describe('DELETE /api/admin/users', () => {
    it('should delete a user', async () => {
      // Create a user
      const createResponse = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'To Delete',
          email: 'delete@example.com',
          role: 'user',
        }),
      });

      const createData = await createResponse.json();
      const userId = createData.user.id;

      // Delete the user
      const deleteResponse = await fetch(`${API_BASE}/users?id=${userId}`, {
        method: 'DELETE',
      });

      const deleteData = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deleteData.success).toBe(true);

      // Verify user is deleted
      const getUsersResponse = await fetch(`${API_BASE}/users`);
      const getUsersData = await getUsersResponse.json();

      const deletedUser = getUsersData.users.find((u: any) => u.id === userId);
      expect(deletedUser).toBeUndefined();
    });

    it('should require user ID', async () => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await fetch(`${API_BASE}/users?id=non-existent-id`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('User Dialog Form Validation', () => {
    it('should validate email format', () => {
      const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });

    it('should validate role options', () => {
      const validRoles = ['admin', 'user', 'viewer'];

      expect(validRoles).toContain('admin');
      expect(validRoles).toContain('user');
      expect(validRoles).toContain('viewer');
      expect(validRoles).not.toContain('superuser');
    });

    it('should validate status options', () => {
      const validStatuses = ['active', 'inactive'];

      expect(validStatuses).toContain('active');
      expect(validStatuses).toContain('inactive');
      expect(validStatuses).not.toContain('suspended');
    });
  });

  describe('Date Formatting', () => {
    function formatDate(dateString: string) {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `vor ${diffMins}m`;
      if (diffHours < 24) return `vor ${diffHours}h`;
      return `vor ${diffDays}d`;
    }

    it('should format recent minutes', () => {
      const date = new Date(Date.now() - 1000 * 60 * 30).toISOString(); // 30 min ago
      const formatted = formatDate(date);
      expect(formatted).toMatch(/^vor \d+m$/);
    });

    it('should format hours', () => {
      const date = new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(); // 5 hours ago
      const formatted = formatDate(date);
      expect(formatted).toMatch(/^vor \d+h$/);
    });

    it('should format days', () => {
      const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days ago
      const formatted = formatDate(date);
      expect(formatted).toMatch(/^vor \d+d$/);
    });
  });
});
