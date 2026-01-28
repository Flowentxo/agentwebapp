"use client";

import { SecurityHealthCard } from "@/components/security/SecurityHealthCard";
import { SecurityEventsTable } from "@/components/security/SecurityEventsTable";
import { SecurityStatistics } from "@/components/security/SecurityStatistics";
import { SuspiciousIPsCard } from "@/components/security/SuspiciousIPsCard";
import { SecurityTimeline } from "@/components/security/SecurityTimeline";

export default function SecurityDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 id="page-title" className="text-xl md:text-2xl font-semibold text-text">
          Security Monitoring
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Echtzeit-Überwachung und Analyse von Sicherheitsereignissen
        </p>
      </div>

      {/* Security Health Overview */}
      <section aria-label="Security Health">
        <SecurityHealthCard />
      </section>

      {/* Statistics & Suspicious IPs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-label="Security Statistics">
          <SecurityStatistics />
        </section>

        <section aria-label="Suspicious IPs">
          <SuspiciousIPsCard />
        </section>
      </div>

      {/* Timeline */}
      <section aria-label="Security Timeline">
        <SecurityTimeline />
      </section>

      {/* Recent Events Table */}
      <section aria-label="Recent Security Events">
        <SecurityEventsTable />
      </section>
    </div>
  );
}
