"use client";
import * as React from "react";
import { useDatasets } from "@/store/datasets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function KnowledgeUpload() {
  const add = useDatasets((s) => s.add);
  const { push } = useToast();

  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");

  const onCreate = () => {
    if (!name.trim()) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
    add({ id, name: name.trim(), description: desc.trim() || "—", size: 0, docs: [] });
    setName(""); setDesc("");
    push({ title: "Dataset created", variant: "success" });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-card/5 p-4">
      <div className="text-sm font-semibold">Create Dataset</div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Name (e.g. Product Docs)" value={name} onChange={(e)=>setName(e.target.value)} />
        <Input placeholder="Description" value={desc} onChange={(e)=>setDesc(e.target.value)} />
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={onCreate} disabled={!name.trim()}>Create</Button>
      </div>
    </div>
  );
}
