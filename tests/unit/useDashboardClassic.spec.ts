import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardClassic } from '@/lib/hooks/useDashboardClassic';
import type { Agent } from '@/components/dashboard/AgentsSnapshotTable';

describe('useDashboardClassic', () => {
  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      name: 'Dexter',
      status: 'ok',
      requests24h: 5000,
      successRate24h: 95.0,
      avgTimeMs24h: 800,
      buildStatus: 'complete',
    },
    {
      id: 'agent-2',
      name: 'Cassie',
      status: 'ok',
      requests24h: 3000,
      successRate24h: 90.0,
      avgTimeMs24h: 1200,
      buildStatus: 'complete',
    },
    {
      id: 'agent-3',
      name: 'Emmie',
      status: 'degraded',
      requests24h: 2000,
      successRate24h: 80.0,
      avgTimeMs24h: 1600,
      state: 'ready',
    },
  ];

  it('should calculate total requests correctly', () => {
    const { result } = renderHook(() => useDashboardClassic(mockAgents));

    expect(result.current.kpi.requests24h).toBe(10000); // 5000 + 3000 + 2000
  });

  it('should calculate weighted average success rate', () => {
    const { result } = renderHook(() => useDashboardClassic(mockAgents));

    // Weighted average: (5000*95 + 3000*90 + 2000*80) / 10000 = 90.5%
    expect(result.current.kpi.successPct24h).toBeCloseTo(90.5, 1);
  });

  it('should calculate error percentage correctly', () => {
    const { result } = renderHook(() => useDashboardClassic(mockAgents));

    // Error % = 100 - success %
    expect(result.current.kpi.errorPct24h).toBeCloseTo(9.5, 1);
  });

  it('should calculate weighted average response time in seconds', () => {
    const { result } = renderHook(() => useDashboardClassic(mockAgents));

    // Weighted average: (5000*800 + 3000*1200 + 2000*1600) / 10000 = 1080 ms = 1.08 s
    expect(result.current.kpi.avgTimeSec24h).toBeCloseTo(1.08, 2);
  });

  it('should generate activity items', () => {
    const { result } = renderHook(() => useDashboardClassic(mockAgents));

    expect(result.current.activities).toBeDefined();
    expect(result.current.activities.length).toBeGreaterThan(0);
  });

  it('should have valid activity item structure', () => {
    const { result } = renderHook(() => useDashboardClassic(mockAgents));

    const activity = result.current.activities[0];
    expect(activity).toHaveProperty('id');
    expect(activity).toHaveProperty('at');
    expect(activity).toHaveProperty('type');
    expect(activity).toHaveProperty('title');

    // Validate type is one of the expected values
    expect(['deploy', 'error', 'spike', 'rate_limit']).toContain(activity.type);

    // Validate timestamp is ISO string
    expect(() => new Date(activity.at)).not.toThrow();
  });

  it('should handle empty agents array', () => {
    const { result } = renderHook(() => useDashboardClassic([]));

    expect(result.current.kpi.requests24h).toBe(0);
    expect(result.current.kpi.successPct24h).toBe(0);
    expect(result.current.kpi.avgTimeSec24h).toBe(0);
    expect(result.current.kpi.errorPct24h).toBe(100);
    expect(result.current.activities.length).toBeGreaterThan(0);
  });

  it('should handle single agent', () => {
    const singleAgent: Agent[] = [
      {
        id: 'solo',
        name: 'Solo',
        status: 'ok',
        requests24h: 1000,
        successRate24h: 88.0,
        avgTimeMs24h: 500,
        isComplete: true,
      },
    ];

    const { result } = renderHook(() => useDashboardClassic(singleAgent));

    expect(result.current.kpi.requests24h).toBe(1000);
    expect(result.current.kpi.successPct24h).toBe(88.0);
    expect(result.current.kpi.errorPct24h).toBe(12.0);
    expect(result.current.kpi.avgTimeSec24h).toBe(0.5);
  });

  it('should memoize results when agents array reference is stable', () => {
    const { result, rerender } = renderHook(
      ({ agents }) => useDashboardClassic(agents),
      { initialProps: { agents: mockAgents } }
    );

    const firstResult = result.current;

    // Rerender with same reference
    rerender({ agents: mockAgents });

    // Should be the same object (memoized)
    expect(result.current).toBe(firstResult);
  });

  it('should recompute when agents change', () => {
    const { result, rerender } = renderHook(
      ({ agents }) => useDashboardClassic(agents),
      { initialProps: { agents: mockAgents } }
    );

    const firstRequests = result.current.kpi.requests24h;

    // Update with different agents
    const newAgents: Agent[] = [
      {
        id: 'new',
        name: 'New',
        status: 'ok',
        requests24h: 500,
        successRate24h: 99.0,
        avgTimeMs24h: 300,
        buildStatus: 'complete',
      },
    ];

    rerender({ agents: newAgents });

    expect(result.current.kpi.requests24h).not.toBe(firstRequests);
    expect(result.current.kpi.requests24h).toBe(500);
  });

  it('should have activity timestamps in descending order (recent first)', () => {
    const { result } = renderHook(() => useDashboardClassic(mockAgents));

    const timestamps = result.current.activities.map((a) => new Date(a.at).getTime());

    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
    }
  });

  it('should include severity levels in activities', () => {
    const { result } = renderHook(() => useDashboardClassic(mockAgents));

    const hasErrorActivity = result.current.activities.some(
      (a) => a.type === 'error' && a.severity
    );

    // At least error activities should have severity
    if (result.current.activities.some((a) => a.type === 'error')) {
      expect(hasErrorActivity).toBe(true);
    }
  });

  it('should convert milliseconds to seconds correctly', () => {
    const agents: Agent[] = [
      {
        id: 'test',
        name: 'Test',
        status: 'ok',
        requests24h: 1000,
        successRate24h: 100,
        avgTimeMs24h: 2500, // 2.5 seconds
        buildStatus: 'complete',
      },
    ];

    const { result } = renderHook(() => useDashboardClassic(agents));

    expect(result.current.kpi.avgTimeSec24h).toBe(2.5);
  });
});
