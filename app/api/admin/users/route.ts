import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { users, userRoles, sessions } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { adminAuditService, ADMIN_ACTIONS } from "@/server/services/AdminAuditService";
import { hashPassword } from "@/lib/auth/crypto";
import { eq, desc, sql, and, gt, isNull } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * Get all users with their roles and session info
 * Requires admin role
 */
export async function GET(request: Request) {
  try {
    // Require admin session
    await requireSession({ requireRoles: ['admin'] });

    const db = getDb();

    // Get all users with their roles
    const usersData = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        isActive: users.isActive,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        avatarUrl: users.avatarUrl,
        mfaEnabled: users.mfaEnabled,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get roles for each user
    const rolesData = await db
      .select({
        userId: userRoles.userId,
        role: userRoles.role,
      })
      .from(userRoles);

    // Get active session counts
    const now = new Date();
    const sessionCounts = await db
      .select({
        userId: sessions.userId,
        count: sql<number>`count(*)`,
      })
      .from(sessions)
      .where(
        and(
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now)
        )
      )
      .groupBy(sessions.userId);

    // Build user map with roles
    const rolesByUser: Record<string, string[]> = {};
    rolesData.forEach(r => {
      if (!rolesByUser[r.userId]) {
        rolesByUser[r.userId] = [];
      }
      rolesByUser[r.userId].push(r.role);
    });

    // Build session count map
    const sessionsByUser: Record<string, number> = {};
    sessionCounts.forEach(s => {
      sessionsByUser[s.userId] = Number(s.count);
    });

    // Transform users for frontend
    const transformedUsers = usersData.map(user => ({
      id: user.id,
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      role: rolesByUser[user.id]?.includes('admin') ? 'admin' :
            rolesByUser[user.id]?.includes('editor') ? 'editor' :
            rolesByUser[user.id]?.includes('reviewer') ? 'reviewer' : 'user',
      roles: rolesByUser[user.id] || ['user'],
      status: user.isActive ? 'active' : 'inactive',
      emailVerified: !!user.emailVerifiedAt,
      activeSessions: sessionsByUser[user.id] || 0,
      mfaEnabled: user.mfaEnabled,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      users: transformedUsers,
      total: transformedUsers.length,
      ts: Date.now(),
    });
  } catch (error: any) {
    console.error('[ADMIN_USERS_GET]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Create a new user
 * Requires admin role
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession({ requireRoles: ['admin'] });

    const body = await request.json();
    const { name, email, password, role = "user" } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if user already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`)
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        displayName: name,
        passwordHash,
        isActive: true,
      })
      .returning();

    // Add role
    await db.insert(userRoles).values({
      userId: newUser.id,
      role: role as 'user' | 'editor' | 'reviewer' | 'admin',
    });

    // Log audit
    await adminAuditService.log({
      userId: session.user.id,
      userEmail: session.user.email,
      action: ADMIN_ACTIONS.USER_CREATE,
      category: 'user',
      targetType: 'user',
      targetId: newUser.id,
      targetName: email,
      description: `Created user ${email} with role ${role}`,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      user: {
        id: newUser.id,
        name: newUser.displayName,
        email: newUser.email,
        role,
        status: 'active',
        createdAt: newUser.createdAt.toISOString(),
      },
      ts: Date.now(),
    }, { status: 201 });
  } catch (error: any) {
    console.error('[ADMIN_USERS_POST]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/users
 * Update a user
 * Requires admin role
 */
export async function PUT(request: Request) {
  try {
    const session = await requireSession({ requireRoles: ['admin'] });

    const body = await request.json();
    const { id, name, email, role, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get existing user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name) updates.displayName = name;
    if (email) updates.email = email.toLowerCase();
    if (status !== undefined) updates.isActive = status === 'active';

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    // Update role if changed
    if (role) {
      // Remove old roles
      await db.delete(userRoles).where(eq(userRoles.userId, id));
      // Add new role
      await db.insert(userRoles).values({
        userId: id,
        role: role as 'user' | 'editor' | 'reviewer' | 'admin',
      });
    }

    // Log audit
    await adminAuditService.log({
      userId: session.user.id,
      userEmail: session.user.email,
      action: ADMIN_ACTIONS.USER_UPDATE,
      category: 'user',
      targetType: 'user',
      targetId: id,
      targetName: updatedUser.email,
      description: `Updated user ${updatedUser.email}`,
      previousValue: {
        displayName: existingUser.displayName,
        email: existingUser.email,
        isActive: existingUser.isActive,
      },
      newValue: {
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.displayName,
        email: updatedUser.email,
        role: role || 'user',
        status: updatedUser.isActive ? 'active' : 'inactive',
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
      ts: Date.now(),
    });
  } catch (error: any) {
    console.error('[ADMIN_USERS_PUT]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users?id=...
 * Delete (deactivate) a user
 * Requires admin role
 */
export async function DELETE(request: Request) {
  try {
    const session = await requireSession({ requireRoles: ['admin'] });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get user before deletion
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Soft delete - deactivate user instead of hard delete
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));

    // Revoke all sessions
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, id));

    // Log audit
    await adminAuditService.log({
      userId: session.user.id,
      userEmail: session.user.email,
      action: ADMIN_ACTIONS.USER_DELETE,
      category: 'user',
      targetType: 'user',
      targetId: id,
      targetName: user.email,
      description: `Deactivated user ${user.email} and revoked all sessions`,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} has been deactivated`,
      ts: Date.now(),
    });
  } catch (error: any) {
    console.error('[ADMIN_USERS_DELETE]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
