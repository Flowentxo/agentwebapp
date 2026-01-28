import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

/**
 * Organization settings storage
 * In production, this would be stored in the database
 * For now, we use a simple in-memory store keyed by user ID
 */
const orgSettingsStore = new Map<string, {
  name: string;
  domain: string;
  language: string;
  timezone: string;
  orgId: string;
}>();

// Default org settings
const DEFAULT_ORG_SETTINGS = {
  name: 'Meine Organisation',
  domain: 'example.com',
  language: 'de',
  timezone: 'Europe/Berlin',
  orgId: 'org_default',
};

/**
 * GET /api/settings/org
 * Get organization settings
 */
export async function GET() {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    // Get stored settings or defaults
    const settings = orgSettingsStore.get(userId) || {
      ...DEFAULT_ORG_SETTINGS,
      orgId: `org_${userId.slice(0, 8)}`,
    };

    return NextResponse.json({
      ok: true,
      data: settings,
    });
  } catch (error: any) {
    console.error("Failed to get organization settings:", error);

    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_SESSION_INVALID') {
      return NextResponse.json(
        { ok: false, error: { code: 'AUTH_UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get settings' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/org
 * Update organization settings
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const body = await req.json();
    const { name, domain, language, timezone } = body;

    // Get current settings
    const currentSettings = orgSettingsStore.get(userId) || {
      ...DEFAULT_ORG_SETTINGS,
      orgId: `org_${userId.slice(0, 8)}`,
    };

    // Merge updates
    const updatedSettings = {
      ...currentSettings,
      ...(name !== undefined && { name }),
      ...(domain !== undefined && { domain }),
      ...(language !== undefined && { language }),
      ...(timezone !== undefined && { timezone }),
    };

    // Store updated settings
    orgSettingsStore.set(userId, updatedSettings);

    return NextResponse.json({
      ok: true,
      message: "Organisation settings updated",
      data: updatedSettings,
    });
  } catch (error: any) {
    console.error("Failed to update organization settings:", error);

    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_SESSION_INVALID') {
      return NextResponse.json(
        { ok: false, error: { code: 'AUTH_UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update settings' } },
      { status: 500 }
    );
  }
}
