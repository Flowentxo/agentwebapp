'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Database,
  RotateCcw,
  Play,
  Sparkles
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface LogEntry {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'api';
  message: string;
  timestamp: Date;
  details?: any;
}

const TEST_LEADS = [
  {
    name: 'Max Müller',
    company: 'Müller Maschinenbau GmbH',
    budget: '75.000€',
    status: 'Neu',
    interest: 'Drehmaschinen'
  },
  {
    name: 'Anna Schmidt',
    company: 'Schmidt Fertigung AG',
    budget: '120.000€',
    status: 'Qualifiziert',
    interest: 'Fräsanlagen'
  },
  {
    name: 'Thomas Weber',
    company: 'Weber Industries',
    budget: '45.000€',
    status: 'Kontaktiert',
    interest: 'CNC-Maschinen'
  }
];

const TEST_MESSAGES = [
  'Hallo, ich interessiere mich für eine Drehmaschine',
  'Könnt ihr mir ein Angebot schicken?',
  'Wann ist der nächste verfügbare Termin?',
  'Was kostet die CNC-Fräse XL2000?',
  'Ich möchte meinen Vertrag kündigen'
];

const LOG_TYPE_CONFIG = {
  info: {
    icon: <Info className="w-4 h-4" />,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
  },
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30'
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
  },
  api: {
    icon: <Zap className="w-4 h-4" />,
    className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
  }
};

interface TestingStepProps {
  onValidationChange: (isValid: boolean) => void;
}

export function TestingStep({ onValidationChange }: TestingStepProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [testDataLoaded, setTestDataLoaded] = useState(false);
  const [conversationCount, setConversationCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Validation: At least 3 messages sent and 2 agent responses
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user').length;
    const agentMessages = messages.filter(m => m.role === 'agent').length;
    const hasErrors = logs.some(l => l.type === 'error');

    const isValid = userMessages >= 3 && agentMessages >= 2 && !hasErrors;
    onValidationChange(isValid);
  }, [messages, logs, onValidationChange]);

  // Show toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Add log entry
  const addLog = (type: LogEntry['type'], message: string, details?: any) => {
    const log: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: new Date(),
      details
    };
    setLogs(prev => [...prev, log]);
  };

  // Load test data
  const loadTestData = () => {
    addLog('info', `Test-Daten geladen: ${TEST_LEADS.length} Leads, ${TEST_MESSAGES.length} Beispiel-Nachrichten`);
    setTestDataLoaded(true);
    showToast('Test-Daten erfolgreich geladen');
  };

  // Reset chat
  const resetChat = () => {
    setMessages([]);
    setLogs([]);
    setConversationCount(0);
    setTestDataLoaded(false);
    showToast('Chat zurückgesetzt');
  };

  // Start new test
  const startNewTest = () => {
    resetChat();
    loadTestData();
  };

  // Simulate agent response
  const simulateAgentResponse = async (userMessage: string) => {
    setIsAgentTyping(true);

    // Log: Message received
    addLog('info', `Nachricht empfangen: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Log: Analyzing intent
    addLog('info', 'Analysiere Intent...');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Determine intent and response
    const lowerMessage = userMessage.toLowerCase();
    let intent = 'unknown';
    let response = '';

    if (lowerMessage.includes('drehmaschine') || lowerMessage.includes('maschine')) {
      intent = 'Produktanfrage - Drehmaschine';
      response = `Gerne helfe ich Ihnen weiter! Wir haben verschiedene Drehmaschinen im Angebot.

Für eine passende Empfehlung benötige ich noch ein paar Informationen:
• Welcher Werkstück-Durchmesser wird benötigt?
• Ist eine CNC-Steuerung gewünscht?
• Wie ist Ihr Budget?

Alternativ kann ich Ihnen einen Termin mit unserem Vertriebsteam vereinbaren.`;
    } else if (lowerMessage.includes('angebot') || lowerMessage.includes('preis') || lowerMessage.includes('kosten')) {
      intent = 'Preisanfrage';
      response = `Sehr gerne erstelle ich Ihnen ein individuelles Angebot.

Dazu benötige ich noch folgende Informationen:
• Welches Produkt interessiert Sie genau?
• Benötigte Stückzahl
• Gewünschter Liefertermin

Ich kann Ihnen auch einen Rückruf von unserem Vertrieb organisieren. Wann passt es Ihnen am besten?`;
    } else if (lowerMessage.includes('termin')) {
      intent = 'Terminanfrage';
      response = `Sehr gerne vereinbare ich einen Termin für Sie!

Verfügbare Termine diese Woche:
• Mittwoch, 18.12. um 14:00 Uhr
• Donnerstag, 19.12. um 10:30 Uhr
• Freitag, 20.12. um 15:00 Uhr

Welcher Termin würde Ihnen passen? Soll es ein Telefonat oder ein persönliches Treffen sein?`;
    } else if (lowerMessage.includes('kündigung') || lowerMessage.includes('kündigen')) {
      intent = 'Kündigung - Eskalation erforderlich';
      response = `Das tut mir leid zu hören. Ich leite Ihr Anliegen an unseren Kundenservice weiter.

Ein Mitarbeiter wird sich innerhalb von 24 Stunden bei Ihnen melden, um die Situation zu besprechen und mögliche Lösungen zu finden.

Gibt es einen bestimmten Grund für Ihre Entscheidung? Vielleicht können wir gemeinsam eine Lösung finden.`;
      addLog('warning', 'Kritisches Keyword erkannt: Kündigung - Eskalation an Support');
    } else {
      intent = 'Allgemeine Anfrage';
      response = `Vielen Dank für Ihre Nachricht!

Ich bin Ihr digitaler Assistent und helfe Ihnen gerne weiter bei:
• Produktinformationen
• Terminvereinbarungen
• Angebotserstellung
• Allgemeinen Fragen

Wie kann ich Ihnen konkret helfen?`;
    }

    addLog('success', `Intent erkannt: ${intent}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Log: CRM lookup
    addLog('api', 'HubSpot API: GET /contacts/search');
    await new Promise(resolve => setTimeout(resolve, 400));
    addLog('success', '3 relevante Kontakte gefunden');

    // Log: Workflow execution
    if (intent.includes('Produkt')) {
      addLog('info', 'Workflow: Produktberatung gestartet');
    } else if (intent.includes('Termin')) {
      addLog('info', 'Workflow: Terminvereinbarung gestartet');
    } else if (intent.includes('Kündigung')) {
      addLog('warning', 'Workflow: Kündigungs-Prävention gestartet');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Add agent message
    const agentMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'agent',
      content: response,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, agentMessage]);
    setIsAgentTyping(false);

    addLog('success', 'Antwort generiert und gesendet');
    setConversationCount(prev => prev + 1);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!input.trim() || isAgentTyping) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    await simulateAgentResponse(input);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Quick test message
  const sendTestMessage = (message: string) => {
    setInput(message);
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const testPassed = conversationCount >= 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Agent testen</h2>
        <p className="text-muted-foreground">
          Teste deinen Agent in einer sicheren Sandbox-Umgebung mit Beispieldaten
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={loadTestData}
          disabled={testDataLoaded}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Database className="w-4 h-4" />
          <span>Test-Daten laden</span>
        </button>
        <button
          onClick={resetChat}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Chat zurücksetzen</span>
        </button>
        <button
          onClick={startNewTest}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>Neuen Test starten</span>
        </button>
      </div>

      {/* Test Data Info */}
      {testDataLoaded && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Test-Daten geladen</h4>
              <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                <p><strong>{TEST_LEADS.length} Beispiel-Leads:</strong> {TEST_LEADS.map(l => l.name).join(', ')}</p>
                <p><strong>{TEST_MESSAGES.length} Test-Nachrichten verfügbar</strong></p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Success Panel */}
      {testPassed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-500/10 border border-green-500/30 rounded-lg p-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500/20 rounded-full">
              <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
                Test erfolgreich abgeschlossen
              </h3>
              <p className="text-green-600 dark:text-green-400 mb-4">
                Dein Agent hat {conversationCount} Konversationen erfolgreich gemeistert!
              </p>
              <div className="space-y-2 text-sm text-green-600 dark:text-green-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Produktanfragen beantwortet</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Termine vereinbart</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CRM-Daten aktualisiert</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-green-500/30">
                <p className="font-medium text-green-600 dark:text-green-400">
                  ✓ Agent ist bereit für Aktivierung
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Split Screen: Chat + Log */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4 min-h-[600px]">
        {/* Left: Chat Interface */}
        <div className="border border-border rounded-lg overflow-hidden flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Chat-Test</h3>
                <p className="text-xs text-muted-foreground">
                  {conversationCount} {conversationCount === 1 ? 'Konversation' : 'Konversationen'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Noch keine Nachrichten</p>
                <p className="text-sm mt-2">Schreibe eine Nachricht oder nutze eine Test-Nachricht</p>
              </div>
            )}

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Typing Indicator */}
            {isAgentTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-background border border-border rounded-lg p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Test Messages */}
          {testDataLoaded && messages.length === 0 && (
            <div className="p-4 border-t border-border bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-2">SCHNELLAUSWAHL:</p>
              <div className="flex flex-wrap gap-2">
                {TEST_MESSAGES.map((msg, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendTestMessage(msg)}
                    className="text-xs px-3 py-1.5 bg-background border border-border rounded-md hover:bg-accent transition-colors"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-background">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nachricht an Agent..."
                disabled={isAgentTyping}
                rows={1}
                className="flex-1 px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isAgentTyping}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enter zum Senden, Shift+Enter für neue Zeile
            </p>
          </div>
        </div>

        {/* Right: Activity Log */}
        <div className="border border-border rounded-lg overflow-hidden flex flex-col">
          {/* Log Header */}
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">Aktivitäts-Log</h3>
                <p className="text-xs text-muted-foreground">{logs.length} Einträge</p>
              </div>
            </div>
          </div>

          {/* Log Entries */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/10 font-mono text-xs">
            {logs.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Keine Aktivität</p>
                <p className="text-xs mt-2">Sende eine Nachricht um zu starten</p>
              </div>
            )}

            {logs.map((log) => {
              const config = LOG_TYPE_CONFIG[log.type];
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="text-muted-foreground whitespace-nowrap">
                    [{formatTime(log.timestamp)}]
                  </span>
                  <span className={`px-1.5 py-0.5 rounded border ${config.className} flex items-center gap-1`}>
                    {config.icon}
                  </span>
                  <span className="flex-1">{log.message}</span>
                </motion.div>
              );
            })}

            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

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
                <XCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
