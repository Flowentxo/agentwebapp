/**
 * USER-FRIENDLY MESSAGES
 *
 * Converts technical logs to user-friendly messages with emojis and clear language
 */

export interface UserFriendlyMessage {
  icon: string;
  title: string;
  description: string;
  variant: 'info' | 'success' | 'warning' | 'error';
}

export function getUserFriendlyMessage(
  nodeName: string,
  message: string,
  level: string,
  data?: any
): UserFriendlyMessage {

  // System messages
  if (nodeName === 'System' || message.includes('Workflow')) {
    if (message.includes('gestartet')) {
      return {
        icon: '🚀',
        title: 'Workflow gestartet',
        description: 'Dein Agent-Workflow wird jetzt ausgeführt',
        variant: 'info'
      };
    }
    if (message.includes('erfolgreich abgeschlossen')) {
      return {
        icon: '🎉',
        title: 'Workflow abgeschlossen!',
        description: 'Alle Module wurden erfolgreich verarbeitet',
        variant: 'success'
      };
    }
    if (message.includes('Simulation')) {
      return {
        icon: '🧪',
        title: 'Simulation-Modus',
        description: 'Du testest mit simulierten Daten. Workflow speichern für echte Ausführung.',
        variant: 'warning'
      };
    }
  }

  // Node execution messages
  if (message.includes('Starte Ausführung')) {
    return {
      icon: '⚙️',
      title: `${nodeName} wird verarbeitet`,
      description: 'Modul wird ausgeführt...',
      variant: 'info'
    };
  }

  if (message.includes('erfolgreich ausgeführt')) {
    // Customize based on node type
    const customMessage = getNodeSuccessMessage(nodeName, data);
    return {
      icon: customMessage.icon,
      title: customMessage.title,
      description: customMessage.description,
      variant: 'success'
    };
  }

  // Error messages
  if (level === 'error') {
    return {
      icon: '❌',
      title: 'Fehler aufgetreten',
      description: message || 'Ein unerwarteter Fehler ist aufgetreten',
      variant: 'error'
    };
  }

  // Default
  return {
    icon: 'ℹ️',
    title: nodeName,
    description: message,
    variant: 'info'
  };
}

/**
 * Get custom success message based on node type
 */
function getNodeSuccessMessage(nodeName: string, data?: any): {
  icon: string;
  title: string;
  description: string;
} {
  const lowerName = nodeName.toLowerCase();

  // Data Analysis
  if (lowerName.includes('data') || lowerName.includes('analysis')) {
    const dataPoints = data?.dataPoints || '1.000+';
    const quality = data?.dataQuality || '98.5%';
    return {
      icon: '📊',
      title: 'Datenanalyse abgeschlossen',
      description: `${dataPoints} Datenpunkte analysiert • ${quality} Datenqualität`
    };
  }

  // Customer Support
  if (lowerName.includes('customer') || lowerName.includes('support')) {
    const sentiment = data?.sentiment || 'positive';
    const confidence = data?.confidence ? `${(parseFloat(data.confidence) * 100).toFixed(0)}%` : '92%';
    return {
      icon: '💬',
      title: 'Support-Antwort generiert',
      description: `Stimmung: ${sentiment} • Zuversicht: ${confidence}`
    };
  }

  // Content Generation
  if (lowerName.includes('content') || lowerName.includes('generation')) {
    const wordCount = data?.wordCount || '180';
    const readingTime = data?.readingTime || '2 min';
    return {
      icon: '✍️',
      title: 'Content erstellt',
      description: `${wordCount} Wörter • Lesezeit: ${readingTime}`
    };
  }

  // Code Review
  if (lowerName.includes('code') || lowerName.includes('review')) {
    const linesReviewed = data?.linesReviewed || '250';
    const issues = data?.issues?.length || 2;
    return {
      icon: '🔍',
      title: 'Code-Review abgeschlossen',
      description: `${linesReviewed} Zeilen geprüft • ${issues} Verbesserungsvorschläge`
    };
  }

  // Email
  if (lowerName.includes('email') || lowerName.includes('mail')) {
    const recipient = data?.recipient || 'Empfänger';
    const status = data?.status === 'sent' ? 'versendet' : 'vorbereitet';
    return {
      icon: '📧',
      title: `E-Mail ${status}`,
      description: `An: ${recipient}`
    };
  }

  // Slack
  if (lowerName.includes('slack')) {
    const channel = data?.channel || '#general';
    return {
      icon: '💬',
      title: 'Slack-Nachricht gesendet',
      description: `Kanal: ${channel}`
    };
  }

  // Research
  if (lowerName.includes('research') || lowerName.includes('search')) {
    const sources = data?.sources || 8;
    const documents = data?.relevantDocuments || 15;
    return {
      icon: '🔎',
      title: 'Recherche abgeschlossen',
      description: `${sources} Quellen durchsucht • ${documents} relevante Dokumente gefunden`
    };
  }

  // Condition/Logic
  if (lowerName.includes('condition') || lowerName.includes('logic')) {
    const branch = data?.branch || 'primary';
    return {
      icon: '🔀',
      title: 'Bedingung ausgewertet',
      description: `Pfad: ${branch}`
    };
  }

  // Loop
  if (lowerName.includes('loop') || lowerName.includes('iterate')) {
    const iterations = data?.iterations || 5;
    const items = data?.itemsProcessed || 25;
    return {
      icon: '🔁',
      title: 'Schleife abgeschlossen',
      description: `${iterations} Durchläufe • ${items} Elemente verarbeitet`
    };
  }

  // Default success
  return {
    icon: '✅',
    title: `${nodeName} abgeschlossen`,
    description: 'Modul erfolgreich ausgeführt'
  };
}

/**
 * Get progress percentage from logs
 */
export function getProgressPercentage(logs: any[], totalNodes: number): number {
  const completedNodes = logs.filter(log =>
    log.level === 'success' &&
    log.nodeId !== 'system'
  ).length;

  return Math.round((completedNodes / totalNodes) * 100);
}

/**
 * Get estimated time remaining
 */
export function getEstimatedTimeRemaining(
  logs: any[],
  totalNodes: number
): string {
  const completedNodes = logs.filter(log =>
    log.level === 'success' &&
    log.nodeId !== 'system'
  ).length;

  if (completedNodes === 0) return 'Wird berechnet...';

  const avgTimePerNode = logs
    .filter(log => log.duration)
    .reduce((sum, log) => sum + (log.duration || 0), 0) / completedNodes;

  const remainingNodes = totalNodes - completedNodes;
  const estimatedMs = remainingNodes * avgTimePerNode;

  if (estimatedMs < 1000) return 'Weniger als 1 Sekunde';
  if (estimatedMs < 60000) return `~${Math.round(estimatedMs / 1000)} Sekunden`;
  return `~${Math.round(estimatedMs / 60000)} Minuten`;
}
