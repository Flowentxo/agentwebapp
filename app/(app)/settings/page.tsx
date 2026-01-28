/**
 * SINTRA Settings Page - Server Component
 * Enterprise settings management with profile and system tabs
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import SettingsClient from './settings.client';
import type { ProfileResponse } from '@/lib/profile/schemas';
import { requireSession } from '@/lib/auth/session';
import { getProfile } from '@/lib/profile/service';

async function loadProfile(): Promise<ProfileResponse> {
  try {
    // Check authentication directly using server-side function
    const session = await requireSession();

    // Load profile data directly from service
    const profile = await getProfile(session.user.id);

    return profile;
  } catch (error: any) {
    // If session is invalid or unauthorized, redirect to login
    if (error.code === 'AUTH_UNAUTHORIZED' || error.code === 'AUTH_SESSION_INVALID') {
      redirect('/login');
    }
    throw error;
  }
}

function SettingsLoading() {
  return (
    <div className="w-full min-h-screen bg-background p-6">
      <div className="animate-pulse max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded mb-6" />
        <div className="h-12 w-full bg-muted rounded mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-muted rounded-xl" />
          <div className="lg:col-span-2 h-64 bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const initialData = await loadProfile();

  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsClient initial={initialData} />
    </Suspense>
  );
}
