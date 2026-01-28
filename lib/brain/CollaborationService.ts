/**
 * Collaboration Service for Brain AI
 * Phase 1: Basic collaboration features
 *
 * Features:
 * - Document sharing with permissions
 * - Comments on documents
 * - @mentions and notifications
 * - Activity feed
 */

import { getDb } from '@/lib/db';
import { sql, eq, and, desc, or } from 'drizzle-orm';

// Permission levels
export type PermissionLevel = 'view' | 'comment' | 'edit' | 'admin';

// Share types
export interface DocumentShare {
  id: string;
  documentId: string;
  sharedBy: string;
  sharedWith: string;      // userId or 'workspace' for workspace-wide
  shareType: 'user' | 'workspace' | 'link';
  permission: PermissionLevel;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShareInput {
  documentId: string;
  sharedBy: string;
  sharedWith: string;
  shareType: 'user' | 'workspace' | 'link';
  permission: PermissionLevel;
  expiresAt?: Date;
}

// Comment types
export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  userName?: string;
  content: string;
  parentId?: string;        // For replies
  mentions: string[];       // @mentioned user IDs
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommentInput {
  documentId: string;
  userId: string;
  userName?: string;
  content: string;
  parentId?: string;
}

// Activity types
export interface ActivityItem {
  id: string;
  workspaceId: string;
  userId: string;
  userName?: string;
  action: 'created' | 'updated' | 'shared' | 'commented' | 'mentioned' | 'resolved';
  targetType: 'document' | 'comment' | 'share';
  targetId: string;
  targetTitle?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: 'mention' | 'share' | 'comment' | 'reply';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

class CollaborationService {
  private static instance: CollaborationService;

  private constructor() {
    console.log('[CollaborationService] Initialized');
  }

  public static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService();
    }
    return CollaborationService.instance;
  }

  // ==================== Document Sharing ====================

  /**
   * Share a document with a user or workspace
   */
  async shareDocument(input: CreateShareInput): Promise<DocumentShare> {
    const db = getDb();
    const id = `share-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      await db.execute(sql`
        INSERT INTO brain_document_shares (
          id, document_id, shared_by, shared_with, share_type,
          permission, expires_at, created_at, updated_at
        ) VALUES (
          ${id}, ${input.documentId}, ${input.sharedBy}, ${input.sharedWith},
          ${input.shareType}, ${input.permission},
          ${input.expiresAt || null}, NOW(), NOW()
        )
        ON CONFLICT (document_id, shared_with) DO UPDATE SET
          permission = ${input.permission},
          expires_at = ${input.expiresAt || null},
          updated_at = NOW()
      `);

      // Log activity
      await this.logActivity({
        workspaceId: 'default',
        userId: input.sharedBy,
        action: 'shared',
        targetType: 'document',
        targetId: input.documentId,
        metadata: { sharedWith: input.sharedWith, permission: input.permission },
      });

      // Create notification for the recipient
      if (input.shareType === 'user') {
        await this.createNotification({
          userId: input.sharedWith,
          type: 'share',
          title: 'Document shared with you',
          message: `A document has been shared with you with ${input.permission} access.`,
          link: `/brain/documents/${input.documentId}`,
        });
      }

      return {
        id,
        documentId: input.documentId,
        sharedBy: input.sharedBy,
        sharedWith: input.sharedWith,
        shareType: input.shareType,
        permission: input.permission,
        expiresAt: input.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('[CollaborationService] Share document error:', error);
      throw error;
    }
  }

  /**
   * Remove a document share
   */
  async unshareDocument(documentId: string, sharedWith: string): Promise<void> {
    const db = getDb();

    try {
      await db.execute(sql`
        DELETE FROM brain_document_shares
        WHERE document_id = ${documentId} AND shared_with = ${sharedWith}
      `);
    } catch (error) {
      console.error('[CollaborationService] Unshare error:', error);
      throw error;
    }
  }

  /**
   * Get document shares
   */
  async getDocumentShares(documentId: string): Promise<DocumentShare[]> {
    const db = getDb();

    try {
      const result = await db.execute(sql`
        SELECT * FROM brain_document_shares
        WHERE document_id = ${documentId}
        ORDER BY created_at DESC
      `);

      return (result.rows as Record<string, unknown>[]).map(row => ({
        id: String(row.id),
        documentId: String(row.document_id),
        sharedBy: String(row.shared_by),
        sharedWith: String(row.shared_with),
        shareType: row.share_type as 'user' | 'workspace' | 'link',
        permission: row.permission as PermissionLevel,
        expiresAt: row.expires_at ? new Date(String(row.expires_at)) : undefined,
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at)),
      }));
    } catch (error) {
      console.error('[CollaborationService] Get shares error:', error);
      return [];
    }
  }

  /**
   * Get documents shared with a user
   */
  async getSharedWithMe(userId: string): Promise<DocumentShare[]> {
    const db = getDb();

    try {
      const result = await db.execute(sql`
        SELECT * FROM brain_document_shares
        WHERE shared_with = ${userId}
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
      `);

      return (result.rows as Record<string, unknown>[]).map(row => ({
        id: String(row.id),
        documentId: String(row.document_id),
        sharedBy: String(row.shared_by),
        sharedWith: String(row.shared_with),
        shareType: row.share_type as 'user' | 'workspace' | 'link',
        permission: row.permission as PermissionLevel,
        expiresAt: row.expires_at ? new Date(String(row.expires_at)) : undefined,
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at)),
      }));
    } catch (error) {
      console.error('[CollaborationService] Get shared with me error:', error);
      return [];
    }
  }

  /**
   * Check user permission on a document
   */
  async checkPermission(
    documentId: string,
    userId: string
  ): Promise<PermissionLevel | null> {
    const db = getDb();

    try {
      const result = await db.execute(sql`
        SELECT permission FROM brain_document_shares
        WHERE document_id = ${documentId}
          AND (shared_with = ${userId} OR share_type = 'workspace')
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY
          CASE permission
            WHEN 'admin' THEN 1
            WHEN 'edit' THEN 2
            WHEN 'comment' THEN 3
            WHEN 'view' THEN 4
          END
        LIMIT 1
      `);

      if (result.rows.length === 0) return null;
      return (result.rows[0] as Record<string, unknown>).permission as PermissionLevel;
    } catch (error) {
      console.error('[CollaborationService] Check permission error:', error);
      return null;
    }
  }

  // ==================== Comments ====================

  /**
   * Add a comment to a document
   */
  async addComment(input: CreateCommentInput): Promise<DocumentComment> {
    const db = getDb();
    const id = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Extract @mentions
    const mentionPattern = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionPattern.exec(input.content)) !== null) {
      mentions.push(match[1]);
    }

    try {
      await db.execute(sql`
        INSERT INTO brain_document_comments (
          id, document_id, user_id, user_name, content,
          parent_id, mentions, resolved, created_at, updated_at
        ) VALUES (
          ${id}, ${input.documentId}, ${input.userId}, ${input.userName || null},
          ${input.content}, ${input.parentId || null}, ${JSON.stringify(mentions)},
          false, NOW(), NOW()
        )
      `);

      // Log activity
      await this.logActivity({
        workspaceId: 'default',
        userId: input.userId,
        userName: input.userName,
        action: 'commented',
        targetType: 'document',
        targetId: input.documentId,
      });

      // Create notifications for mentions
      for (const mention of mentions) {
        await this.createNotification({
          userId: mention,
          type: 'mention',
          title: 'You were mentioned',
          message: `${input.userName || 'Someone'} mentioned you in a comment.`,
          link: `/brain/documents/${input.documentId}#comment-${id}`,
        });
      }

      // Notify parent comment author if this is a reply
      if (input.parentId) {
        const parentResult = await db.execute(sql`
          SELECT user_id FROM brain_document_comments WHERE id = ${input.parentId}
        `);
        if (parentResult.rows.length > 0) {
          const parentUserId = String((parentResult.rows[0] as Record<string, unknown>).user_id);
          if (parentUserId !== input.userId) {
            await this.createNotification({
              userId: parentUserId,
              type: 'reply',
              title: 'New reply to your comment',
              message: `${input.userName || 'Someone'} replied to your comment.`,
              link: `/brain/documents/${input.documentId}#comment-${id}`,
            });
          }
        }
      }

      return {
        id,
        documentId: input.documentId,
        userId: input.userId,
        userName: input.userName,
        content: input.content,
        parentId: input.parentId,
        mentions,
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('[CollaborationService] Add comment error:', error);
      throw error;
    }
  }

  /**
   * Get comments for a document
   */
  async getComments(documentId: string): Promise<DocumentComment[]> {
    const db = getDb();

    try {
      const result = await db.execute(sql`
        SELECT * FROM brain_document_comments
        WHERE document_id = ${documentId}
        ORDER BY created_at ASC
      `);

      return (result.rows as Record<string, unknown>[]).map(row => ({
        id: String(row.id),
        documentId: String(row.document_id),
        userId: String(row.user_id),
        userName: row.user_name ? String(row.user_name) : undefined,
        content: String(row.content),
        parentId: row.parent_id ? String(row.parent_id) : undefined,
        mentions: JSON.parse(String(row.mentions || '[]')),
        resolved: Boolean(row.resolved),
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at)),
      }));
    } catch (error) {
      console.error('[CollaborationService] Get comments error:', error);
      return [];
    }
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, content: string): Promise<void> {
    const db = getDb();

    try {
      await db.execute(sql`
        UPDATE brain_document_comments
        SET content = ${content}, updated_at = NOW()
        WHERE id = ${commentId} AND user_id = ${userId}
      `);
    } catch (error) {
      console.error('[CollaborationService] Update comment error:', error);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const db = getDb();

    try {
      await db.execute(sql`
        DELETE FROM brain_document_comments
        WHERE id = ${commentId} AND user_id = ${userId}
      `);
    } catch (error) {
      console.error('[CollaborationService] Delete comment error:', error);
      throw error;
    }
  }

  /**
   * Resolve/unresolve a comment thread
   */
  async resolveComment(commentId: string, resolved: boolean): Promise<void> {
    const db = getDb();

    try {
      await db.execute(sql`
        UPDATE brain_document_comments
        SET resolved = ${resolved}, updated_at = NOW()
        WHERE id = ${commentId}
      `);
    } catch (error) {
      console.error('[CollaborationService] Resolve comment error:', error);
      throw error;
    }
  }

  // ==================== Activity Feed ====================

  /**
   * Log an activity
   */
  private async logActivity(input: {
    workspaceId: string;
    userId: string;
    userName?: string;
    action: ActivityItem['action'];
    targetType: ActivityItem['targetType'];
    targetId: string;
    targetTitle?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const db = getDb();
    const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      await db.execute(sql`
        INSERT INTO brain_activity_log (
          id, workspace_id, user_id, user_name, action,
          target_type, target_id, target_title, metadata, created_at
        ) VALUES (
          ${id}, ${input.workspaceId}, ${input.userId}, ${input.userName || null},
          ${input.action}, ${input.targetType}, ${input.targetId},
          ${input.targetTitle || null}, ${JSON.stringify(input.metadata || {})}, NOW()
        )
      `);
    } catch (error) {
      console.error('[CollaborationService] Log activity error:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Get activity feed
   */
  async getActivityFeed(
    workspaceId: string,
    limit: number = 50
  ): Promise<ActivityItem[]> {
    const db = getDb();

    try {
      const result = await db.execute(sql`
        SELECT * FROM brain_activity_log
        WHERE workspace_id = ${workspaceId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);

      return (result.rows as Record<string, unknown>[]).map(row => ({
        id: String(row.id),
        workspaceId: String(row.workspace_id),
        userId: String(row.user_id),
        userName: row.user_name ? String(row.user_name) : undefined,
        action: row.action as ActivityItem['action'],
        targetType: row.target_type as ActivityItem['targetType'],
        targetId: String(row.target_id),
        targetTitle: row.target_title ? String(row.target_title) : undefined,
        metadata: JSON.parse(String(row.metadata || '{}')),
        createdAt: new Date(String(row.created_at)),
      }));
    } catch (error) {
      console.error('[CollaborationService] Get activity feed error:', error);
      return [];
    }
  }

  // ==================== Notifications ====================

  /**
   * Create a notification
   */
  private async createNotification(input: {
    userId: string;
    type: Notification['type'];
    title: string;
    message: string;
    link?: string;
  }): Promise<void> {
    const db = getDb();
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      await db.execute(sql`
        INSERT INTO brain_notifications (
          id, user_id, type, title, message, link, read, created_at
        ) VALUES (
          ${id}, ${input.userId}, ${input.type}, ${input.title},
          ${input.message}, ${input.link || null}, false, NOW()
        )
      `);
    } catch (error) {
      console.error('[CollaborationService] Create notification error:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const db = getDb();

    try {
      const result = await db.execute(sql`
        SELECT * FROM brain_notifications
        WHERE user_id = ${userId}
          ${unreadOnly ? sql`AND read = false` : sql``}
        ORDER BY created_at DESC
        LIMIT 100
      `);

      return (result.rows as Record<string, unknown>[]).map(row => ({
        id: String(row.id),
        userId: String(row.user_id),
        type: row.type as Notification['type'],
        title: String(row.title),
        message: String(row.message),
        link: row.link ? String(row.link) : undefined,
        read: Boolean(row.read),
        createdAt: new Date(String(row.created_at)),
      }));
    } catch (error) {
      console.error('[CollaborationService] Get notifications error:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    const db = getDb();

    try {
      await db.execute(sql`
        UPDATE brain_notifications
        SET read = true
        WHERE id = ${notificationId} AND user_id = ${userId}
      `);
    } catch (error) {
      console.error('[CollaborationService] Mark read error:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(userId: string): Promise<void> {
    const db = getDb();

    try {
      await db.execute(sql`
        UPDATE brain_notifications
        SET read = true
        WHERE user_id = ${userId} AND read = false
      `);
    } catch (error) {
      console.error('[CollaborationService] Mark all read error:', error);
    }
  }
}

// Singleton instance
export const collaborationService = CollaborationService.getInstance();
