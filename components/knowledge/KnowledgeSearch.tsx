"use client";

import { useState } from "react";
import { Search, Filter, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchResult } from "@/types/knowledge";

interface KnowledgeSearchProps {
  onSearch: (query: string) => void;
  onAsk: (question: string) => void;
  results: SearchResult[];
  onResultClick: (entryId: string) => void;
}

export function KnowledgeSearch({
  onSearch,
  onAsk,
  results,
  onResultClick,
}: KnowledgeSearchProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "ask">("search");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "search") {
      onSearch(query);
    } else {
      onAsk(query);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <Button
            onClick={() => setMode("search")}
            className={mode === "search" ? "bg-accent/20 text-accent" : "bg-surface-1 hover:bg-card/10"}
          >
            <Search className="h-4 w-4 mr-2" />
            Suche
          </Button>
          <Button
            onClick={() => setMode("ask")}
            className={mode === "ask" ? "bg-accent/20 text-accent" : "bg-surface-1 hover:bg-card/10"}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            KI-Fragen
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === "search"
                ? "Suche nach Titel, Inhalt, Tags..."
                : "Stellen Sie eine Frage zu Ihrem Wissen..."
            }
            className="flex-1"
          />
          <Button type="submit">
            {mode === "search" ? <Search className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </Button>
          <Button type="button" className="bg-surface-1 hover:bg-card/10">
            <Filter className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.entry.id}
              onClick={() => onResultClick(result.entry.id)}
              className="panel p-5 cursor-pointer hover:ring-2 hover:ring-accent/40 transition-all"
            >
              <h3 className="font-semibold text-text mb-2">{result.entry.title}</h3>
              <p className="text-sm text-text-muted line-clamp-2 mb-3">
                {result.highlights[0] || result.entry.content.substring(0, 200)}...
              </p>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="mono">{result.entry.category}</span>
                <span>·</span>
                <span>Relevanz: {Math.round(result.relevanceScore * 100)}%</span>
                {result.entry.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="bg-card/5 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
