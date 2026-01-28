/**
 * Profile Layout - Modern SaaS-style layout with compact header and sticky tabs
 * Replaces old box-based layout with professional design
 */

'use client';

import { useState } from 'react';
import type { ProfileResponse } from '@/lib/profile/schemas';
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';

interface ProfileLayoutProps {
  profile: ProfileResponse;
  children: (activeTab: string) => React.ReactNode;
  onLogout?: () => void;
}

export default function ProfileLayout({
  profile,
  children,
  onLogout
}: ProfileLayoutProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-[rgb(var(--surface-0))]">
      {/* Compact Hero Header */}
      <ProfileHeader
        profile={profile}
        onLogout={onLogout}
      />

      {/* Sticky Tab Navigation */}
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content Area - Full width, edge to edge */}
      <div className="px-4 md:px-6 py-6">
        {children(activeTab)}
      </div>
    </div>
  );
}
