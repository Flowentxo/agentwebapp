export default function TagBadge({ t }: { t: string }) {
  return (
    <span className="rounded-md border border-white/10 bg-card/5 px-2 py-0.5 text-[11px] text-white/70">
      #{t}
    </span>
  );
}
