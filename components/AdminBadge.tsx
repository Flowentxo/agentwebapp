import { useSession } from "@/store/session";

export default function AdminBadge() {
  const role = useSession((s) => s.user.role);
  if (role !== "admin") return null;
  return (
    <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
      Admin
    </span>
  );
}
