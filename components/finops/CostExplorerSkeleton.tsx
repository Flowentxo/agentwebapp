'use client';

/**
 * CostExplorer Skeleton Loader
 * Shows animated placeholder while data is loading
 */
export function CostExplorerSkeleton() {
  return (
    <div className="flex h-full bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden animate-pulse">
      {/* Filter Sidebar Skeleton */}
      <div className="w-52 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
          <div className="h-4 w-16 bg-zinc-700 rounded" />
          <div className="h-4 w-4 bg-zinc-700 rounded" />
        </div>

        {/* Filter Groups */}
        <div className="px-2 py-2 border-b border-zinc-800">
          <div className="h-3 w-20 bg-zinc-700 rounded mb-2" />
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-7 bg-zinc-800 rounded" />
            ))}
          </div>
        </div>

        <div className="py-2 px-2 space-y-2">
          <div className="h-3 w-16 bg-zinc-700 rounded" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-zinc-800 rounded" />
          ))}
        </div>
      </div>

      {/* Chart Area Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Chart Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-zinc-700 rounded-full" />
                <div className="h-3 w-12 bg-zinc-700 rounded" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-20 bg-zinc-700 rounded" />
            ))}
          </div>
        </div>

        {/* Chart Skeleton */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Y-Axis labels */}
          <div className="flex h-full">
            <div className="w-12 flex flex-col justify-between py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-3 w-8 bg-zinc-800 rounded" />
              ))}
            </div>

            {/* Chart area */}
            <div className="flex-1 flex flex-col justify-end px-2">
              {/* Fake bars/area */}
              <div className="flex items-end justify-around h-full gap-1 pb-8">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-blue-500/20 to-blue-500/5 rounded-t"
                    style={{
                      height: `${30 + Math.sin(i * 0.5) * 20 + Math.random() * 30}%`,
                    }}
                  />
                ))}
              </div>

              {/* X-Axis labels */}
              <div className="flex justify-between pt-2 border-t border-zinc-800">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-3 w-8 bg-zinc-800 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MetricRibbon Skeleton
 */
export function MetricRibbonSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 animate-pulse">
      {/* Metrics */}
      <div className="flex items-center gap-3 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-zinc-700 rounded" />
              <div className="h-3 w-16 bg-zinc-700 rounded" />
            </div>
            <div className="h-6 w-20 bg-zinc-700 rounded mb-1" />
            <div className="h-3 w-12 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-24 bg-zinc-800 rounded" />
        <div className="h-8 w-20 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

/**
 * PolicyTable Skeleton
 */
export function PolicyTableSkeleton() {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-zinc-700 rounded" />
          <div className="h-4 w-6 bg-zinc-800 rounded" />
        </div>
        <div className="h-7 w-24 bg-blue-600/30 rounded" />
      </div>

      {/* Table Header */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
        {[80, 50, 60, 120, 50, 60].map((w, i) => (
          <div key={i} className={`h-3 bg-zinc-700 rounded`} style={{ width: w }} />
        ))}
      </div>

      {/* Rows */}
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50"
        >
          <div className="w-[80px]">
            <div className="h-4 w-full bg-zinc-800 rounded mb-1" />
            <div className="h-3 w-2/3 bg-zinc-800 rounded" />
          </div>
          <div className="w-[50px] h-5 bg-zinc-800 rounded" />
          <div className="w-[60px] h-4 bg-zinc-800 rounded" />
          <div className="w-[120px]">
            <div className="h-4 bg-zinc-800 rounded mb-1" />
            <div className="h-1 bg-zinc-800 rounded-full" />
          </div>
          <div className="w-[50px] h-5 bg-zinc-800 rounded" />
          <div className="w-[60px] h-5 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * GranularLedger Skeleton
 */
export function GranularLedgerSkeleton() {
  return (
    <div className="h-full flex flex-col bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-zinc-700 rounded" />
          <div className="h-4 w-8 bg-zinc-800 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-32 bg-zinc-800 rounded" />
          <div className="h-6 w-20 bg-zinc-800 rounded" />
          <div className="h-6 w-20 bg-zinc-800 rounded" />
        </div>
      </div>

      {/* Table Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/30">
        {[60, 50, 60, 40, 40, 40, 35, 35, 30, 40].map((w, i) => (
          <div key={i} className={`h-2.5 bg-zinc-700 rounded`} style={{ width: w }} />
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/30"
          >
            {[60, 50, 60, 40, 40, 40, 35, 35, 30, 40].map((w, j) => (
              <div key={j} className={`h-3 bg-zinc-800 rounded`} style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800 bg-zinc-900/50">
        <div className="h-3 w-32 bg-zinc-800 rounded" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-zinc-800 rounded" />
          <div className="h-3 w-16 bg-zinc-800 rounded" />
          <div className="h-6 w-6 bg-zinc-800 rounded" />
        </div>
      </div>
    </div>
  );
}
