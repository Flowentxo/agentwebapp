"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Link as LinkIcon, Trash2 } from "lucide-react";
import { KnowledgeItem } from "@/lib/knowledge/types";

interface KnowledgeCardProps {
  item: Pick<KnowledgeItem, "id" | "type" | "title" | "url" | "chunkCount" | "createdAt" | "redactions">;
  onDelete: (id: string) => void;
}

export default function KnowledgeCard({ item, onDelete }: KnowledgeCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const handleDeleteClick = () => {
    setShowConfirm(true);
    setTimeout(() => confirmButtonRef.current?.focus(), 100);
  };

  const handleConfirmDelete = () => {
    onDelete(item.id);
    setShowConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
  };

  return (
    <Card data-testid="knowledge-card" className="edge transition-transform duration-200 hover:-translate-y-[2px] relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {item.type === "note" ? (
                <FileText className="h-4 w-4 text-blue-400" aria-hidden="true" />
              ) : (
                <LinkIcon className="h-4 w-4 text-green-400" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold text-white/90">{item.title}</h3>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block truncate text-[12px] text-blue-400 hover:underline"
                  aria-label={`Open ${item.title} in new tab`}
                >
                  {item.url}
                </a>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/50">
                <span>{item.type === "note" ? "Note" : "URL"}</span>
                <span>·</span>
                <span>{item.chunkCount} chunks</span>
                {(item.redactions.emails > 0 || item.redactions.phones > 0) && (
                  <>
                    <span>·</span>
                    <span className="text-yellow-400">
                      {item.redactions.emails + item.redactions.phones} PII redacted
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Primary CTA: Delete */}
          {!showConfirm && (
            <button
              onClick={handleDeleteClick}
              aria-label={`Delete ${item.title}`}
              className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-400 hover:bg-red-500/20 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardHeader>

      {showConfirm && (
        <CardContent className="border-t border-white/10 pt-3">
          <div role="alert" aria-live="assertive" className="space-y-3">
            <p className="text-[13px] text-white/70">Delete "{item.title}"? This cannot be undone.</p>
            <div className="flex items-center gap-2">
              <button
                ref={confirmButtonRef}
                onClick={handleConfirmDelete}
                data-testid="confirm-delete"
                className="rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red-600 transition"
              >
                Confirm Delete
              </button>
              <button
                onClick={handleCancelDelete}
                className="rounded-lg border border-white/10 bg-card/5 px-3 py-1.5 text-[12px] text-white/70 hover:bg-card/10 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
