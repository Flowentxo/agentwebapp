export async function fetchAgentsFromApi(): Promise<any[]> {
  const res = await fetch("/api/agents", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return data.agents ?? [];
}
