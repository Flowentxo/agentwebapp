"use client";

import { useState } from "react";
import { Save, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface KnowledgeEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialCategory?: string;
  onSave: (data: { title: string; content: string; tags: string[]; category: string }) => Promise<void>;
  onCancel: () => void;
}

export function KnowledgeEditor({
  initialTitle = "",
  initialContent = "",
  initialTags = [],
  initialCategory = "",
  onSave,
  onCancel,
}: KnowledgeEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [category, setCategory] = useState(initialCategory);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ title, content, tags, category });
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">Wissenseintrag bearbeiten</h2>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span>Gespeichert</span>
            </div>
          )}
          <Button onClick={onCancel} className="bg-surface-1 hover:bg-card/10">
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">Titel</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel des Wissenseintrags"
          className="text-lg"
        />
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-2">Kategorie</label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="z.B. Prozesse, Richtlinien"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-2">Tags</label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Tag hinzufügen"
            />
            <Button onClick={addTag} className="bg-surface-1 hover:bg-card/10">
              +
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  className="cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-text">Inhalt</label>
          <Button className="h-8 bg-accent/20 hover:bg-accent/30 text-accent text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Assist
          </Button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Markdown-formatierter Inhalt..."
          className="w-full min-h-[400px] p-4 bg-surface-1 border border-white/10 rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono text-sm"
        />
        <p className="text-xs text-text-muted mt-2">
          Markdown wird unterstützt. Verwenden Sie **fett**, *kursiv*, `code`, etc.
        </p>
      </div>
    </div>
  );
}
