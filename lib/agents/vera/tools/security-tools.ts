/**
 * Vera Security Tools
 *
 * Security & compliance tools: password audit, URL scanning, GDPR reports.
 */

// ─── audit_password_strength ─────────────────────────────────────

export interface AuditPasswordInput {
  password: string;
}

export interface PasswordAuditResult {
  score: number;
  strength: string;
  checks: {
    length: { passed: boolean; detail: string };
    uppercase: { passed: boolean; detail: string };
    lowercase: { passed: boolean; detail: string };
    numbers: { passed: boolean; detail: string };
    special_chars: { passed: boolean; detail: string };
    no_common_patterns: { passed: boolean; detail: string };
  };
  recommendations: string[];
  estimated_crack_time: string;
}

export const AUDIT_PASSWORD_STRENGTH_TOOL = {
  name: 'audit_password_strength',
  description: 'Pruefe die Staerke eines Passworts. Analysiert Laenge, Zeichenvielfalt, gaengige Muster und gibt einen Score von 0-100 zurueck.',
  input_schema: {
    type: 'object',
    properties: {
      password: {
        type: 'string',
        description: 'Das zu pruefende Passwort',
      },
    },
    required: ['password'],
  },
};

const COMMON_PATTERNS = [
  'password', '123456', 'qwerty', 'abc123', 'admin', 'letmein',
  'welcome', 'monkey', 'dragon', 'master', 'login', '1234',
  'test', 'pass', 'user', 'guest', 'shadow', 'sunshine',
  'princess', 'football', 'charlie', 'superman', 'iloveyou',
  'trustno1', 'baseball', 'michael', 'ashley', 'passw0rd',
  'access', 'hello', 'sommer', 'geheim', 'hallo', 'passwort',
];

const KEYBOARD_PATTERNS = [
  'qwertz', 'qwerty', 'asdfgh', 'yxcvbn', 'zxcvbn',
  '12345', '67890', 'abcdef', 'abcabc',
];

function calculateEntropy(password: string): number {
  const charsets: { regex: RegExp; size: number }[] = [
    { regex: /[a-z]/, size: 26 },
    { regex: /[A-Z]/, size: 26 },
    { regex: /[0-9]/, size: 10 },
    { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, size: 32 },
  ];
  const poolSize = charsets.reduce((sum, cs) => sum + (cs.regex.test(password) ? cs.size : 0), 0);
  if (poolSize === 0) return 0;
  return Math.round(password.length * Math.log2(poolSize) * 10) / 10;
}

function hasRepeatingChars(password: string): boolean {
  return /(.)\1{2,}/.test(password);
}

function hasKeyboardPattern(password: string): boolean {
  const lower = password.toLowerCase();
  return KEYBOARD_PATTERNS.some(p => lower.includes(p));
}

export async function auditPasswordStrength(input: AuditPasswordInput): Promise<PasswordAuditResult> {
  const { password } = input;
  let score = 0;
  const recommendations: string[] = [];

  const hasLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const noCommon = !COMMON_PATTERNS.some(p => password.toLowerCase().includes(p));

  if (hasLength) score += 15; else recommendations.push('Mindestens 12 Zeichen verwenden');
  if (hasUpper) score += 10; else recommendations.push('Grossbuchstaben hinzufuegen');
  if (hasLower) score += 10; else recommendations.push('Kleinbuchstaben hinzufuegen');
  if (hasNumbers) score += 10; else recommendations.push('Zahlen hinzufuegen');
  if (hasSpecial) score += 15; else recommendations.push('Sonderzeichen hinzufuegen (!@#$%^&*)');
  if (noCommon) score += 10; else recommendations.push('Gaengige Woerter/Muster vermeiden');

  // Entropy-based scoring (max 20 points)
  const entropy = calculateEntropy(password);
  const entropyScore = Math.min(20, Math.round(entropy / 4));
  score += entropyScore;

  // Penalties
  if (hasRepeatingChars(password)) {
    score = Math.max(0, score - 10);
    recommendations.push('Wiederholende Zeichen vermeiden (z.B. "aaa")');
  }
  if (hasKeyboardPattern(password)) {
    score = Math.max(0, score - 10);
    recommendations.push('Tastaturmuster vermeiden (z.B. "qwerty", "asdfgh")');
  }

  // Bonus for extra length
  if (password.length >= 16) score = Math.min(100, score + 5);
  if (password.length >= 20) score = Math.min(100, score + 5);

  score = Math.min(100, Math.max(0, score));
  const strength = score >= 80 ? 'Sehr stark' : score >= 60 ? 'Stark' : score >= 40 ? 'Mittel' : score >= 20 ? 'Schwach' : 'Sehr schwach';

  // Crack time based on entropy
  let crackTime: string;
  if (entropy >= 80) crackTime = '> 1.000 Jahre';
  else if (entropy >= 60) crackTime = '> 100 Jahre';
  else if (entropy >= 45) crackTime = '1-100 Jahre';
  else if (entropy >= 30) crackTime = 'Monate bis Jahre';
  else if (entropy >= 20) crackTime = 'Tage bis Wochen';
  else crackTime = 'Sekunden bis Minuten';

  return {
    score,
    strength,
    checks: {
      length: { passed: hasLength, detail: `${password.length} Zeichen (min. 12)` },
      uppercase: { passed: hasUpper, detail: hasUpper ? 'Enthaelt Grossbuchstaben' : 'Keine Grossbuchstaben' },
      lowercase: { passed: hasLower, detail: hasLower ? 'Enthaelt Kleinbuchstaben' : 'Keine Kleinbuchstaben' },
      numbers: { passed: hasNumbers, detail: hasNumbers ? 'Enthaelt Zahlen' : 'Keine Zahlen' },
      special_chars: { passed: hasSpecial, detail: hasSpecial ? 'Enthaelt Sonderzeichen' : 'Keine Sonderzeichen' },
      no_common_patterns: { passed: noCommon, detail: noCommon ? 'Keine gaengigen Muster erkannt' : 'Gaengiges Muster erkannt!' },
    },
    recommendations,
    estimated_crack_time: `${crackTime} (Entropie: ${entropy} Bit)`,
  };
}

// ─── scan_url_safety ─────────────────────────────────────────────

export interface ScanUrlInput {
  url: string;
}

export interface UrlSafetyResult {
  url: string;
  safe: boolean;
  risk_level: 'safe' | 'suspicious' | 'dangerous';
  risk_score: number;
  checks: {
    domain_blacklisted: boolean;
    phishing_pattern: boolean;
    https: boolean;
    suspicious_tld: boolean;
    homograph_attack: boolean;
  };
  details: string[];
  recommendation: string;
}

export const SCAN_URL_SAFETY_TOOL = {
  name: 'scan_url_safety',
  description: 'Scanne eine URL auf Sicherheitsrisiken. Prueft Domain-Blacklists, Phishing-Muster, HTTPS und verdaechtige TLDs.',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Die zu pruefende URL oder Domain',
      },
    },
    required: ['url'],
  },
};

const BLACKLISTED_DOMAINS = [
  'evil-phishing.com', 'malware-site.net', 'fake-bank.org', 'phish-login.com',
  'scam-crypto.io', 'free-iphone.xyz', 'virus-download.ru', 'hack-facebook.tk',
  'steal-password.ml', 'fake-paypal.ga', 'lottery-winner.cf', 'bitcoin-double.gq',
  'amazon-security.tk', 'apple-verify.ml', 'google-prize.ga', 'microsoft-alert.cf',
  'netflix-renew.gq', 'paypal-confirm.tk', 'bank-verify.ml', 'dhl-tracking.ga',
];

const SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.buzz', '.club', '.work', '.click'];

const PHISHING_PATTERNS = [
  /login.*verify/i, /account.*suspend/i, /security.*alert/i, /confirm.*identity/i,
  /update.*payment/i, /urgent.*action/i, /verify.*now/i, /click.*here.*win/i,
];

export async function scanUrlSafety(input: ScanUrlInput): Promise<UrlSafetyResult> {
  const { url } = input;
  const urlLower = url.toLowerCase();
  const details: string[] = [];
  let riskScore = 0;

  // Extract domain
  let domain = urlLower.replace(/^https?:\/\//, '').split('/')[0].split('?')[0];

  // Check HTTPS
  const isHttps = urlLower.startsWith('https://') || (!urlLower.startsWith('http://') && !urlLower.includes('://'));
  if (!isHttps && urlLower.startsWith('http://')) {
    riskScore += 15;
    details.push('Keine HTTPS-Verschluesselung');
  }

  // Check blacklist
  const isBlacklisted = BLACKLISTED_DOMAINS.some(d => domain.includes(d));
  if (isBlacklisted) {
    riskScore += 50;
    details.push('Domain auf Blacklist gefunden!');
  }

  // Check suspicious TLD
  const hasSuspiciousTld = SUSPICIOUS_TLDS.some(tld => domain.endsWith(tld));
  if (hasSuspiciousTld) {
    riskScore += 20;
    details.push('Verdaechtige Top-Level-Domain');
  }

  // Check phishing patterns
  const hasPhishingPattern = PHISHING_PATTERNS.some(p => p.test(urlLower));
  if (hasPhishingPattern) {
    riskScore += 30;
    details.push('Phishing-Muster in URL erkannt');
  }

  // Check homograph attack (mixing similar chars)
  const hasHomograph = /[а-яёА-ЯЁ]/.test(url) || (domain.includes('0') && domain.includes('o'));
  if (hasHomograph) {
    riskScore += 25;
    details.push('Moeglicher Homograph-Angriff (aehnliche Zeichen)');
  }

  riskScore = Math.min(100, riskScore);
  const riskLevel = riskScore >= 50 ? 'dangerous' : riskScore >= 20 ? 'suspicious' : 'safe';

  if (details.length === 0) {
    details.push('Keine offensichtlichen Sicherheitsrisiken erkannt');
  }

  const recommendations: Record<string, string> = {
    safe: 'Die URL scheint sicher zu sein. Trotzdem auf persoenliche Daten achten.',
    suspicious: 'Vorsicht! Die URL zeigt verdaechtige Merkmale. Nicht auf Links klicken oder Daten eingeben.',
    dangerous: 'WARNUNG: Diese URL ist potenziell gefaehrlich! Nicht besuchen und keine Daten eingeben.',
  };

  return {
    url,
    safe: riskLevel === 'safe',
    risk_level: riskLevel,
    risk_score: riskScore,
    checks: {
      domain_blacklisted: isBlacklisted,
      phishing_pattern: hasPhishingPattern,
      https: isHttps || !urlLower.startsWith('http://'),
      suspicious_tld: hasSuspiciousTld,
      homograph_attack: hasHomograph,
    },
    details,
    recommendation: recommendations[riskLevel],
  };
}

// ─── generate_gdpr_report ────────────────────────────────────────

export interface GdprReportInput {
  user_id: string;
}

export interface GdprReportResult {
  user_id: string;
  report_id: string;
  generated_at: string;
  data_categories: Array<{
    category: string;
    data_types: string[];
    legal_basis: string;
    retention_period: string;
    processing_purpose: string;
  }>;
  rights_summary: string[];
  deletion_status: string;
  markdown_report: string;
}

export const GENERATE_GDPR_REPORT_TOOL = {
  name: 'generate_gdpr_report',
  description: 'Erstelle einen DSGVO-Datenschutzbericht fuer einen Nutzer. Zeigt gespeicherte Datenkategorien, Rechtsgrundlagen, Loeschfristen und Betroffenenrechte.',
  input_schema: {
    type: 'object',
    properties: {
      user_id: {
        type: 'string',
        description: 'Die User-ID fuer den Bericht',
      },
    },
    required: ['user_id'],
  },
};

export async function generateGdprReport(input: GdprReportInput): Promise<GdprReportResult> {
  const { user_id } = input;
  const reportId = `GDPR-${Date.now().toString(36).toUpperCase()}`;

  const dataCategories = [
    {
      category: 'Stammdaten',
      data_types: ['Name', 'E-Mail', 'Telefonnummer', 'Adresse'],
      legal_basis: 'Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung)',
      retention_period: '3 Jahre nach Vertragsende',
      processing_purpose: 'Vertragsabwicklung und Kundenkommunikation',
    },
    {
      category: 'Nutzungsdaten',
      data_types: ['Login-Zeiten', 'Feature-Nutzung', 'Seitenaufrufe', 'Klickverhalten'],
      legal_basis: 'Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse)',
      retention_period: '12 Monate',
      processing_purpose: 'Produktverbesserung und Fehleranalyse',
    },
    {
      category: 'Zahlungsdaten',
      data_types: ['Rechnungsadresse', 'Zahlungsmethode (maskiert)', 'Transaktionshistorie'],
      legal_basis: 'Art. 6 Abs. 1 lit. b/c DSGVO (Vertrag/Rechtl. Verpflichtung)',
      retention_period: '10 Jahre (gesetzl. Aufbewahrungspflicht)',
      processing_purpose: 'Abrechnung und steuerliche Dokumentation',
    },
    {
      category: 'Kommunikationsdaten',
      data_types: ['Support-Tickets', 'Chat-Verlaeufe', 'E-Mail-Korrespondenz'],
      legal_basis: 'Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung)',
      retention_period: '2 Jahre nach letztem Kontakt',
      processing_purpose: 'Kundenservice und Qualitaetssicherung',
    },
    {
      category: 'Technische Daten',
      data_types: ['IP-Adresse', 'Browser-Typ', 'Geraeteinformationen', 'Cookies'],
      legal_basis: 'Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)',
      retention_period: '6 Monate',
      processing_purpose: 'Sicherheit und technische Bereitstellung',
    },
  ];

  const rights = [
    'Recht auf Auskunft (Art. 15 DSGVO)',
    'Recht auf Berichtigung (Art. 16 DSGVO)',
    'Recht auf Loeschung (Art. 17 DSGVO)',
    'Recht auf Einschraenkung der Verarbeitung (Art. 18 DSGVO)',
    'Recht auf Datenuebertragbarkeit (Art. 20 DSGVO)',
    'Widerspruchsrecht (Art. 21 DSGVO)',
    'Recht auf Beschwerde bei der Aufsichtsbehoerde',
  ];

  const markdown = `# DSGVO-Datenschutzbericht

**Report-ID:** ${reportId}
**User-ID:** ${user_id}
**Erstellt am:** ${new Date().toLocaleDateString('de-DE')}

## Gespeicherte Datenkategorien

${dataCategories.map(c => `### ${c.category}
- **Datentypen:** ${c.data_types.join(', ')}
- **Rechtsgrundlage:** ${c.legal_basis}
- **Aufbewahrungsfrist:** ${c.retention_period}
- **Zweck:** ${c.processing_purpose}
`).join('\n')}

## Ihre Rechte

${rights.map(r => `- ${r}`).join('\n')}

## Loeschung

Zur Beantragung der Datenlöschung wenden Sie sich an: datenschutz@flowent.ai

---
*Dieser Bericht wurde automatisch generiert und dient der Transparenz gemaess DSGVO.*`;

  return {
    user_id,
    report_id: reportId,
    generated_at: new Date().toISOString(),
    data_categories: dataCategories,
    rights_summary: rights,
    deletion_status: 'Keine Loeschanfrage aktiv',
    markdown_report: markdown,
  };
}

// ─── check_cve ──────────────────────────────────────────────────

export interface CheckCveInput {
  product: string;
  version: string;
}

export interface CveEntry {
  id: string;
  description: string;
  score: number | null;
  severity: string;
  published: string;
}

export interface CheckCveResult {
  product: string;
  version: string;
  total_cves: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  cves: CveEntry[];
  recommendation: string;
  formatted_output: string;
}

export const CHECK_CVE_TOOL = {
  name: 'check_cve',
  description: 'Pruefe bekannte Sicherheitsluecken (CVEs) fuer ein Softwareprodukt und eine Version ueber die NIST National Vulnerability Database.',
  input_schema: {
    type: 'object',
    properties: {
      product: {
        type: 'string',
        description: 'Name des Softwareprodukts (z.B. "apache", "openssl", "nginx")',
      },
      version: {
        type: 'string',
        description: 'Versionsnummer (z.B. "2.4.49", "1.1.1", "3.0.0")',
      },
    },
    required: ['product', 'version'],
  },
};

export async function checkCve(input: CheckCveInput): Promise<CheckCveResult> {
  const { product, version } = input;
  const searchTerm = encodeURIComponent(`${product} ${version}`);
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${searchTerm}&resultsPerPage=20`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`NVD API responded with status ${response.status}`);
    }

    const data = await response.json();
    const vulnerabilities = data.vulnerabilities || [];

    const cves: CveEntry[] = vulnerabilities.map((v: any) => {
      const cve = v.cve;
      const description = cve.descriptions?.find((d: any) => d.lang === 'en')?.value
        || cve.descriptions?.[0]?.value
        || 'No description available';

      const cvssV31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData;
      const cvssV30 = cve.metrics?.cvssMetricV30?.[0]?.cvssData;
      const cvssV2 = cve.metrics?.cvssMetricV2?.[0]?.cvssData;
      const cvss = cvssV31 || cvssV30;

      const score = cvss?.baseScore ?? cvssV2?.baseScore ?? null;
      const severity = cvss?.baseSeverity
        || (score !== null ? (score >= 9 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW') : 'UNKNOWN');

      return {
        id: cve.id,
        description: description.slice(0, 200),
        score,
        severity: severity.toUpperCase(),
        published: cve.published?.split('T')[0] || 'Unknown',
      };
    });

    cves.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const critical = cves.filter(c => c.severity === 'CRITICAL').length;
    const high = cves.filter(c => c.severity === 'HIGH').length;
    const medium = cves.filter(c => c.severity === 'MEDIUM').length;
    const low = cves.filter(c => c.severity === 'LOW' || c.severity === 'UNKNOWN').length;

    let recommendation: string;
    if (critical > 0) {
      recommendation = 'DRINGEND: Kritische Schwachstellen gefunden! Sofortiges Update empfohlen.';
    } else if (high > 0) {
      recommendation = 'WICHTIG: Schwachstellen mit hohem Risiko. Zeitnahes Update einplanen.';
    } else if (medium > 0) {
      recommendation = 'HINWEIS: Mittlere Schwachstellen vorhanden. Update bei naechster Gelegenheit.';
    } else if (cves.length > 0) {
      recommendation = 'Geringe Risiken erkannt. Regelmaessige Updates beibehalten.';
    } else {
      recommendation = 'Keine bekannten CVEs gefunden. Regelmaessig pruefen.';
    }

    const formatted = [
      `## CVE-Bericht: ${product} ${version}`,
      '',
      `**Gefundene Schwachstellen:** ${cves.length}`,
      `| Kritisch | Hoch | Mittel | Niedrig |`,
      `|----------|------|--------|---------|`,
      `| ${critical} | ${high} | ${medium} | ${low} |`,
      '',
      ...(cves.length > 0 ? [
        '| CVE-ID | Score | Schweregrad | Datum | Beschreibung |',
        '|--------|-------|-------------|-------|-------------|',
        ...cves.slice(0, 10).map(c =>
          `| ${c.id} | ${c.score ?? 'N/A'} | ${c.severity} | ${c.published} | ${c.description.slice(0, 80)}... |`
        ),
      ] : ['Keine CVEs gefunden.']),
      '',
      `**Empfehlung:** ${recommendation}`,
    ].join('\n');

    return {
      product,
      version,
      total_cves: cves.length,
      critical,
      high,
      medium,
      low,
      cves,
      recommendation,
      formatted_output: formatted,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('NVD API Timeout nach 5 Sekunden. Bitte spaeter erneut versuchen.');
    }
    throw new Error(`CVE-Abfrage fehlgeschlagen: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}
