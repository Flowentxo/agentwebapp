'use client';

/**
 * Integrations Settings Page
 * Phase 11: Integration Hub & Secure Credential Management
 *
 * Displays available integrations with OAuth connect/disconnect functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Mail,
  MessageSquare,
  Users,
  Cloud,
  CreditCard,
  Calculator,
  HardDrive,
  Box,
  FileText,
  Linkedin,
  Twitter,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Search,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface IntegrationConnection {
  id: string;
  provider: string;
  status: 'active' | 'expired' | 'error' | 'pending';
  accountEmail?: string;
  accountName?: string;
  scopes: string[];
  expiresAt?: string;
  lastSyncAt?: string;
  createdAt: string;
}

interface Provider {
  id: string;
  name: string;
  category: 'communication' | 'crm' | 'finance' | 'storage' | 'social' | 'productivity';
  icon: string;
  description: string;
  isConnected: boolean;
  connection?: IntegrationConnection;
}

type Category = 'all' | 'communication' | 'crm' | 'finance' | 'storage' | 'social' | 'productivity';

// ============================================
// ICON MAPPING
// ============================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  MessageSquare,
  Users,
  Cloud,
  CreditCard,
  Calculator,
  HardDrive,
  Box,
  FileText,
  Linkedin,
  Twitter,
};

// ============================================
// STATIC PROVIDER DATA
// ============================================

const PROVIDERS: Omit<Provider, 'isConnected' | 'connection'>[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'communication',
    icon: 'Mail',
    description: 'Read and send emails, manage labels',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    icon: 'MessageSquare',
    description: 'Send messages, manage channels',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    category: 'communication',
    icon: 'Mail',
    description: 'Microsoft email and calendar',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    icon: 'Users',
    description: 'Sync contacts, deals, and tickets',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    icon: 'Cloud',
    description: 'Enterprise CRM integration',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'finance',
    icon: 'CreditCard',
    description: 'Payment processing and subscriptions',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    category: 'finance',
    icon: 'Calculator',
    description: 'Accounting and invoicing',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'storage',
    icon: 'HardDrive',
    description: 'File storage and documents',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'storage',
    icon: 'Box',
    description: 'Cloud file storage',
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    icon: 'FileText',
    description: 'Workspace and documentation',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'social',
    icon: 'Linkedin',
    description: 'Professional networking',
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    category: 'social',
    icon: 'Twitter',
    description: 'Social media management',
  },
];

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All Integrations',
  communication: 'Communication',
  crm: 'CRM',
  finance: 'Finance',
  storage: 'Storage',
  social: 'Social Media',
  productivity: 'Productivity',
};

const CATEGORY_COLORS: Record<string, string> = {
  communication: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  crm: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  finance: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  storage: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
  social: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
  productivity: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30',
};

// ============================================
// INTEGRATION CARD COMPONENT
// ============================================

interface IntegrationCardProps {
  provider: Provider;
  onConnect: (providerId: string) => void;
  onDisconnect: (connectionId: string) => void;
  isLoading: boolean;
}

function IntegrationCard({ provider, onConnect, onDisconnect, isLoading }: IntegrationCardProps) {
  const IconComponent = ICON_MAP[provider.icon] || Box;
  const categoryColor = CATEGORY_COLORS[provider.category] || CATEGORY_COLORS.productivity;

  return (
    <div
      className={`relative p-5 rounded-xl bg-gradient-to-br ${categoryColor} border
        transition-all hover:scale-[1.02] hover:shadow-lg`}
    >
      {/* Status Badge */}
      {provider.isConnected && (
        <div className="absolute top-3 right-3">
          {provider.connection?.status === 'active' ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </div>
          ) : provider.connection?.status === 'expired' ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">
              <AlertTriangle className="w-3 h-3" />
              Expired
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
              <XCircle className="w-3 h-3" />
              Error
            </div>
          )}
        </div>
      )}

      {/* Icon & Name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-card/10 flex items-center justify-center">
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
          <p className="text-xs text-white/50 capitalize">{provider.category}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-white/60 mb-4">{provider.description}</p>

      {/* Connected Account Info */}
      {provider.isConnected && provider.connection?.accountEmail && (
        <div className="mb-4 p-2 rounded-lg bg-card/5">
          <p className="text-xs text-white/50">Connected as:</p>
          <p className="text-sm text-white truncate">{provider.connection.accountEmail}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {provider.isConnected ? (
          <>
            <button
              onClick={() => onConnect(provider.id)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                bg-card/10 hover:bg-card/20 text-white text-sm font-medium
                transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect
            </button>
            <button
              onClick={() => provider.connection && onDisconnect(provider.connection.id)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium
                transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
            </button>
          </>
        ) : (
          <button
            onClick={() => onConnect(provider.id)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg
              bg-card/10 hover:bg-card/20 text-white text-sm font-medium
              transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Connect
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle URL params for success/error messages
  useEffect(() => {
    const success = searchParams.get('success');
    const providerName = searchParams.get('provider');
    const account = searchParams.get('account');
    const error = searchParams.get('error');

    if (success === 'true' && providerName) {
      toast.success(`Connected to ${providerName}`, {
        description: account ? `Signed in as ${account}` : undefined,
      });
      // Clear URL params
      router.replace('/settings/integrations');
    }

    if (error) {
      toast.error('Connection failed', {
        description: error,
      });
      router.replace('/settings/integrations');
    }
  }, [searchParams, router]);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations');
      const data = await response.json();

      if (data.success) {
        // Map connections to providers
        const connectionMap = new Map<string, IntegrationConnection>();
        (data.data || []).forEach((conn: any) => {
          connectionMap.set(conn.id, {
            id: conn.id,
            provider: conn.id,
            status: conn.status === 'connected' ? 'active' : conn.status,
            accountEmail: conn.accountEmail,
            scopes: [],
            createdAt: conn.lastSync || new Date().toISOString(),
          });
        });

        const providersWithStatus: Provider[] = PROVIDERS.map((p) => ({
          ...p,
          isConnected: connectionMap.has(p.id),
          connection: connectionMap.get(p.id),
        }));

        setProviders(providersWithStatus);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Connect to provider
  const handleConnect = (providerId: string) => {
    setActionLoading(providerId);
    // Redirect to OAuth flow
    window.location.href = `/api/integrations/auth/${providerId}?returnUrl=/settings/integrations`;
  };

  // Disconnect provider
  const handleDisconnect = async (connectionId: string) => {
    setActionLoading(connectionId);

    try {
      const response = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (response.ok) {
        toast.success('Disconnected successfully');
        fetchConnections();
      } else {
        const data = await response.json();
        toast.error('Disconnect failed', { description: data.error });
      }
    } catch (error) {
      toast.error('Disconnect failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter providers
  const filteredProviders = providers.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = providers.filter((p) => p.isConnected).length;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-white/60 mt-1">
              Connect your tools and services to supercharge your agents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-card/5 text-sm">
              <span className="text-white/60">Connected:</span>{' '}
              <span className="text-green-400 font-semibold">{connectedCount}</span>
              <span className="text-white/40"> / {providers.length}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card/5 border border-white/10
                text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50
                transition-colors text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${
                    selectedCategory === cat
                      ? 'bg-indigo-500 text-white'
                      : 'bg-card/5 text-white/60 hover:bg-card/10 hover:text-white'
                  }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {/* Provider Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProviders.map((provider) => (
                <IntegrationCard
                  key={provider.id}
                  provider={provider}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  isLoading={actionLoading === provider.id}
                />
              ))}
            </div>

            {/* Empty State */}
            {filteredProviders.length === 0 && (
              <div className="text-center py-20">
                <Filter className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white/60">No integrations found</h3>
                <p className="text-sm text-white/40 mt-1">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
