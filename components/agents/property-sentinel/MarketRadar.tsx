'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Radio, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSentinelStore } from '@/store/sentinelStore';

const AGENT_COLOR = '#92400E';

export function MarketRadar() {
  const { profiles, stats, isScanRunning, triggerScan, selectedProfileId } = useSentinelStore();
  const activeProfiles = profiles.filter(p => p.isActive).length;
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
  }, []);

  const handleScan = async () => {
    const profileId = selectedProfileId || profiles.find(p => p.isActive)?.id;
    if (!profileId) return;
    setScanFeedback(null);
    const result = await triggerScan(profileId);
    setScanFeedback({
      type: result.success ? 'success' : 'error',
      message: result.success ? 'Scan initiiert — Ergebnisse erscheinen gleich.' : result.message,
    });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 5000);
  };

  // Compute next scan from most recent lastScanAt + frequency
  const lastScan = stats?.lastScanAt;
  const lastScanFormatted = lastScan
    ? new Date(lastScan).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '--';

  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
      <h3 className="text-sm font-medium text-white/50 mb-4 flex items-center gap-2">
        <Radio className="w-4 h-4" style={{ color: AGENT_COLOR }} />
        Market Radar
      </h3>

      {/* Animated Radar */}
      <div className="relative w-28 h-28 mx-auto mb-4">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
        {/* Middle ring */}
        <div className="absolute inset-4 rounded-full border border-white/[0.04]" />
        {/* Inner ring */}
        <div className="absolute inset-8 rounded-full border border-white/[0.03]" />

        {/* Sweep line */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="h-1/2 w-px mx-auto origin-bottom"
            style={{
              background: `linear-gradient(to top, ${AGENT_COLOR}, transparent)`,
            }}
          />
        </motion.div>

        {/* Glow pulse */}
        {isScanRunning && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ backgroundColor: AGENT_COLOR }}
          />
        )}

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-white/40 font-mono">{activeProfiles}</span>
        </div>
      </div>

      {/* Scan info */}
      <div className="text-center space-y-1 mb-4">
        <p className="text-[11px] text-white/30">Letzter Scan</p>
        <p className="text-xs text-white/50 font-mono">{lastScanFormatted}</p>
      </div>

      {/* Manual scan button */}
      <button
        onClick={handleScan}
        disabled={isScanRunning || activeProfiles === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: `${AGENT_COLOR}15`,
          border: `1px solid ${AGENT_COLOR}30`,
          color: AGENT_COLOR,
        }}
      >
        {isScanRunning ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Scan laeuft...
          </>
        ) : (
          <>
            <Radio className="w-3.5 h-3.5" />
            Jetzt scannen
          </>
        )}
      </button>

      {/* Scan feedback */}
      {scanFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mt-3 flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] ${
            scanFeedback.type === 'success'
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-red-400 bg-red-500/10 border border-red-500/20'
          }`}
        >
          {scanFeedback.type === 'success'
            ? <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0" />
            : <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />}
          <span>{scanFeedback.message}</span>
        </motion.div>
      )}
    </div>
  );
}
