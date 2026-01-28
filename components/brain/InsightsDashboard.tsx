'use client';

import { TrendingUp, Search, Users } from 'lucide-react';

export function InsightsDashboard({ initialStats }: any) {
  return (
    <div className="insights-dashboard">
      <h2>Analytics & Insights</h2>
      <div className="insights-grid">
        <div className="insight-card">
          <TrendingUp size={24} />
          <h3>Popular Queries</h3>
          <ul>
            <li>Q4 sales data - 45 searches</li>
            <li>Authentication setup - 32 searches</li>
          </ul>
        </div>
        <div className="insight-card">
          <Search size={24} />
          <h3>Search Performance</h3>
          <div>Avg Response: 850ms</div>
          <div>Cache Hit: 65%</div>
        </div>
        <div className="insight-card">
          <Users size={24} />
          <h3>Active Users</h3>
          <div>24 unique sessions today</div>
        </div>
      </div>
    </div>
  );
}
