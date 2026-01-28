/**
 * Mock Data for Security Monitoring
 * Used for testing and development of the admin security dashboard
 */

export interface SuspiciousActivityEvent {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  eventType: 'brute_force' | 'failed_login' | 'rate_limit' | 'admin_access' | 'unusual_location' | 'sql_injection' | 'xss_attempt';
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  location?: { city: string; country: string; };
  description: string;
  status: 'active' | 'reviewed' | 'dismissed' | 'blocked';
  reviewedBy?: string;
  reviewedAt?: Date;
  metadata?: Record<string, any>;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  threshold: number;
  violations: number;
  lastUpdated: Date;
}

// Mock IPs and Locations
const mockIPs = [
  '192.168.1.100',
  '203.0.113.42',
  '198.51.100.23',
  '45.76.123.45',
  '185.220.101.32',
  '167.99.142.78',
  '104.248.160.90',
  '159.65.230.45',
  '134.209.88.123',
  '178.128.92.67',
];

const mockLocations = [
  { city: 'Berlin', country: 'Deutschland' },
  { city: 'London', country: 'UK' },
  { city: 'New York', country: 'USA' },
  { city: 'Moscow', country: 'Russland' },
  { city: 'Beijing', country: 'China' },
  { city: 'São Paulo', country: 'Brasilien' },
  { city: 'Mumbai', country: 'Indien' },
  { city: 'Tokyo', country: 'Japan' },
  { city: 'Lagos', country: 'Nigeria' },
  { city: 'Sydney', country: 'Australien' },
];

const mockUsers = [
  { id: 'user-001', email: 'admin@agent-system.com' },
  { id: 'user-002', email: 'john.doe@example.com' },
  { id: 'user-003', email: 'jane.smith@example.com' },
  { id: 'user-004', email: 'test.user@demo.com' },
  { id: 'user-005', email: 'suspicious@temp-mail.com' },
];

// Generate Mock Events
export const generateMockEvents = (count: number = 30): SuspiciousActivityEvent[] => {
  const events: SuspiciousActivityEvent[] = [];
  const now = new Date();

  const eventConfigs = [
    {
      severity: 'critical' as const,
      eventType: 'brute_force' as const,
      description: 'Brute-Force-Angriff erkannt: 50+ Login-Versuche in 2 Minuten',
      status: 'active' as const,
    },
    {
      severity: 'critical' as const,
      eventType: 'sql_injection' as const,
      description: 'SQL-Injection-Versuch in Query-Parameter erkannt',
      status: 'active' as const,
    },
    {
      severity: 'high' as const,
      eventType: 'failed_login' as const,
      description: 'Mehrfache fehlgeschlagene Login-Versuche (8x in 5 Minuten)',
      status: 'active' as const,
    },
    {
      severity: 'high' as const,
      eventType: 'admin_access' as const,
      description: 'Unbefugter Zugriff auf Admin-Route ohne Authentifizierung',
      status: 'reviewed' as const,
    },
    {
      severity: 'medium' as const,
      eventType: 'rate_limit' as const,
      description: 'API Rate-Limit überschritten: 150 Requests in 1 Minute',
      status: 'dismissed' as const,
    },
    {
      severity: 'medium' as const,
      eventType: 'unusual_location' as const,
      description: 'Login von ungewöhnlicher GeoLocation (Russland)',
      status: 'active' as const,
    },
    {
      severity: 'low' as const,
      eventType: 'unusual_location' as const,
      description: 'Ungewöhnliches Zugriffsmuster: Schnelle Location-Wechsel',
      status: 'dismissed' as const,
    },
    {
      severity: 'high' as const,
      eventType: 'xss_attempt' as const,
      description: 'XSS-Versuch in Formular-Eingabe erkannt',
      status: 'blocked' as const,
    },
  ];

  for (let i = 0; i < count; i++) {
    const config = eventConfigs[Math.floor(Math.random() * eventConfigs.length)];
    const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
    const ip = mockIPs[Math.floor(Math.random() * mockIPs.length)];
    const location = mockLocations[Math.floor(Math.random() * mockLocations.length)];

    // Random timestamp within last 7 days
    const hoursAgo = Math.floor(Math.random() * 168); // 7 days = 168 hours
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    events.push({
      id: `event-${String(i + 1).padStart(3, '0')}`,
      timestamp,
      severity: config.severity,
      eventType: config.eventType,
      userId: user.id,
      userEmail: user.email,
      ipAddress: ip,
      location,
      description: config.description,
      status: config.status,
      reviewedBy: config.status === 'reviewed' ? 'admin@agent-system.com' : undefined,
      reviewedAt: config.status === 'reviewed' ? new Date(timestamp.getTime() + 3600000) : undefined,
      metadata: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        requestPath: '/api/auth/login',
        requestMethod: 'POST',
      },
    });
  }

  // Sort by timestamp (newest first)
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Mock Security Policies
export const mockSecurityPolicies: SecurityPolicy[] = [
  {
    id: 'policy-001',
    name: 'Max Login Attempts',
    description: 'Maximale Anzahl fehlgeschlagener Login-Versuche pro IP in 15 Minuten',
    enabled: true,
    threshold: 5,
    violations: 24,
    lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'policy-002',
    name: 'API Rate Limit',
    description: 'Maximale Anzahl API-Requests pro Minute',
    enabled: true,
    threshold: 100,
    violations: 12,
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'policy-003',
    name: 'MFA Required',
    description: 'Zwei-Faktor-Authentifizierung erforderlich für Admin-Accounts',
    enabled: true,
    threshold: 1,
    violations: 3,
    lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'policy-004',
    name: 'Session Timeout',
    description: 'Automatischer Logout nach Inaktivität (Minuten)',
    enabled: true,
    threshold: 15,
    violations: 0,
    lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'policy-005',
    name: 'Suspicious IP Detection',
    description: 'Erkennung von Logins aus neuen/verdächtigen GeoLocations',
    enabled: false,
    threshold: 1,
    violations: 8,
    lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

// Initialize mock events
export const mockEvents = generateMockEvents(30);

// KPI Type
export interface KPI {
  value: number;
  trend: 'up' | 'down' | 'neutral';
}

// Helper: Calculate KPIs
export const calculateKPIs = (events: SuspiciousActivityEvent[]) => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeAlerts = events.filter((e) => e.status === 'active').length;
  const blockedIPs = new Set(
    events.filter((e) => e.status === 'blocked' && e.timestamp > last24h).map((e) => e.ipAddress)
  ).size;
  const failedLogins = events.filter(
    (e) => e.eventType === 'failed_login' && e.timestamp > lastHour
  ).length;
  const policyViolations = mockSecurityPolicies.reduce((sum, p) => sum + p.violations, 0);

  return {
    activeAlerts: { value: activeAlerts, trend: (activeAlerts > 10 ? 'up' : 'down') as 'up' | 'down' },
    blockedIPs: { value: blockedIPs, trend: 'neutral' as 'neutral' },
    failedLogins: { value: failedLogins, trend: (failedLogins > 5 ? 'up' : 'down') as 'up' | 'down' },
    policyViolations: { value: policyViolations, trend: (policyViolations > 30 ? 'up' : 'down') as 'up' | 'down' },
  };
};

// Helper: Format relative time
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
};
