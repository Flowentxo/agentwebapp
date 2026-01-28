'use client';

/**
 * PUBLISH WORKFLOW BUTTON
 *
 * Handles workflow deployment lifecycle: Draft → Active → Archived
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Archive,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Globe,
  Lock
} from 'lucide-react';

export type WorkflowStatus = 'draft' | 'active' | 'archived';

interface PublishWorkflowButtonProps {
  workflowId: string;
  currentStatus: WorkflowStatus;
  workflowName: string;
  hasUnsavedChanges?: boolean;
  onPublish: (changeDescription?: string) => Promise<void>;
  onArchive: () => Promise<void>;
  onUnarchive: () => Promise<void>;
  disabled?: boolean;
}

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: '#94A3B8',
    icon: Clock,
    bgColor: 'bg-muted/500/10',
    textColor: 'text-muted-foreground',
    borderColor: 'border-slate-500/20'
  },
  active: {
    label: 'Active',
    color: '#10B981',
    icon: CheckCircle,
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/20'
  },
  archived: {
    label: 'Archived',
    color: '#6B7280',
    icon: Archive,
    bgColor: 'bg-muted/500/10',
    textColor: 'text-muted-foreground',
    borderColor: 'border-gray-500/20'
  }
};

export function PublishWorkflowButton({
  workflowId,
  currentStatus,
  workflowName,
  hasUnsavedChanges = false,
  onPublish,
  onArchive,
  onUnarchive,
  disabled = false
}: PublishWorkflowButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'publish' | 'archive' | 'unarchive'>('publish');
  const [changeDescription, setChangeDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const statusConfig = STATUS_CONFIG[currentStatus];
  const StatusIcon = statusConfig.icon;

  const handleAction = (action: 'publish' | 'archive' | 'unarchive') => {
    setModalAction(action);
    setShowModal(true);
    setChangeDescription('');
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (modalAction === 'publish') {
        await onPublish(changeDescription || undefined);
      } else if (modalAction === 'archive') {
        await onArchive();
      } else if (modalAction === 'unarchive') {
        await onUnarchive();
      }
      setShowModal(false);
    } catch (error) {
      console.error(`[PUBLISH_WORKFLOW] ${modalAction} failed:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Status Badge & Actions */}
      <div className="flex items-center gap-3">
        {/* Current Status Badge */}
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${statusConfig.bgColor} ${statusConfig.borderColor}`}
        >
          <StatusIcon className={`h-4 w-4 ${statusConfig.textColor}`} />
          <span className={`text-sm font-semibold ${statusConfig.textColor}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Action Buttons */}
        {currentStatus === 'draft' && (
          <button
            onClick={() => handleAction('publish')}
            disabled={disabled || hasUnsavedChanges}
            className="flex items-center gap-2 rounded-lg bg-[rgb(var(--accent))] px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title={hasUnsavedChanges ? 'Save changes before publishing' : 'Publish workflow'}
          >
            <Rocket className="h-4 w-4" />
            Publish
          </button>
        )}

        {currentStatus === 'active' && (
          <button
            onClick={() => handleAction('archive')}
            disabled={disabled}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-0 px-4 py-1.5 text-sm font-semibold text-text transition hover:bg-card/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>
        )}

        {currentStatus === 'archived' && (
          <button
            onClick={() => handleAction('unarchive')}
            disabled={disabled}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-0 px-4 py-1.5 text-sm font-semibold text-text transition hover:bg-card/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            Restore
          </button>
        )}

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-1.5">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-yellow-400">Unsaved changes</span>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoading && setShowModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-surface-1 p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="mb-4 flex items-start gap-4">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor:
                      modalAction === 'publish'
                        ? '#8B5CF620'
                        : modalAction === 'archive'
                        ? '#6B728020'
                        : '#10B98120'
                  }}
                >
                  {modalAction === 'publish' && (
                    <Rocket className="h-6 w-6 text-[rgb(var(--accent))]" />
                  )}
                  {modalAction === 'archive' && <Archive className="h-6 w-6 text-muted-foreground" />}
                  {modalAction === 'unarchive' && (
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text">
                    {modalAction === 'publish' && 'Publish Workflow'}
                    {modalAction === 'archive' && 'Archive Workflow'}
                    {modalAction === 'unarchive' && 'Restore Workflow'}
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">
                    {modalAction === 'publish' &&
                      'Make this workflow available for production use. A new version will be created.'}
                    {modalAction === 'archive' &&
                      'This workflow will be removed from active use but can be restored later.'}
                    {modalAction === 'unarchive' &&
                      'Restore this workflow and make it available again.'}
                  </p>
                </div>
              </div>

              {/* Workflow Info */}
              <div className="mb-6 rounded-lg border border-white/10 bg-surface-0 p-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-text-muted" />
                  <span className="text-sm font-semibold text-text">{workflowName}</span>
                </div>
              </div>

              {/* Change Description (only for publish) */}
              {modalAction === 'publish' && (
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-text">
                    Version Notes
                    <span className="ml-2 text-xs font-normal text-text-muted">(Optional)</span>
                  </label>
                  <textarea
                    value={changeDescription}
                    onChange={(e) => setChangeDescription(e.target.value)}
                    placeholder="Describe what changed in this version..."
                    rows={3}
                    className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text placeholder-text-muted outline-none transition focus:border-[rgb(var(--accent))] focus:ring-1 focus:ring-[rgb(var(--accent))]"
                  />
                </div>
              )}

              {/* Warning for Publish */}
              {modalAction === 'publish' && (
                <div className="mb-6 flex gap-3 rounded-lg bg-blue-500/10 p-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-blue-400" />
                  <div className="text-xs text-blue-300">
                    <strong>Publishing will:</strong>
                    <ul className="ml-4 mt-1 list-disc space-y-0.5">
                      <li>Make this workflow available in production</li>
                      <li>Create a version snapshot for rollback</li>
                      <li>Allow the workflow to be executed by users</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-white/10 bg-surface-0 px-4 py-2 text-sm font-semibold text-text transition hover:bg-card/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
                    modalAction === 'publish'
                      ? 'bg-[rgb(var(--accent))]'
                      : modalAction === 'archive'
                      ? 'bg-gray-600'
                      : 'bg-green-600'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {modalAction === 'publish' && 'Publish Workflow'}
                      {modalAction === 'archive' && 'Archive Workflow'}
                      {modalAction === 'unarchive' && 'Restore Workflow'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
