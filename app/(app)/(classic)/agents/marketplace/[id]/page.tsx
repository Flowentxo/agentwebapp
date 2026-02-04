'use client';

/**
 * MARKETPLACE AGENT DETAIL PAGE
 *
 * View detailed information about a marketplace agent before installing
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Download,
  Shield,
  Sparkles,
  Code,
  Globe,
  Image,
  Database,
  Zap,
  CheckCircle2,
  Calendar,
  User,
} from 'lucide-react';

interface MarketplaceAgentDetail {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdBy: string;
  usageCount: number;
  rating: number;
  tags: string[];
  capabilities: {
    webBrowsing: boolean;
    codeInterpreter: boolean;
    imageGeneration: boolean;
    knowledgeBase: boolean;
    customActions: boolean;
  };
  systemInstructions: string;
  model: string;
  conversationStarters: string[];
  publishedAt: string;
}

const capabilityIcons = {
  webBrowsing: Globe,
  codeInterpreter: Code,
  imageGeneration: Image,
  knowledgeBase: Database,
  customActions: Zap,
};

const capabilityLabels = {
  webBrowsing: 'Web Browsing',
  codeInterpreter: 'Code Interpreter',
  imageGeneration: 'Image Generation',
  knowledgeBase: 'Knowledge Base',
  customActions: 'Custom Actions',
};

export default function MarketplaceAgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<MarketplaceAgentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  const loadAgent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/agents/marketplace/${agentId}`);
      const data = await response.json();

      if (data.success) {
        setAgent(data.agent);
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      const response = await fetch('/api/agents/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/agents/${result.newAgentId}/chat`);
      }
    } catch (error) {
      console.error('Failed to install agent:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-text-muted">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-text mb-4">Agent not found</p>
          <button
            onClick={() => router.push('/agents/marketplace')}
            className="text-primary hover:underline"
          >
            ← Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const enabledCapabilities = Object.entries(agent.capabilities)
    .filter(([_, enabled]) => enabled)
    .map(([key, _]) => key as keyof typeof agent.capabilities);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/agents/marketplace')}
          className="mb-6 flex items-center gap-2 text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Marketplace
        </button>

        {/* Header */}
        <div className="bg-surface border border-border rounded-xl p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Icon */}
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ backgroundColor: agent.color }}
            >
              {agent.icon}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text mb-2">
                {agent.name}
              </h1>
              <p className="text-lg text-text-muted mb-4">
                {agent.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <Star size={18} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-text font-medium">
                    {agent.rating.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Download size={18} className="text-text-muted" />
                  <span className="text-text">
                    {agent.usageCount.toLocaleString()} installs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={18} className="text-text-muted" />
                  <span className="text-text">{agent.createdBy}</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {agent.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-background text-sm text-text-muted rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Install Button */}
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Installing...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Install Agent
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Capabilities */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                Capabilities
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {enabledCapabilities.map((capability) => {
                  const Icon = capabilityIcons[capability];
                  const label = capabilityLabels[capability];
                  return (
                    <div
                      key={capability}
                      className="flex items-center gap-3 p-3 bg-background rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon size={20} className="text-primary" />
                      </div>
                      <span className="text-text">{label}</span>
                    </div>
                  );
                })}
                {enabledCapabilities.length === 0 && (
                  <p className="text-text-muted col-span-2">
                    No special capabilities enabled
                  </p>
                )}
              </div>
            </div>

            {/* System Instructions */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
                <Shield size={20} className="text-primary" />
                System Instructions
              </h2>
              <p className="text-text-muted whitespace-pre-wrap">
                {agent.systemInstructions}
              </p>
            </div>

            {/* Conversation Starters */}
            {agent.conversationStarters &&
              agent.conversationStarters.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
                    <Sparkles size={20} className="text-primary" />
                    Example Prompts
                  </h2>
                  <div className="space-y-2">
                    {agent.conversationStarters.map((starter, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-3 bg-background rounded-lg"
                      >
                        <CheckCircle2
                          size={18}
                          className="text-primary mt-0.5 flex-shrink-0"
                        />
                        <span className="text-text">{starter}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="font-semibold text-text mb-4">Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-text-muted mb-1">Model</p>
                  <p className="text-sm text-text">{agent.model}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Published</p>
                  <p className="text-sm text-text">
                    {new Date(agent.publishedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Creator</p>
                  <p className="text-sm text-text">{agent.createdBy}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
