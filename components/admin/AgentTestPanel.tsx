'use client';

import { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Zap
} from 'lucide-react';

interface AgentTestResult {
  agentId: string;
  agentName: string;
  status: 'OK' | 'FAIL';
  latency: number;
  error?: string;
  timestamp: string;
  details?: {
    hasPersona: boolean;
    hasIcon: boolean;
    hasSpecialties: boolean;
    hasValidConfig: boolean;
  };
}

interface AgentTestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: AgentTestResult[];
  timestamp: string;
}

export function AgentTestPanel() {
  const [summary, setSummary] = useState<AgentTestSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Test failed');
      }

      setSummary(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to run tests');
      console.error('[AGENT_TEST_PANEL]', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
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

  const passRate = summary
    ? ((summary.passed / summary.total) * 100).toFixed(1)
    : 0;

  return (
    <div className="agent-test-panel">
      <div className="test-panel-header">
        <div>
          <h2 className="test-panel-title">Agent System Health Check</h2>
          <p className="test-panel-description">
            Comprehensive functionality tests for all registered agents
          </p>
        </div>
        <button
          onClick={runTests}
          disabled={isLoading}
          className="test-run-button"
        >
          {isLoading ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play size={18} />
              Run All Tests
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="test-error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="test-summary-grid">
            <div className="test-summary-card">
              <div className="summary-card-icon total">
                <Zap size={20} />
              </div>
              <div className="summary-card-content">
                <span className="summary-card-label">Total Agents</span>
                <span className="summary-card-value">{summary.total}</span>
              </div>
            </div>

            <div className="test-summary-card">
              <div className="summary-card-icon success">
                <CheckCircle2 size={20} />
              </div>
              <div className="summary-card-content">
                <span className="summary-card-label">Passed</span>
                <span className="summary-card-value">{summary.passed}</span>
              </div>
            </div>

            <div className="test-summary-card">
              <div className="summary-card-icon error">
                <XCircle size={20} />
              </div>
              <div className="summary-card-content">
                <span className="summary-card-label">Failed</span>
                <span className="summary-card-value">{summary.failed}</span>
              </div>
            </div>

            <div className="test-summary-card">
              <div className="summary-card-icon metric">
                <TrendingUp size={20} />
              </div>
              <div className="summary-card-content">
                <span className="summary-card-label">Pass Rate</span>
                <span className="summary-card-value">{passRate}%</span>
              </div>
            </div>

            <div className="test-summary-card">
              <div className="summary-card-icon metric">
                <Clock size={20} />
              </div>
              <div className="summary-card-content">
                <span className="summary-card-label">Duration</span>
                <span className="summary-card-value">
                  {formatLatency(summary.duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Test Results Table */}
          <div className="test-results-section">
            <div className="test-results-header">
              <h3>Test Results</h3>
              <span className="test-timestamp">
                Last run: {formatTimestamp(summary.timestamp)}
              </span>
            </div>

            {/* Failed Agents (if any) */}
            {summary.failed > 0 && (
              <div className="test-results-group">
                <div className="test-group-header error">
                  <XCircle size={18} />
                  <span>Failed Agents ({summary.failed})</span>
                </div>
                <div className="test-results-table-wrapper">
                  <table className="test-results-table">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Status</th>
                        <th>Latency</th>
                        <th>Error</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.results
                        .filter(r => r.status === 'FAIL')
                        .map(result => (
                          <tr key={result.agentId} className="result-row error">
                            <td className="agent-name-cell">
                              <span className="agent-name">{result.agentName}</span>
                              <span className="agent-id">{result.agentId}</span>
                            </td>
                            <td>
                              <span className="status-badge error">
                                <XCircle size={14} />
                                FAIL
                              </span>
                            </td>
                            <td className="latency-cell">
                              {formatLatency(result.latency)}
                            </td>
                            <td className="error-cell">
                              {result.error || 'Unknown error'}
                            </td>
                            <td className="details-cell">
                              {result.details && (
                                <div className="detail-checks">
                                  <span className={result.details.hasPersona ? 'check-ok' : 'check-fail'}>
                                    Persona
                                  </span>
                                  <span className={result.details.hasIcon ? 'check-ok' : 'check-fail'}>
                                    Icon
                                  </span>
                                  <span className={result.details.hasSpecialties ? 'check-ok' : 'check-fail'}>
                                    Specialties
                                  </span>
                                  <span className={result.details.hasValidConfig ? 'check-ok' : 'check-fail'}>
                                    Config
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Passed Agents */}
            {summary.passed > 0 && (
              <div className="test-results-group">
                <div className="test-group-header success">
                  <CheckCircle2 size={18} />
                  <span>Passed Agents ({summary.passed})</span>
                </div>
                <div className="test-results-table-wrapper">
                  <table className="test-results-table">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Status</th>
                        <th>Latency</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.results
                        .filter(r => r.status === 'OK')
                        .map(result => (
                          <tr key={result.agentId} className="result-row success">
                            <td className="agent-name-cell">
                              <span className="agent-name">{result.agentName}</span>
                              <span className="agent-id">{result.agentId}</span>
                            </td>
                            <td>
                              <span className="status-badge success">
                                <CheckCircle2 size={14} />
                                OK
                              </span>
                            </td>
                            <td className="latency-cell">
                              {formatLatency(result.latency)}
                            </td>
                            <td className="details-cell">
                              {result.details && (
                                <div className="detail-checks">
                                  <span className="check-ok">Persona</span>
                                  <span className="check-ok">Icon</span>
                                  <span className="check-ok">Specialties</span>
                                  <span className="check-ok">Config</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!summary && !isLoading && (
        <div className="test-empty-state">
          <Play size={48} className="empty-state-icon" />
          <h3>No Tests Run Yet</h3>
          <p>Click "Run All Tests" to check the health of all agents</p>
        </div>
      )}
    </div>
  );
}
