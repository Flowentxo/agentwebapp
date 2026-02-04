"use client";
import AppShell from "@/components/AppShell";
import { useParams, useRouter } from "next/navigation";
import { useDatasets } from "@/store/datasets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as React from "react";

export default function DatasetDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ds = useDatasets((s) => s.items.find((x) => x.id === id));
  const addDoc = useDatasets((s) => s.addDoc);

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");

  if (!ds) {
    return (
      <AppShell>
        <div className="col-span-12 rounded-xl border border-white/10 bg-card/5 p-6">
          <div className="text-lg font-semibold">Dataset not found</div>
          <Button className="mt-3" onClick={() => router.push("/knowledge")}>
            Back
          </Button>
        </div>
      </AppShell>
    );
  }

  const onAdd = () => {
    if (!title.trim() || !content.trim()) return;
    addDoc(ds.id, {
      id: crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
    });
    setTitle("");
    setContent("");
  };

  return (
    <AppShell>
      <div className="col-span-12">
        <Card className="elev-1">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{ds.name}</CardTitle>
            <Button variant="outline" onClick={() => router.push("/knowledge")}>
              Back
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-white/70">{ds.description}</div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="text-sm font-semibold">Documents</div>
                <ul className="mt-2 space-y-2">
                  {ds.docs.map((doc) => (
                    <li
                      key={doc.id}
                      className="rounded-xl border border-white/10 p-3 hover:bg-card/5"
                    >
                      <div className="text-sm font-medium">{doc.title}</div>
                      <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-muted/30 p-2 text-xs ring-1 ring-border whitespace-pre-wrap">
                        {doc.content}
                      </pre>
                    </li>
                  ))}
                  {ds.docs.length === 0 && (
                    <li className="text-xs text-white/60">No docs yet.</li>
                  )}
                </ul>
              </div>
              <div className="lg:col-span-7">
                <div className="text-sm font-semibold">Add Document</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <Input
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <textarea
                    className="min-h-[160px] rounded-xl bg-muted/30 p-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/30"
                    placeholder="Content…"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button onClick={onAdd}>Add</Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
