"use client";

import { useState } from 'react';
import { Mail, Trash2, Reply, Send, AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolConfirmationProps {
  toolName: string;
  displayName: string;
  args: Record<string, any>;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Tool Confirmation Component
 *
 * Displays a confirmation dialog for destructive email actions.
 * Used before executing gmail_send, gmail_reply, and gmail_trash.
 */
export function ToolConfirmation({
  toolName,
  displayName,
  args,
  onConfirm,
  onCancel,
  isLoading = false,
}: ToolConfirmationProps) {
  const getToolIcon = () => {
    switch (toolName) {
      case 'gmail_send':
        return <Send className="h-5 w-5 text-blue-400" />;
      case 'gmail_reply':
        return <Reply className="h-5 w-5 text-green-400" />;
      case 'gmail_trash':
        return <Trash2 className="h-5 w-5 text-red-400" />;
      default:
        return <Mail className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getActionDetails = () => {
    switch (toolName) {
      case 'gmail_send':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-white/50">An:</span>
              <span className="text-white">{args.to}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/50">Betreff:</span>
              <span className="text-white">{args.subject}</span>
            </div>
            {args.cc && (
              <div className="flex items-center gap-2">
                <span className="text-white/50">CC:</span>
                <span className="text-white">{args.cc}</span>
              </div>
            )}
            <div className="mt-2 rounded-lg bg-card/5 p-3 max-h-32 overflow-y-auto">
              <div className="text-white/70 text-xs whitespace-pre-wrap">
                {args.body?.substring(0, 300)}
                {args.body?.length > 300 && '...'}
              </div>
            </div>
          </div>
        );

      case 'gmail_reply':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-white/50">Auf E-Mail:</span>
              <span className="text-white font-mono text-xs">{args.messageId}</span>
            </div>
            {args.replyAll && (
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-xs">Allen antworten</span>
              </div>
            )}
            <div className="mt-2 rounded-lg bg-card/5 p-3 max-h-32 overflow-y-auto">
              <div className="text-white/70 text-xs whitespace-pre-wrap">
                {args.body?.substring(0, 300)}
                {args.body?.length > 300 && '...'}
              </div>
            </div>
          </div>
        );

      case 'gmail_trash':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Diese E-Mail wird in den Papierkorb verschoben</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/50">E-Mail-ID:</span>
              <span className="text-white font-mono text-xs">{args.messageId}</span>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-white/70">
            {JSON.stringify(args, null, 2)}
          </div>
        );
    }
  };

  const getConfirmButtonStyle = () => {
    if (toolName === 'gmail_trash') {
      return 'bg-red-500 hover:bg-red-600 text-white';
    }
    return 'bg-blue-500 hover:bg-blue-600 text-white';
  };

  const getConfirmButtonText = () => {
    switch (toolName) {
      case 'gmail_send':
        return 'E-Mail senden';
      case 'gmail_reply':
        return 'Antwort senden';
      case 'gmail_trash':
        return 'Löschen';
      default:
        return 'Bestätigen';
    }
  };

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 my-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-yellow-500/10">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-yellow-400">
            Bestätigung erforderlich
          </h4>
          <p className="text-xs text-white/50">
            {displayName}
          </p>
        </div>
      </div>

      {/* Action Details */}
      <div className="mb-4 pl-12">
        {getActionDetails()}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pl-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="text-white/70 hover:text-white hover:bg-card/10"
        >
          <X className="h-4 w-4 mr-1" />
          Abbrechen
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className={getConfirmButtonStyle()}
        >
          {isLoading ? (
            <span className="animate-pulse">Ausführen...</span>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              {getConfirmButtonText()}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Check if a tool requires confirmation
 */
export function requiresConfirmation(toolName: string): boolean {
  const confirmationRequired = [
    'gmail_send',
    'gmail_reply',
    'gmail_trash',
  ];
  return confirmationRequired.includes(toolName);
}

/**
 * Get confirmation message for a tool
 */
export function getConfirmationMessage(toolName: string, args: Record<string, any>): string {
  switch (toolName) {
    case 'gmail_send':
      return `E-Mail an ${args.to} senden?`;
    case 'gmail_reply':
      return 'Antwort senden?';
    case 'gmail_trash':
      return 'E-Mail in den Papierkorb verschieben?';
    default:
      return 'Aktion bestätigen?';
  }
}
