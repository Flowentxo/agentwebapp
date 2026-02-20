'use client';

import { motion } from 'framer-motion';
import { SlidersHorizontal, ArrowUpDown, Search } from 'lucide-react';
import { useSentinelStore } from '@/store/sentinelStore';
import { DealCard } from './DealCard';

const AGENT_COLOR = '#92400E';

const sortOptions = [
  { value: 'score', label: 'Score' },
  { value: 'date', label: 'Neueste' },
  { value: 'price', label: 'Preis' },
] as const;

const scorePresets = [
  { value: 0, label: 'Alle' },
  { value: 50, label: '50+' },
  { value: 65, label: '65+' },
  { value: 80, label: '80+' },
] as const;

export function DealGrid() {
  const {
    listings,
    isLoadingListings,
    listingSort,
    listingMinScore,
    listingsMeta,
    setListingSort,
    setListingMinScore,
    setListingPage,
    fetchListings,
    pushToPipeline,
    dismissListing,
  } = useSentinelStore();

  const handlePush = async (id: string) => {
    await pushToPipeline([id]);
  };

  const handleDismiss = async (id: string) => {
    await dismissListing(id);
  };

  const handleSortChange = (sort: 'score' | 'date' | 'price') => {
    setListingSort(sort);
    fetchListings();
  };

  const handleScoreChange = (score: number) => {
    setListingMinScore(score);
    fetchListings();
  };

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white/80">Deals</h2>

        <div className="flex items-center gap-3">
          {/* Score filter */}
          <div className="flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-white/25" />
            {scorePresets.map(preset => (
              <button
                key={preset.value}
                onClick={() => handleScoreChange(preset.value)}
                className={`
                  px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all duration-200
                  ${listingMinScore === preset.value
                    ? 'text-white/70 bg-white/[0.08] border-white/[0.12]'
                    : 'text-white/25 bg-transparent border-transparent hover:text-white/40'}
                `}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-white/25" />
            {sortOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                className={`
                  px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all duration-200
                  ${listingSort === opt.value
                    ? 'text-white/70 bg-white/[0.08] border-white/[0.12]'
                    : 'text-white/25 bg-transparent border-transparent hover:text-white/40'}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoadingListings ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse">
              <div className="h-32 rounded-xl bg-white/[0.04] mb-4" />
              <div className="h-5 w-24 bg-white/[0.04] rounded mb-2" />
              <div className="h-3 w-32 bg-white/[0.03] rounded mb-4" />
              <div className="h-8 w-full bg-white/[0.03] rounded" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-16 text-center"
        >
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: `${AGENT_COLOR}10`, border: `1px solid ${AGENT_COLOR}20` }}
          >
            <Search className="w-6 h-6" style={{ color: `${AGENT_COLOR}60` }} />
          </div>
          <p className="text-sm text-white/30">Keine Deals gefunden</p>
          <p className="text-xs text-white/15 mt-1">
            Erstelle ein Suchprofil und starte deinen ersten Scan
          </p>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((listing, i) => (
              <DealCard
                key={listing.id}
                listing={listing}
                index={i}
                onPushToPipeline={handlePush}
                onDismiss={handleDismiss}
              />
            ))}
          </div>

          {/* Pagination */}
          {listingsMeta && listingsMeta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: Math.min(listingsMeta.totalPages, 5) }).map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => { setListingPage(page); fetchListings(); }}
                    className={`
                      w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200
                      ${listingsMeta.page === page
                        ? 'text-white/80 bg-white/[0.08] border border-white/[0.12]'
                        : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'}
                    `}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
