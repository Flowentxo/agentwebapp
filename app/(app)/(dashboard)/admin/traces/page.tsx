/**
 * AI TRACES EXPLORER PAGE
 *
 * Admin page for exploring and analyzing AI request traces.
 * Phase 3.2 of the observability roadmap.
 *
 * Features:
 * - Paginated trace list with filtering
 * - Real-time stats overview
 * - Detailed trace inspection drawer
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Cpu, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import TracesTable, { TraceFilters } from '@/components/admin/traces/TracesTable';
import TraceDetailDrawer, { TraceDetail } from '@/components/admin/traces/TraceDetailDrawer';

interface TracesResponse {
  traces: TraceDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    totalCost: number;
    totalTokens: number;
    avgResponseTime: number;
    successCount: number;
    failedCount: number;
    successRate: number;
  };
}

export default function TracesExplorerPage() {
  const [data, setData] = useState<TracesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedTrace, setSelectedTrace] = useState<TraceDetail | null>(null);
  const [filters, setFilters] = useState<TraceFilters>({
    search: '',
    status: '',
    provider: '',
    model: '',
  });

  const fetchTraces = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.provider) params.set('provider', filters.provider);
      if (filters.model) params.set('model', filters.model);

      const res = await fetch(`/api/admin/traces?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch traces');

      const responseData: TracesResponse = await res.json();
      setData(responseData);
    } catch (error) {
      console.error('[TRACES_PAGE] Error fetching traces:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset to first page on filter change
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search, filters.status, filters.provider, filters.model]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = () => {
    fetchTraces();
  };

  const handleFilterChange = (newFilters: TraceFilters) => {
    setFilters(newFilters);
  };

  const handleTraceClick = (trace: TraceDetail) => {
    setSelectedTrace(trace);
  };

  const handleDrawerClose = () => {
    setSelectedTrace(null);
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          Header
      ═══════════════════════════════════════════════════════════════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/admin"
              className="p-2 -ml-2 rounded-lg hover:bg-card/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Cpu className="w-7 h-7 text-cyan-400" />
              <span>AI Traces Explorer</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                <Activity className="w-3 h-3" />
                {data?.total?.toLocaleString('de-DE') || '0'} Traces
              </span>
            </h1>
          </div>
          <p className="text-white/50 ml-10">
            Monitor AI requests, track costs, and analyze performance across all providers
          </p>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          Traces Table
      ═══════════════════════════════════════════════════════════════ */}
      <TracesTable
        traces={data?.traces || []}
        total={data?.total || 0}
        page={data?.page || 1}
        limit={data?.limit || 50}
        totalPages={data?.totalPages || 1}
        stats={data?.stats || {
          totalCost: 0,
          totalTokens: 0,
          avgResponseTime: 0,
          successCount: 0,
          failedCount: 0,
          successRate: 100,
        }}
        isLoading={loading}
        onPageChange={handlePageChange}
        onRefresh={handleRefresh}
        onTraceClick={handleTraceClick}
        onFilterChange={handleFilterChange}
        filters={filters}
      />

      {/* ═══════════════════════════════════════════════════════════════
          Trace Detail Drawer
      ═══════════════════════════════════════════════════════════════ */}
      <TraceDetailDrawer trace={selectedTrace} onClose={handleDrawerClose} />
    </div>
  );
}
