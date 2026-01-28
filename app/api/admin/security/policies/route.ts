/**
 * API Route: Security Policies
 * GET /api/admin/security/policies - Get all policies
 * POST /api/admin/security/policies - Toggle or update policy
 * Requires admin role
 *
 * Note: Security policies are stored as system configuration.
 * For now, we use environment variables and default settings.
 * In a full implementation, these would be stored in a dedicated
 * security_policies table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { adminAuditService } from '@/server/services/AdminAuditService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Default security policies (can be overridden by DB in production)
const defaultPolicies = [
  {
    id: 'rate-limiting',
    name: 'Rate Limiting',
    description: 'Begrenzt API-Anfragen pro Benutzer/IP',
    enabled: true,
    threshold: 100,
    unit: 'requests/min',
    lastUpdated: new Date().toISOString(),
    category: 'protection',
  },
  {
    id: 'failed-login-lockout',
    name: 'Failed Login Lockout',
    description: 'Sperrt Konten nach mehreren fehlgeschlagenen Anmeldeversuchen',
    enabled: true,
    threshold: 5,
    unit: 'attempts',
    lastUpdated: new Date().toISOString(),
    category: 'authentication',
  },
  {
    id: 'session-timeout',
    name: 'Session Timeout',
    description: 'Automatische Abmeldung nach Inaktivität',
    enabled: true,
    threshold: 30,
    unit: 'minutes',
    lastUpdated: new Date().toISOString(),
    category: 'session',
  },
  {
    id: 'mfa-enforcement',
    name: 'MFA Enforcement',
    description: 'Erzwingt Multi-Faktor-Authentifizierung für Admin-Konten',
    enabled: false,
    threshold: null,
    unit: null,
    lastUpdated: new Date().toISOString(),
    category: 'authentication',
  },
  {
    id: 'ip-whitelist',
    name: 'IP Whitelist',
    description: 'Beschränkt Admin-Zugriff auf bestimmte IP-Adressen',
    enabled: false,
    threshold: null,
    unit: null,
    lastUpdated: new Date().toISOString(),
    category: 'access',
  },
  {
    id: 'audit-logging',
    name: 'Audit Logging',
    description: 'Protokolliert alle administrativen Aktionen',
    enabled: true,
    threshold: 90,
    unit: 'days retention',
    lastUpdated: new Date().toISOString(),
    category: 'compliance',
  },
];

// In-memory policy state (would be DB-backed in production)
let policies = [...defaultPolicies];

export async function GET(request: NextRequest) {
  try {
    // Require admin session
    await requireSession({ requireRoles: ['admin'] });

    // Return current policy configuration
    // In production, this would query a security_policies table
    return NextResponse.json({
      success: true,
      policies,
      lastSync: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[SECURITY_POLICIES]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin session
    const session = await requireSession({ requireRoles: ['admin'] });

    const { action, policyId, enabled, threshold } = await request.json();

    if (!action || !policyId) {
      return NextResponse.json(
        { success: false, error: 'Action and policyId are required' },
        { status: 400 }
      );
    }

    const policyIndex = policies.findIndex((p) => p.id === policyId);
    if (policyIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

    const oldPolicy = { ...policies[policyIndex] };
    const now = new Date();

    if (action === 'toggle') {
      policies[policyIndex].enabled = enabled;
      policies[policyIndex].lastUpdated = now.toISOString();

      // Log the action
      await adminAuditService.logSecurityAction({
        userId: session.userId,
        userEmail: session.user.email,
        action: 'policy_toggled',
        targetType: 'security_policy',
        targetId: policyId,
        targetName: policies[policyIndex].name,
        description: `${enabled ? 'Enabled' : 'Disabled'} security policy: ${policies[policyIndex].name}`,
        previousValue: { enabled: oldPolicy.enabled },
        newValue: { enabled },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json({
        success: true,
        policy: policies[policyIndex],
        message: `Policy ${enabled ? 'aktiviert' : 'deaktiviert'}`,
      });
    }

    if (action === 'updateThreshold') {
      if (threshold === undefined || threshold === null) {
        return NextResponse.json(
          { success: false, error: 'Threshold value is required' },
          { status: 400 }
        );
      }

      policies[policyIndex].threshold = threshold;
      policies[policyIndex].lastUpdated = now.toISOString();

      // Log the action
      await adminAuditService.logSecurityAction({
        userId: session.userId,
        userEmail: session.user.email,
        action: 'policy_threshold_updated',
        targetType: 'security_policy',
        targetId: policyId,
        targetName: policies[policyIndex].name,
        description: `Updated threshold for ${policies[policyIndex].name}: ${oldPolicy.threshold} → ${threshold}`,
        previousValue: { threshold: oldPolicy.threshold },
        newValue: { threshold },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json({
        success: true,
        policy: policies[policyIndex],
        message: 'Threshold aktualisiert',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use: toggle or updateThreshold' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[SECURITY_POLICIES]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update policy' },
      { status: 500 }
    );
  }
}
