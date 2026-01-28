'use client';

/**
 * ArtifactBlock - Summary Card for Artifacts in Chat Stream
 * Displays a clickable preview card instead of the full artifact content
 */

import React from 'react';
import { FileCode, FileText, Mail, Table, ExternalLink, Clock } from 'lucide-react';
import type { Artifact, ArtifactType } from '@/types/inbox';
import { useInboxStore } from '@/lib/stores/useInboxStore';

interface ArtifactBlockProps {
  artifact: Artifact;
  agentColor?: string;
}

// Icon mapping for artifact types
const artifactIcons: Record<ArtifactType, React.ElementType> = {
  code: FileCode,
  markdown: FileText,
  email_draft: Mail,
  data_table: Table,
};

// Label mapping for artifact types
const artifactLabels: Record<ArtifactType, string> = {
  code: 'Code',
  markdown: 'Document',
  email_draft: 'Email Draft',
  data_table: 'Data Table',
};

// Get language display name
function getLanguageLabel(language?: string): string {
  if (!language) return '';
  const labels: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    python: 'Python',
    java: 'Java',
    go: 'Go',
    rust: 'Rust',
    sql: 'SQL',
    css: 'CSS',
    html: 'HTML',
    json: 'JSON',
    yaml: 'YAML',
    markdown: 'Markdown',
  };
  return labels[language.toLowerCase()] || language;
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function ArtifactBlock({ artifact, agentColor = '#3b82f6' }: ArtifactBlockProps) {
  const { openArtifact } = useInboxStore();
  const Icon = artifactIcons[artifact.type];
  const typeLabel = artifactLabels[artifact.type];
  const languageLabel = getLanguageLabel(artifact.language);

  // Calculate stats
  const lineCount = artifact.content.split('\n').length;
  const wordCount = artifact.content.split(/\s+/).filter(Boolean).length;

  const handleClick = () => {
    openArtifact(artifact);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full max-w-md group cursor-pointer transition-all duration-200"
    >
      <div
        className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 hover:border-white/20 transition-all duration-200"
        style={{
          boxShadow: `0 0 0 1px ${agentColor}20, 0 4px 12px -2px ${agentColor}10`,
        }}
      >
        {/* Accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: agentColor }}
        />

        <div className="p-4 pl-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${agentColor}20` }}
            >
              <Icon size={20} style={{ color: agentColor }} />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${agentColor}20`,
                    color: agentColor,
                  }}
                >
                  {typeLabel}
                  {languageLabel && ` - ${languageLabel}`}
                </span>
                {artifact.version > 1 && (
                  <span className="text-xs text-white/40">
                    v{artifact.version}
                  </span>
                )}
              </div>

              <h4 className="font-medium text-white truncate">
                {artifact.title}
              </h4>

              <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                <span>{lineCount} lines</span>
                <span>{wordCount} words</span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatRelativeTime(artifact.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 text-white/30 group-hover:text-white/60 transition-colors">
              <ExternalLink size={16} />
            </div>
          </div>

          {/* Preview snippet for code */}
          {artifact.type === 'code' && artifact.content && (
            <div className="mt-3 p-2 rounded-lg bg-black/30 border border-white/5 overflow-hidden">
              <pre className="text-xs text-white/60 font-mono truncate">
                {artifact.content.split('\n').slice(0, 2).join('\n')}
                {artifact.content.split('\n').length > 2 && '...'}
              </pre>
            </div>
          )}

          {/* Preview snippet for email/markdown */}
          {(artifact.type === 'email_draft' || artifact.type === 'markdown') && artifact.content && (
            <p className="mt-2 text-sm text-white/50 line-clamp-2 text-left">
              {artifact.content.substring(0, 120)}
              {artifact.content.length > 120 && '...'}
            </p>
          )}
        </div>

        {/* Click to view overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity pointer-events-none">
          <span className="text-sm font-medium text-white px-3 py-1.5 rounded-full bg-card/10 backdrop-blur-sm">
            Click to view & edit
          </span>
        </div>
      </div>
    </button>
  );
}
