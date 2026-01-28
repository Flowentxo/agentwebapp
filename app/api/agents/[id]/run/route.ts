import { NextRequest, NextResponse } from "next/server";
import { runsStore } from "@/lib/agents/store";
import { AGENTS } from "@/data/agents";

// Helper: Call Farming-Industrie Orchestrator
async function callFarmingOrchestrator(prompt: string, context: any) {
  const res = await fetch("http://localhost:8000/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, context }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Orchestrator error: ${res.status}`);
  return await res.json();
}

// Helper: Mock Farming Response
function getMockFarmingResponse() {
  return {
    decision: "8-Wochen-Plan erstellt",
    summary: "Detaillierter Plan für 100ha Weizenbetrieb mit Bodenbearbeitung, Bewässerung, NPK-Düngung, Schädlingsmonitoring und Erntefenster",
    confidence: 0.92,
    constraints_respected: [
      "Fruchtfolge beachtet",
      "Wasserbedarf kalkuliert",
      "Düngemittelverordnung eingehalten",
    ],
    actions: [
      { week: 1, task: "Bodenanalyse", details: "NPK-Werte ermitteln" },
      { week: 2, task: "Grunddüngung", details: "60kg N/ha, 40kg P/ha, 80kg K/ha" },
      { week: 3, task: "Aussaat", details: "Weizen Sorte 'Elixer', 180kg/ha" },
      { week: 4, task: "Bewässerung Start", details: "30mm/Woche bei Trockenheit" },
      { week: 5, task: "Schädlingsscouting", details: "Blattläuse, Getreidehähnchen monitoren" },
      { week: 6, task: "Nachdüngung", details: "40kg N/ha zur Schossphase" },
      { week: 7, task: "Fungizid-Einsatz", details: "Bei Befallsdruck Mehltau/Rost behandeln" },
      { week: 8, task: "Erntefenster", details: "Feuchtemessung, bei 14% ernten" },
    ],
    artifacts: [
      { type: "plan", filename: "8-wochen-plan-weizen.pdf" },
      { type: "calendar", filename: "duengung-schedule.ics" },
    ],
    logs: [
      "Betriebsdaten geladen",
      "Bodentyp: Lehmboden, pH 6.5",
      "Wetterdaten Q1-Q2 analysiert",
      "Düngeempfehlung berechnet",
      "Schädlingsdruck: mittel",
      "Erntefenster: KW 32-34",
    ],
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = AGENTS.find((a) => a.id === params.id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const run = runsStore.createRun(params.id);

  // Handle farming-industry agent with orchestrator
  if (params.id === "farming-industry") {
    setTimeout(async () => {
      runsStore.updateRunStatus(run.id, "running");
      runsStore.addLog(run.id, {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Connecting to Farming-Industrie Orchestrator...",
      });

      try {
        const prompt = "Analysiere einen 100-ha-Weizenbetrieb: erstelle einen 8-Wochen-Plan für Bodenbearbeitung, Bewässerung, Düngung (N/P/K), Schädlingsmonitoring und Erntefenster";
        const context = { area_ha: 100, crop: "wheat", planning_weeks: 8 };

        let result;
        let usedMock = false;

        try {
          result = await callFarmingOrchestrator(prompt, context);
          runsStore.addLog(run.id, {
            timestamp: new Date().toISOString(),
            level: "info",
            message: "Orchestrator responded successfully",
          });
        } catch (orchError: any) {
          runsStore.addLog(run.id, {
            timestamp: new Date().toISOString(),
            level: "warn",
            message: `Orchestrator offline, using mock: ${orchError.message}`,
          });
          result = getMockFarmingResponse();
          usedMock = true;
        }

        // Check if cancelled
        const current = runsStore.getRun(run.id);
        if (current?.status === "cancelled") return;

        runsStore.updateRunStatus(run.id, "success");
        runsStore.addLog(run.id, {
          timestamp: new Date().toISOString(),
          level: "info",
          message: usedMock ? "Mock response generated" : "Run completed successfully",
        });

        // Store result in run
        const finalRun = runsStore.getRun(run.id);
        if (finalRun) {
          finalRun.result = result;
        }
      } catch (error: any) {
        runsStore.updateRunStatus(run.id, "error", error.message);
        runsStore.addLog(run.id, {
          timestamp: new Date().toISOString(),
          level: "error",
          message: `Error: ${error.message}`,
        });
      }
    }, 500);

    return NextResponse.json(run, { status: 201 });
  }

  // Simulate async work for other agents
  setTimeout(() => {
    runsStore.updateRunStatus(run.id, "running");
    runsStore.addLog(run.id, {
      timestamp: new Date().toISOString(),
      level: "info",
      message: `Agent ${agent.name} is now running...`,
    });

    // Simulate completion after 2-4s
    const duration = 2000 + Math.random() * 2000;
    setTimeout(() => {
      // Check if already cancelled
      const current = runsStore.getRun(run.id);
      if (current?.status === "cancelled") return;

      runsStore.updateRunStatus(run.id, "success");
      runsStore.addLog(run.id, {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Run completed successfully.",
      });
    }, duration);
  }, 500);

  return NextResponse.json(run, { status: 201 });
}
