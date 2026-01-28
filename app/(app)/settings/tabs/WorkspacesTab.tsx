'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Star,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useWorkspace, Workspace } from '@/lib/contexts/workspace-context';
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal';

export default function WorkspacesTab() {
  const { workspaces, currentWorkspace, switchWorkspace, deleteWorkspace, updateWorkspace } = useWorkspace();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = (workspace: Workspace) => {
    setEditingId(workspace.id);
    setEditName(workspace.name);
    setEditDescription(workspace.description || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const handleSaveEdit = async (workspaceId: string) => {
    if (!editName.trim()) return;

    try {
      setIsSaving(true);
      await updateWorkspace(workspaceId, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update workspace:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (workspaceId: string) => {
    try {
      setIsDeleting(true);
      await deleteWorkspace(workspaceId);
      setDeletingId(null);
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section within the Tab */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Meine Workspaces</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verwalte deine Arbeitsbereiche und Organisationen.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-white transition-all shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" />
          Neuer Workspace
        </button>
      </div>

      {/* Workspaces List */}
      <div className="grid gap-4">
        {workspaces.map((workspace, index) => (
          <motion.div
            key={workspace.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative p-5 rounded-2xl border-2 transition-all ${
              currentWorkspace?.id === workspace.id
                ? 'bg-primary/5 border-primary/30'
                : 'bg-card border-border hover:border-primary/30'
            }`}
          >
            {/* Delete Confirmation Overlay */}
            <AnimatePresence>
              {deletingId === workspace.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-card/95 rounded-2xl backdrop-blur-sm border-2 border-red-500/30"
                >
                  <div className="text-center px-6">
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      Workspace löschen?
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Unwiderruflich löschen.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                       <button
                        onClick={() => setDeletingId(null)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => handleDelete(workspace.id)}
                        disabled={isDeleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                      >
                         {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                        Löschen
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  currentWorkspace?.id === workspace.id
                    ? 'bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/25'
                    : 'bg-muted'
                }`}
              >
                {workspace.iconUrl ? (
                  <img
                    src={workspace.iconUrl}
                    alt={workspace.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <Building2
                    className={`w-5 h-5 ${
                      currentWorkspace?.id === workspace.id
                        ? 'text-white'
                        : 'text-muted-foreground'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {editingId === workspace.id ? (
                  /* Edit Mode */
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Workspace Name"
                      className="w-full px-3 py-1.5 bg-input border-2 border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/40"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEdit(workspace.id)}
                        disabled={isSaving || !editName.trim()}
                        className="text-xs bg-primary text-white px-2 py-1 rounded"
                      >
                        Speichern
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium text-foreground truncate">
                        {workspace.name}
                      </h3>
                      {currentWorkspace?.id === workspace.id && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wide uppercase">
                          Aktiv
                        </span>
                      )}
                    </div>
                    {workspace.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                        {workspace.description}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              {editingId !== workspace.id && (
                <div className="flex items-center gap-1">
                  {currentWorkspace?.id !== workspace.id && (
                    <button
                      onClick={() => switchWorkspace(workspace.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors mr-2"
                    >
                      Wechseln
                    </button>
                  )}
                  <button
                    onClick={() => handleStartEdit(workspace)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {!workspace.isDefault && (
                    <button
                        onClick={() => setDeletingId(workspace.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {workspaces.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/50">
          <p className="text-muted-foreground">Keine Workspaces gefunden.</p>
        </div>
      )}

      {/* Create Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
