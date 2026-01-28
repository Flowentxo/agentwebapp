/**
 * Brain AI Collaboration API
 * Handles document sharing, comments, and notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { collaborationService } from '@/lib/brain/CollaborationService';
import { getSessionFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/brain/collaboration
 * Get collaboration data (shares, comments, activity, notifications)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const documentId = searchParams.get('documentId');
    const workspaceId = searchParams.get('workspaceId') || 'default-workspace';

    switch (type) {
      case 'shares':
        if (!documentId) {
          // Get documents shared with me
          const sharedWithMe = await collaborationService.getSharedWithMe(session.userId);
          return NextResponse.json({ success: true, data: sharedWithMe });
        }
        // Get shares for a specific document
        const shares = await collaborationService.getDocumentShares(documentId);
        return NextResponse.json({ success: true, data: shares });

      case 'comments':
        if (!documentId) {
          return NextResponse.json({ error: 'documentId required' }, { status: 400 });
        }
        const comments = await collaborationService.getComments(documentId);
        return NextResponse.json({ success: true, data: comments });

      case 'activity':
        const activity = await collaborationService.getActivityFeed(workspaceId, 50);
        return NextResponse.json({ success: true, data: activity });

      case 'notifications':
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const notifications = await collaborationService.getNotifications(session.userId, unreadOnly);
        return NextResponse.json({ success: true, data: notifications });

      case 'permission':
        if (!documentId) {
          return NextResponse.json({ error: 'documentId required' }, { status: 400 });
        }
        const permission = await collaborationService.checkPermission(documentId, session.userId);
        return NextResponse.json({ success: true, data: { permission } });

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: shares, comments, activity, notifications, permission' },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Collaboration API] GET Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brain/collaboration
 * Create shares, comments, or mark notifications
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, ...data } = body;

    switch (action) {
      case 'share':
        const share = await collaborationService.shareDocument({
          documentId: data.documentId,
          sharedBy: session.userId,
          sharedWith: data.sharedWith,
          shareType: data.shareType || 'user',
          permission: data.permission || 'view',
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        });
        return NextResponse.json({ success: true, data: share });

      case 'unshare':
        await collaborationService.unshareDocument(data.documentId, data.sharedWith);
        return NextResponse.json({ success: true });

      case 'comment':
        const comment = await collaborationService.addComment({
          documentId: data.documentId,
          userId: session.userId,
          userName: data.userName || session.userId,
          content: data.content,
          parentId: data.parentId,
        });
        return NextResponse.json({ success: true, data: comment });

      case 'updateComment':
        await collaborationService.updateComment(data.commentId, session.userId, data.content);
        return NextResponse.json({ success: true });

      case 'deleteComment':
        await collaborationService.deleteComment(data.commentId, session.userId);
        return NextResponse.json({ success: true });

      case 'resolveComment':
        await collaborationService.resolveComment(data.commentId, data.resolved ?? true);
        return NextResponse.json({ success: true });

      case 'markNotificationRead':
        await collaborationService.markNotificationRead(data.notificationId, session.userId);
        return NextResponse.json({ success: true });

      case 'markAllNotificationsRead':
        await collaborationService.markAllNotificationsRead(session.userId);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Collaboration API] POST Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
