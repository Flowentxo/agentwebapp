'use client';

import { Clock } from 'lucide-react';

export function RecentActivity({ initialActivity }: any) {
  const activities = initialActivity?.suggestions?.popularQueries || [];

  return (
    <div className="recent-activity">
      <h3>Recent Activity</h3>
      {activities.map((activity: any, i: number) => (
        <div key={i} className="activity-item">
          <Clock size={14} />
          <span>{activity.query || activity}</span>
        </div>
      ))}
    </div>
  );
}
