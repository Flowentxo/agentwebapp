/**
 * ConnectedProfile Component
 *
 * Displays connected user profile with avatar, name, email, and actions
 */

import React from 'react';
import { ConnectedProfileProps } from '@/types/integrations';

function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

export function ConnectedProfile({
  user,
  onRefresh,
  onDisconnect,
  isRefreshing = false,
}: ConnectedProfileProps) {
  const lastSyncText = user.lastSync
    ? `Synced ${getRelativeTimeString(new Date(user.lastSync))}`
    : 'Never synced';

  return (
    <div className="connected-profile">
      {/* User Info */}
      <div className="connected-profile-info">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="connected-profile-avatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="connected-profile-avatar placeholder"
            aria-label={`Avatar for ${user.name}`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="connected-profile-details">
          <div className="connected-profile-name">{user.name}</div>
          <div className="connected-profile-email">{user.email}</div>
          <div className="connected-profile-sync" aria-live="polite">
            {lastSyncText}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="connected-profile-actions">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn-secondary btn-sm"
          aria-label="Refresh connection"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={isRefreshing ? 'spinning' : ''}
            aria-hidden="true"
          >
            <path
              d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C9.84883 2 11.5098 2.87988 12.5957 4.24707"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M12 2V4.5H9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isRefreshing ? 'Syncing...' : 'Resync'}
        </button>

        <button
          type="button"
          onClick={onDisconnect}
          className="btn-danger btn-sm"
          aria-label="Disconnect integration"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 2H14V6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6 14H2V10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 2L9 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M2 14L7 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Disconnect
        </button>
      </div>
    </div>
  );
}
