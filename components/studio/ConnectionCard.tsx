import { DatabaseConnection } from './ConnectionsManager';
import {
    Database,
    Server,
    Key,
    CheckCircle2,
    AlertCircle,
    Loader2,
    TestTube,
    Edit3,
    Trash2
} from 'lucide-react';

interface ConnectionCardProps {
    connection: DatabaseConnection;
    isTesting: boolean;
    onTest: (id: string) => void;
    onEdit: (connection: DatabaseConnection) => void;
    onDelete: (id: string) => void;
}

export function ConnectionCard({
    connection,
    isTesting,
    onTest,
    onEdit,
    onDelete
}: ConnectionCardProps) {
    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'connected':
                return <CheckCircle2 className="h-4 w-4 text-green-400" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-400" />;
            case 'testing':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
            default:
                return <Database className="h-4 w-4 text-text-muted" />;
        }
    };

    const getStatusText = (status?: string) => {
        switch (status) {
            case 'connected':
                return <span className="text-green-400">Connected</span>;
            case 'error':
                return <span className="text-red-400">Error</span>;
            case 'testing':
                return <span className="text-blue-400">Testing...</span>;
            default:
                return <span className="text-text-muted">Not tested</span>;
        }
    };

    const getDbTypeLabel = (type: string) => {
        switch (type) {
            case 'postgresql': return 'PostgreSQL';
            case 'mysql': return 'MySQL';
            case 'mongodb': return 'MongoDB';
            case 'sqlite': return 'SQLite';
            default: return type;
        }
    };

    return (
        <div className="rounded-lg border border-white/10 bg-surface-0 p-3 transition hover:border-purple-400/30">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    {/* Connection Header */}
                    <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(connection.status)}
                        <h4 className="text-sm font-semibold text-text">{connection.name}</h4>
                        <span className="rounded bg-card/10 px-1.5 py-0.5 text-xs text-text-muted">
                            {getDbTypeLabel(connection.type)}
                        </span>
                    </div>

                    {/* Connection Details */}
                    <div className="space-y-1 text-xs text-text-muted">
                        <div className="flex items-center gap-2">
                            <Server className="h-3 w-3" />
                            <span className="font-mono">{connection.host}:{connection.port}</span>
                            <span>→</span>
                            <span className="font-mono">{connection.database}</span>
                        </div>

                        {connection.username && (
                            <div className="flex items-center gap-2">
                                <Key className="h-3 w-3" />
                                <span className="font-mono">{connection.username}</span>
                                {connection.password && (
                                    <span className="text-green-400">• Password set</span>
                                )}
                                {connection.ssl && (
                                    <span className="text-blue-400">• SSL enabled</span>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <span>Status:</span>
                            {getStatusText(connection.status)}
                            {connection.lastTested && (
                                <span>
                                    • Last tested: {new Date(connection.lastTested).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onTest(connection.id)}
                        disabled={isTesting}
                        className="rounded p-1.5 text-blue-400 transition hover:bg-blue-400/10 disabled:opacity-50"
                        title="Test Connection"
                    >
                        {isTesting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <TestTube className="h-4 w-4" />
                        )}
                    </button>

                    <button
                        onClick={() => onEdit(connection)}
                        className="rounded p-1.5 text-text-muted transition hover:bg-purple-400/10 hover:text-purple-400"
                        title="Edit"
                    >
                        <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => onDelete(connection.id)}
                        className="rounded p-1.5 text-text-muted transition hover:bg-red-400/10 hover:text-red-400"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
