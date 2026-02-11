'use client';

/**
 * Integrations Settings Tab
 * Refactored from standalone integrations page into settings tab.
 * Uses Vicy design system CSS variables.
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
  { id: 'gmail', name: 'Gmail', category: 'communication', icon: 'Mail', description: 'E-Mails lesen und senden, Labels verwalten' },
  { id: 'slack', name: 'Slack', category: 'communication', icon: 'MessageSquare', description: 'Nachrichten senden, Channels verwalten' },
  { id: 'outlook', name: 'Outlook', category: 'communication', icon: 'Mail', description: 'Microsoft E-Mail und Kalender' },
  { id: 'hubspot', name: 'HubSpot', category: 'crm', icon: 'Users', description: 'Kontakte, Deals und Tickets synchronisieren' },
  { id: 'salesforce', name: 'Salesforce', category: 'crm', icon: 'Cloud', description: 'Enterprise CRM Integration' },
  { id: 'stripe', name: 'Stripe', category: 'finance', icon: 'CreditCard', description: 'Zahlungsabwicklung und Abonnements' },
  { id: 'quickbooks', name: 'QuickBooks', category: 'finance', icon: 'Calculator', description: 'Buchhaltung und Rechnungen' },
  { id: 'google-drive', name: 'Google Drive', category: 'storage', icon: 'HardDrive', description: 'Dateispeicher und Dokumente' },
  { id: 'dropbox', name: 'Dropbox', category: 'storage', icon: 'Box', description: 'Cloud-Dateispeicher' },
  { id: 'notion', name: 'Notion', category: 'productivity', icon: 'FileText', description: 'Workspace und Dokumentation' },
  { id: 'linkedin', name: 'LinkedIn', category: 'social', icon: 'Linkedin', description: 'Professionelles Netzwerk' },
  { id: 'twitter', name: 'Twitter/X', category: 'social', icon: 'Twitter', description: 'Social Media Management' },
];

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'Alle',
  communication: 'Kommunikation',
  crm: 'CRM',
  finance: 'Finanzen',
  storage: 'Speicher',
  social: 'Social Media',
  productivity: 'Produktivität',
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

  return (
    <div className="relative p-5 rounded-xl bg-[var(--vicy-glass-bg)] border border-[var(--vicy-glass-border)] backdrop-blur-sm transition-all hover:border-[var(--vicy-border-focus)] hover:shadow-lg">
      {/* Status Badge */}
      {provider.isConnected && (
        <div className="absolute top-3 right-3">
          {provider.connection?.status === 'active' ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Verbunden
            </div>
          ) : provider.connection?.status === 'expired' ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
              <AlertTriangle className="w-3 h-3" />
              Abgelaufen
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">
              <XCircle className="w-3 h-3" />
              Fehler
            </div>
          )}
        </div>
      )}

      {/* Icon & Name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-[var(--vicy-surface-hover)] border border-[var(--vicy-border)] flex items-center justify-center">
          <IconComponent className="w-5 h-5 text-[var(--vicy-text-primary)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--vicy-text-primary)]">{provider.name}</h3>
          <p className="text-[11px] text-[var(--vicy-text-tertiary)] capitalize">{CATEGORY_LABELS[provider.category] || provider.category}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--vicy-text-secondary)] mb-4 leading-relaxed">{provider.description}</p>

      {/* Connected Account Info */}
      {provider.isConnected && provider.connection?.accountEmail && (
        <div className="mb-4 p-2.5 rounded-lg bg-[var(--vicy-surface)] border border-[var(--vicy-border)]">
          <p className="text-[10px] text-[var(--vicy-text-tertiary)] uppercase tracking-wider mb-0.5">Verbunden als</p>
          <p className="text-xs text-[var(--vicy-text-primary)] truncate">{provider.connection.accountEmail}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {provider.isConnected ? (
          <>
            <button
              onClick={() => onConnect(provider.id)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                bg-[var(--vicy-surface-hover)] border border-[var(--vicy-border)] hover:border-[var(--vicy-accent-30)]
                text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] text-xs font-medium
                transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Neu verbinden
            </button>
            <button
              onClick={() => provider.connection && onDisconnect(provider.connection.id)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                bg-red-500/10 border border-red-500/20 hover:bg-red-500/20
                text-red-400 text-xs font-medium
                transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
            </button>
          </>
        ) : (
          <button
            onClick={() => onConnect(provider.id)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
              bg-[var(--vicy-accent-glow)] border border-[var(--vicy-accent-20)] hover:border-[var(--vicy-accent-40)]
              text-[var(--vicy-text-primary)] text-xs font-medium
              transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                Verbinden
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN TAB COMPONENT
// ============================================

export default function IntegrationsSettingsTab() {
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
      toast.success(`Verbunden mit ${providerName}`, {
        description: account ? `Angemeldet als ${account}` : undefined,
      });
      router.replace('/settings');
    }

    if (error) {
      toast.error('Verbindung fehlgeschlagen', {
        description: error,
      });
      router.replace('/settings');
    }
  }, [searchParams, router]);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations');
      const data = await response.json();

      if (data.success) {
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
      // Show providers without connection status on error
      setProviders(PROVIDERS.map((p) => ({ ...p, isConnected: false })));
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
    window.location.href = `/api/integrations/auth/${providerId}?returnUrl=/settings`;
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
        toast.success('Verbindung getrennt');
        fetchConnections();
      } else {
        const data = await response.json();
        toast.error('Trennen fehlgeschlagen', { description: data.error });
      }
    } catch (error) {
      toast.error('Trennen fehlgeschlagen');
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
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--vicy-text-primary)]">Integrationen</h2>
          <p className="text-sm text-[var(--vicy-text-secondary)] mt-1">
            Verbinde deine Tools und Dienste mit deinen Agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-[var(--vicy-glass-bg)] border border-[var(--vicy-border)] text-sm">
            <span className="text-[var(--vicy-text-secondary)]">Verbunden:</span>{' '}
            <span className="text-emerald-400 font-semibold">{connectedCount}</span>
            <span className="text-[var(--vicy-text-tertiary)]"> / {providers.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--vicy-text-tertiary)]" />
          <input
            type="text"
            placeholder="Integrationen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--vicy-glass-bg)] border border-[var(--vicy-border)]
              text-[var(--vicy-text-primary)] placeholder-[var(--vicy-text-tertiary)]
              focus:outline-none focus:border-[var(--vicy-accent-50)]
              transition-colors text-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[var(--vicy-accent)] text-white'
                  : 'bg-[var(--vicy-glass-bg)] border border-[var(--vicy-border)] text-[var(--vicy-text-secondary)] hover:bg-[var(--vicy-surface-hover)] hover:text-[var(--vicy-text-primary)]'
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
          <Loader2 className="w-8 h-8 animate-spin text-[var(--vicy-accent)]" />
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
              <Filter className="w-12 h-12 text-[var(--vicy-text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--vicy-text-secondary)]">Keine Integrationen gefunden</h3>
              <p className="text-sm text-[var(--vicy-text-tertiary)] mt-1">
                Passe deine Suche oder Filterkriterien an
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
