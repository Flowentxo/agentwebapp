'use client';

/**
 * LOADING STATE - BEAUTIFUL PATIENCE
 *
 * "Even waiting should be delightful."
 *
 * Animated loading states that make users smile while they wait.
 */

import { Loader2, Sparkles } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'pulse' | 'dots';
  fullScreen?: boolean;
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  variant = 'spinner',
  fullScreen = false
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  };

  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center p-6'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClass} style={fullScreen ? { background: 'var(--background)' } : {}}>
      {fullScreen && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      )}

      <div className="relative flex flex-col items-center gap-6">
        {/* Loading Animation */}
        {variant === 'spinner' && (
          <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center`}
            style={{
              background: 'linear-gradient(135deg, #06B6D4 0%, #F97316 100%)',
              boxShadow: '0 8px 32px rgba(6, 182, 212, 0.4)',
              animation: 'spin 1s linear infinite'
            }}
          >
            <Loader2 className={`${sizeClasses[size === 'lg' ? 'md' : 'sm']} text-white`} />
          </div>
        )}

        {variant === 'pulse' && (
          <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center animate-pulse`}
            style={{
              background: 'linear-gradient(135deg, #06B6D4 0%, #F97316 100%)',
              boxShadow: '0 8px 32px rgba(6, 182, 212, 0.4)',
            }}
          >
            <Sparkles className={`${sizeClasses[size === 'lg' ? 'md' : 'sm']} text-white`} />
          </div>
        )}

        {variant === 'dots' && (
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-orange-400"
                style={{
                  animation: 'bounce 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.16}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Message */}
        <p className={`${textSizes[size]} text-muted-foreground font-medium`}>
          {message}
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
