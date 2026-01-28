/**
 * Account Deletion API
 * DELETE /api/profile/account
 *
 * GDPR-compliant account deletion:
 * - Validates session and password
 * - Deletes all user data
 * - Revokes all sessions
 * - Returns redirect instruction
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import {
  users,
  sessions,
  userRoles,
  userAudit,
  userNotificationPrefs,
  userPasskeys,
  userKnownDevices,
  workspaces,
  agentMessages,
  agentConversations,
  aiUsage,
  integrations,
  brainDocuments,
  brainContexts,
  brainMemories,
  collaborations,
} from '@/lib/db/schema';
import { requireSession, revokeAllUserSessions } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/crypto';
import { recordAuditEvent } from '@/lib/profile/audit';

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    // Parse request body for password confirmation
    const body = await req.json().catch(() => ({}));
    const { password, confirmText } = body;

    // Validate confirmation text
    if (confirmText !== 'LÖSCHEN' && confirmText !== 'DELETE') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_CONFIRMATION',
            message: 'Bitte geben Sie LÖSCHEN ein, um die Kontolöschung zu bestätigen'
          }
        },
        { status: 400 }
      );
    }

    // Validate password if provided (optional for now, but recommended)
    const db = getDb();

    if (password) {
      const user = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user[0] || !await verifyPassword(password, user[0].passwordHash)) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: 'INVALID_PASSWORD',
              message: 'Passwort ist falsch'
            }
          },
          { status: 401 }
        );
      }
    }

    // Record audit event before deletion
    await recordAuditEvent({
      userId,
      action: 'account_deletion_requested',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      details: { deletedAt: new Date().toISOString() },
    });

    // Begin cascading deletion (order matters due to foreign keys)
    // Note: Most tables have ON DELETE CASCADE, but we'll be explicit for safety

    try {
      // 1. Delete collaboration data
      await db.delete(collaborations).where(eq(collaborations.userId, userId));

      // 2. Delete brain data
      await db.delete(brainMemories).where(eq(brainMemories.agentId, userId));
      await db.delete(brainContexts).where(eq(brainContexts.userId, userId));
      await db.delete(brainDocuments).where(eq(brainDocuments.createdBy, userId));

      // 3. Delete integrations
      await db.delete(integrations).where(eq(integrations.userId, userId));

      // 4. Delete agent chat data
      await db.delete(agentMessages).where(eq(agentMessages.userId, userId));
      await db.delete(agentConversations).where(eq(agentConversations.userId, userId));
      await db.delete(aiUsage).where(eq(aiUsage.userId, userId));

      // 5. Delete workspaces (cascades to workspace_agents, workspace_knowledge)
      await db.delete(workspaces).where(eq(workspaces.userId, userId));

      // 6. Delete auth-related data
      await db.delete(userPasskeys).where(eq(userPasskeys.userId, userId));
      await db.delete(userKnownDevices).where(eq(userKnownDevices.userId, userId));
      await db.delete(sessions).where(eq(sessions.userId, userId));

      // 7. Delete profile data
      await db.delete(userNotificationPrefs).where(eq(userNotificationPrefs.userId, userId));
      await db.delete(userAudit).where(eq(userAudit.userId, userId));
      await db.delete(userRoles).where(eq(userRoles.userId, userId));

      // 8. Finally, delete the user
      await db.delete(users).where(eq(users.id, userId));

    } catch (deleteError) {
      console.error('[ACCOUNT_DELETE] Deletion error:', deleteError);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'DELETION_FAILED',
            message: 'Kontolöschung fehlgeschlagen. Bitte kontaktieren Sie den Support.'
          }
        },
        { status: 500 }
      );
    }

    // Return success with redirect instruction
    return NextResponse.json({
      ok: true,
      message: 'Konto erfolgreich gelöscht',
      redirect: '/login?deleted=true',
    });

  } catch (error: any) {
    console.error('[ACCOUNT_DELETE] Error:', error);

    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_SESSION_INVALID') {
      return NextResponse.json(
        { ok: false, error: { code: 'AUTH_UNAUTHORIZED', message: 'Nicht authentifiziert' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Interner Serverfehler' } },
      { status: 500 }
    );
  }
}
