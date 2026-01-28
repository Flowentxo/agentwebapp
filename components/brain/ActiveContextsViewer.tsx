'use client';

import { MessageSquare, User, Clock } from 'lucide-react';

export function ActiveContextsViewer() {
  return (
    <div className="active-contexts">
      <h2>Active Conversation Contexts</h2>
      <div className="contexts-list">
        <div className="context-card">
          <div className="context-header">
            <MessageSquare size={20} />
            <span>Session #123</span>
          </div>
          <div className="context-info">
            <div><User size={14} /> User: john@example.com</div>
            <div><Clock size={14} /> 5 minutes ago</div>
          </div>
        </div>
      </div>
    </div>
  );
}
