'use client';

import { motion } from 'framer-motion';
import { Home, AlertTriangle, ArrowRightCircle, X, ExternalLink } from 'lucide-react';
import { ScoreBadge } from './ScoreBadge';
import { RED_FLAGS } from '@/lib/agents/property-sentinel/config';
import type { SeenListing } from '@/lib/db/schema-sentinel';

const AGENT_COLOR = '#92400E';

interface DealCardProps {
  listing: SeenListing;
  onPushToPipeline: (id: string) => void;
  onDismiss: (id: string) => void;
  index?: number;
}

function formatPrice(price: number | null): string {
  if (!price) return 'k.A.';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
}

function YieldBadge({ yieldEst }: { yieldEst: string | null }) {
  if (!yieldEst) return null;
  const val = parseFloat(yieldEst);
  if (isNaN(val)) return null;

  const color = val >= 5 ? '#10B981' : val >= 2 ? '#F59E0B' : '#EF4444';
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      {val.toFixed(1)}% Rendite
    </span>
  );
}

function RedFlagIcon({ flag }: { flag: string }) {
  const def = RED_FLAGS.find(f => f.id === flag);
  if (!def) return null;

  const color = def.severity === 'critical' ? '#EF4444' : def.severity === 'high' ? '#F59E0B' : '#6B7280';
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px]"
      style={{ backgroundColor: `${color}12`, color, border: `1px solid ${color}25` }}
      title={def.description}
    >
      <AlertTriangle className="w-2.5 h-2.5" />
      {def.id}
    </span>
  );
}

export function DealCard({ listing, onPushToPipeline, onDismiss, index = 0 }: DealCardProps) {
  const isPushed = listing.pushedToPipeline;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
    >
      {/* Image Placeholder */}
      <div className="h-32 rounded-xl bg-white/[0.04] mb-4 flex items-center justify-center relative overflow-hidden">
        <Home className="w-8 h-8 text-white/10" />
        {listing.portal && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-medium bg-white/[0.08] text-white/40 border border-white/[0.06]">
            {listing.portal}
          </span>
        )}
        {isPushed && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            In Pipeline
          </span>
        )}
      </div>

      {/* Price + Score */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-xl font-bold text-white">{formatPrice(listing.price)}</span>
        <ScoreBadge score={listing.aiScore} />
      </div>

      {/* Title + Address */}
      <h3 className="text-sm text-white/70 truncate">{listing.title || 'Ohne Titel'}</h3>
      <p className="text-xs text-white/30 truncate mt-0.5">{listing.addressRaw || ''}</p>

      {/* Specs Row */}
      <div className="flex gap-3 mt-3 text-xs text-white/40">
        {listing.rooms && <span>{listing.rooms} Zi.</span>}
        {listing.areaSqm && <span>{listing.areaSqm} m²</span>}
      </div>

      {/* Yield + Red Flags */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3 min-h-[20px]">
        <YieldBadge yieldEst={listing.aiYieldEst} />
        {listing.aiRiskFlags?.slice(0, 3).map(flag => (
          <RedFlagIcon key={flag} flag={flag} />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        {!isPushed ? (
          <>
            <button
              onClick={() => onPushToPipeline(listing.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 hover:shadow-lg"
              style={{
                backgroundColor: `${AGENT_COLOR}15`,
                border: `1px solid ${AGENT_COLOR}30`,
                color: AGENT_COLOR,
              }}
            >
              <ArrowRightCircle className="w-3.5 h-3.5" />
              In Pipeline
            </button>
            <button
              onClick={() => onDismiss(listing.id)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-white/30 bg-white/[0.03] border border-white/[0.06] hover:text-white/50 hover:bg-white/[0.06] transition-all duration-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <a
            href={listing.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/40 bg-white/[0.03] border border-white/[0.06] hover:text-white/60 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Auf Portal ansehen
          </a>
        )}
      </div>
    </motion.div>
  );
}
