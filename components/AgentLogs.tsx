"use client";
import * as React from "react";

const demo = [
  "Booting runtime…",
  "Loading prompt templates…",
  "Connected to vector store.",
  "Waiting for customer request…",
  "Fetched 12 similar cases.",
  "Generated reply in 0.8s.",
];

export default function AgentLogs() {
  const [logs, setLogs] = React.useState<string[]>(demo.slice(0,3));
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(()=>{
    const id = setInterval(()=>{
      setLogs((s)=>{
        const next = s.length < demo.length ? [...s, demo[s.length]] : [...s, `Heartbeat ${new Date().toLocaleTimeString()}`];
        return next.slice(-50);
      });
    }, 1500);
    return ()=> clearInterval(id);
  },[]);

  React.useEffect(()=>{
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  return (
    <div ref={ref} className="h-72 w-full overflow-auto rounded-xl border border-border bg-input p-3 text-xs leading-relaxed">
      {logs.map((l,i)=>(
        <div key={i} className="text-white/80">
          <span className="text-white/40">{new Date().toLocaleTimeString()} — </span>{l}
        </div>
      ))}
    </div>
  );
}
