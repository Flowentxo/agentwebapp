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

// Brand colors for each provider (bg + text)
const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  gmail: { bg: 'bg-red-500/15', text: 'text-red-400' },
  slack: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  outlook: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  hubspot: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  salesforce: { bg: 'bg-sky-500/15', text: 'text-sky-400' },
  stripe: { bg: 'bg-violet-500/15', text: 'text-violet-400' },
  quickbooks: { bg: 'bg-green-500/15', text: 'text-green-400' },
  'google-drive': { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  dropbox: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  notion: { bg: 'bg-zinc-400/15', text: 'text-zinc-300' },
  linkedin: { bg: 'bg-blue-600/15', text: 'text-blue-400' },
  twitter: { bg: 'bg-zinc-400/15', text: 'text-zinc-300' },
};

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
  const brandColor = BRAND_COLORS[provider.id] || { bg: 'bg-zinc-500/15', text: 'text-zinc-400' };

  return (
    <div className={`relative p-6 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border transition-all hover:shadow-xl hover:shadow-black/20 ${
      provider.isConnected ? 'border-emerald-500/20' : 'border-white/[0.05] hover:border-white/[0.10]'
    }`}>
      {/* Status Badge */}
      {provider.isConnected && (
        <div className="absolute top-4 right-4">
          {provider.connection?.status === 'active' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verbunden
            </div>
          ) : provider.connection?.status === 'expired' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              Abgelaufen
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
              <XCircle className="w-3.5 h-3.5" />
              Fehler
            </div>
          )}
        </div>
      )}

      {/* Large Brand Icon */}
      <div className={`w-14 h-14 rounded-2xl ${brandColor.bg} flex items-center justify-center mb-4 border border-white/[0.04]`}>
        <IconComponent className={`w-7 h-7 ${brandColor.text}`} />
      </div>

      {/* Provider Info */}
      <h3 className="text-lg font-bold text-white mb-1">{provider.name}</h3>
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-2">{CATEGORY_LABELS[provider.category] || provider.category}</p>
      <p className="text-sm text-zinc-400 leading-relaxed mb-5">{provider.description}</p>

      {/* Connected Account Info */}
      {provider.isConnected && provider.connection?.accountEmail && (
        <div className="mb-5 p-3 rounded-xl bg-black/20 border border-white/[0.05]">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Verbunden als</p>
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
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-purple-500/20
                text-zinc-300 text-sm font-medium
                transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Neu verbinden
            </button>
            <button
              onClick={() => provider.connection && onDisconnect(provider.connection.id)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-red-500/5 border border-red-500/10 hover:bg-red-500/10
                text-red-400 text-sm font-medium
                transition-all disabled:opacity-50"
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
              bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium
              shadow-lg shadow-purple-500/20
              transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
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
          <h2 className="text-xl font-bold text-white tracking-tight">Integrationen</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Verbinde deine Tools und Dienste mit deinen Agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] text-sm">
            <span className="text-zinc-400">Verbunden:</span>{' '}
            <span className="text-emerald-400 font-semibold">{connectedCount}</span>
            <span className="text-zinc-600"> / {providers.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Integrationen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-xl bg-black/20 border border-white/[0.10]
              text-white text-sm placeholder:text-white/20
              focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40
              transition-all"
          />
        </div>

        {/* Category Filter — Floating Pills */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] overflow-x-auto no-scrollbar">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-zinc-800 text-white shadow-lg shadow-black/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
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
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <>
          {/* Provider Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <Filter className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-400">Keine Integrationen gefunden</h3>
              <p className="text-sm text-zinc-600 mt-1">
                Passe deine Suche oder Filterkriterien an
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
