'use client';

/**
 * Pipeline Layout - 2-pane layout matching Inbox pattern
 * Left: PipelineSidebar (w-72, #0f172a)
 * Right: Main stage (#0a0a0a) with violet workspace glow
 */

import { useRef, useState, useEffect } from 'react';
import { PipelineSidebar } from './components/PipelineSidebar';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PipelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="flex flex-1 h-full w-full overflow-hidden"
      style={{
        display: 'flex',
        flex: 1,
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--vicy-bg)',
        overflow: 'hidden',
      }}
    >
      {/* Mobile Menu Toggle */}
      {mounted && (
        <button
          onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white transition-colors"
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 50,
            padding: '8px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          {isMobileSidebarOpen ? (
            <X className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
          ) : (
            <Menu className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
          )}
        </button>
      )}

      {/* Left Pane: Pipeline Sidebar */}
      <div
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-40 w-72 flex-shrink-0',
          'transform transition-all duration-300 ease-in-out lg:transform-none',
          'border-r border-white/[0.05]',
          'bg-[#0f172a]',
          isMobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          position: 'relative',
          width: '288px',
          flexShrink: 0,
          backgroundColor: '#0f172a',
          borderRight: '1px solid rgba(59, 130, 246, 0.08)',
          height: '100%',
        }}
      >
        <PipelineSidebar
          searchInputRef={searchInputRef}
          onSelectPipeline={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Right Pane: Main Stage */}
      <main
        className="flex-1 min-w-0 flex flex-col pipeline-workspace-glow"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--vicy-bg)',
          background: 'radial-gradient(ellipse 600px 400px at 50% 0%, rgba(139, 92, 246, 0.03), transparent 60%)',
        }}
      >
        {children}
      </main>
    </div>
  );
}
