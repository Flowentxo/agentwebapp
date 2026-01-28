'use client';

/**
 * CONNECTIONS DIALOG
 *
 * Modal dialog for managing database connections
 */

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ConnectionsManager, DatabaseConnection } from './ConnectionsManager';

interface ConnectionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSelect?: (connection: DatabaseConnection) => void;
}

export function ConnectionsDialog({
  isOpen,
  onClose,
  onConnectionSelect
}: ConnectionsDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 bg-surface-1 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-text">Database Connections</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted transition hover:bg-card/5 hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 5rem)' }}>
          <ConnectionsManager onConnectionSelect={onConnectionSelect} />
        </div>
      </motion.div>
    </div>
  );
}
