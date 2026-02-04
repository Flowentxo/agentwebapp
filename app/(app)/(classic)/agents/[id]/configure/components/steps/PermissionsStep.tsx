'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Info,
  X
} from 'lucide-react';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type PermissionCategory = 'read' | 'write' | 'critical';

interface Permission {
  id: string;
  label: string;
  description: string;
  riskLevel: RiskLevel;
  category: PermissionCategory;
  recommended?: boolean;
}

const PERMISSIONS: Permission[] = [
  // READ Permissions
  {
    id: 'read_contacts',
    label: 'Kontakte lesen',
    description: 'Zugriff auf Kontaktdaten und Profile',
    riskLevel: 'low',
    category: 'read',
    recommended: true
  },
  {
    id: 'read_emails',
    label: 'E-Mails lesen',
    description: 'Posteingang und gesendete Nachrichten einsehen',
    riskLevel: 'medium',
    category: 'read',
    recommended: true
  },
  {
    id: 'read_deals',
    label: 'Deals anzeigen',
    description: 'Verkaufschancen und Pipeline einsehen',
    riskLevel: 'low',
    category: 'read',
    recommended: true
  },
  {
    id: 'read_chats',
    label: 'Chat-Verläufe lesen',
    description: 'Zugriff auf WhatsApp und Messaging-Historie',
    riskLevel: 'medium',
    category: 'read',
    recommended: true
  },
  {
    id: 'read_calendar',
    label: 'Kalender einsehen',
    description: 'Termine und Verfügbarkeiten anzeigen',
    riskLevel: 'medium',
    category: 'read'
  },

  // WRITE Permissions
  {
    id: 'write_contacts',
    label: 'Kontakte erstellen',
    description: 'Neue Kontakte anlegen und Daten aktualisieren',
    riskLevel: 'medium',
    category: 'write',
    recommended: true
  },
  {
    id: 'write_deals',
    label: 'Deals aktualisieren',
    description: 'Verkaufschancen bearbeiten und Status ändern',
    riskLevel: 'high',
    category: 'write'
  },
  {
    id: 'write_tickets',
    label: 'Tickets erstellen',
    description: 'Support-Tickets anlegen und zuweisen',
    riskLevel: 'medium',
    category: 'write',
    recommended: true
  },
  {
    id: 'write_emails',
    label: 'E-Mails senden',
    description: 'Nachrichten im Namen des Users versenden',
    riskLevel: 'high',
    category: 'write',
    recommended: true
  },
  {
    id: 'write_calendar',
    label: 'Kalendereinträge',
    description: 'Termine erstellen, ändern und löschen',
    riskLevel: 'medium',
    category: 'write'
  },
  {
    id: 'write_crm_status',
    label: 'CRM-Status ändern',
    description: 'Lead-Status und Phasen im CRM aktualisieren',
    riskLevel: 'high',
    category: 'write'
  },

  // CRITICAL Permissions
  {
    id: 'delete_contacts',
    label: 'Kontakte löschen',
    description: 'Kontakte permanent aus dem System entfernen',
    riskLevel: 'high',
    category: 'critical'
  },
  {
    id: 'close_deals',
    label: 'Deals abschließen',
    description: 'Verkaufschancen als gewonnen/verloren markieren',
    riskLevel: 'high',
    category: 'critical'
  },
  {
    id: 'cancel_contracts',
    label: 'Verträge kündigen',
    description: 'Kundenverträge beenden und Kündigungen einreichen',
    riskLevel: 'critical',
    category: 'critical'
  },
  {
    id: 'trigger_payments',
    label: 'Zahlungen auslösen',
    description: 'Rechnungen erstellen und Zahlungsvorgänge starten',
    riskLevel: 'critical',
    category: 'critical'
  },
  {
    id: 'admin_access',
    label: 'Admin-Zugriff',
    description: 'Vollzugriff auf alle System-Einstellungen',
    riskLevel: 'critical',
    category: 'critical'
  }
];

const CATEGORY_CONFIG: Record<PermissionCategory, {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  borderColor: string;
  bgColor: string;
}> = {
  read: {
    title: 'Daten lesen',
    icon: <Eye className="w-5 h-5" />,
    iconColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/5'
  },
  write: {
    title: 'Daten schreiben',
    icon: <Pencil className="w-5 h-5" />,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/5'
  },
  critical: {
    title: 'Kritische Aktionen',
    icon: <AlertTriangle className="w-5 h-5" />,
    iconColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/5'
  }
};

const RISK_BADGE_CONFIG: Record<RiskLevel, {
  label: string;
  className: string;
}> = {
  low: {
    label: 'Low Risk',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30'
  },
  medium: {
    label: 'Medium Risk',
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
  },
  high: {
    label: 'High Risk',
    className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
  },
  critical: {
    label: 'Critical Risk',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
  }
};

interface PermissionsStepProps {
  onValidationChange: (isValid: boolean) => void;
}

export function PermissionsStep({ onValidationChange }: PermissionsStepProps) {
  const [enabledPermissions, setEnabledPermissions] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Validation: At least 1 READ permission required
  useEffect(() => {
    const readPermissions = PERMISSIONS.filter(p => p.category === 'read');
    const hasReadPermission = readPermissions.some(p => enabledPermissions.includes(p.id));
    onValidationChange(hasReadPermission);
  }, [enabledPermissions, onValidationChange]);

  // Show toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Set recommended permissions
  const setRecommendedPermissions = () => {
    const recommended = PERMISSIONS.filter(p => p.recommended).map(p => p.id);
    setEnabledPermissions(recommended);
    showToast('Empfohlene Sicherheitseinstellungen aktiviert');
  };

  // Enable all permissions
  const selectAllPermissions = () => {
    setEnabledPermissions(PERMISSIONS.map(p => p.id));
    showToast('Alle Berechtigungen aktiviert');
  };

  // Disable all permissions
  const deselectAllPermissions = () => {
    setEnabledPermissions([]);
    showToast('Alle Berechtigungen deaktiviert');
  };

  // Toggle single permission
  const togglePermission = (id: string, checked: boolean) => {
    if (checked) {
      setEnabledPermissions(prev => [...prev, id]);
    } else {
      setEnabledPermissions(prev => prev.filter(p => p !== id));
    }
  };

  // Get permissions by category
  const getPermissionsByCategory = (category: PermissionCategory) => {
    return PERMISSIONS.filter(p => p.category === category);
  };

  // Check if any critical permission is enabled
  const hasCriticalPermissions = PERMISSIONS
    .filter(p => p.riskLevel === 'critical')
    .some(p => enabledPermissions.includes(p.id));

  // Count enabled permissions by category
  const countByCategory = (category: PermissionCategory) => {
    return getPermissionsByCategory(category).filter(p => enabledPermissions.includes(p.id)).length;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Berechtigungen festlegen</h2>
        <p className="text-muted-foreground">
          Definiere, welche Aktionen dein Agent ausführen darf. Du kannst diese Einstellungen jederzeit ändern.
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={setRecommendedPermissions}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Shield className="w-4 h-4" />
          <span>Empfohlene Einstellungen</span>
        </button>
        <button
          onClick={selectAllPermissions}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Alle aktivieren</span>
        </button>
        <button
          onClick={deselectAllPermissions}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Alle deaktivieren</span>
        </button>
      </div>

      {/* Critical Warning */}
      {hasCriticalPermissions && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-600 dark:text-red-400 mb-1">
                Kritische Berechtigungen aktiviert
              </h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                Dein Agent kann unwiderrufliche Aktionen ausführen. Stelle sicher, dass du den Einsatzbereich verstehst.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Permission Cards */}
      <div className="space-y-4">
        {(['read', 'write', 'critical'] as const).map((category) => {
          const config = CATEGORY_CONFIG[category];
          const permissions = getPermissionsByCategory(category);
          const enabledCount = countByCategory(category);

          return (
            <div
              key={category}
              className={`border-2 rounded-lg overflow-hidden ${config.borderColor} ${config.bgColor}`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${config.iconColor}`}>
                      {config.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{config.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {enabledCount} von {permissions.length} aktiviert
                      </p>
                    </div>
                  </div>
                  {/* Risk Badge */}
                  <span className={`px-2 py-1 text-xs rounded-md border font-medium ${
                    category === 'read' ? RISK_BADGE_CONFIG.low.className :
                    category === 'write' ? RISK_BADGE_CONFIG.medium.className :
                    RISK_BADGE_CONFIG.high.className
                  }`}>
                    {category === 'read' ? 'Low-Medium Risk' :
                     category === 'write' ? 'Medium-High Risk' :
                     'High-Critical Risk'}
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4 space-y-3">
                {permissions.map((permission) => {
                  const isEnabled = enabledPermissions.includes(permission.id);

                  return (
                    <div
                      key={permission.id}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {/* Left: Label & Description */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{permission.label}</span>
                          {permission.recommended && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-md border border-primary/30">
                              Empfohlen
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-md border ${RISK_BADGE_CONFIG[permission.riskLevel].className}`}>
                            {RISK_BADGE_CONFIG[permission.riskLevel].label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>

                      {/* Right: Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        onClick={() => togglePermission(permission.id, !isEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          isEnabled ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Warning */}
      {enabledPermissions.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                Keine Berechtigungen ausgewählt
              </h4>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Dein Agent benötigt mindestens eine Lese-Berechtigung, um zu funktionieren.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Panel */}
      {enabledPermissions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">BERECHTIGUNGS-ÜBERSICHT</h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Read Count */}
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                {countByCategory('read')}
              </div>
              <div className="text-sm text-muted-foreground">Lesen</div>
            </div>

            {/* Write Count */}
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                {countByCategory('write')}
              </div>
              <div className="text-sm text-muted-foreground">Schreiben</div>
            </div>

            {/* Critical Count */}
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                {countByCategory('critical')}
              </div>
              <div className="text-sm text-muted-foreground">Kritisch</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <div
              className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
                toast.type === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
