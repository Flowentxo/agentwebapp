import { getDb } from '../db/connection';
import { kbAccessRules, knowledgeBases, kbEntries } from '../db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';

export type UserRole = 'user' | 'editor' | 'reviewer' | 'admin';
export type Permission = 'read' | 'create' | 'update' | 'review' | 'publish' | 'delete';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: ['read'],
  editor: ['read', 'create', 'update'],
  reviewer: ['read', 'create', 'update', 'review'],
  admin: ['read', 'create', 'update', 'review', 'publish', 'delete'],
};

export interface ACLContext {
  userId: string;
  role: UserRole;
  teamId?: string;
  orgId?: string;
}

/**
 * Check if user has permission
 */
export function hasPermission(context: ACLContext, permission: Permission): boolean {
  return ROLE_PERMISSIONS[context.role].includes(permission);
}

/**
 * Check if user can access knowledge base
 */
export async function canAccessKnowledgeBase(
  context: ACLContext,
  kbId: string
): Promise<boolean> {
  const db = getDb();

  // Admins can access everything
  if (context.role === 'admin') {
    return true;
  }

  // Check KB visibility
  const [kb] = await db
    .select()
    .from(knowledgeBases)
    .where(eq(knowledgeBases.id, kbId))
    .limit(1);

  if (!kb) {
    return false;
  }

  // If org visibility, all authenticated users can access
  if (kb.visibility === 'org') {
    return true;
  }

  // If private, check access rules
  const rules = await db
    .select()
    .from(kbAccessRules)
    .where(
      and(
        eq(kbAccessRules.kbId, kbId),
        or(
          eq(kbAccessRules.subjectId, context.userId),
          context.teamId ? eq(kbAccessRules.subjectId, context.teamId) : undefined
        )
      )
    );

  return rules.length > 0;
}

/**
 * Check if user can access entry (based on status and permissions)
 */
export async function canAccessEntry(
  context: ACLContext,
  entryId: string
): Promise<boolean> {
  const db = getDb();

  const [entry] = await db
    .select()
    .from(kbEntries)
    .where(eq(kbEntries.id, entryId))
    .limit(1);

  if (!entry) {
    return false;
  }

  // Check KB access first
  const hasKbAccess = await canAccessKnowledgeBase(context, entry.kbId);
  if (!hasKbAccess) {
    return false;
  }

  // Admins can access everything
  if (context.role === 'admin') {
    return true;
  }

  // Authors and editors can access their own drafts
  if (entry.status === 'draft') {
    return (
      entry.authorId === context.userId ||
      (entry.editorIds as string[]).includes(context.userId)
    );
  }

  // Reviewers can access in_review
  if (entry.status === 'in_review') {
    return hasPermission(context, 'review');
  }

  // Everyone with read permission can access published
  if (entry.status === 'published') {
    return hasPermission(context, 'read');
  }

  // Archived entries only for reviewer (admin already handled above)
  if (entry.status === 'archived') {
    return context.role === 'reviewer';
  }

  return false;
}

/**
 * Filter entries by ACL
 */
export async function filterAccessibleEntries(
  context: ACLContext,
  entryIds: string[]
): Promise<string[]> {
  const accessible: string[] = [];

  for (const entryId of entryIds) {
    if (await canAccessEntry(context, entryId)) {
      accessible.push(entryId);
    }
  }

  return accessible;
}

/**
 * Assert permission or throw
 */
export function assertPermission(context: ACLContext, permission: Permission): void {
  if (!hasPermission(context, permission)) {
    throw new Error(`Permission denied: ${permission} requires ${context.role} role or higher`);
  }
}
