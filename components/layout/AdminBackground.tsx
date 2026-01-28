/**
 * AdminBackground - Deep Space Command Core
 *
 * Global background component for the Admin Dashboard.
 * Provides the foundational visual layer with:
 * - Deep space background (#050505)
 * - Subtle grid pattern overlay
 * - Ambient glow effects for depth
 * - Optional scanline effect
 *
 * Usage:
 * Place this component at the root level of your admin layout,
 * before other content. It uses z-index -1 to stay behind everything.
 *
 * @example
 * <AdminBackground />
 * <div className="relative z-10">...your content...</div>
 */

'use client';

import { memo } from 'react';

interface AdminBackgroundProps {
  /** Show the grid pattern overlay */
  showGrid?: boolean;
  /** Show ambient glow effects */
  showAmbientGlow?: boolean;
  /** Show scanline effect (subtle CRT-like lines) */
  showScanlines?: boolean;
  /** Custom class name for additional styling */
  className?: string;
}

function AdminBackgroundComponent({
  showGrid = true,
  showAmbientGlow = true,
  showScanlines = false,
  className = '',
}: AdminBackgroundProps) {
  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden ${className}`}
      aria-hidden="true"
      data-decorative="true"
    >
      {/* Base Background - Deep Space */}
      <div className="absolute inset-0 bg-deep-space" />

      {/* Grid Pattern Overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 bg-grid-pattern opacity-100"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      )}

      {/* Ambient Glow Effects */}
      {showAmbientGlow && (
        <>
          {/* Primary Purple Glow - Top Right */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-150px',
              right: '-100px',
              width: '600px',
              height: '600px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(80px)',
            }}
          />

          {/* Secondary Blue Glow - Top Left */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '100px',
              left: '-200px',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(60px)',
            }}
          />

          {/* Tertiary Emerald Glow - Bottom Right */}
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: '-100px',
              right: '10%',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.04) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(50px)',
            }}
          />
        </>
      )}

      {/* Scanline Effect (optional) */}
      {showScanlines && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.03) 2px,
              rgba(0, 0, 0, 0.03) 4px
            )`,
          }}
        />
      )}

      {/* Vignette Effect - Subtle darkening at edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
        }}
      />
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const AdminBackground = memo(AdminBackgroundComponent);

export default AdminBackground;
