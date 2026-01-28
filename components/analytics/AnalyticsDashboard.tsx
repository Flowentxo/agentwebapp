'use client';

import { MOCK_DASHBOARDS } from '@/lib/analytics/mockData';
import { FilterBar } from './FilterBar';
import { WidgetRenderer } from './WidgetRenderer';
import { UserProfileBox } from '@/components/shell/UserProfileBox';
import { Command, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';


import { useRouter } from 'next/navigation';
import { useAnalyticsSocket } from '@/hooks/useAnalyticsSocket';

export default function AnalyticsDashboard() {
  const router = useRouter(); // Initialize router
  const [selectedDashboardId, setSelectedDashboardId] = useState(MOCK_DASHBOARDS[0].id);

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard', selectedDashboardId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/dashboard/${selectedDashboardId}/data`);
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    staleTime: 60 * 1000, 
  });

  // Real-time Updates "Magic Moment" ✨
  useAnalyticsSocket(selectedDashboardId);

  const handleDrillDown = (metric: string) => {
    // Intelligent Routing based on Metric context
    if (metric.startsWith('cost.')) {
       setSelectedDashboardId('cost-analysis');
    } else if (metric.startsWith('agents.') || metric.startsWith('execution.')) {
       setSelectedDashboardId('agent-deep-dive');
    } else {
       // Default fallback
       console.log('Drill down:', metric);
    }
  };

  if (isLoading) {
     return (
        <div className="flex h-full items-center justify-center bg-transparent">
           <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-white/40 animate-pulse">Loading Intelligence...</p>
           </div>
        </div>
     );
  }

  if (error || !dashboard) {
     return (
        <div className="flex h-full items-center justify-center bg-transparent">
           <div className="text-center">
              <p className="text-red-400 font-bold mb-2">System Error</p>
              <p className="text-white/40 text-sm">Could not load dashboard data.</p>
              <button 
                 onClick={() => window.location.reload()}
                 className="mt-4 px-4 py-2 bg-card/5 hover:bg-card/10 rounded-lg text-xs font-bold text-white transition-colors"
              >
                 Retry Connection
              </button>
           </div>
        </div>
     );
  }

  return (
      <div className="min-h-full bg-transparent agents-layout-integrated overflow-hidden relative font-sans flex flex-col">
         {/* --- ENTERPRISE HEADER --- */}
         <div className="enterprise-header-wrap mb-8 flex items-start justify-between shrink-0">
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
                  <span className="opacity-50">SYSTEM</span>
                  <span className="opacity-30">/</span>
                  <span>ANALYTICS</span>
               </div>
               
               <div className="flex items-center gap-4">
                  <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                     <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        {dashboard.name}
                     </span>
                  </h1>
                  
                  {/* Dashboard Switcher */}
                  <div className="relative group z-50">
                     <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/5 border border-white/5 hover:bg-card/10 transition-colors text-xs font-bold text-white/60 hover:text-white uppercase tracking-wider">
                        Switch View
                     </button>
                     <div className="absolute top-full left-0 mt-2 w-48 py-1 rounded-xl bg-[#18181b] border border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-left">
                        {MOCK_DASHBOARDS.map(d => (
                           <button 
                              key={d.id}
                              onClick={() => setSelectedDashboardId(d.id)}
                              className={cn(
                                 "w-full text-left px-4 py-2 text-xs font-medium transition-colors hover:bg-card/5",
                                 selectedDashboardId === d.id ? "text-indigo-400 bg-indigo-500/5" : "text-white/60"
                              )}
                           >
                              {d.name}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-4">
                 <button
                    className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-card/5 px-4 text-xs font-bold text-white/60 transition-colors hover:bg-card/10 hover:text-white uppercase tracking-wider"
                    onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                 >
                    <Command className="w-3 h-3" />
                    <span className="hidden sm:inline">Schnellaktionen</span>
                    <kbd className="hidden rounded border border-white/10 bg-card/5 px-1.5 py-0.5 text-[10px] font-mono sm:inline ml-2">
                    ⌘K
                    </kbd>
                 </button>

                 <UserProfileBox />
            </div>
         </div>

         {/* --- FILTERS --- */}
         <div className="shrink-0">
            <FilterBar />
         </div>

         {/* --- DASHBOARD GRID --- */}
         <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {/* 12 Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 auto-rows-min">
               {dashboard.widgets.map((widget) => {
                  // Setup CSS Grid Placement
                  const style = {
                     gridColumn: `span ${widget.position.w}`,
                     gridRow: `span ${widget.position.h}`,
                  };

                  return (
                     // Using inline style for grid span, responsive standard via md: classes
                     <div 
                        key={widget.id} 
                        className={`
                           col-span-12 
                           md:col-span-${Math.min(widget.position.w * 2, 6)} 
                           lg:col-span-${widget.position.w}
                           min-h-[140px]
                        `}
                        style={{}} // We use classes for responsiveness instead of strict grid rows for now to be safer on mobile
                     >
                        <WidgetRenderer widget={widget} onDrillDown={handleDrillDown} />
                     </div>
                  );
               })}
            </div>
         </div>
      </div>
  );
}

