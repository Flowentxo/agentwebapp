"use client";

import { useState, useEffect } from "react";
import { Plus, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KnowledgeDashboard } from "@/components/knowledge/KnowledgeDashboard";
import { KnowledgeEditor } from "@/components/knowledge/KnowledgeEditor";
import { KnowledgeSearch } from "@/components/knowledge/KnowledgeSearch";
import { KnowledgeEntry, KnowledgeStats, SearchResult } from "@/types/knowledge";

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [recentEntries, setRecentEntries] = useState<KnowledgeEntry[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, recentRes] = await Promise.all([
        fetch("/api/knowledge/summary"),
        fetch("/api/knowledge/recent"),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentEntries(recentData.entries || []);
      }
    } catch (error) {
      console.error("Failed to fetch knowledge data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    try {
      const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleAsk = async (question: string) => {
    try {
      const res = await fetch("/api/knowledge/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("AI Response:", data);
        // TODO: Display answer in modal/drawer
      }
    } catch (error) {
      console.error("Ask failed:", error);
    }
  };

  const handleSaveEntry = async (data: {
    title: string;
    content: string;
    tags: string[];
    category: string;
  }) => {
    try {
      const url = editingEntry ? `/api/knowledge/${editingEntry}` : "/api/knowledge";
      const method = editingEntry ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setEditingEntry(null);
        setActiveTab("dashboard");
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to save entry:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;

    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-text-muted">Lade Wissensbasis...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 id="page-title" className="text-xl md:text-2xl font-semibold text-text">
            Wissensbasis
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Enterprise Knowledge Management & Documentation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveTab("search")}
            className="bg-surface-1 hover:bg-card/10"
          >
            <SearchIcon className="h-4 w-4 mr-2" />
            Suche
          </Button>
          <Button
            onClick={() => {
              setEditingEntry(null);
              setActiveTab("editor");
            }}
            className="bg-accent/20 hover:bg-accent/30 text-accent"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neuer Eintrag
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" current={activeTab} onClick={setActiveTab}>
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="search" current={activeTab} onClick={setActiveTab}>
            Suche & Q&A
          </TabsTrigger>
          <TabsTrigger value="editor" current={activeTab} onClick={setActiveTab}>
            Editor
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent when="dashboard" current={activeTab}>
          {stats && (
            <KnowledgeDashboard
              stats={stats}
              recentEntries={recentEntries}
              onView={(id) => console.log("View:", id)}
              onEdit={(id) => {
                setEditingEntry(id);
                setActiveTab("editor");
              }}
              onDelete={handleDelete}
            />
          )}
        </TabsContent>

        {/* Search Tab */}
        <TabsContent when="search" current={activeTab}>
          <KnowledgeSearch
            onSearch={handleSearch}
            onAsk={handleAsk}
            results={searchResults}
            onResultClick={(id) => console.log("Result clicked:", id)}
          />
        </TabsContent>

        {/* Editor Tab */}
        <TabsContent when="editor" current={activeTab}>
          <KnowledgeEditor
            onSave={handleSaveEntry}
            onCancel={() => {
              setEditingEntry(null);
              setActiveTab("dashboard");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
