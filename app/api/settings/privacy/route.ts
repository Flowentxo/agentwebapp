/**
 * Privacy Settings API
 * GET /api/settings/privacy - Get current privacy settings
 * PATCH /api/settings/privacy - Update privacy settings
 *
 * Stores privacy preferences in the user's profile (privacySettings JSONB column)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/profile/audit';

// Type for privacy settings
interface PrivacySettings {
  profileVisibility: 'public' | 'organization' | 'private';
  showInDirectory: boolean;
  allowSearchIndexing: boolean;
  allowAnalytics: boolean;
  allowProductImprovement: boolean;
}

// Default privacy settings
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profileVisibility: 'organization',
  showInDirectory: true,
  allowSearchIndexing: false,
  allowAnalytics: true,
  allowProductImprovement: false,
};

/**
 * GET /api/settings/privacy
 * Get current privacy settings
 */
export async function GET() {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const db = getDb();

    // Fetch user's privacy settings from the database
    const result = await db
      .select({ privacySettings: users.privacySettings })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json(
        { ok: false, error: { code: 'USER_NOT_FOUND', message: 'Benutzer nicht gefunden' } },
        { status: 404 }
      );
    }

    // Merge with defaults (in case user has partial settings)
    const dbSettings = result[0].privacySettings as Partial<PrivacySettings> || {};

    // Convert old schema format if needed
    const settings: PrivacySettings = {
      profileVisibility: dbSettings.profileVisibility ||
        (dbSettings.directoryOptOut ? 'private' : 'organization'),
      showInDirectory: dbSettings.showInDirectory ??
        !(dbSettings.directoryOptOut ?? false),
      allowSearchIndexing: dbSettings.allowSearchIndexing ??
        (dbSettings.searchVisibility ?? false),
      allowAnalytics: dbSettings.allowAnalytics ??
        (dbSettings.dataSharing?.analytics ?? true),
      allowProductImprovement: dbSettings.allowProductImprovement ??
        (dbSettings.dataSharing?.product ?? false),
    };

    return NextResponse.json({
      ok: true,
      data: settings,
    });

  } catch (error: any) {
    console.error('[PRIVACY_GET] Error:', error);

    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_SESSION_INVALID') {
      return NextResponse.json(
        { ok: false, error: { code: 'AUTH_UNAUTHORIZED', message: 'Nicht authentifiziert' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Fehler beim Laden der Einstellungen' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/privacy
 * Update privacy settings
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const body = await req.json();
    const {
      profileVisibility,
      showInDirectory,
      allowSearchIndexing,
      allowAnalytics,
      allowProductImprovement,
    } = body;

    const db = getDb();

    // Fetch current settings
    const result = await db
      .select({ privacySettings: users.privacySettings })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json(
        { ok: false, error: { code: 'USER_NOT_FOUND', message: 'Benutzer nicht gefunden' } },
        { status: 404 }
      );
    }

    const currentSettings = result[0].privacySettings as Partial<PrivacySettings> || {};

    // Validate profileVisibility if provided
    if (profileVisibility !== undefined) {
      if (!['public', 'organization', 'private'].includes(profileVisibility)) {
        return NextResponse.json(
          { ok: false, error: { code: 'INVALID_VISIBILITY', message: 'Ungültige Sichtbarkeitseinstellung' } },
          { status: 400 }
        );
      }
    }

    // Build updated settings
    const updatedSettings: PrivacySettings = {
      profileVisibility: profileVisibility ?? currentSettings.profileVisibility ?? DEFAULT_PRIVACY_SETTINGS.profileVisibility,
      showInDirectory: showInDirectory ?? currentSettings.showInDirectory ?? DEFAULT_PRIVACY_SETTINGS.showInDirectory,
      allowSearchIndexing: allowSearchIndexing ?? currentSettings.allowSearchIndexing ?? DEFAULT_PRIVACY_SETTINGS.allowSearchIndexing,
      allowAnalytics: allowAnalytics ?? currentSettings.allowAnalytics ?? DEFAULT_PRIVACY_SETTINGS.allowAnalytics,
      allowProductImprovement: allowProductImprovement ?? currentSettings.allowProductImprovement ?? DEFAULT_PRIVACY_SETTINGS.allowProductImprovement,
    };

    // Update in database
    await db
      .update(users)
      .set({
        privacySettings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Record audit event
    await recordAuditEvent({
      userId,
      action: 'privacy_updated',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      details: {
        changes: Object.keys(body).filter(key => body[key] !== undefined),
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Datenschutzeinstellungen aktualisiert',
      data: updatedSettings,
    });

  } catch (error: any) {
    console.error('[PRIVACY_PATCH] Error:', error);

    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_SESSION_INVALID') {
      return NextResponse.json(
        { ok: false, error: { code: 'AUTH_UNAUTHORIZED', message: 'Nicht authentifiziert' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Fehler beim Speichern der Einstellungen' } },
      { status: 500 }
    );
  }
}
