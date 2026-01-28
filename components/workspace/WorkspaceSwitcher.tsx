'use client';

import { useState } from 'react';
import { useWorkspace } from '@/lib/contexts/workspace-context';
import { ChevronDown, Plus, Check, Settings, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!currentWorkspace) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOpenCreateModal = () => {
    setIsOpen(false);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="relative">
        {/* Switcher Button */}
        <button
          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-card/[0.03] border border-white/10 hover:bg-card/5 transition"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentWorkspace.iconUrl ? (
              <img
                src={currentWorkspace.iconUrl}
                alt={currentWorkspace.name}
                className="h-6 w-6 rounded"
              />
            ) : (
              <div className="h-6 w-6 rounded bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-3.5 w-3.5 text-indigo-400" />
              </div>
            )}
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium text-white truncate">
                {currentWorkspace.name}
              </span>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-white/40 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40"
              onClick={handleClose}
            />

            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              {/* Workspace List */}
              <div className="max-h-64 overflow-y-auto">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-card/5 transition ${
                      workspace.id === currentWorkspace.id ? 'bg-card/5' : ''
                    }`}
                    onClick={() => {
                      if (workspace.id !== currentWorkspace.id) {
                        switchWorkspace(workspace.id);
                      }
                      handleClose();
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {workspace.iconUrl ? (
                        <img
                          src={workspace.iconUrl}
                          alt={workspace.name}
                          className="h-5 w-5 rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-3 w-3 text-indigo-400" />
                        </div>
                      )}
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-medium text-white truncate">
                          {workspace.name}
                        </span>
                        {workspace.isDefault && (
                          <span className="text-xs text-white/40">Default</span>
                        )}
                      </div>
                    </div>

                    {workspace.id === currentWorkspace.id && (
                      <Check className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="border-t border-white/5 p-2 space-y-0.5">
                <button
                  onClick={handleOpenCreateModal}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-card/5 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Neuer Workspace
                </button>

                <button
                  onClick={() => {
                    router.push('/settings/workspaces');
                    handleClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-card/5 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Workspaces verwalten
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
