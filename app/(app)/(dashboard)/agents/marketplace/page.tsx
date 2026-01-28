'use client';

/**
 * AGENT MARKETPLACE
 *
 * Browse, search, and install community agents
 * - Public agents from other users
 * - Search and filter capabilities
 * - Agent ratings and reviews
 * - One-click installation
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Star,
  Download,
  TrendingUp,
  Filter,
  X,
  Sparkles,
  Users,
  Tag,
  ChevronDown,
} from 'lucide-react';

interface MarketplaceAgent {
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
  publishedAt: string;
}

const categories = [
  { id: 'all', label: 'All Agents', icon: Sparkles },
  { id: 'productivity', label: 'Productivity', icon: TrendingUp },
  { id: 'creative', label: 'Creative', icon: Sparkles },
  { id: 'technical', label: 'Technical', icon: Users },
  { id: 'business', label: 'Business', icon: TrendingUp },
];

const sortOptions = [
  { id: 'popular', label: 'Most Popular' },
  { id: 'recent', label: 'Recently Added' },
  { id: 'rating', label: 'Highest Rated' },
];

export default function AgentMarketplacePage() {
  const router = useRouter();
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<MarketplaceAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  // Load marketplace agents
  useEffect(() => {
    loadAgents();
  }, []);

  // Filter and sort agents
  useEffect(() => {
    let filtered = agents;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query) ||
          agent.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((agent) =>
        agent.tags.includes(selectedCategory)
      );
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'recent':
        filtered.sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
        );
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
    }

    setFilteredAgents(filtered);
  }, [agents, searchQuery, selectedCategory, sortBy]);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/agents/marketplace');
      const data = await response.json();

      if (data.success) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Failed to load marketplace:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallAgent = async (agentId: string) => {
    try {
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
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">
              Agent Marketplace
            </h1>
            <p className="text-text-muted">
              Discover and install community-created AI agents
            </p>
          </div>

          <button
            onClick={() => router.push('/agents/studio/create')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
          >
            <Sparkles size={20} />
            Create Your Own
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-muted"
              size={20}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-12 pr-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 pr-10 bg-surface border border-border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary text-text cursor-pointer"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none"
              size={20}
            />
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-lg border transition-colors flex items-center gap-2 ${
              showFilters
                ? 'bg-primary text-white border-primary'
                : 'bg-surface border-border text-text hover:bg-background'
            }`}
          >
            <Filter size={20} />
            Filters
          </button>
        </div>

        {/* Category Pills */}
        {showFilters && (
          <div className="flex gap-3 mb-6 flex-wrap">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                    selectedCategory === category.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface border-border text-text hover:bg-background'
                  }`}
                >
                  <Icon size={16} />
                  {category.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent Grid */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-xl p-6 animate-pulse"
              >
                <div className="w-12 h-12 bg-background rounded-lg mb-4"></div>
                <div className="h-6 bg-background rounded mb-3 w-3/4"></div>
                <div className="h-4 bg-background rounded mb-2"></div>
                <div className="h-4 bg-background rounded w-5/6"></div>
              </div>
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="mx-auto mb-4 text-text-muted" size={48} />
            <h3 className="text-xl font-semibold text-text mb-2">
              No agents found
            </h3>
            <p className="text-text-muted">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="bg-surface border border-border rounded-xl p-6 hover:border-primary transition-colors cursor-pointer group"
                onClick={() => router.push(`/agents/marketplace/${agent.id}`)}
              >
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-4"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.icon}
                </div>

                {/* Name */}
                <h3 className="text-lg font-semibold text-text mb-2 group-hover:text-primary transition-colors">
                  {agent.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-text-muted mb-4 line-clamp-2">
                  {agent.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-text-muted">
                  <div className="flex items-center gap-1">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    <span>{agent.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download size={14} />
                    <span>{agent.usageCount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {agent.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-background text-xs text-text-muted rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Install Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInstallAgent(agent.id);
                  }}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Install Agent
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
