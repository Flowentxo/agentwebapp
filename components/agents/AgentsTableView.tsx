'use client';

import { Agent } from '@/hooks/useAgents';
import {
  MoreVertical,
  MessageSquare,
  Edit,
  Copy,
  Power,
  Trash2,
  Calendar,
  User,
  CheckSquare,
  Square
} from 'lucide-react';
import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AgentsTableViewProps {
  items: Agent[];
  onAction: (action: string, agent: Agent) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  searchQuery?: string;
}

export function AgentsTableView({
  items,
  onAction,
  selectedIds = new Set(),
  onSelectionChange,
  onSelectAll,
  searchQuery = ''
}: AgentsTableViewProps) {
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const allSelected = items.length > 0 && items.every(item => selectedIds.has(item.id));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'disabled':
        return '#ef4444';
      case 'draft':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return '💬';
      case 'tool':
        return '🔧';
      case 'workflow':
        return '⚡';
      default:
        return '🤖';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={i} className="search-highlight">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className="agents-table-container">
      <table className="agents-table">
        <thead>
          <tr>
            {onSelectAll && (
              <th className="table-cell-checkbox">
                <button
                  onClick={() => onSelectAll(!allSelected)}
                  className="checkbox-button"
                  aria-label={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
              </th>
            )}
            <th className="table-cell-agent">Agent</th>
            <th className="table-cell-status">Status</th>
            <th className="table-cell-type">Type</th>
            <th className="table-cell-tags">Tags</th>
            <th className="table-cell-owner">Owner</th>
            <th className="table-cell-updated">Updated</th>
            <th className="table-cell-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((agent) => {
            const IconComponent = agent.icon
              ? (LucideIcons as any)[agent.icon] || MessageSquare
              : MessageSquare;
            const isSelected = selectedIds.has(agent.id);
            const isMenuOpen = menuOpenFor === agent.id;

            return (
              <tr
                key={agent.id}
                className={`table-row ${isSelected ? 'selected' : ''}`}
                onClick={() => onAction('open', agent)}
              >
                {onSelectionChange && (
                  <td
                    className="table-cell-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onSelectionChange(agent.id, !isSelected)}
                      className="checkbox-button"
                      aria-label={isSelected ? 'Deselect agent' : 'Select agent'}
                    >
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                )}

                <td className="table-cell-agent">
                  <div className="agent-info-cell">
                    <div
                      className="agent-avatar-small"
                      style={{
                        background: agent.color
                          ? `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)`
                          : '#3b82f6',
                      }}
                    >
                      <IconComponent size={16} color="white" />
                    </div>
                    <div className="agent-text-info">
                      <div className="agent-name-text">{highlightText(agent.name)}</div>
                      <div className="agent-description-text">
                        {highlightText(agent.description)}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="table-cell-status">
                  <span
                    className="status-badge-small"
                    style={{
                      backgroundColor: `${getStatusColor(agent.status)}20`,
                      color: getStatusColor(agent.status),
                      borderColor: `${getStatusColor(agent.status)}40`,
                    }}
                  >
                    <span
                      className="status-dot"
                      style={{ backgroundColor: getStatusColor(agent.status) }}
                    />
                    {agent.status}
                  </span>
                </td>

                <td className="table-cell-type">
                  <span className="type-badge">
                    <span className="type-icon">{getTypeIcon(agent.type)}</span>
                    {agent.type}
                  </span>
                </td>

                <td className="table-cell-tags">
                  <div className="tags-compact">
                    {agent.tags?.slice(0, 2).map((tag, index) => (
                      <TooltipProvider key={index}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="tag-compact">
                              {highlightText(tag)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tag: {tag}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    {agent.tags && agent.tags.length > 2 && (
                      <span className="tag-more">+{agent.tags.length - 2}</span>
                    )}
                  </div>
                </td>

                <td className="table-cell-owner">
                  {agent.owner && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="owner-compact">
                            <User size={12} />
                            <span>{agent.owner.name}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Created by {agent.owner.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </td>

                <td className="table-cell-updated">
                  <div className="updated-compact">
                    <Calendar size={12} />
                    <span>{formatDate(agent.updatedAt)}</span>
                  </div>
                </td>

                <td className="table-cell-actions" onClick={(e) => e.stopPropagation()}>
                  <div className="table-actions">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="action-button-small"
                            onClick={() => onAction('open', agent)}
                            aria-label="Open agent"
                          >
                            <MessageSquare size={16} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open & Chat</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="menu-container-table">
                      <button
                        className="action-button-small"
                        onClick={() => setMenuOpenFor(isMenuOpen ? null : agent.id)}
                        aria-label="More actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="menu-overlay"
                            onClick={() => setMenuOpenFor(null)}
                          />
                          <div className="menu-dropdown-table">
                            <button
                              className="menu-item"
                              onClick={() => {
                                onAction('edit', agent);
                                setMenuOpenFor(null);
                              }}
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                            <button
                              className="menu-item"
                              onClick={() => {
                                onAction('duplicate', agent);
                                setMenuOpenFor(null);
                              }}
                            >
                              <Copy size={14} />
                              Duplicate
                            </button>
                            <div className="menu-divider" />
                            <button
                              className="menu-item"
                              onClick={() => {
                                onAction(
                                  agent.status === 'active' ? 'disable' : 'enable',
                                  agent
                                );
                                setMenuOpenFor(null);
                              }}
                            >
                              <Power size={14} />
                              {agent.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              className="menu-item danger"
                              onClick={() => {
                                onAction('delete', agent);
                                setMenuOpenFor(null);
                              }}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
