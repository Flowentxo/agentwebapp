'use client';

import Link from 'next/link';
import { AgentPersona } from '@/lib/agents/personas';
import { Badge } from '@/components/ui/badge';

interface AgentPersonaCardProps {
  agent: AgentPersona;
}

export function AgentPersonaCard({ agent }: AgentPersonaCardProps) {
  const Icon = agent.icon;

  return (
    <Link href={`/agents/${agent.id}/chat`}>
      <div
        className="agent-card group"
        style={{
          '--agent-color': agent.color
        } as React.CSSProperties}
      >
        {/* Avatar */}
        <div className="agent-avatar">
          <Icon className="icon" size={32} />
        </div>

        {/* Content */}
        <div className="agent-content">
          <div className="agent-header">
            <h3 className="agent-name">{agent.name}</h3>
            <span className="agent-role">{agent.role}</span>
          </div>

          <p className="agent-bio">{agent.bio}</p>

          {/* Specialties */}
          <div className="agent-specialties">
            {agent.specialties.slice(0, 3).map((specialty) => (
              <Badge key={specialty} variant="secondary" className="specialty-badge">
                {specialty}
              </Badge>
            ))}
            {agent.specialties.length > 3 && (
              <Badge variant="outline" className="more-badge">
                +{agent.specialties.length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Status Badge */}
        {agent.status !== 'active' && (
          <div className="status-badge">
            {agent.status === 'beta' ? 'Beta' : 'Coming Soon'}
          </div>
        )}
      </div>
    </Link>
  );
}
