/**
 * OAuthButton Component
 *
 * Displays official provider-branded authentication buttons
 * Follows Google Sign-In, Microsoft, Slack branding guidelines
 */

import React from 'react';
import { OAuthButtonProps } from '@/types/integrations';

const ProviderLogos = {
  google: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.82999 3.96409 7.28999V4.95818H0.957275C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.57954C10.3214 3.57954 11.5077 4.03363 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01681 0.957275 4.95818L3.96409 7.28999C4.67182 5.16272 6.65591 3.57954 9 3.57954Z" fill="#EA4335"/>
    </svg>
  ),
  microsoft: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0H9.5V9.5H0V0Z" fill="#F25022"/>
      <path d="M10.5 0H20V9.5H10.5V0Z" fill="#7FBA00"/>
      <path d="M0 10.5H9.5V20H0V10.5Z" fill="#00A4EF"/>
      <path d="M10.5 10.5H20V20H10.5V10.5Z" fill="#FFB900"/>
    </svg>
  ),
  slack: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.25 12.5C4.25 13.4665 3.4665 14.25 2.5 14.25C1.5335 14.25 0.75 13.4665 0.75 12.5C0.75 11.5335 1.5335 10.75 2.5 10.75H4.25V12.5Z" fill="#E01E5A"/>
      <path d="M5.25 12.5C5.25 11.5335 6.0335 10.75 7 10.75C7.9665 10.75 8.75 11.5335 8.75 12.5V17.5C8.75 18.4665 7.9665 19.25 7 19.25C6.0335 19.25 5.25 18.4665 5.25 17.5V12.5Z" fill="#E01E5A"/>
      <path d="M7 4.25C6.0335 4.25 5.25 3.4665 5.25 2.5C5.25 1.5335 6.0335 0.75 7 0.75C7.9665 0.75 8.75 1.5335 8.75 2.5V4.25H7Z" fill="#36C5F0"/>
      <path d="M7 5.25C7.9665 5.25 8.75 6.0335 8.75 7C8.75 7.9665 7.9665 8.75 7 8.75H2C1.0335 8.75 0.25 7.9665 0.25 7C0.25 6.0335 1.0335 5.25 2 5.25H7Z" fill="#36C5F0"/>
      <path d="M15.75 7C15.75 6.0335 16.5335 5.25 17.5 5.25C18.4665 5.25 19.25 6.0335 19.25 7C19.25 7.9665 18.4665 8.75 17.5 8.75H15.75V7Z" fill="#2EB67D"/>
      <path d="M14.75 7C14.75 7.9665 13.9665 8.75 13 8.75C12.0335 8.75 11.25 7.9665 11.25 7V2C11.25 1.0335 12.0335 0.25 13 0.25C13.9665 0.25 14.75 1.0335 14.75 2V7Z" fill="#2EB67D"/>
      <path d="M13 15.75C13.9665 15.75 14.75 16.5335 14.75 17.5C14.75 18.4665 13.9665 19.25 13 19.25C12.0335 19.25 11.25 18.4665 11.25 17.5V15.75H13Z" fill="#ECB22E"/>
      <path d="M13 14.75C12.0335 14.75 11.25 13.9665 11.25 13C11.25 12.0335 12.0335 11.25 13 11.25H18C18.9665 11.25 19.75 12.0335 19.75 13C19.75 13.9665 18.9665 14.75 18 14.75H13Z" fill="#ECB22E"/>
    </svg>
  ),
  github: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0110 4.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.137 18.165 20 14.418 20 10c0-5.523-4.477-10-10-10z"/>
    </svg>
  ),
};

const ProviderLabels = {
  google: 'Sign in with Google',
  microsoft: 'Sign in with Microsoft',
  slack: 'Sign in with Slack',
  github: 'Sign in with GitHub',
};

export function OAuthButton({
  provider,
  service,
  isLoading = false,
  disabled = false,
  onClick,
  className = '',
}: OAuthButtonProps) {
  const logo = ProviderLogos[provider];
  const label = ProviderLabels[provider];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`oauth-btn oauth-btn-${provider} ${isLoading ? 'loading' : ''} ${className}`}
      aria-label={`${label} for ${service}`}
      aria-busy={isLoading}
    >
      {!isLoading && (
        <span className="oauth-btn-icon" aria-hidden="true">
          {logo}
        </span>
      )}
      {isLoading && (
        <span className="oauth-btn-spinner" aria-hidden="true">
          <svg className="spinner" viewBox="0 0 24 24" fill="none">
            <circle
              className="spinner-circle"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
        </span>
      )}
      <span className="oauth-btn-label">
        {isLoading ? 'Connecting...' : label}
      </span>
    </button>
  );
}
