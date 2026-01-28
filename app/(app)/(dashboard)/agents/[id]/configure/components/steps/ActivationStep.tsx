'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Rocket,
  Edit,
  Sparkles,
  ExternalLink,
  Plus
} from 'lucide-react';

interface ChecklistItem {
  id: number;
  title: string;
  summary: string;
  isValid: boolean;
  canEdit: boolean;
}

interface ActivationStepProps {
  stepValidation: Record<number, boolean>;
  agentName: string;
  onNavigateToStep: (step: number) => void;
  onActivate: () => void;
}

export function ActivationStep({
  stepValidation,
  agentName,
  onNavigateToStep,
  onActivate
}: ActivationStepProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);

  // Build checklist from stepValidation
  const checklistItems: ChecklistItem[] = [
    {
      id: 1,
      title: 'Agent-Details',
      summary: stepValidation[1]
        ? `${agentName} - Konfiguration abgeschlossen`
        : 'Name und Grundeinstellungen erforderlich',
      isValid: stepValidation[1],
      canEdit: true
    },
    {
      id: 2,
      title: 'Workflows',
      summary: stepValidation[2]
        ? 'Mind. 1 Workflow konfiguriert'
        : 'Kein Workflow definiert',
      isValid: stepValidation[2],
      canEdit: true
    },
    {
      id: 3,
      title: 'Integrationen',
      summary: stepValidation[3]
        ? 'Mind. 1 Integration verbunden'
        : 'Keine Integration verbunden',
      isValid: stepValidation[3],
      canEdit: true
    },
    {
      id: 4,
      title: 'Berechtigungen',
      summary: stepValidation[4]
        ? 'Berechtigungen festgelegt'
        : 'Keine Lese-Berechtigung aktiviert',
      isValid: stepValidation[4],
      canEdit: true
    },
    {
      id: 5,
      title: 'Testing',
      summary: stepValidation[5]
        ? 'Test erfolgreich abgeschlossen'
        : 'Test noch nicht durchgeführt',
      isValid: stepValidation[5],
      canEdit: true
    },
    {
      id: 6,
      title: 'Produktionsbereitschaft',
      summary: allStepsValid
        ? 'Alle Voraussetzungen erfüllt'
        : 'Nicht alle Schritte abgeschlossen',
      isValid: allStepsValid,
      canEdit: false
    }
  ];

  const allStepsValid = Object.values(stepValidation).every(v => v === true);
  const missingSteps = checklistItems.filter(item => !item.isValid && item.canEdit);

  // Handle activation
  const handleActivate = async () => {
    setShowConfirmDialog(false);
    setIsActivating(true);

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Call parent onActivate
      onActivate();

      setActivationSuccess(true);
    } catch (error) {
      console.error('Activation failed:', error);
      // In production: show error toast
    } finally {
      setIsActivating(false);
    }
  };

  // Success Screen
  if (activationSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[600px] flex items-center justify-center"
      >
        <div className="text-center max-w-2xl mx-auto p-8">
          {/* Rocket Icon with Animation */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
            className="mb-8"
          >
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Rocket className="w-12 h-12 text-primary" />
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-4xl font-bold mb-4">
              Agent erfolgreich aktiviert!
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              "{agentName}" ist jetzt live und einsatzbereit.
            </p>
          </motion.div>

          {/* Success Details */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-8"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">
                  Was passiert jetzt?
                </h3>
                <ul className="space-y-2 text-sm text-green-600 dark:text-green-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Agent ist produktiv geschaltet</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Workflows werden automatisch ausgeführt</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Integrationen sind aktiv</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Du kannst den Agent jederzeit pausieren</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => window.location.href = `/agents/${agentName.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Dashboard öffnen</span>
            </button>
            <button
              onClick={() => window.location.href = '/revolution'}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Weiteren Agent erstellen</span>
            </button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Main Activation Screen
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Agent aktivieren</h2>
        <p className="text-muted-foreground">
          Überprüfe alle Einstellungen bevor dein Agent live geht
        </p>
      </div>

      {/* Warning Panel (if not all valid) */}
      {!allStepsValid && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                Noch nicht bereit für Aktivierung
              </h4>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-3">
                Folgende Schritte müssen noch abgeschlossen werden:
              </p>
              <ul className="space-y-2">
                {missingSteps.map(step => (
                  <li key={step.id} className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <XCircle className="w-4 h-4" />
                    <span>{step.title}</span>
                    <button
                      onClick={() => onNavigateToStep(step.id)}
                      className="ml-auto text-xs underline hover:no-underline"
                    >
                      Bearbeiten
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-3">
                Klicke auf "Bearbeiten" um fehlende Schritte zu vervollständigen.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Success Panel (if all valid) */}
      {allStepsValid && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">
                Dein Agent ist bereit für die Aktivierung!
              </h4>
              <p className="text-sm text-green-600 dark:text-green-400">
                Alle Konfigurationsschritte wurden erfolgreich abgeschlossen.
                Sobald du auf "Agent aktivieren" klickst, wird dein Agent
                produktiv geschaltet und kann echte Aktionen durchführen.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Go-Live Checklist */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold mb-4">Pre-Launch Checklist</h3>
        {checklistItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: item.id * 0.1 }}
            className={`border-2 rounded-lg p-4 transition-all ${
              item.isValid
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-red-500/30 bg-red-500/5'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Status Icon */}
              <div className={`flex-shrink-0 mt-1 ${
                item.isValid
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {item.isValid ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{item.title}</h4>
                  <span className={`px-2 py-0.5 text-xs rounded-md ${
                    item.isValid
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {item.isValid ? 'Abgeschlossen' : 'Ausstehend'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.summary}
                </p>
              </div>

              {/* Edit Button */}
              {item.canEdit && (
                <button
                  onClick={() => onNavigateToStep(item.id)}
                  className="flex-shrink-0 p-2 border border-border rounded-lg hover:bg-accent transition-colors"
                  title="Schritt bearbeiten"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activation Button */}
      <div className="pt-4">
        <button
          onClick={() => setShowConfirmDialog(true)}
          disabled={!allStepsValid || isActivating}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Rocket className="w-6 h-6" />
          <span>
            {isActivating ? 'Agent wird aktiviert...' : 'Agent aktivieren und live schalten'}
          </span>
        </button>
        {!allStepsValid && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Schließe alle Schritte ab um den Agent zu aktivieren
          </p>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowConfirmDialog(false)}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-card border border-border rounded-lg shadow-2xl z-50"
            >
              {/* Dialog Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold">Agent jetzt aktivieren?</h3>
                </div>
              </div>

              {/* Dialog Content */}
              <div className="p-6 space-y-4">
                <p className="text-foreground">
                  Dein Agent <strong>"{agentName}"</strong> wird jetzt live geschaltet und kann:
                </p>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Echte E-Mails senden</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>CRM-Daten verändern</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Tickets erstellen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Mit Kunden kommunizieren</span>
                  </li>
                </ul>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <strong>Wichtig:</strong> Der Agent wird sofort produktiv geschaltet.
                      Stelle sicher, dass alle Einstellungen korrekt sind.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dialog Footer */}
              <div className="p-6 border-t border-border flex items-center gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleActivate}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Ja, aktivieren
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
