"use client";
export default function TagChip({
  tag,
  active = false,
  onToggle,
}: {
  tag: string;
  active?: boolean;
  onToggle?: (t: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle?.(tag)}
      className={`rounded-full border px-3 py-1 text-xs ${
        active
          ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/15"
          : "border-white/10 bg-card/5 hover:bg-card/7"
      }`}
    >
      #{tag}
    </button>
  );
}
