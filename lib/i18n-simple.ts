/**
 * Einfache i18n-Konstanten für konsistente deutsche Texte
 * Verwendung: import { de } from "@/lib/i18n-simple"
 */

export const de = {
  // Actions
  actions: {
    open: "Details öffnen",
    create: "Erstellen",
    edit: "Bearbeiten",
    delete: "Löschen",
    save: "Speichern",
    cancel: "Abbrechen",
    search: "Suchen",
    filter: "Filtern",
    start: "Agent starten",
    stop: "Agent stoppen",
    restart: "Neu starten",
    clone: "Duplizieren",
    export: "Exportieren",
  },

  // KPI Labels
  kpi: {
    requests: "Anfragen",
    requestsTooltip: "Anzahl bearbeiteter Anfragen",
    success: "Erfolg",
    successTooltip: "Anteil erfolgreicher Antworten",
    avgTime: "Ø Zeit",
    avgTimeTooltip: "Durchschnittliche Bearbeitungszeit",
    uptime: "Verfügbarkeit",
    uptimeTooltip: "Prozentsatz der Betriebszeit",
  },

  // Navigation
  nav: {
    dashboard: "Dashboard",
    agents: "Agents",
    workflows: "Workflows",
    knowledge: "Wissensbasis",
    analytics: "Analytics",
    board: "Board",
    admin: "Admin",
    settings: "Einstellungen",
  },

  // Page Intros
  intro: {
    dashboard: "Überblick über alle Systeme und Metriken",
    agents: "Verwalte und überwache deine Agents",
    workflows: "Automatisierungen verwalten",
    knowledge: "Dokumente und Wissen durchsuchen",
    analytics: "Auswertungen und Reports",
    board: "Aufgaben im Überblick",
    admin: "Systemverwaltung",
    settings: "Konfiguration anpassen",
  },

  // Search & Commands
  search: {
    placeholder: "z. B. 'Open Cassie' oder '/assist help'",
    filterAgents: "Agenten filtern…",
    noResults: "Keine Ergebnisse",
    commandLabel: "Befehl eingeben oder suchen",
  },

  // Agent Status
  status: {
    active: "Aktiv",
    stopped: "Gestoppt",
    error: "Fehler",
    loading: "Lädt…",
  },

  // Messages
  messages: {
    loadingAgentDetails: "Agent-Details werden geladen…",
    agentNotFound: "Agent nicht gefunden",
    confirmDelete: "Möchten Sie diesen Agent wirklich löschen?",
  },

  // Aria Labels
  aria: {
    moreActions: "Weitere Aktionen",
    createAgent: "Neuen Agent erstellen",
    viewAgentDetails: (name: string) => `Details zu ${name} anzeigen`,
    openAgentDetails: (name: string) => `Details zu ${name} öffnen`,
  },
};

// Type-safe helper
export type I18nKey = typeof de;
