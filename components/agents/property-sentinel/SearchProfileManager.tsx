'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pause, Play, Trash2, MapPin, Clock } from 'lucide-react';
import { useSentinelStore } from '@/store/sentinelStore';
import { ProfileCreateModal } from './ProfileCreateModal';
import { FREQUENCY_PRESETS, type FrequencyPreset } from '@/lib/agents/property-sentinel/config';

const AGENT_COLOR = '#92400E';

function formatPrice(price: number | null): string {
  if (!price) return '';
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1000) return `${Math.round(price / 1000)}k`;
  return String(price);
}

export function SearchProfileManager() {
  const {
    profiles,
    isLoadingProfiles,
    selectedProfileId,
    setSelectedProfile,
    togglePause,
    deleteProfile,
    fetchListings,
  } = useSentinelStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSelectProfile = (id: string) => {
    const newId = selectedProfileId === id ? null : id;
    setSelectedProfile(newId);
    fetchListings(newId || undefined);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteProfile(id);
    setDeletingId(null);
  };

  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/50">Suchprofile</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200"
          style={{
            backgroundColor: `${AGENT_COLOR}15`,
            border: `1px solid ${AGENT_COLOR}30`,
            color: AGENT_COLOR,
          }}
        >
          <Plus className="w-3 h-3" />
          Neues Profil
        </button>
      </div>

      {/* Profile list */}
      <div className="space-y-2">
        {isLoadingProfiles ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse">
              <div className="h-3 w-24 bg-white/[0.04] rounded mb-2" />
              <div className="h-2 w-16 bg-white/[0.03] rounded" />
            </div>
          ))
        ) : profiles.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-white/20">Noch keine Suchprofile</p>
            <p className="text-[10px] text-white/15 mt-1">Erstelle dein erstes Profil</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {profiles.map((profile, i) => {
              const isSelected = profile.id === selectedProfileId;
              const freq = FREQUENCY_PRESETS[profile.frequency as Exclude<FrequencyPreset, 'custom'>];

              return (
                <motion.div
                  key={profile.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  onClick={() => handleSelectProfile(profile.id)}
                  className={`
                    p-3 rounded-xl cursor-pointer transition-all duration-200
                    ${isSelected
                      ? 'bg-white/[0.05] border-white/[0.12]'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'}
                    border
                  `}
                  style={isSelected ? { borderColor: `${AGENT_COLOR}40` } : undefined}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white/80 font-medium truncate block">
                        {profile.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3 h-3 text-white/25 flex-shrink-0" />
                        <span className="text-[11px] text-white/30 truncate">
                          {(profile.location as any)?.city || ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      {/* Pause/Resume */}
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePause(profile.id, !profile.isActive); }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                        title={profile.isActive ? 'Pausieren' : 'Fortsetzen'}
                      >
                        {profile.isActive ? (
                          <Pause className="w-3 h-3 text-white/30" />
                        ) : (
                          <Play className="w-3 h-3 text-emerald-400/50" />
                        )}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(profile.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        disabled={deletingId === profile.id}
                      >
                        <Trash2 className="w-3 h-3 text-white/20 hover:text-red-400/50" />
                      </button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(profile.priceMin || profile.priceMax) && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] text-white/30 bg-white/[0.04] border border-white/[0.06]">
                        {formatPrice(profile.priceMin)}–{formatPrice(profile.priceMax)} EUR
                      </span>
                    )}
                    {freq && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] text-white/30 bg-white/[0.04] border border-white/[0.06] inline-flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {freq.label}
                      </span>
                    )}
                    {!profile.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] text-amber-400/60 bg-amber-500/10 border border-amber-500/20">
                        Pausiert
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreateModal && (
          <ProfileCreateModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
