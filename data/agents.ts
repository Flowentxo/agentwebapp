export type Agent = {
  id: string;
  name: string;
  description: string;
  status?: "active" | "stopped";
  tags: string[];
  kpis?: {
    requests: number;
    success: number;
    avgTime: number;
    uptime: number;
  };
};

export const AGENTS: Agent[] = [
  {
    id: "cassie",
    name: "Cassie",
    description: "Customer support agent.",
    status: "active",
    tags: ["support", "reports"],
    kpis: { requests: 120, success: 89.0, avgTime: 0.90, uptime: 99.8 },
  },
  {
    id: "dexter",
    name: "Dexter",
    description: "Multilingual support agent (GPT-4).",
    status: "active",
    tags: ["support", "nlp", "prod"],
    kpis: { requests: 4567, success: 96.8, avgTime: 0.80, uptime: 99.9 },
  },
  {
    id: "orion",
    name: "Orion",
    description: "Analytics & insights.",
    status: "active",
    tags: ["analytics", "bi"],
    kpis: { requests: 980, success: 92.1, avgTime: 1.20, uptime: 99.7 },
  },
  {
    id: "lyra",
    name: "Lyra",
    description: "Knowledge base curator.",
    status: "active",
    tags: ["kb", "summaries"],
    kpis: { requests: 640, success: 94.2, avgTime: 0.65, uptime: 99.6 },
  },
  {
    id: "atlas",
    name: "Atlas",
    description: "Workflow orchestrator.",
    status: "active",
    tags: ["workflows", "ops"],
    kpis: { requests: 210, success: 97.3, avgTime: 0.70, uptime: 99.9 },
  },
  {
    id: "rhea",
    name: "Rhea",
    description: "Report generation.",
    status: "active",
    tags: ["reports", "pdf"],
    kpis: { requests: 845, success: 95.8, avgTime: 1.05, uptime: 99.8 },
  },
  {
    id: "nova",
    name: "Nova",
    description: "Sales assistant.",
    status: "active",
    tags: ["sales", "leads"],
    kpis: { requests: 1320, success: 93.4, avgTime: 0.88, uptime: 99.7 },
  },
  {
    id: "mira",
    name: "Mira",
    description: "Marketing copy & assets.",
    status: "active",
    tags: ["marketing", "assets"],
    kpis: { requests: 720, success: 91.7, avgTime: 0.77, uptime: 99.6 },
  },
  {
    id: "zephyr",
    name: "Zephyr",
    description: "Data cleanup & ETL.",
    status: "active",
    tags: ["etl", "cleanup"],
    kpis: { requests: 305, success: 97.9, avgTime: 1.40, uptime: 99.9 },
  },
  {
    id: "iris",
    name: "Iris",
    description: "HR assistant.",
    status: "active",
    tags: ["hr", "policies"],
    kpis: { requests: 410, success: 92.8, avgTime: 0.72, uptime: 99.8 },
  },
  {
    id: "sigma",
    name: "Sigma",
    description: "Security & compliance helper.",
    status: "active",
    tags: ["security", "compliance"],
    kpis: { requests: 158, success: 98.3, avgTime: 0.90, uptime: 99.9 },
  },
  {
    id: "echo",
    name: "Echo",
    description: "Voice/IVR helper.",
    status: "active",
    tags: ["voice", "ivr"],
    kpis: { requests: 690, success: 90.2, avgTime: 1.10, uptime: 99.5 },
  },
  {
    id: "farming-industry",
    name: "Farming-Industrie Agent",
    description: "8-Wochen-Pläne für Bodenbearbeitung, Bewässerung, Düngung (N/P/K), Schädlingsmonitoring und Erntefenster für landwirtschaftliche Betriebe",
    status: "active",
    tags: ["farming", "agriculture", "planning"],
    kpis: { requests: 0, success: 100.0, avgTime: 2.50, uptime: 99.9 },
  },
];
