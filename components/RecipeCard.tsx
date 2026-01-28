"use client";

import { useState, useRef } from "react";
import type { Recipe } from "@/lib/recipes/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Play } from "lucide-react";

export default function RecipeCard({
  recipe,
  onRun,
  onDelete,
}: {
  recipe: Recipe & { stepCount: number };
  onRun: (input?: Record<string, any>) => void;
  onDelete: () => void;
}) {
  const [inputJson, setInputJson] = useState("{}");
  const [inputError, setInputError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const runButtonRef = useRef<HTMLButtonElement>(null);

  const handleRun = () => {
    setInputError(null);

    try {
      const parsed = JSON.parse(inputJson);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Input must be an object");
      }
      onRun(Object.keys(parsed).length > 0 ? parsed : undefined);
    } catch (err: any) {
      setInputError(err.message || "Invalid JSON");
    }
  };

  const handleDeleteClick = () => {
    setConfirm(true);
    setTimeout(() => confirmBtnRef.current?.focus(), 100);
  };

  return (
    <Card
      data-testid="recipe-card"
      className="edge transition-transform duration-200 hover:-translate-y-[2px] relative"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-[15px] font-semibold text-white/90">
              {recipe.name}
            </h3>
            {recipe.description && (
              <p className="text-[13px] text-white/60">{recipe.description}</p>
            )}
            <p className="text-[12px] text-white/50">
              Steps: <span className="text-white/70">{recipe.stepCount}</span>
            </p>
            {recipe.defaults && Object.keys(recipe.defaults).length > 0 && (
              <div className="text-[12px] text-white/50">
                <p className="mb-1">Defaults:</p>
                <code className="block rounded bg-black/40 px-2 py-1 font-mono text-[11px] text-white/70">
                  {JSON.stringify(recipe.defaults)}
                </code>
              </div>
            )}
          </div>

          {/* PRIMARY CTA: Run recipe */}
          <button
            ref={runButtonRef}
            data-testid="primary-cta"
            className="flex items-center gap-1.5 shrink-0 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-[13px] font-medium text-white hover:brightness-110 transition"
            aria-label={`Run recipe ${recipe.name}`}
            onClick={handleRun}
          >
            <Play className="h-3.5 w-3.5" />
            Run recipe
          </button>
        </div>
      </CardHeader>

      {/* Input Context */}
      <CardContent className="border-t border-white/10 pt-3 space-y-2">
        <label
          htmlFor={`input-${recipe.id}`}
          className="block text-[13px] text-white/70"
        >
          Input Context (JSON):
        </label>
        <textarea
          id={`input-${recipe.id}`}
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white font-mono placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
          placeholder='{"env":"dev","flag":true}'
        />

        {inputError && (
          <p
            role="alert"
            aria-live="assertive"
            className="text-[12px] text-red-400"
          >
            {inputError}
          </p>
        )}
      </CardContent>

      {/* Delete (secondary action) */}
      {!confirm && (
        <CardContent className="border-t border-white/10 pt-3">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleDeleteClick();
            }}
            className="text-[13px] text-white/60 hover:text-white hover:underline transition"
            aria-label={`Delete recipe ${recipe.name}`}
          >
            Delete recipe
          </a>
        </CardContent>
      )}

      {/* Delete Confirmation */}
      {confirm && (
        <CardContent className="border-t border-white/10 pt-3">
          <div role="alert" aria-live="assertive" className="space-y-3">
            <p className="text-[13px] text-white/70">
              Delete "{recipe.name}"? This cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <button
                ref={confirmBtnRef}
                onClick={onDelete}
                data-testid="confirm-delete"
                className="rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red-600 transition"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirm(false)}
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
