'use client';

import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MiniSparklineProps {
  data: Array<[number, number]>;
  color: string;
}

export function MiniSparkline({ data, color }: MiniSparklineProps) {
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (containerRef.current && containerRef.current.offsetWidth > 0) {
        setIsMounted(true);
      } else {
        setTimeout(() => setIsMounted(true), 100);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Transform data for Recharts
  const chartData = data.map(([ts, value]) => ({
    value,
  }));

  // Extract color from bg-* class
  const strokeColor = color.includes('primary')
    ? 'hsl(262 83% 68%)'
    : color.includes('success')
    ? 'hsl(142 76% 46%)'
    : color.includes('warning')
    ? 'hsl(38 92% 50%)'
    : 'hsl(0 72% 51%)';

  return (
    <div ref={containerRef} className="h-12 w-full" style={{ minHeight: 48, minWidth: 48 }}>
      {isMounted && (
        <ResponsiveContainer width="100%" height="100%" minHeight={48} minWidth={48}>
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
              animationDuration={200}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
