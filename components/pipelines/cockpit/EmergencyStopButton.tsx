'use client';

/**
 * EmergencyStopButton Component
 *
 * Kill Switch for immediately stopping all running pipeline executions.
 * Features confirmation modal with countdown and visual feedback.
 *
 * Vicy-Style: Deep Black (#050505) + Red Alert Colors
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Square,
  X,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface EmergencyStopButtonProps {
  pipelineId: string;
  isRunning: boolean;
  executionCount?: number;
  onStop?: () => void;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function EmergencyStopButton({
  pipelineId,
  isRunning,
  executionCount = 1,
  onStop,
  className,
}: EmergencyStopButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isStopping, setIsStopping] = useState(false);
  const [stopResult, setStopResult] = useState<'success' | 'error' | null>(null);

  // Reset countdown when modal opens
  useEffect(() => {
    if (showConfirm) {
      setCountdown(3);
      setStopResult(null);
    }
  }, [showConfirm]);

  // Countdown timer
  useEffect(() => {
    if (!showConfirm || countdown <= 0 || isStopping) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showConfirm, countdown, isStopping]);

  // Handle force stop
  const handleForceStop = useCallback(async () => {
    if (countdown > 0) return;

    setIsStopping(true);

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/force-stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || 'demo-user',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to stop pipeline');
      }

      const data = await response.json();

      setStopResult('success');
      toast.success('Pipeline gestoppt', {
        description: `${data.stoppedCount || executionCount} Ausführung(en) beendet`,
      });

      // Call onStop callback
      onStop?.();

      // Close modal after short delay
      setTimeout(() => {
        setShowConfirm(false);
        setStopResult(null);
      }, 1500);
    } catch (error) {
      console.error('[EMERGENCY_STOP] Error:', error);
      setStopResult('error');
      toast.error('Stoppen fehlgeschlagen', {
        description: 'Bitte versuchen Sie es erneut',
      });
    } finally {
      setIsStopping(false);
    }
  }, [pipelineId, countdown, executionCount, onStop]);

  // Handle click when countdown is 0
  useEffect(() => {
    if (countdown === 0 && showConfirm && !isStopping && !stopResult) {
      // Auto-enable the button, user must click to confirm
    }
  }, [countdown, showConfirm, isStopping, stopResult]);

  // Don't render if not running
  if (!isRunning) {
    return null;
  }

  return (
    <>
      {/* Stop Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={() => setShowConfirm(true)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl',
          'bg-red-500/10 hover:bg-red-500/20',
          'border border-red-500/30 hover:border-red-500/50',
          'text-red-400 hover:text-red-300',
          'transition-all duration-200',
          'group',
          className
        )}
      >
        <Square className="w-4 h-4 fill-current" />
        <span className="text-sm font-medium">
          STOP{executionCount > 1 ? ` ALL (${executionCount})` : ''}
        </span>
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      </motion.button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isStopping && setShowConfirm(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Notfall-Stop
                      </h3>
                      <p className="text-xs text-white/40">
                        Alle Ausführungen sofort beenden
                      </p>
                    </div>
                  </div>
                  {!isStopping && (
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="p-2 rounded-lg hover:bg-white/[0.04] text-white/40 hover:text-white/60 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Warning Message */}
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 mb-6">
                    <p className="text-sm text-white/70">
                      <span className="text-red-400 font-medium">Warnung:</span>{' '}
                      {executionCount > 1 ? (
                        <>
                          Alle <span className="text-white font-semibold">{executionCount}</span>{' '}
                          laufenden Ausführungen werden sofort gestoppt.
                        </>
                      ) : (
                        <>Die laufende Ausführung wird sofort gestoppt.</>
                      )}
                    </p>
                    <p className="text-xs text-white/40 mt-2">
                      Diese Aktion kann nicht rückgängig gemacht werden.
                      Bereits verarbeitete Schritte bleiben erhalten.
                    </p>
                  </div>

                  {/* Result State */}
                  {stopResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex items-center justify-center gap-3 p-4 rounded-xl mb-4',
                        stopResult === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-red-500/10 border border-red-500/20'
                      )}
                    >
                      {stopResult === 'success' ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">
                            Erfolgreich gestoppt
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-medium">
                            Fehler beim Stoppen
                          </span>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  {!stopResult && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isStopping}
                        className={cn(
                          'flex-1 px-4 py-3 rounded-xl',
                          'bg-white/[0.02] hover:bg-white/[0.04]',
                          'border border-white/[0.06]',
                          'text-sm font-medium text-white/60 hover:text-white/80',
                          'transition-all duration-200',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        Abbrechen
                      </button>

                      <button
                        onClick={handleForceStop}
                        disabled={countdown > 0 || isStopping}
                        className={cn(
                          'flex-1 px-4 py-3 rounded-xl',
                          'flex items-center justify-center gap-2',
                          'text-sm font-semibold',
                          'transition-all duration-200',
                          countdown > 0
                            ? 'bg-white/[0.02] border border-white/[0.06] text-white/40 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600 border border-red-400/50 text-white shadow-lg shadow-red-500/20',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {isStopping ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Stoppe...
                          </>
                        ) : countdown > 0 ? (
                          <>
                            <Square className="w-4 h-4" />
                            STOP ({countdown}...)
                          </>
                        ) : (
                          <>
                            <Square className="w-4 h-4 fill-current" />
                            JETZT STOPPEN
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Countdown Progress */}
                {!stopResult && countdown > 0 && (
                  <div className="h-1 bg-white/[0.02]">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 3, ease: 'linear' }}
                      className="h-full bg-red-500/50"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default EmergencyStopButton;
