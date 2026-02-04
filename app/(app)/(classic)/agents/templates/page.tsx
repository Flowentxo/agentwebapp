'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  agentTemplates,
  getFeaturedTemplates,
  getTemplatesByCategory,
  searchTemplates,
  AgentTemplate,
} from '@/lib/agents/templates';
import {
  Sparkles,
  Search,
  Star,
  ArrowRight,
  Check,
  TrendingUp,
} from 'lucide-react';

export default function AgentTemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  const categories = [
    { id: 'all', label: 'All Templates', count: agentTemplates.length },
    { id: 'support', label: 'Support', count: getTemplatesByCategory('support').length },
    { id: 'analytics', label: 'Analytics', count: getTemplatesByCategory('analytics').length },
    { id: 'productivity', label: 'Productivity', count: getTemplatesByCategory('productivity').length },
    { id: 'sales', label: 'Sales', count: getTemplatesByCategory('sales').length },
    { id: 'technical', label: 'Technical', count: getTemplatesByCategory('technical').length },
  ];

  // Filter templates
  let filteredTemplates = agentTemplates;

  if (searchQuery.trim()) {
    filteredTemplates = searchTemplates(searchQuery);
  } else if (selectedCategory !== 'all') {
    filteredTemplates = getTemplatesByCategory(selectedCategory as any);
  }

  const featuredTemplates = getFeaturedTemplates();

  const handleUseTemplate = async (template: AgentTemplate) => {
    try {
      // Create agent from template
      const response = await fetch('/api/agents/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          icon: template.icon,
          color: template.color,
          systemInstructions: template.systemInstructions,
          model: template.model,
          temperature: template.temperature,
          maxTokens: template.maxTokens,
          conversationStarters: template.conversationStarters,
          capabilities: template.capabilities,
          fallbackChain: 'standard',
          visibility: 'private',
          status: 'draft',
          tags: template.tags,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to edit page
        router.push(`/agents/studio/${result.data.id}`);
      } else {
        alert('Failed to create agent from template');
      }
    } catch (error) {
      console.error('Failed to use template:', error);
      alert('Failed to create agent from template');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Production-Ready Templates
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Start with a Template
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Professional AI agents ready to deploy in seconds. Clone, customize, and go live.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Category Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {cat.label}
              <span className="ml-2 text-xs opacity-70">({cat.count})</span>
            </button>
          ))}
        </div>

        {/* Featured Templates */}
        {selectedCategory === 'all' && !searchQuery && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <h2 className="text-2xl font-bold">Featured Templates</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={handleUseTemplate}
                  onPreview={setSelectedTemplate}
                  featured
                />
              ))}
            </div>
          </div>
        )}

        {/* All Templates */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {searchQuery
              ? `Search Results (${filteredTemplates.length})`
              : selectedCategory === 'all'
              ? 'All Templates'
              : `${categories.find((c) => c.id === selectedCategory)?.label} Templates`}
          </h2>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-16 border rounded-xl bg-card">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-6">
                Try a different search or browse all templates
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={handleUseTemplate}
                  onPreview={setSelectedTemplate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUse={handleUseTemplate}
        />
      )}
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  onUse,
  onPreview,
  featured = false,
}: {
  template: AgentTemplate;
  onUse: (template: AgentTemplate) => void;
  onPreview: (template: AgentTemplate) => void;
  featured?: boolean;
}) {
  return (
    <div
      className={`border rounded-xl p-6 bg-card hover:shadow-lg transition-shadow cursor-pointer ${
        featured ? 'ring-2 ring-primary/20' : ''
      }`}
      onClick={() => onPreview(template)}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: template.color + '20' }}
        >
          {template.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg truncate">{template.name}</h3>
            {template.featured && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-muted rounded-full capitalize">
              {template.category}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{'⭐'.repeat(template.popularity)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {template.description}
      </p>

      {/* Use Case */}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs font-medium mb-1">Use Case</p>
        <p className="text-sm">{template.useCase}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-1 bg-background rounded-full text-muted-foreground"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="text-xs px-2 py-1 text-muted-foreground">
            +{template.tags.length - 3}
          </span>
        )}
      </div>

      {/* Action */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUse(template);
        }}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 font-medium"
      >
        Use Template
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// Template Preview Modal
function TemplatePreviewModal({
  template,
  onClose,
  onUse,
}: {
  template: AgentTemplate;
  onClose: () => void;
  onUse: (template: AgentTemplate) => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: template.color + '20' }}
            >
              {template.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{template.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">
                {template.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{template.description}</p>
          </div>

          {/* Use Case */}
          <div>
            <h3 className="font-semibold mb-2">Use Case</h3>
            <p className="text-muted-foreground">{template.useCase}</p>
          </div>

          {/* Benefits */}
          <div>
            <h3 className="font-semibold mb-2">Benefits</h3>
            <ul className="space-y-2">
              {template.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ideal For */}
          <div>
            <h3 className="font-semibold mb-2">Ideal For</h3>
            <div className="flex flex-wrap gap-2">
              {template.idealFor.map((item, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Conversation Starters */}
          <div>
            <h3 className="font-semibold mb-2">Example Prompts</h3>
            <div className="space-y-2">
              {template.conversationStarters.map((starter, i) => (
                <div
                  key={i}
                  className="p-3 bg-muted rounded-lg text-sm text-muted-foreground"
                >
                  "{starter}"
                </div>
              ))}
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <h3 className="font-semibold mb-2">Capabilities</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(template.capabilities).map(([key, value]) => (
                <div
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    value ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  <span className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div>
            <h3 className="font-semibold mb-2">Configuration</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Model</p>
                <p className="font-medium">{template.model}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Temperature</p>
                <p className="font-medium">{template.temperature}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Max Tokens</p>
                <p className="font-medium">{template.maxTokens}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onUse(template);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 font-medium"
          >
            Use This Template
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
