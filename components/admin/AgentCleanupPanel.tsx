'use client';

import { useState } from 'react';
import {
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Zap,
  Shield,
} from 'lucide-react';

interface CleanupAction {
  agentId: string;
  agentName: string;
  action: 'keep' | 'delete';
  reason: string;
  testStatus?: 'OK' | 'FAIL';
}

interface CleanupPlan {
  total: number;
  toKeep: number;
  toDelete: number;
  actions: CleanupAction[];
  timestamp: string;
}

interface CleanupResult {
  plan: CleanupPlan;
  executed: boolean;
  deleted: string[];
  kept: string[];
  errors: { agentId: string; error: string }[];
  timestamp: string;
}

export function AgentCleanupPanel() {
  const [plan, setPlan] = useState<CleanupPlan | null>(null);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/agents/cleanup');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Vorschau fehlgeschlagen');
      }

      setPlan(data.data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Vorschau');
      console.error('[CLEANUP_PREVIEW]', err);
    } finally {
      setIsLoading(false);
    }
  };

  const executeDryRun = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, execute: false }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Dry-Run fehlgeschlagen');
      }

      setResult(data.data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Dry-Run');
      console.error('[CLEANUP_DRYRUN]', err);
    } finally {
      setIsLoading(false);
    }
  };

  const executeCleanup = async () => {
    setIsLoading(true);
    setError(null);
    setShowConfirmation(false);

    try {
      const response = await fetch('/api/agents/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false, execute: true }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Cleanup fehlgeschlagen');
      }

      setResult(data.data);

      // Reload page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Cleanup');
      console.error('[CLEANUP_EXECUTE]', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="agent-cleanup-panel">
      <div className="cleanup-panel-header">
        <div>
          <h2 className="cleanup-panel-title">Agent Cleanup System</h2>
          <p className="cleanup-panel-description">
            Automatisches Entfernen fehlerhafter und nicht-whitelisteter Agents
          </p>
        </div>
        <div className="cleanup-actions">
          <button
            onClick={loadPreview}
            disabled={isLoading}
            className="cleanup-button secondary"
          >
            <Eye size={18} />
            Vorschau laden
          </button>
          <button
            onClick={executeDryRun}
            disabled={isLoading}
            className="cleanup-button secondary"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Dry-Run testen
          </button>
        </div>
      </div>

      {error && (
        <div className="cleanup-error-banner">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Whitelist Info */}
      <div className="whitelist-info">
        <Shield size={20} />
        <div>
          <strong>Geschützte Agents (Whitelist):</strong>
          <span className="whitelist-badges">
            <span className="whitelist-badge">Dexter</span>
            <span className="whitelist-badge">Cassie</span>
            <span className="whitelist-badge">Emmie</span>
            <span className="whitelist-badge">Aura</span>
          </span>
        </div>
      </div>

      {/* Plan/Result Summary */}
      {(plan || result) && (
        <div className="cleanup-summary-grid">
          <div className="cleanup-summary-card">
            <div className="summary-card-icon total">
              <Zap size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Total Agents</span>
              <span className="summary-card-value">
                {plan?.total || result?.plan.total || 0}
              </span>
            </div>
          </div>

          <div className="cleanup-summary-card">
            <div className="summary-card-icon success">
              <CheckCircle2 size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Zu behalten</span>
              <span className="summary-card-value">
                {plan?.toKeep || result?.plan.toKeep || 0}
              </span>
            </div>
          </div>

          <div className="cleanup-summary-card">
            <div className="summary-card-icon error">
              <Trash2 size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Zu löschen</span>
              <span className="summary-card-value">
                {plan?.toDelete || result?.plan.toDelete || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Actions Table */}
      {plan && !result && (
        <div className="cleanup-actions-section">
          <div className="cleanup-actions-header">
            <h3>Geplante Aktionen</h3>
            <span className="cleanup-timestamp">
              Erstellt: {formatTimestamp(plan.timestamp)}
            </span>
          </div>

          {/* Agents to Delete */}
          {plan.toDelete > 0 && (
            <div className="cleanup-actions-group">
              <div className="cleanup-group-header error">
                <Trash2 size={18} />
                <span>Zu löschen ({plan.toDelete})</span>
              </div>
              <div className="cleanup-actions-table-wrapper">
                <table className="cleanup-actions-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Test-Status</th>
                      <th>Grund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.actions
                      .filter(a => a.action === 'delete')
                      .map(action => (
                        <tr key={action.agentId} className="action-row delete">
                          <td className="agent-name-cell">
                            <span className="agent-name">{action.agentName}</span>
                            <span className="agent-id">{action.agentId}</span>
                          </td>
                          <td>
                            <span className={`status-badge ${action.testStatus === 'OK' ? 'success' : 'error'}`}>
                              {action.testStatus === 'OK' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                              {action.testStatus}
                            </span>
                          </td>
                          <td className="reason-cell">{action.reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Agents to Keep */}
          {plan.toKeep > 0 && (
            <div className="cleanup-actions-group">
              <div className="cleanup-group-header success">
                <CheckCircle2 size={18} />
                <span>Zu behalten ({plan.toKeep})</span>
              </div>
              <div className="cleanup-actions-table-wrapper">
                <table className="cleanup-actions-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Test-Status</th>
                      <th>Grund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.actions
                      .filter(a => a.action === 'keep')
                      .map(action => (
                        <tr key={action.agentId} className="action-row keep">
                          <td className="agent-name-cell">
                            <span className="agent-name">{action.agentName}</span>
                            <span className="agent-id">{action.agentId}</span>
                          </td>
                          <td>
                            <span className="status-badge success">
                              <CheckCircle2 size={14} />
                              OK
                            </span>
                          </td>
                          <td className="reason-cell">{action.reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Execute Button */}
          {plan.toDelete > 0 && !showConfirmation && (
            <div className="cleanup-execute-section">
              <button
                onClick={() => setShowConfirmation(true)}
                className="cleanup-button danger"
              >
                <Trash2 size={18} />
                Cleanup ausführen ({plan.toDelete} Agents löschen)
              </button>
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirmation && (
            <div className="cleanup-confirmation">
              <AlertTriangle size={24} className="confirmation-icon" />
              <h3>Cleanup bestätigen</h3>
              <p>
                Sie sind dabei, <strong>{plan.toDelete} Agents</strong> permanent zu löschen.
                Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
              <div className="confirmation-actions">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="cleanup-button secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={executeCleanup}
                  disabled={isLoading}
                  className="cleanup-button danger"
                >
                  <Trash2 size={18} />
                  Ja, jetzt löschen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="cleanup-result-section">
          <div className="cleanup-result-header">
            <h3>
              {result.executed ? '✅ Cleanup ausgeführt' : '🔍 Dry-Run Ergebnis'}
            </h3>
            <span className="cleanup-timestamp">
              {formatTimestamp(result.timestamp)}
            </span>
          </div>

          {result.executed && (
            <div className="result-summary success">
              <CheckCircle2 size={20} />
              <div>
                <strong>Cleanup erfolgreich abgeschlossen!</strong>
                <p>
                  {result.deleted.length} Agents gelöscht, {result.kept.length} behalten.
                  Die Seite wird in 2 Sekunden neu geladen...
                </p>
              </div>
            </div>
          )}

          {!result.executed && (
            <div className="result-summary info">
              <Eye size={20} />
              <div>
                <strong>Dies war ein Dry-Run</strong>
                <p>Keine Agents wurden tatsächlich gelöscht. Dies ist eine Vorschau.</p>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="result-errors">
              <h4>⚠️ Fehler beim Cleanup:</h4>
              <ul>
                {result.errors.map((err, i) => (
                  <li key={i}>
                    Agent {err.agentId}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!plan && !result && !isLoading && (
        <div className="cleanup-empty-state">
          <Eye size={48} className="empty-state-icon" />
          <h3>Keine Vorschau geladen</h3>
          <p>Klicken Sie auf "Vorschau laden" um zu sehen, welche Agents gelöscht würden</p>
        </div>
      )}
    </div>
  );
}
