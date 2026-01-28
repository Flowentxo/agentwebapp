'use client';

import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface HealthDonutProps {
  health: {
    ok: number;
    degraded: number;
    error: number;
  };
}

const COLORS = {
  ok: 'hsl(142 76% 46%)', // success
  degraded: 'hsl(38 92% 50%)', // warning
  error: 'hsl(0 72% 51%)', // error
};

export function HealthDonut({ health }: HealthDonutProps) {
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

  const data = [
    { name: 'OK', value: health.ok, color: COLORS.ok },
    { name: 'Eingeschränkt', value: health.degraded, color: COLORS.degraded },
    { name: 'Fehler', value: health.error, color: COLORS.error },
  ].filter((item) => item.value > 0); // Only show segments with values

  const total = health.ok + health.degraded + health.error;

  return (
    <div ref={containerRef} className="relative h-32 w-32" style={{ minHeight: 128, minWidth: 128 }}>
      {isMounted && (
        <ResponsiveContainer width="100%" height="100%" minHeight={128} minWidth={128}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
              animationDuration={200}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      )}

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="mono text-2xl font-bold text-text">{total}</p>
        <p className="text-xs text-text-muted">Agents</p>
      </div>
    </div>
  );
}
