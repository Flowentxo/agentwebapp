'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSentinelStore } from '@/store/sentinelStore';
import { StatsBar } from './StatsBar';
import { SearchProfileManager } from './SearchProfileManager';
import { MarketRadar } from './MarketRadar';
import { DealGrid } from './DealGrid';

export function SentinelDashboard() {
  const { fetchProfiles, fetchListings, fetchStats, isLoadingStats, stats, error, clearError } = useSentinelStore();

  useEffect(() => {
    fetchProfiles();
    fetchListings();
    fetchStats();
  }, [fetchProfiles, fetchListings, fetchStats]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ backgroundColor: '#030712' }}>
      {/* Aurora glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: '-15%',
            left: '30%',
            width: '500px',
            height: '500px',
            background: 'rgba(146, 64, 14, 0.05)',
            filter: 'blur(120px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: '-10%',
            right: '20%',
            width: '400px',
            height: '400px',
            background: 'rgba(146, 64, 14, 0.03)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mt-4 px-4 py-2.5 rounded-xl text-xs text-red-400 bg-red-500/10 border border-red-500/20 flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400/50 hover:text-red-400 ml-3">
            ✕
          </button>
        </motion.div>
      )}

      {/* Stats Bar */}
      <div className="relative z-10">
        <StatsBar stats={stats} isLoading={isLoadingStats} />
      </div>

      {/* Main Grid */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-6 min-h-0 overflow-y-auto">
        {/* Left Column (1/3): Profiles + Radar */}
        <div className="space-y-4">
          <SearchProfileManager />
          <MarketRadar />
        </div>

        {/* Right Column (2/3): Deals */}
        <div className="lg:col-span-2">
          <DealGrid />
        </div>
      </div>
    </div>
  );
}
