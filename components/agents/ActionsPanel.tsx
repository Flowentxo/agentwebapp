'use client';

/**
 * ACTIONS PANEL
 *
 * Configure custom actions (API integrations) for agents
 */

import { useState } from 'react';
import { Zap, Plus, X, ExternalLink, Loader2, CheckCircle, Code } from 'lucide-react';

interface CustomAction {
  id: string;
  name: string;
  description: string;
  schema: any; // OpenAPI schema
  authentication: {
    type: 'none' | 'api_key' | 'oauth';
    config?: Record<string, any>;
  };
  enabled: boolean;
}

interface ActionsPanelProps {
  agentId?: string;
}

const PREDEFINED_ACTIONS = [
  {
    name: 'Send Email',
    description: 'Send emails via Gmail or SMTP',
    icon: '📧',
    category: 'communication',
  },
  {
    name: 'Send Slack Message',
    description: 'Post messages to Slack channels',
    icon: '💬',
    category: 'communication',
  },
  {
    name: 'Create Calendar Event',
    description: 'Schedule events in Google Calendar',
    icon: '📅',
    category: 'productivity',
  },
  {
    name: 'GitHub Integration',
    description: 'Create issues, PRs, and manage repositories',
    icon: '🐙',
    category: 'development',
  },
  {
    name: 'Notion API',
    description: 'Create and update Notion pages',
    icon: '📝',
    category: 'productivity',
  },
  {
    name: 'Airtable',
    description: 'Create and update Airtable records',
    icon: '🗂️',
    category: 'data',
  },
];

export function ActionsPanel({ agentId }: ActionsPanelProps) {
  const [actions, setActions] = useState<CustomAction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOpenAPIModal, setShowOpenAPIModal] = useState(false);
  const [openAPISchema, setOpenAPISchema] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddPredefinedAction = (actionTemplate: typeof PREDEFINED_ACTIONS[0]) => {
    const newAction: CustomAction = {
      id: `action-${Date.now()}`,
      name: actionTemplate.name,
      description: actionTemplate.description,
      schema: {}, // Will be populated
      authentication: {
        type: 'none',
      },
      enabled: true,
    };

    setActions((prev) => [...prev, newAction]);
    setShowAddModal(false);
  };

  const handleImportOpenAPI = async () => {
    if (!openAPISchema.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/actions/import-openapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema: JSON.parse(openAPISchema),
          agentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import OpenAPI schema');
      }

      const result = await response.json();

      // Add imported actions
      if (result.actions) {
        setActions((prev) => [...prev, ...result.actions]);
      }

      setShowOpenAPIModal(false);
      setOpenAPISchema('');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import OpenAPI schema. Please check the format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAction = (actionId: string) => {
    setActions((prev) =>
      prev.map((action) =>
        action.id === actionId ? { ...action, enabled: !action.enabled } : action
      )
    );
  };

  const handleRemoveAction = (actionId: string) => {
    setActions((prev) => prev.filter((action) => action.id !== actionId));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">Custom Actions</h3>
        <p className="text-sm text-text-muted">
          Connect your agent to external APIs and services. Actions let your agent take real-world actions.
        </p>
      </div>

      {/* Add Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Action
        </button>
        <button
          onClick={() => setShowOpenAPIModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-surface transition-colors text-sm font-medium text-text"
        >
          <Code className="h-4 w-4" />
          Import OpenAPI
        </button>
      </div>

      {/* Actions List */}
      {actions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text">
            Configured Actions ({actions.length})
          </h4>

          <div className="space-y-2">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Zap className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text">{action.name}</p>
                    <p className="text-xs text-text-muted">{action.description}</p>
                    {action.authentication.type !== 'none' && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-500">
                          {action.authentication.type === 'api_key' ? 'API Key' : 'OAuth'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={action.enabled}
                      onChange={() => handleToggleAction(action.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                  <button
                    onClick={() => handleRemoveAction(action.id)}
                    className="p-1 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {actions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <Zap className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <h4 className="text-lg font-medium text-text mb-2">No Actions Yet</h4>
          <p className="text-sm text-text-muted mb-4">
            Add actions to let your agent interact with external services
          </p>
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h4 className="text-sm font-medium text-text mb-2">💡 How it works</h4>
        <ul className="text-xs text-text-muted space-y-1">
          <li>• Actions extend your agent with real-world capabilities</li>
          <li>• Use predefined actions or import custom OpenAPI schemas</li>
          <li>• Your agent will automatically call actions when needed</li>
          <li>• Supports API key and OAuth authentication</li>
        </ul>
      </div>

      {/* Add Action Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-border sticky top-0 bg-surface">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text">Add Action</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded hover:bg-background transition-colors"
                >
                  <X className="h-5 w-5 text-text-muted" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {PREDEFINED_ACTIONS.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAddPredefinedAction(action)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-background transition-colors text-left"
                >
                  <div className="text-3xl">{action.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">{action.name}</p>
                    <p className="text-xs text-text-muted">{action.description}</p>
                  </div>
                  <Plus className="h-5 w-5 text-text-muted" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OpenAPI Import Modal */}
      {showOpenAPIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border max-w-2xl w-full">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text">Import OpenAPI Schema</h3>
                <button
                  onClick={() => setShowOpenAPIModal(false)}
                  className="p-1 rounded hover:bg-background transition-colors"
                >
                  <X className="h-5 w-5 text-text-muted" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-text-muted mb-4">
                Paste your OpenAPI 3.0 schema (JSON format) below:
              </p>
              <textarea
                value={openAPISchema}
                onChange={(e) => setOpenAPISchema(e.target.value)}
                placeholder='{"openapi": "3.0.0", "info": {...}, "paths": {...}}'
                rows={12}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text placeholder-text-muted outline-none focus:border-primary transition-colors resize-none font-mono text-xs"
              />
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowOpenAPIModal(false)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-background transition-colors text-sm font-medium text-text"
              >
                Cancel
              </button>
              <button
                onClick={handleImportOpenAPI}
                disabled={!openAPISchema.trim() || isLoading}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Code className="h-4 w-4" />
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
