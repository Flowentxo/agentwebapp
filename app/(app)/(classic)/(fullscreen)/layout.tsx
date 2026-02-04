'use client';

/**
 * Fullscreen Layout
 *
 * Clean layout for immersive experiences like the Agent Studio.
 * No padding, margins, or container constraints.
 */

export default function FullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {children}
    </div>
  );
}
