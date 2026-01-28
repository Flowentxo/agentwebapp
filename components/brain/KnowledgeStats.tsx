'use client';

/**
 * Knowledge Stats - Overview Cards
 * Displays key metrics for Brain AI system
 */

import { useState, useEffect } from 'react';
import { FileText, MessageSquare, Search, Database } from 'lucide-react';

interface KnowledgeStatsProps {
  initialStats?: any;
}

export function KnowledgeStats({ initialStats }: KnowledgeStatsProps) {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    if (!initialStats) {
      fetchStats();
    }
  }, [initialStats]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/brain/metrics');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="brain-stats-loading">Loading stats...</div>;
  }

  const metrics = stats?.metrics || {};

  const statCards = [
    {
      icon: FileText,
      label: 'Total Documents',
      value: metrics.documents?.total || 0,
      change: `+${metrics.documents?.last24h || 0} today`,
      color: 'blue',
    },
    {
      icon: MessageSquare,
      label: 'Active Contexts',
      value: metrics.contexts?.total || 0,
      change: `${metrics.contexts?.uniqueSessions || 0} sessions`,
      color: 'green',
    },
    {
      icon: Search,
      label: 'Total Queries',
      value: metrics.queries?.total7d || 0,
      change: `${metrics.queries?.last1h || 0} last hour`,
      color: 'purple',
    },
    {
      icon: Database,
      label: 'Cache Hit Rate',
      value: `${metrics.cache?.keys || 0}`,
      change: stats?.services?.redis?.connected ? 'Connected' : 'Offline',
      color: stats?.services?.redis?.connected ? 'teal' : 'gray',
    },
  ];

  return (
    <div className="brain-stats-grid">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`brain-stat-card brain-stat-${stat.color}`}
        >
          <div className="brain-stat-header">
            <stat.icon className="brain-stat-icon" size={20} />
            <span className="brain-stat-label">{stat.label}</span>
          </div>

          <div className="brain-stat-value">{stat.value.toLocaleString()}</div>

          <div className="brain-stat-change">{stat.change}</div>
        </div>
      ))}
    </div>
  );
}
