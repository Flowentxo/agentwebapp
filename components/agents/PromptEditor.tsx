'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  Trash2,
  Plus,
  Star,
  Copy,
  Check,
  Edit,
  X,
  FileText,
} from 'lucide-react';

interface CustomPrompt {
  id: string;
  userId: string;
  agentId: string;
  name: string;
  description: string | null;
  promptText: string;
  isActive: boolean;
  isDefault: boolean;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PromptTemplate {
  id: string;
  agentId: string;
  name: string;
  description: string;
  promptText: string;
  category: string | null;
  isPublic: boolean;
  useCount: number;
}

interface PromptEditorProps {
  agentId: string;
  agentName: string;
  agentColor: string;
  onPromptChange?: (prompt: CustomPrompt | null) => void;
}

export function PromptEditor({ agentId, agentName, agentColor, onPromptChange }: PromptEditorProps) {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    promptText: '',
  });

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load user prompts and templates
  useEffect(() => {
    loadPrompts();
    loadTemplates();
  }, [agentId]);

  const loadPrompts = async () => {
    try {
      const response = await fetch(`/api/prompts/custom?agentId=${agentId}`);
      if (response.ok) {
        const data = await response.json();
        setPrompts(data.data || []);

        // Select default prompt if exists
        const defaultPrompt = data.data.find((p: CustomPrompt) => p.isDefault);
        if (defaultPrompt) {
          setSelectedPrompt(defaultPrompt);
        }
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/prompts/templates?agentId=${agentId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedPrompt(null);
    setFormData({
      name: '',
      description: '',
      promptText: '',
    });
  };

  const handleEdit = (prompt: CustomPrompt) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description || '',
      promptText: prompt.promptText,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.promptText.trim()) {
      alert('Name and prompt text are required');
      return;
    }

    if (formData.promptText.length < 10) {
      alert('Prompt text must be at least 10 characters');
      return;
    }

    setLoading(true);

    try {
      if (isCreating) {
        // Create new prompt
        const response = await fetch('/api/prompts/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId,
            ...formData,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await loadPrompts();
          setSelectedPrompt(data.data);
          setIsCreating(false);
          onPromptChange?.(data.data);
        }
      } else if (isEditing && selectedPrompt) {
        // Update existing prompt
        const response = await fetch(`/api/prompts/custom/${selectedPrompt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const data = await response.json();
          await loadPrompts();
          setSelectedPrompt(data.data);
          setIsEditing(false);
          onPromptChange?.(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Failed to save prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/prompts/custom/${promptId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPrompts();
        if (selectedPrompt?.id === promptId) {
          setSelectedPrompt(null);
          onPromptChange?.(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      alert('Failed to delete prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (promptId: string) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/prompts/custom/${promptId}/default`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      if (response.ok) {
        await loadPrompts();
        const data = await response.json();
        setSelectedPrompt(data.data);
        onPromptChange?.(data.data);
      }
    } catch (error) {
      console.error('Failed to set default:', error);
      alert('Failed to set default prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/prompts/templates/${templateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        await loadPrompts();
        setSelectedPrompt(data.data);
        setShowTemplates(false);
        onPromptChange?.(data.data);
      }
    } catch (error) {
      console.error('Failed to apply template:', error);
      alert('Failed to apply template');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setFormData({
      name: '',
      description: '',
      promptText: '',
    });
  };

  return (
    <div className="prompt-editor">
      {/* Header */}
      <div className="prompt-editor-header">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${agentColor}20, ${agentColor}40)`,
              color: agentColor,
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Custom Prompts</h3>
            <p className="text-sm text-muted-foreground">
              Customize {agentName}'s behavior
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium flex items-center gap-2"
          >
            <FileText size={16} />
            {showTemplates ? 'Hide Templates' : 'Browse Templates'}
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2"
            style={{ background: `linear-gradient(135deg, ${agentColor}, ${agentColor}dd)` }}
          >
            <Plus size={16} />
            Create New
          </button>
        </div>
      </div>

      {/* Templates Section */}
      {showTemplates && (
        <div className="prompt-templates">
          <h4 className="text-md font-semibold mb-3">Available Templates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((template) => (
              <div key={template.id} className="template-card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="font-medium">{template.name}</h5>
                    {template.category && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {template.category}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleApplyTemplate(template.id)}
                    disabled={loading}
                    className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="prompt-editor-content">
        {/* Sidebar: List of Prompts */}
        <div className="prompt-list">
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
            Your Prompts ({prompts.length})
          </h4>
          <div className="space-y-2">
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`prompt-item ${selectedPrompt?.id === prompt.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedPrompt(prompt);
                  setIsCreating(false);
                  setIsEditing(false);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{prompt.name}</span>
                      {prompt.isDefault && (
                        <Star size={14} className="text-yellow-500 flex-shrink-0" fill="currentColor" />
                      )}
                    </div>
                    {prompt.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {prompt.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {prompts.length === 0 && !isCreating && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                <p>No custom prompts yet</p>
                <p className="text-xs">Create one or apply a template</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Prompt Editor/Viewer */}
        <div className="prompt-content">
          {(isCreating || isEditing) ? (
            // Edit Mode
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Formal Business Analyst"
                  className="w-full px-3 py-2 rounded-lg border bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this prompt's style"
                  className="w-full px-3 py-2 rounded-lg border bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">System Prompt *</label>
                <textarea
                  value={formData.promptText}
                  onChange={(e) => setFormData({ ...formData, promptText: e.target.value })}
                  placeholder={`You are ${agentName}, an expert AI assistant...\n\nYOUR ROLE:\n- ...\n\nYOUR PERSONALITY:\n- ...`}
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
                  rows={16}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.promptText.length} characters (minimum 10)
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={loading || !formData.name.trim() || formData.promptText.length < 10}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : isCreating ? 'Create Prompt' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 font-medium flex items-center gap-2"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : selectedPrompt ? (
            // View Mode
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xl font-semibold">{selectedPrompt.name}</h4>
                    {selectedPrompt.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-xs font-medium flex items-center gap-1">
                        <Star size={12} fill="currentColor" />
                        Default
                      </span>
                    )}
                  </div>
                  {selectedPrompt.description && (
                    <p className="text-muted-foreground">{selectedPrompt.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {new Date(selectedPrompt.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  {!selectedPrompt.isDefault && (
                    <button
                      onClick={() => handleSetDefault(selectedPrompt.id)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm font-medium flex items-center gap-1"
                    >
                      <Star size={14} />
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(selectedPrompt)}
                    className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium flex items-center gap-1"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedPrompt.id)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">System Prompt</label>
                  <button
                    onClick={() => handleCopy(selectedPrompt.promptText)}
                    className="px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-xs flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check size={12} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="prompt-preview">
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {selectedPrompt.promptText}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div>
                <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No prompt selected</p>
                <p className="text-sm">Select a prompt or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .prompt-editor {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          height: 100%;
        }

        .prompt-editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .prompt-templates {
          padding: 1rem;
          border-bottom: 1px solid var(--border);
          background: var(--muted);
        }

        .template-card {
          padding: 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--card);
        }

        .prompt-editor-content {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 1rem;
          flex: 1;
          overflow: hidden;
        }

        .prompt-list {
          padding: 1rem;
          border-right: 1px solid var(--border);
          overflow-y: auto;
        }

        .prompt-item {
          padding: 0.75rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .prompt-item:hover {
          background: var(--muted);
        }

        .prompt-item.active {
          background: var(--primary-foreground);
          border-color: var(--primary);
        }

        .prompt-content {
          padding: 1rem;
          overflow-y: auto;
        }

        .prompt-preview {
          padding: 1rem;
          border-radius: 0.5rem;
          background: var(--muted);
          max-height: 400px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
