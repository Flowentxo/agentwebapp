/**
 * Unit tests for useDashboard hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboard } from '@/lib/hooks/useDashboard';
import { type Agent } from '@/components/dashboard/TopAgentsCompact';

describe('useDashboard', () => {
  const mockAgents: Agent[] = [
    {
      id: 'agent1',
      name: 'Agent 1',
      status: 'ok',
      requests24h: 1000,
      successRate24h: 95,
      avgTimeMs24h: 800,
      tags: ['test'],
      buildStatus: 'complete',
    },
    {
      id: 'agent2',
      name: 'Agent 2',
      status: 'degraded',
      requests24h: 500,
      successRate24h: 85,
      avgTimeMs24h: 1200,
      tags: ['test'],
      state: 'ready',
    },
    {
      id: 'agent3',
      name: 'Agent 3',
      status: 'error',
      requests24h: 200,
      successRate24h: 70,
      avgTimeMs24h: 1500,
      tags: ['test'],
      isComplete: true,
    },
  ];

  it('should calculate correct health distribution', () => {
    const { result } = renderHook(() => useDashboard(mockAgents));

    expect(result.current.health).toEqual({
      ok: 1,
      degraded: 1,
      error: 1,
    });
  });

  it('should calculate correct aggregated KPIs', () => {
    const { result } = renderHook(() => useDashboard(mockAgents));

    // Total requests
    expect(result.current.kpi.requests).toBe(1700);

    // Average success rate
    const avgSuccess = (95 + 85 + 70) / 3;
    expect(result.current.kpi.successPct).toBeCloseTo(avgSuccess, 1);

    // Average time in seconds
    const avgTimeMs = (800 + 1200 + 1500) / 3;
    const avgTimeSec = avgTimeMs / 1000;
    expect(result.current.kpi.avgTimeSec).toBeCloseTo(avgTimeSec, 2);

    // Error percentage
    const errorPct = 100 - avgSuccess;
    expect(result.current.kpi.errorPct).toBeCloseTo(errorPct, 1);
  });

  it('should generate time series data for all metrics', () => {
    const { result } = renderHook(() => useDashboard(mockAgents));

    expect(result.current.series.requests).toBeDefined();
    expect(result.current.series.success).toBeDefined();
    expect(result.current.series.avgTime).toBeDefined();
    expect(result.current.series.errors).toBeDefined();

    // Should have 24 data points (hourly for 24h)
    expect(result.current.series.requests.length).toBe(24);
    expect(result.current.series.success.length).toBe(24);
    expect(result.current.series.avgTime.length).toBe(24);
    expect(result.current.series.errors.length).toBe(24);
  });

  it('should provide capacity metrics', () => {
    const { result } = renderHook(() => useDashboard(mockAgents));

    expect(result.current.capacity).toHaveProperty('rateLimit');
    expect(result.current.capacity).toHaveProperty('tokens');

    expect(result.current.capacity.rateLimit).toHaveProperty('used');
    expect(result.current.capacity.rateLimit).toHaveProperty('limit');

    expect(result.current.capacity.tokens).toHaveProperty('today');
    expect(result.current.capacity.tokens).toHaveProperty('week');
  });

  it('should generate incidents list', () => {
    const { result } = renderHook(() => useDashboard(mockAgents));

    expect(result.current.incidents).toBeDefined();
    expect(Array.isArray(result.current.incidents)).toBe(true);
    expect(result.current.incidents.length).toBeGreaterThan(0);

    // Check incident structure
    const incident = result.current.incidents[0];
    expect(incident).toHaveProperty('id');
    expect(incident).toHaveProperty('at');
    expect(incident).toHaveProperty('type');
    expect(incident).toHaveProperty('message');
  });

  it('should handle empty agents array', () => {
    const { result } = renderHook(() => useDashboard([]));

    expect(result.current.health).toEqual({
      ok: 0,
      degraded: 0,
      error: 0,
    });

    expect(result.current.kpi.requests).toBe(0);
    expect(result.current.kpi.successPct).toBe(0);
    expect(result.current.kpi.avgTimeSec).toBe(0);
    expect(result.current.kpi.errorPct).toBe(100);
  });

  it('should memoize results correctly', () => {
    const { result, rerender } = renderHook(
      ({ agents }) => useDashboard(agents),
      { initialProps: { agents: mockAgents } }
    );

    const firstResult = result.current;

    // Rerender with same agents
    rerender({ agents: mockAgents });
    expect(result.current).toBe(firstResult);

    // Rerender with different agents
    const newAgents = [...mockAgents, {
      id: 'agent4',
      name: 'Agent 4',
      status: 'ok',
      requests24h: 300,
      successRate24h: 90,
      avgTimeMs24h: 1000,
      tags: [],
    }];
    rerender({ agents: newAgents });
    expect(result.current).not.toBe(firstResult);
  });
});
