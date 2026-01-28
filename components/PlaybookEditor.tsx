"use client";
import * as React from "react";
import { usePlaybooks } from "@/store/playbooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function PlaybookEditor() {
  const add = usePlaybooks((s) => s.add);
  const { push } = useToast();

  const [title, setTitle] = React.useState("");
  const [md, setMd] = React.useState("");

  const onCreate = () => {
    if (!title.trim()) return;
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Parse markdown into steps
    const lines = md.split("\n").filter(l => l.trim());
    const steps = lines
      .filter(l => /^\d+\./.test(l.trim()))
      .map((l, i) => ({
        id: `s${i + 1}`,
        text: l.replace(/^\d+\.\s*/, "").trim(),
      }));

    add({ id, title: title.trim(), markdown: md.trim(), steps });
    setTitle("");
    setMd("");
    push({ title: "Playbook created", variant: "success" });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-card/5 p-4">
      <div className="text-sm font-semibold">Create Playbook</div>
      <div className="mt-3 space-y-2">
        <Input
          placeholder="Title (e.g. Incident Response)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full rounded-md border border-white/10 bg-card/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Markdown content with numbered steps..."
          rows={8}
          value={md}
          onChange={(e) => setMd(e.target.value)}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={onCreate} disabled={!title.trim()}>
          Create
        </Button>
      </div>
    </div>
  );
}
