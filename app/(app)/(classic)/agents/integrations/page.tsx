'use client';

/**
 * Integrations Ecosystem - Premium Module Grid
 *
 * A Command Center for plugins. Rich, atmospheric, alive.
 * High-end polish with micro-interactions and visual hierarchy.
 * Features unified "Master Adapter" pattern for Google Workspace.
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Calendar, Users, FolderOpen, Share2, BarChart3, CreditCard,
  Zap, Layers, Search, Bot, RefreshCw, Plug2, Settings2, Link2, Unplug,
  Webhook, Code, RotateCw, Settings, X, HardDrive, Check, ChevronRight,
  ShieldCheck, Lock, Activity, FileText, Sliders, Clock, Sparkles,
  Loader2, AlertCircle, ExternalLink
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type Category = 'all' | 'suite' | 'email' | 'calendar' | 'crm' | 'storage' | 'social' | 'analytics' | 'payments' | 'automation';
type Status = 'connected' | 'available' | 'error' | 'partial';

interface SubService {
  id: string;
  name: string;
  icon: 'Mail' | 'Calendar' | 'HardDrive' | 'Users';
  description: string;
  active: boolean;
  // Enterprise metadata
  brandColor: string; // Tailwind text color class
  scope: string; // OAuth scope display
  accessLevel: 'READ' | 'WRITE' | 'READ / WRITE';
  syncFrequency: 'Real-time' | '1m' | '5m' | '15m' | '1h'; // Sync interval
}

interface IntegrationData {
  id: string;
  name: string;
  category: Exclude<Category, 'all'>;
  tagline: string;
  status: Status;
  logoUrl?: string;
  color?: string;
  subServices?: SubService[];
  isMasterAdapter?: boolean;
}

// =============================================================================
// CATEGORY FILTERS
// =============================================================================

const categoryFilters: { id: Category; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'suite', label: 'Suites', icon: Plug2 },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'storage', label: 'Storage', icon: FolderOpen },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'automation', label: 'Automation', icon: Zap },
];

// Icon mapping for sub-services
const subServiceIcons: Record<string, React.ElementType> = {
  Mail,
  Calendar,
  HardDrive,
  Users,
};

// =============================================================================
// INTEGRATIONS DATA (with taglines for emotional context)
// =============================================================================

const integrations: IntegrationData[] = [
  // ==========================================================================
  // MASTER ADAPTERS (Unified Suites)
  // ==========================================================================
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    category: 'suite',
    tagline: 'Unified access to Mail, Calendar, and Drive',
    status: 'available',
    logoUrl: 'https://cdn.simpleicons.org/google/4285F4',
    color: '#4285F4',
    isMasterAdapter: true,
    subServices: [
      { id: 'gmail', name: 'Gmail', icon: 'Mail', description: 'Send, receive, and manage email threads', active: false, brandColor: 'text-red-500', scope: 'mail.google.com', accessLevel: 'READ / WRITE', syncFrequency: 'Real-time' },
      { id: 'calendar', name: 'Google Calendar', icon: 'Calendar', description: 'Events, meetings & scheduling', active: false, brandColor: 'text-blue-500', scope: 'calendar.readonly', accessLevel: 'READ', syncFrequency: '5m' },
      { id: 'drive', name: 'Google Drive', icon: 'HardDrive', description: 'Documents, sheets & file storage', active: false, brandColor: 'text-yellow-500', scope: 'drive.readonly', accessLevel: 'READ', syncFrequency: '15m' },
      { id: 'contacts', name: 'People API', icon: 'Users', description: 'Contact directory & sync', active: false, brandColor: 'text-green-500', scope: 'contacts.readonly', accessLevel: 'READ', syncFrequency: '1h' },
    ],
  },

  // ==========================================================================
  // STANDARD INTEGRATIONS
  // ==========================================================================

  // Email
  { id: 'outlook', name: 'Outlook', category: 'email', tagline: 'Microsoft 365 Suite', status: 'available', logoUrl: 'https://cdn.simpleicons.org/microsoftoutlook', color: '#0078D4' },

  // CRM
  { id: 'hubspot', name: 'HubSpot', category: 'crm', tagline: 'CRM & Deal Sync', status: 'available', logoUrl: 'https://cdn.simpleicons.org/hubspot/FF7A59', color: '#FF7A59' },
  { id: 'salesforce', name: 'Salesforce', category: 'crm', tagline: 'Enterprise Sales Cloud', status: 'available', logoUrl: 'https://cdn.simpleicons.org/salesforce/00A1E0', color: '#00A1E0' },

  // Storage
  { id: 'dropbox', name: 'Dropbox', category: 'storage', tagline: 'File Synchronization', status: 'available', logoUrl: 'https://cdn.simpleicons.org/dropbox/0061FF', color: '#0061FF' },
  { id: 'notion', name: 'Notion', category: 'storage', tagline: 'Knowledge Base', status: 'available', logoUrl: 'https://cdn.simpleicons.org/notion/white', color: '#FFFFFF' },

  // Social
  { id: 'slack', name: 'Slack', category: 'social', tagline: 'Team Messaging', status: 'available', logoUrl: 'https://cdn.simpleicons.org/slack/4A154B', color: '#4A154B' },
  { id: 'linkedin', name: 'LinkedIn', category: 'social', tagline: 'Professional Network', status: 'available', logoUrl: 'https://cdn.simpleicons.org/linkedin', color: '#0A66C2' },
  { id: 'twitter', name: 'X (Twitter)', category: 'social', tagline: 'Social Engagement', status: 'available', logoUrl: 'https://cdn.simpleicons.org/x/white', color: '#FFFFFF' },

  // Payments
  { id: 'stripe', name: 'Stripe', category: 'payments', tagline: 'Payment Processing', status: 'available', logoUrl: 'https://cdn.simpleicons.org/stripe/635BFF', color: '#635BFF' },

  // Automation
  { id: 'zapier', name: 'Zapier', category: 'automation', tagline: '5,000+ App Automations', status: 'available', logoUrl: 'https://cdn.simpleicons.org/zapier/FF4F00', color: '#FF4F00' },
];

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function IntegrationsHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConnections, setActiveConnections] = useState<Record<string, string>>({});
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Google Workspace Configuration Modal State
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configModalIntegration, setConfigModalIntegration] = useState<IntegrationData | null>(null);
  const [subServiceStates, setSubServiceStates] = useState<Record<string, boolean>>({});

  // OAuth Authorization State
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Fetch connection status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const map: Record<string, string> = {};
          json.data.forEach((item: { id: string; status: string }) => {
            map[item.id] = item.status;
          });
          setActiveConnections(map);

          // Update sub-service states based on active connections
          const subStates: Record<string, boolean> = {};
          integrations.forEach(integration => {
            if (integration.subServices) {
              integration.subServices.forEach(sub => {
                subStates[`${integration.id}:${sub.id}`] = map[sub.id] === 'connected';
              });
            }
          });
          setSubServiceStates(subStates);
        }
      }
    } catch {
      // Silent
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Calculate Master Adapter status based on sub-services
  const getMasterAdapterStatus = useCallback((integration: IntegrationData): Status => {
    if (!integration.subServices) return integration.status;

    const activeCount = integration.subServices.filter(
      sub => subServiceStates[`${integration.id}:${sub.id}`]
    ).length;

    if (activeCount === 0) return 'available';
    if (activeCount === integration.subServices.length) return 'connected';
    return 'partial';
  }, [subServiceStates]);

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    return integrations.map(item => ({
      ...item,
      status: item.isMasterAdapter
        ? getMasterAdapterStatus(item)
        : (activeConnections[item.id] as Status) || item.status,
      // Update sub-service active states
      subServices: item.subServices?.map(sub => ({
        ...sub,
        active: subServiceStates[`${item.id}:${sub.id}`] || false,
      })),
    })).filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tagline.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, activeConnections, subServiceStates, getMasterAdapterStatus]);

  // Count connected integrations (including partial for master adapters)
  const connectedCount = integrations.filter(i => {
    if (i.isMasterAdapter) {
      const status = getMasterAdapterStatus(i);
      return status === 'connected' || status === 'partial';
    }
    return activeConnections[i.id] === 'connected';
  }).length;

  // Open configuration modal for master adapters
  const openConfigModal = (integration: IntegrationData) => {
    setConfigModalIntegration(integration);
    setConfigModalOpen(true);
  };

  // Toggle sub-service state
  const toggleSubService = (integrationId: string, subServiceId: string) => {
    const key = `${integrationId}:${subServiceId}`;
    setSubServiceStates(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Save configuration - Initiates OAuth flow with selected services
  const saveConfiguration = async () => {
    if (!configModalIntegration) return;

    // Collect enabled service IDs
    const enabledServices = configModalIntegration.subServices
      ?.filter(sub => subServiceStates[`${configModalIntegration.id}:${sub.id}`])
      .map(sub => sub.id) || [];

    if (enabledServices.length === 0) {
      setAuthError('Please select at least one service to authorize.');
      return;
    }

    // Clear any previous errors
    setAuthError(null);
    setIsAuthorizing(true);

    console.log('[Integrations] Initiating OAuth for services:', enabledServices);

    try {
      // Call the OAuth initiate endpoint with selected services array
      const initRes = await fetch('/api/oauth/google/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: enabledServices })
      });

      const data = await initRes.json();

      if (!initRes.ok) {
        throw new Error(data.error || 'Failed to initiate OAuth flow');
      }

      if (data.authUrl) {
        console.log('[Integrations] Redirecting to Google OAuth:', {
          services: enabledServices,
          scopeCount: data.scopeCount
        });
        // Redirect to Google OAuth consent screen
        window.location.href = data.authUrl;
        return;
      } else {
        throw new Error('No authorization URL received from server');
      }
    } catch (e) {
      console.error('[Integrations] OAuth initiation error:', e);
      setAuthError(e instanceof Error ? e.message : 'Failed to start authorization. Please try again.');
      setIsAuthorizing(false);
    }
  };

  const handleConnect = async (integrationId: string, integration?: IntegrationData) => {
    // For Master Adapters, open configuration modal instead
    if (integration?.isMasterAdapter) {
      openConfigModal(integration);
      return;
    }

    setConnectingId(integrationId);
    try {
      if (integrationId === 'hubspot') {
        const res = await fetch('/api/integrations/config/hubspot');
        if (res.ok) {
          const config = await res.json();
          if (config.configured) window.location.href = '/api/integrations/hubspot/auth';
        }
      }
      // Other non-master integrations...
    } finally {
      setTimeout(() => setConnectingId(null), 2000);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Disconnect this integration?')) return;
    try {
      const res = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: integrationId.includes('google') ? 'google' : integrationId })
      });
      if (res.ok) await fetchStatus();
    } catch {}
  };

  // Sync handler - triggers manual sync for an integration
  const handleSync = async (integrationId: string) => {
    console.log(`[Integrations] Syncing ${integrationId}...`);
    // TODO: Implement actual sync API call
    // For now, just show a visual feedback would be nice
  };

  // Configure handler - opens settings/configuration panel
  const handleConfigure = (integrationId: string) => {
    console.log(`[Integrations] Configure ${integrationId}`);
    // TODO: Open slide-over drawer with configuration options
  };

  // Mock last sync times for demo
  const getLastSync = (integrationId: string): string | undefined => {
    const connected = activeConnections[integrationId] === 'connected';
    if (!connected) return undefined;
    // Simulate different sync times
    const mockTimes = ['2m ago', '5m ago', '15m ago', '1h ago', 'Auto-sync active'];
    return mockTimes[Math.abs(integrationId.charCodeAt(0) % mockTimes.length)];
  };

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Atmospheric Background Gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.12), transparent)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Hero Header Section */}
        <header className="px-8 pt-8 pb-6">
          <div className="max-w-7xl mx-auto">
            {/* Title Row */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-500/20 shadow-lg shadow-violet-500/5">
                    <Plug2 className="w-5 h-5 text-violet-400" />
                  </div>
                  <h1 className="text-2xl font-semibold text-white tracking-tight">Integrations Ecosystem</h1>
                </div>
                <p className="text-zinc-400 text-sm pl-[52px]">
                  Manage your connected tools and data pipelines
                </p>
              </div>

              {/* Stats - Enhanced with icons */}
              <div className="flex items-center gap-5 bg-zinc-900/50 border border-white/5 rounded-xl px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Link2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-white">{connectedCount}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Connected</div>
                  </div>
                </div>
                <div className="w-px h-10 bg-zinc-800" />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800">
                    <Unplug className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-white">{integrations.length - connectedCount}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Available</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between gap-4">
              {/* Category Pills - Glass Container */}
              <div className="flex items-center bg-zinc-900/50 border border-white/5 rounded-full px-1.5 py-1 overflow-x-auto">
                {categoryFilters.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
                      transition-all duration-200 ease-in-out
                      ${selectedCategory === cat.id
                        ? 'bg-card/10 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                      }
                    `}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search integrations..."
                  className="w-64 h-10 pl-10 pr-4 bg-zinc-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Module Grid */}
        <main className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredIntegrations.map((integration, index) => (
                integration.isMasterAdapter ? (
                  <MasterAdapterCard
                    key={integration.id}
                    integration={integration}
                    index={index}
                    onConfigure={() => openConfigModal(integration)}
                    onManage={() => openConfigModal(integration)}
                  />
                ) : (
                  <ModuleCard
                    key={integration.id}
                    integration={integration}
                    index={index}
                    onConnect={() => handleConnect(integration.id, integration)}
                    onDisconnect={() => handleDisconnect(integration.id)}
                    onSync={() => handleSync(integration.id)}
                    onConfigure={() => handleConfigure(integration.id)}
                    isConnecting={connectingId === integration.id}
                    lastSync={getLastSync(integration.id)}
                  />
                )
              ))}
              {/* Custom Webhook Card - Always at the end */}
              <CustomWebhookCard index={filteredIntegrations.length} />
            </div>

            {/* Configuration Modal for Master Adapters */}
            <ConfigurationModal
              isOpen={configModalOpen}
              onClose={() => {
                setConfigModalOpen(false);
                setAuthError(null); // Clear error on close
              }}
              integration={configModalIntegration}
              subServiceStates={subServiceStates}
              onToggleService={toggleSubService}
              onSave={saveConfiguration}
              isAuthorizing={isAuthorizing}
              authError={authError}
            />

            {/* Empty State */}
            {filteredIntegrations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-white/5 flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-zinc-600" />
                </div>
                <p className="text-zinc-400 font-medium">No integrations found</p>
                <p className="text-zinc-600 text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// MODULE CARD - Rich System Card with Polish
// =============================================================================

interface ModuleCardProps {
  integration: IntegrationData;
  index: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => void;
  onConfigure?: () => void;
  isConnecting: boolean;
  lastSync?: string;
}

function ModuleCard({ integration, index, onConnect, onDisconnect, onSync, onConfigure, isConnecting, lastSync }: ModuleCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isConnected = integration.status === 'connected';

  // Mock last sync times for connected integrations
  const syncStatus = isConnected ? (lastSync || 'Auto-sync active') : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative p-4 rounded-xl
        transition-all duration-300 ease-out
        ${isConnected
          ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 shadow-lg shadow-emerald-500/5'
          : 'bg-zinc-900/40 border border-white/[0.06] hover:border-white/20 hover:bg-zinc-800/60 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20'
        }
      `}
    >
      <div className="flex items-center gap-4">
        {/* Icon with enhanced styling */}
        <div
          className={`
            relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
            transition-transform duration-200 ease-in-out
            group-hover:scale-105
          `}
          style={{
            backgroundColor: integration.color ? `${integration.color}15` : 'rgba(255,255,255,0.05)',
          }}
        >
          {integration.logoUrl && !imgError ? (
            <img
              src={integration.logoUrl}
              alt=""
              className="w-7 h-7 object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <Bot className="w-6 h-6 text-zinc-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-white truncate">{integration.name}</h3>
            {/* Status Dot - Pulsing for connected */}
            <span className={`
              w-2 h-2 rounded-full flex-shrink-0
              ${isConnected
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                : 'bg-zinc-600'
              }
            `} />
          </div>
          <p className="text-xs text-zinc-500 truncate">{integration.tagline}</p>
          {/* Last Sync Indicator - Only for connected */}
          {isConnected && syncStatus && (
            <p className="text-[10px] text-zinc-600 mt-1 truncate">{syncStatus}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0">
          {isConnected ? (
            <div className="flex items-center gap-1.5">
              {/* Hover Actions - Sync Now & Configure */}
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{
                  opacity: isHovered ? 1 : 0,
                  width: isHovered ? 'auto' : 0
                }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1 overflow-hidden"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onSync?.(); }}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-150"
                  title="Sync Now"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onConfigure?.(); }}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-150"
                  title="Configure"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </motion.div>

              {/* Main Manage Button */}
              <button
                onClick={onDisconnect}
                className="
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  text-zinc-400 bg-zinc-800/80 border border-zinc-700/50
                  hover:text-white hover:bg-zinc-700 hover:border-zinc-600
                  transition-all duration-200 ease-in-out
                "
              >
                <Settings2 className="w-3.5 h-3.5" />
                Manage
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className={`
                px-4 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-200 ease-in-out
                ${isConnecting
                  ? 'text-zinc-500 bg-zinc-800/50 border border-zinc-700/50 cursor-wait'
                  : 'text-zinc-400 bg-transparent border border-white/10 hover:text-white hover:bg-violet-600 hover:border-violet-500 hover:shadow-md hover:shadow-violet-500/20'
                }
              `}
            >
              {isConnecting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Connect'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Connected indicator bar at bottom */}
      {isConnected && (
        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent rounded-full" />
      )}
    </motion.div>
  );
}

// =============================================================================
// MASTER ADAPTER CARD - Unified Suite Card (e.g., Google Workspace)
// =============================================================================

interface MasterAdapterCardProps {
  integration: IntegrationData;
  index: number;
  onConfigure: () => void;
  onManage: () => void;
}

function MasterAdapterCard({ integration, index, onConfigure, onManage }: MasterAdapterCardProps) {
  const [imgError, setImgError] = useState(false);

  const isConnected = integration.status === 'connected';
  const isPartial = integration.status === 'partial';
  const hasConnection = isConnected || isPartial;

  // Count active sub-services
  const activeCount = integration.subServices?.filter(s => s.active).length || 0;
  const totalCount = integration.subServices?.length || 0;

  // Get active service names for tagline
  const activeServiceNames = integration.subServices
    ?.filter(s => s.active)
    .map(s => s.name)
    .slice(0, 2)
    .join(', ') || '';

  const statusTagline = hasConnection
    ? `${activeCount}/${totalCount} services active${activeServiceNames ? ` (${activeServiceNames}${activeCount > 2 ? '...' : ''})` : ''}`
    : integration.tagline;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      onClick={onConfigure}
      className={`
        group relative p-4 rounded-xl cursor-pointer
        transition-all duration-300 ease-out
        ${isConnected
          ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 shadow-lg shadow-emerald-500/5'
          : isPartial
            ? 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 shadow-lg shadow-amber-500/5'
            : 'bg-gradient-to-br from-blue-500/10 to-violet-600/5 border border-blue-500/20 hover:border-blue-500/40 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/10'
        }
      `}
    >
      <div className="flex items-center gap-4">
        {/* Icon with enhanced styling */}
        <div
          className="relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 ease-in-out group-hover:scale-105"
          style={{
            backgroundColor: integration.color ? `${integration.color}20` : 'rgba(255,255,255,0.05)',
          }}
        >
          {integration.logoUrl && !imgError ? (
            <img
              src={integration.logoUrl}
              alt=""
              className="w-7 h-7 object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <Bot className="w-6 h-6 text-zinc-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-white truncate">{integration.name}</h3>
            {/* Status Indicator */}
            <span className={`
              w-2 h-2 rounded-full flex-shrink-0
              ${isConnected
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                : isPartial
                  ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                  : 'bg-zinc-600'
              }
            `} />
          </div>
          <p className="text-xs text-zinc-500 truncate">{statusTagline}</p>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); hasConnection ? onManage() : onConfigure(); }}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200 ease-in-out
              ${hasConnection
                ? 'text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 hover:text-white hover:bg-zinc-700 hover:border-zinc-600'
                : 'text-blue-400 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50'
              }
            `}
          >
            {hasConnection ? (
              <>
                <Settings2 className="w-3.5 h-3.5" />
                Configure
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                Setup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-services Preview Pills */}
      {integration.subServices && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
          {integration.subServices.slice(0, 4).map(sub => {
            const IconComponent = subServiceIcons[sub.icon] || Bot;
            return (
              <span
                key={sub.id}
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium
                  ${sub.active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/30'
                  }
                `}
              >
                <IconComponent className="w-2.5 h-2.5" />
                {sub.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Connected indicator bar at bottom */}
      {hasConnection && (
        <div className={`
          absolute bottom-0 left-4 right-4 h-0.5 rounded-full
          ${isConnected
            ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent'
            : 'bg-gradient-to-r from-transparent via-amber-500/50 to-transparent'
          }
        `} />
      )}
    </motion.div>
  );
}

// =============================================================================
// CONFIGURATION MODAL - Enterprise Control Console
// =============================================================================

// Tab definitions for the modal
const MODAL_TABS = [
  { id: 'permissions', label: 'Permissions', icon: Lock },
  { id: 'sync', label: 'Sync Policy', icon: RefreshCw },
  { id: 'logs', label: 'Access Logs', icon: FileText },
  { id: 'advanced', label: 'Advanced', icon: Sliders },
] as const;

type ModalTab = typeof MODAL_TABS[number]['id'];

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: IntegrationData | null;
  subServiceStates: Record<string, boolean>;
  onToggleService: (integrationId: string, subServiceId: string) => void;
  onSave: () => void;
  isAuthorizing?: boolean;
  authError?: string | null;
}

function ConfigurationModal({
  isOpen,
  onClose,
  integration,
  subServiceStates,
  onToggleService,
  onSave,
  isAuthorizing = false,
  authError = null,
}: ConfigurationModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('permissions');
  const [recentlyToggled, setRecentlyToggled] = useState<string | null>(null);

  if (!integration) return null;

  const enabledCount = integration.subServices?.filter(
    sub => subServiceStates[`${integration.id}:${sub.id}`]
  ).length || 0;

  const totalCount = integration.subServices?.length || 0;

  // Security level based on permissions
  const securityLevel = enabledCount === 0 ? 'None' : enabledCount <= 2 ? 'Moderate' : 'High';
  const securityColor = enabledCount === 0 ? 'text-zinc-500' : enabledCount <= 2 ? 'text-amber-400' : 'text-emerald-400';

  // Handle toggle with animation feedback
  const handleToggle = (integrationId: string, subId: string) => {
    onToggleService(integrationId, subId);
    setRecentlyToggled(`${integrationId}:${subId}`);
    setTimeout(() => setRecentlyToggled(null), 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop with enhanced blur - absolute within flex container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-lg"
          />

          {/* Modal Container - Enterprise Width - relative to stack above backdrop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-3xl"
          >
            <div className="bg-card backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">

              {/* ====== HEADER with Brand Gradient ====== */}
              <div className="relative px-8 py-6 overflow-hidden">
                {/* Brand gradient background - Google colors */}
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    background: 'linear-gradient(135deg, #4285F4 0%, #EA4335 25%, #FBBC04 50%, #34A853 75%, #4285F4 100%)',
                  }}
                />
                {/* Subtle noise texture */}
                <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3QgZmlsdGVyPSJ1cmwoI2EpIiBoZWlnaHQ9IjEwMCUiIHdpZHRoPSIxMDAlIi8+PC9zdmc+')]" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Logo Container with animated glow */}
                    <motion.div
                      animate={{
                        boxShadow: enabledCount > 0
                          ? [`0 0 20px ${integration.color}30`, `0 0 40px ${integration.color}20`, `0 0 20px ${integration.color}30`]
                          : `0 0 20px ${integration.color}15`
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${integration.color}12` }}
                    >
                      {integration.logoUrl ? (
                        <img src={integration.logoUrl} alt="" className="w-9 h-9 object-contain" />
                      ) : (
                        <Plug2 className="w-7 h-7 text-zinc-400" />
                      )}
                      {/* Active indicator pulse */}
                      {enabledCount > 0 && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center"
                        >
                          <span className="text-[8px] font-bold text-white">{enabledCount}</span>
                        </motion.div>
                      )}
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-semibold text-white tracking-tight">
                          Integration Console
                        </h2>
                        <span className="px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/25 text-[10px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          OAuth 2.0
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400">
                        Configure <span className="text-zinc-300 font-medium">{integration.name}</span> API access for your AI agents
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-card/5 border border-white/5 hover:border-white/10 transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ====== TAB NAVIGATION ====== */}
              <div className="px-8 border-b border-white/5">
                <div className="flex items-center gap-1">
                  {MODAL_TABS.map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isDisabled = tab.id !== 'permissions'; // Only permissions is functional

                    return (
                      <button
                        key={tab.id}
                        onClick={() => !isDisabled && setActiveTab(tab.id)}
                        disabled={isDisabled}
                        className={`
                          relative flex items-center gap-2 px-4 py-3 text-xs font-medium rounded-t-lg
                          transition-all duration-200
                          ${isActive
                            ? 'text-white bg-zinc-900/80'
                            : isDisabled
                              ? 'text-zinc-600 cursor-not-allowed'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                          }
                        `}
                      >
                        <TabIcon className="w-3.5 h-3.5" />
                        {tab.label}
                        {/* Active indicator line */}
                        {isActive && (
                          <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500"
                          />
                        )}
                        {/* Coming soon badge for disabled tabs */}
                        {isDisabled && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-medium bg-zinc-800 text-zinc-500">
                            Soon
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ====== PERMISSION CARDS (Main Content) ====== */}
              <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                      Service Endpoints
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-600">
                      {enabledCount}/{totalCount} active
                    </span>
                    {/* Quick select all */}
                    <button
                      onClick={() => {
                        integration.subServices?.forEach(sub => {
                          if (!subServiceStates[`${integration.id}:${sub.id}`]) {
                            onToggleService(integration.id, sub.id);
                          }
                        });
                      }}
                      className="text-[10px] text-violet-400 hover:text-violet-300 font-medium transition-colors"
                    >
                      Select All
                    </button>
                  </div>
                </div>

                {integration.subServices?.map((sub, idx) => {
                  const IconComponent = subServiceIcons[sub.icon] || Bot;
                  const isActive = subServiceStates[`${integration.id}:${sub.id}`];
                  const wasRecentlyToggled = recentlyToggled === `${integration.id}:${sub.id}`;

                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: wasRecentlyToggled ? [1, 1.01, 1] : 1,
                      }}
                      transition={{
                        duration: 0.2,
                        delay: idx * 0.05,
                        scale: { duration: 0.3 }
                      }}
                      onClick={() => handleToggle(integration.id, sub.id)}
                      className={`
                        group relative flex items-center justify-between p-5 rounded-2xl cursor-pointer
                        transition-all duration-300 ease-out overflow-hidden
                        ${isActive
                          ? 'bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/30 border-2'
                          : 'bg-zinc-900/40 border border-white/5 hover:border-white/10 hover:bg-zinc-900/60'
                        }
                      `}
                      style={{
                        borderColor: isActive ? `${sub.brandColor.replace('text-', '').includes('red') ? '#ef4444' : sub.brandColor.includes('blue') ? '#3b82f6' : sub.brandColor.includes('yellow') ? '#eab308' : '#22c55e'}40` : undefined,
                        boxShadow: isActive ? `0 0 30px ${sub.brandColor.includes('red') ? '#ef444420' : sub.brandColor.includes('blue') ? '#3b82f620' : sub.brandColor.includes('yellow') ? '#eab30820' : '#22c55e20'}` : undefined,
                      }}
                    >
                      {/* Animated background glow for active state */}
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 rounded-2xl pointer-events-none"
                          style={{
                            background: `radial-gradient(ellipse at left, ${sub.brandColor.includes('red') ? '#ef444410' : sub.brandColor.includes('blue') ? '#3b82f610' : sub.brandColor.includes('yellow') ? '#eab30810' : '#22c55e10'}, transparent 70%)`,
                          }}
                        />
                      )}

                      {/* Flash effect on toggle */}
                      <AnimatePresence>
                        {wasRecentlyToggled && (
                          <motion.div
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 bg-card/10 rounded-2xl pointer-events-none"
                          />
                        )}
                      </AnimatePresence>

                      <div className="relative flex items-center gap-5">
                        {/* Icon with bloom effect when active */}
                        <div className={`
                          relative w-14 h-14 rounded-xl flex items-center justify-center
                          transition-all duration-300 ease-out
                          ${isActive
                            ? 'bg-zinc-800/80'
                            : 'bg-zinc-800/40 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-80'
                          }
                        `}>
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1.5, opacity: 0.3 }}
                              transition={{ duration: 0.5 }}
                              className="absolute inset-0 rounded-xl"
                              style={{
                                background: `radial-gradient(circle, ${sub.brandColor.includes('red') ? '#ef4444' : sub.brandColor.includes('blue') ? '#3b82f6' : sub.brandColor.includes('yellow') ? '#eab308' : '#22c55e'}30, transparent 70%)`,
                              }}
                            />
                          )}
                          <IconComponent
                            className={`relative w-7 h-7 transition-all duration-300 ${
                              isActive ? sub.brandColor : 'text-zinc-600'
                            }`}
                            style={{
                              filter: isActive ? 'drop-shadow(0 0 8px currentColor)' : undefined,
                            }}
                          />
                        </div>

                        {/* Service Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2.5 mb-1">
                            <p className={`text-sm font-semibold transition-colors duration-200 ${
                              isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                            }`}>
                              {sub.name}
                            </p>
                            {isActive && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-400 uppercase">Active</span>
                              </motion.div>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 leading-relaxed">{sub.description}</p>
                        </div>
                      </div>

                      {/* Right Side: Badges + Toggle */}
                      <div className="relative flex items-center gap-4">
                        {/* Badges Stack */}
                        <div className="hidden md:flex flex-col items-end gap-1.5">
                          {/* Row 1: Access + Scope */}
                          <div className="flex items-center gap-2">
                            <span className={`
                              px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider
                              font-mono transition-all duration-200
                              ${isActive
                                ? sub.accessLevel === 'READ / WRITE'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                                  : 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                                : 'bg-zinc-800/50 text-zinc-600 border border-zinc-700/30'
                              }
                            `}>
                              {sub.accessLevel}
                            </span>
                            <span className={`
                              px-2 py-1 rounded-md text-[9px] font-mono tracking-tight
                              transition-all duration-200
                              ${isActive
                                ? 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/40'
                                : 'bg-zinc-800/30 text-zinc-600 border border-zinc-800/40'
                              }
                            `}>
                              {sub.scope}
                            </span>
                          </div>
                          {/* Row 2: Sync Frequency */}
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3 h-3 ${isActive ? 'text-cyan-500' : 'text-zinc-600'}`} />
                            <span className={`
                              px-2 py-0.5 rounded text-[9px] font-medium
                              transition-all duration-200
                              ${isActive
                                ? sub.syncFrequency === 'Real-time'
                                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                                  : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/30'
                                : 'bg-zinc-800/30 text-zinc-600 border border-zinc-800/30'
                              }
                            `}>
                              Sync: {sub.syncFrequency}
                            </span>
                          </div>
                        </div>

                        {/* Premium Toggle Switch */}
                        <div
                          className={`
                            relative w-14 h-8 rounded-full transition-all duration-300 cursor-pointer
                            ${isActive
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                              : 'bg-zinc-700/80 hover:bg-zinc-600/80'
                            }
                          `}
                          style={{
                            boxShadow: isActive ? '0 0 20px rgba(16, 185, 129, 0.4)' : undefined,
                          }}
                        >
                          <motion.div
                            animate={{ x: isActive ? 26 : 4 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={`
                              absolute top-1 w-6 h-6 rounded-full shadow-lg
                              ${isActive
                                ? 'bg-card'
                                : 'bg-zinc-400'
                              }
                            `}
                          />
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-1/2 left-2 -translate-y-1/2"
                            >
                              <Check className="w-3.5 h-3.5 text-white/90" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* ====== FOOTER - Control Panel Style ====== */}
              <div className="px-8 py-5 border-t border-border bg-card">
                {/* Error Message Display */}
                <AnimatePresence>
                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <span className="text-sm text-red-300">{authError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between">
                  {/* Left: Security Summary */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-5 h-5 ${enabledCount > 0 ? 'text-emerald-500' : 'text-zinc-600'}`} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                          Security Level
                        </span>
                        <span className={`text-sm font-semibold ${securityColor}`}>
                          {securityLevel}
                        </span>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-zinc-800" />
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-zinc-600" />
                      <span className="text-[11px] text-zinc-500">
                        End-to-End Encrypted
                      </span>
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClose}
                      disabled={isAuthorizing}
                      className={`
                        px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                        ${isAuthorizing
                          ? 'text-zinc-600 border border-zinc-800 cursor-not-allowed'
                          : 'text-zinc-400 hover:text-white hover:bg-card/5 border border-zinc-800 hover:border-zinc-700'
                        }
                      `}
                    >
                      Cancel
                    </button>
                    <motion.button
                      onClick={onSave}
                      disabled={enabledCount === 0 || isAuthorizing}
                      whileHover={enabledCount > 0 && !isAuthorizing ? { scale: 1.02 } : {}}
                      whileTap={enabledCount > 0 && !isAuthorizing ? { scale: 0.98 } : {}}
                      className={`
                        relative px-7 py-3 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden
                        ${isAuthorizing
                          ? 'bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 text-white/80 cursor-wait'
                          : enabledCount > 0
                            ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }
                      `}
                      style={{
                        boxShadow: enabledCount > 0 && !isAuthorizing
                          ? '0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(139, 92, 246, 0.2)'
                          : undefined,
                      }}
                    >
                      {/* Animated shine effect - only when ready to authorize */}
                      {enabledCount > 0 && !isAuthorizing && (
                        <motion.div
                          animate={{
                            x: ['-200%', '200%'],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3,
                            ease: 'easeInOut',
                          }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        />
                      )}

                      <span className="relative flex items-center gap-2">
                        {isAuthorizing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Connecting to Google...
                          </>
                        ) : enabledCount > 0 ? (
                          <>
                            <ExternalLink className="w-4 h-4" />
                            Authorize Access ({enabledCount})
                          </>
                        ) : (
                          'Select Services'
                        )}
                      </span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// CUSTOM WEBHOOK CARD - Special Integration Entry Point
// =============================================================================

function CustomWebhookCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="
        group relative p-4 rounded-xl cursor-pointer
        bg-card/60 border-2 border-dashed border-border
        hover:border-violet-500/40 hover:bg-muted/60
        transition-all duration-300 ease-out
      "
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-800/50 border border-zinc-700/30 group-hover:border-violet-500/30 transition-colors duration-200">
          <Webhook className="w-6 h-6 text-zinc-500 group-hover:text-violet-400 transition-colors duration-200" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-white truncate">Custom Webhook</h3>
            <Code className="w-3 h-3 text-zinc-600" />
          </div>
          <p className="text-xs text-zinc-500 truncate">Connect your own API</p>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          <button className="
            px-4 py-1.5 rounded-lg text-xs font-medium
            text-zinc-500 bg-transparent border border-zinc-700/50
            group-hover:text-violet-400 group-hover:border-violet-500/40
            transition-all duration-200 ease-in-out
          ">
            Create
          </button>
        </div>
      </div>
    </motion.div>
  );
}
