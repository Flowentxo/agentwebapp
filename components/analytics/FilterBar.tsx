'use client';

import { Filter, Calendar, Users, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function FilterBar() {
  const [activeRange, setActiveRange] = useState('7d');

  return (
    <div className="flex items-center gap-4 p-2 bg-card/[0.02] border border-white/5 rounded-xl mb-6">
      
      {/* Search / Filter Label */}
      <div className="flex items-center gap-2 px-3 py-1.5 text-white/40 border-r border-white/5">
        <Filter className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
      </div>

      {/* Workspace Selector */}
      <div className="relative group">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-card/5 text-white text-sm transition-colors">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>All Agents</span>
          <ChevronDown className="w-3 h-3 text-white/40" />
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="flex items-center bg-card/5 rounded-lg p-1 border border-white/5 ml-auto">
        {['24h', '7d', '30d', '90d'].map((range) => (
          <button
            key={range}
            onClick={() => setActiveRange(range)}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-md transition-all uppercase",
              activeRange === range 
                ? "bg-card/10 text-white shadow-sm" 
                : "text-white/40 hover:text-white hover:bg-card/5"
            )}
          >
            {range}
          </button>
        ))}
        <div className="w-[1px] h-4 bg-card/10 mx-1" />
        <button className="px-2 py-1 text-white/40 hover:text-white transition-colors">
          <Calendar className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
