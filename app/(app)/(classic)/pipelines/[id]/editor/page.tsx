'use client';

/**
 * Pipeline Editor Page
 *
 * Full-screen visual workflow editor for a specific pipeline.
 * Loads existing workflow data and enables editing with React Flow.
 *
 * Route: /pipelines/[id]/editor
 *
 * @version 1.0.0
 */

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { PipelineEditor } from '@/components/pipelines/PipelineEditor';
import {
  ArrowLeft,
  Save,
  Play,
  Settings,
  Share2,
  MoreHorizontal,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  status: 'draft' | 'active' | 'archived';
  version: string;
  updatedAt: string;
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PipelineEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load workflow data
  useEffect(() => {
    async function loadWorkflow() {
      setIsLoading(true);
      setError(null);

      try {
        // For new workflows
        if (workflowId === 'new') {
          setWorkflow({
            id: 'new',
            name: 'Neuer Workflow',
            description: '',
            nodes: [],
            edges: [],
            status: 'draft',
            version: '1.0.0',
            updatedAt: new Date().toISOString(),
          });
          setIsLoading(false);
          return;
        }

        // Fetch existing workflow
        const response = await fetch(`/api/workflows/${workflowId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Workflow nicht gefunden');
          }
          throw new Error('Fehler beim Laden des Workflows');
        }

        const data = await response.json();
        setWorkflow({
          id: data.id,
          name: data.name,
          description: data.description,
          nodes: data.nodes || [],
          edges: data.edges || [],
          status: data.status,
          version: data.version,
          updatedAt: data.updatedAt,
        });
      } catch (err) {
        console.error('[PipelineEditor] Load error:', err);
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkflow();
  }, [workflowId]);

  // Handle save
  const handleSave = useCallback(
    async (nodes: Node[], edges: Edge[]) => {
      if (!workflow) return;

      setIsSaving(true);
      console.log('=== Saving Pipeline ===');
      console.log('Nodes:', JSON.stringify(nodes, null, 2));
      console.log('Edges:', JSON.stringify(edges, null, 2));

      try {
        const isNew = workflowId === 'new';
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? '/api/workflows' : `/api/workflows/${workflowId}`;

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: workflow.name,
            description: workflow.description,
            nodes,
            edges,
          }),
        });

        if (!response.ok) {
          throw new Error('Speichern fehlgeschlagen');
        }

        const savedWorkflow = await response.json();

        // If new, redirect to the saved workflow's editor
        if (isNew && savedWorkflow.id) {
          router.replace(`/pipelines/${savedWorkflow.id}/editor`);
        }

        setHasUnsavedChanges(false);
        console.log('Workflow saved successfully!');
      } catch (err) {
        console.error('[PipelineEditor] Save error:', err);
        alert('Fehler beim Speichern: ' + (err instanceof Error ? err.message : 'Unbekannt'));
      } finally {
        setIsSaving(false);
      }
    },
    [workflow, workflowId, router]
  );

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'Du hast ungespeicherte Änderungen. Möchtest du wirklich zurück gehen?'
      );
      if (!confirmed) return;
    }
    router.push('/pipelines');
  }, [router, hasUnsavedChanges]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-white/40">Lade Workflow...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error || !workflow) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center max-w-sm"
        >
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Fehler beim Laden
            </h3>
            <p className="text-sm text-white/40">
              {error || 'Der Workflow konnte nicht geladen werden.'}
            </p>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] text-white rounded-xl text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a]/80 border-b border-white/[0.06] backdrop-blur-sm">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workflow.name}
                onChange={(e) => {
                  setWorkflow({ ...workflow, name: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                className="bg-transparent text-lg font-semibold text-white outline-none border-b border-transparent focus:border-primary transition-colors"
                placeholder="Workflow Name"
              />
              {hasUnsavedChanges && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Ungespeichert
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              Version {workflow.version} • Zuletzt geändert:{' '}
              {new Date(workflow.updatedAt).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              workflow.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : workflow.status === 'archived'
                ? 'bg-white/[0.06] text-white/40'
                : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {workflow.status === 'active'
              ? 'Aktiv'
              : workflow.status === 'archived'
              ? 'Archiviert'
              : 'Entwurf'}
          </div>

          {/* Test Run */}
          <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] text-white rounded-xl text-sm font-medium transition-colors">
            <Play className="w-4 h-4" />
            Testen
          </button>

          {/* Settings */}
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>

          {/* Share */}
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
            <Share2 className="w-5 h-5" />
          </button>

          {/* More */}
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <PipelineEditor
          workflowId={workflowId}
          initialNodes={workflow.nodes}
          initialEdges={workflow.edges}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
