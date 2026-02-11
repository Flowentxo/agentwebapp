'use client';

/**
 * PipelineSidebar - Pipeline list panel matching Inbox ChatSidebar pattern
 *
 * Features:
 * - Search input
 * - Filter tabs (All / Active / Inactive)
 * - Pipeline list with status dots and running indicator
 * - Context menu (Edit, Toggle, Delete)
 * - "New Pipeline" button → PipelineWizard modal
 *
 * Data source: Database API (GET /api/pipelines)
 */

import { useCallback, useEffect, useMemo, useState, type Ref } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from '@/store/session';
import { useCurrentRunningPipelineId } from '@/store/useDashboardStore';
import { PipelineWizard } from '@/components/pipelines/wizard/PipelineWizard';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Search,
  Plus,
  GitBranch,
  Play,
  Calendar,
  Webhook,
  MoreHorizontal,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Display type for sidebar items (mapped from API response)
interface SidebarPipeline {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isArchived: boolean;
  triggerType: 'manual' | 'schedule' | 'webhook';
  steps: unknown[];
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface PipelineSidebarProps {
  searchInputRef: Ref<HTMLInputElement>;
  onSelectPipeline?: () => void;
}

type FilterMode = 'all' | 'active' | 'inactive' | 'archived';

function formatDate(date: Date | undefined): string {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleDateString('de-DE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTriggerIcon(type: SidebarPipeline['triggerType']) {
  switch (type) {
    case 'manual':
      return <Play className="w-3 h-3" />;
    case 'schedule':
      return <Calendar className="w-3 h-3" />;
    case 'webhook':
      return <Webhook className="w-3 h-3" />;
  }
}

export function PipelineSidebar({
  searchInputRef,
  onSelectPipeline,
}: PipelineSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const currentPipelineId = params?.id as string | undefined;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterMode>('all');
  const [showWizard, setShowWizard] = useState(false);

  // Session for API auth
  const { user } = useSession();

  // Database pipelines
  const [dbPipelines, setDbPipelines] = useState<SidebarPipeline[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const currentRunningPipelineId = useCurrentRunningPipelineId();

  // Fetch pipelines from database API
  const fetchPipelines = useCallback(async () => {
    if (!user.id) return;

    try {
      const res = await fetch('/api/pipelines', {
        headers: { 'x-user-id': user.id },
      });
      if (res.ok) {
        const data = await res.json();
        const pipelines: SidebarPipeline[] = (data.pipelines || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          isActive: p.status === 'active',
          isArchived: p.status === 'archived',
          triggerType: 'manual' as const,
          steps: p.nodes || [],
          lastRunAt: p.lastExecutedAt ? new Date(p.lastExecutedAt) : undefined,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }));
        setDbPipelines(pipelines);
      }
    } catch (error) {
      console.error('[PipelineSidebar] Failed to fetch pipelines:', error);
    } finally {
      setIsLoadingDb(false);
    }
  }, [user.id]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  // Listen for pipeline-created events from PipelineWizard
  useEffect(() => {
    const handlePipelineCreated = () => {
      fetchPipelines();
    };
    window.addEventListener('pipeline-created', handlePipelineCreated);
    return () => window.removeEventListener('pipeline-created', handlePipelineCreated);
  }, [fetchPipelines]);

  // Filter and search pipelines
  const filteredPipelines = useMemo(() => {
    let result = [...dbPipelines];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter === 'all') {
      // Exclude archived from default view
      result = result.filter((p) => !p.isArchived);
    } else if (statusFilter === 'active') {
      result = result.filter((p) => p.isActive && !p.isArchived);
    } else if (statusFilter === 'inactive') {
      result = result.filter((p) => !p.isActive && !p.isArchived);
    } else if (statusFilter === 'archived') {
      result = result.filter((p) => p.isArchived);
    }

    // Sort: running first, then active, then by updatedAt desc
    result.sort((a, b) => {
      if (a.id === currentRunningPipelineId) return -1;
      if (b.id === currentRunningPipelineId) return 1;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [dbPipelines, searchQuery, statusFilter, currentRunningPipelineId]);

  const handleSelectPipeline = (id: string) => {
    router.push(`/pipelines/${id}`);
    onSelectPipeline?.();
  };

  const handleNewPipeline = () => {
    setShowWizard(true);
  };

  const handleEdit = (id: string) => {
    router.push(`/pipelines/${id}/editor`);
  };

  const handleArchive = async (id: string, name: string) => {
    if (confirm(`"${name}" archivieren?`)) {
      try {
        await fetch(`/api/pipelines/${id}`, {
          method: 'DELETE',
          headers: { 'x-user-id': user.id },
        });
        // Update local state: mark as archived
        setDbPipelines((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isArchived: true, isActive: false } : p))
        );
        if (currentPipelineId === id) {
          router.push('/pipelines');
        }
      } catch (error) {
        console.error('Failed to archive pipeline:', error);
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await fetch(`/api/pipelines/${id}/restore`, {
        method: 'POST',
        headers: { 'x-user-id': user.id },
      });
      // Update local state: unarchive
      setDbPipelines((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isArchived: false, isActive: false } : p))
      );
    } catch (error) {
      console.error('Failed to restore pipeline:', error);
    }
  };

  const handleToggleActive = async (id: string) => {
    const pipeline = dbPipelines.find((p) => p.id === id);
    if (!pipeline) return;

    const newStatus = pipeline.isActive ? 'archived' : 'active';
    try {
      await fetch(`/api/pipelines/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      // Update local state
      setDbPipelines((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, isActive: newStatus !== 'archived' } : p
        )
      );
    } catch (error) {
      console.error('Failed to toggle pipeline:', error);
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3"
        style={{ flexShrink: 0, padding: '16px 16px 12px' }}
      >
        <div
          className="flex items-center justify-between mb-3"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}
        >
          <h2
            className="text-sm font-medium text-white/50"
            style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}
          >
            Pipelines
          </h2>
          <button
            onClick={handleNewPipeline}
            className="p-1.5 rounded-lg text-white/40 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white/70 transition-all"
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.4)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: 'none',
              cursor: 'pointer',
            }}
            title="New Pipeline"
          >
            <Plus className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative group" style={{ position: 'relative' }}>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '14px',
              height: '14px',
              color: 'rgba(255, 255, 255, 0.2)',
            }}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/30 transition-all"
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#fff',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 text-lg leading-none"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div
          className="flex mt-3 gap-0.5 bg-white/[0.03] rounded-lg p-0.5"
          style={{
            display: 'flex',
            marginTop: '12px',
            gap: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            padding: '2px',
          }}
        >
          {([
            { key: 'all' as const, label: 'Alle' },
            { key: 'active' as const, label: 'Aktiv' },
            { key: 'inactive' as const, label: 'Inaktiv' },
            { key: 'archived' as const, label: 'Archiv' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                statusFilter === tab.key
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/30 hover:text-white/50'
              )}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: statusFilter === tab.key ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: statusFilter === tab.key ? '#fff' : 'rgba(255, 255, 255, 0.3)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div
        className="h-px bg-white/[0.04] mx-4"
        style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.04)', marginLeft: '16px', marginRight: '16px' }}
      />

      {/* Pipeline List */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        style={{ flex: 1, overflowY: 'auto' }}
      >
        {isLoadingDb ? (
          <div className="px-4 py-2 space-y-1" style={{ padding: '8px 16px' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse" style={{ marginBottom: '4px' }}>
                <div
                  className="h-12 bg-white/[0.03] rounded-xl"
                  style={{ height: '48px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}
                />
              </div>
            ))}
          </div>
        ) : filteredPipelines.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-48 text-center px-4"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '192px', textAlign: 'center', padding: '0 16px' }}
          >
            <GitBranch
              className="w-8 h-8 text-white/15 mb-2"
              style={{ width: '32px', height: '32px', color: 'rgba(255, 255, 255, 0.15)', marginBottom: '8px' }}
            />
            <p className="text-white/30 text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px', margin: 0 }}>
              {searchQuery
                ? 'No matches found'
                : statusFilter !== 'all'
                ? `No ${statusFilter} pipelines`
                : 'No pipelines yet'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={handleNewPipeline}
                className="mt-2 px-3 py-1.5 bg-violet-500 hover:bg-violet-400 text-white text-xs font-medium rounded-lg transition-colors"
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  backgroundColor: '#8b5cf6',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Create pipeline
              </button>
            )}
          </div>
        ) : (
          <div className="py-1" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
            {filteredPipelines.map((pipeline) => (
              <PipelineItem
                key={pipeline.id}
                pipeline={pipeline}
                isActive={currentPipelineId === pipeline.id}
                isRunning={currentRunningPipelineId === pipeline.id}
                onSelect={() => handleSelectPipeline(pipeline.id)}
                onEdit={() => handleEdit(pipeline.id)}
                onToggleActive={() => handleToggleActive(pipeline.id)}
                onArchive={() => handleArchive(pipeline.id, pipeline.name)}
                onRestore={() => handleRestore(pipeline.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 border-t border-white/[0.04] px-4 py-2"
        style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          padding: '8px 16px',
        }}
      >
        <span
          className="text-[11px] text-white/25"
          style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.25)' }}
        >
          {dbPipelines.length} pipeline{dbPipelines.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Modals */}
      <PipelineWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
      />
    </div>
  );
}

// Individual pipeline item
interface PipelineItemProps {
  pipeline: SidebarPipeline;
  isActive: boolean;
  isRunning: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

function PipelineItem({
  pipeline,
  isActive,
  isRunning,
  onSelect,
  onEdit,
  onToggleActive,
  onArchive,
  onRestore,
}: PipelineItemProps) {
  // Status dot color
  const statusColor = isRunning
    ? 'bg-blue-400 animate-pulse'
    : pipeline.isActive
    ? 'bg-emerald-400'
    : 'bg-zinc-600';

  // Icon color based on state
  const iconColor = isRunning
    ? '#818cf8'
    : pipeline.isActive
    ? '#8b5cf6'
    : '#52525b';

  return (
    <div
      className={cn(
        'group relative mx-2 mb-0.5 rounded-xl transition-all cursor-pointer',
        isActive
          ? 'bg-violet-500/[0.08] border-l-2 border-l-violet-500'
          : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
      )}
    >
      {/* Running shimmer */}
      {isRunning && (
        <div className="absolute top-0 left-0 w-full h-[2px] rounded-t-xl overflow-hidden">
          <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-violet-500 to-transparent pipeline-running-shimmer" />
        </div>
      )}

      <div className="flex items-center gap-2.5 px-3 py-2" onClick={onSelect}>
        {/* Pipeline Icon */}
        <div className="relative flex-shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: iconColor + '18' }}
          >
            <GitBranch className="w-3.5 h-3.5" style={{ color: iconColor }} />
          </div>
          {/* Status dot */}
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-[#050505]',
              statusColor
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3
              className={cn(
                'text-sm truncate',
                isActive || isRunning ? 'font-medium text-white' : 'text-white/50'
              )}
            >
              {pipeline.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white/25">
              {getTriggerIcon(pipeline.triggerType)}
            </span>
            <span className="text-[11px] text-white/30">
              {pipeline.steps.length} step{pipeline.steps.length !== 1 ? 's' : ''}
            </span>
            <span className="text-white/15">·</span>
            <span className="text-[11px] text-white/25 truncate">
              {formatDate(pipeline.lastRunAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'absolute top-2.5 right-2.5 p-1 rounded-lg transition-opacity',
              'text-white/30 hover:text-white/60 hover:bg-white/[0.06]',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
              'focus:outline-none'
            )}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className={cn(
              'z-50 min-w-[140px] py-1',
              'bg-[#111] border border-white/[0.08] rounded-xl shadow-lg backdrop-blur-xl',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
            )}
          >
            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/70
                cursor-pointer outline-none hover:bg-white/[0.06] transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Bearbeiten
            </DropdownMenu.Item>
            {!pipeline.isArchived && (
              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleActive();
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/70
                  cursor-pointer outline-none hover:bg-white/[0.06] transition-colors"
              >
                {pipeline.isActive ? (
                  <>
                    <PowerOff className="w-3.5 h-3.5" />
                    Deaktivieren
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" />
                    Aktivieren
                  </>
                )}
              </DropdownMenu.Item>
            )}
            {pipeline.isArchived ? (
              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore();
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-emerald-400
                  cursor-pointer outline-none hover:bg-emerald-500/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Wiederherstellen
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive();
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-400
                  cursor-pointer outline-none hover:bg-red-500/10 transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                Archivieren
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
