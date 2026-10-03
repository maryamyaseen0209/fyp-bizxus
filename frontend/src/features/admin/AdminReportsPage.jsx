import { useEffect, useState } from "react";
import { BarChart3, Globe, SquareStack, Users } from "lucide-react";

import { getAdminReports } from "../../services/adminApi.js";
import { AdminHero, Notice, Panel, Reveal, humanize, planLabel } from "./adminUi.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

/**
 * Platform reports.
 *
 * Removed: the "Role mix / Website status / Plan mix / Module usage" chip row, which was a
 * legend for the page that did nothing — and `SectionTitle`, whose keyword matching gave
 * "Plan Mix" and "Module Catalog Snapshot" the same module-stack icon.
 *
 * Role and status values arrive as raw enums (`platform_admin`, `pending_review`). They are
 * now passed through the shared label and tone maps so the reports read the same way the rest
 * of the panel does.
 */

export function AdminReportsPage() {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getAdminReports()
      .then((data) => {
        if (active) {
          setReports(data);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, "Unable to load reports."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // `reports` is null until the request resolves, and these feed the hero's figures on the
  // very first render — so they have to read through an empty object, not through `reports`.
  const data = reports || {};
  const accounts = (data.userRoleBreakdown || []).reduce((sum, row) => sum + (row.count || 0), 0);
  const businesses = (data.websiteStatusBreakdown || []).reduce((sum, row) => sum + (row.count || 0), 0);
  const paidPlans = Object.entries(data.planBreakdown || {}).filter(([code]) => code !== "starter");
  const moduleCatalog = data.moduleCatalog || [];
  const activeModules = moduleCatalog.filter((m) => m.isActive).length;

  return (
    <div className="space-y-6">
      <AdminHero
        skin="reports"
        eyebrow="Insight"
        title="Reports"
        icon={BarChart3}
        description="How the platform is being used: who signed up, what is published, which plans and modules are actually in demand."
        stats={[
          { label: "Accounts", value: accounts, hint: "Across every role", icon: Users },
          { label: "Websites tracked", value: businesses, hint: "Every publication state", icon: Globe },
          { label: "Paid plans", value: paidPlans.length, hint: "Above the Basic tier", icon: BarChart3, tone: paidPlans.length ? "approve" : "brand" },
          { label: "Modules", value: moduleCatalog.length, hint: `${activeModules} active`, icon: SquareStack },
        ]}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}
      {isLoading && !reports ? <p className="text-sm text-muted">Loading reports…</p> : null}

      {reports ? (
        <>
          <Reveal>
          <div className="grid gap-4 xl:grid-cols-3">
            <Breakdown
              title="Account roles"
              icon={Users}
              rows={(reports.userRoleBreakdown || []).map((row) => ({ key: row.role, label: humanize(row.role), value: row.count }))}
              empty="No accounts yet."
            />
            <Breakdown
              title="Website status"
              icon={Globe}
              rows={(reports.websiteStatusBreakdown || []).map((row) => ({ key: row.status, label: humanize(row.status), value: row.count }))}
              empty="No websites yet."
            />
            <Breakdown
              title="Plan mix"
              icon={BarChart3}
              rows={Object.entries(reports.planBreakdown || {}).map(([code, count]) => ({ key: code, label: planLabel(code), value: count }))}
              empty="No plans assigned yet."
            />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <Panel lift title="Module catalog" icon={SquareStack} description="Every module, where it sits, and how many businesses switched it on.">
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">Module catalog snapshot</caption>
                <thead className="border-b border-line bg-surface text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">
                  <tr>
                    <th scope="col" className="px-4 py-3">Module</th>
                    <th scope="col" className="px-4 py-3">Category</th>
                    <th scope="col" className="px-4 py-3">Included in</th>
                    <th scope="col" className="px-4 py-3 text-right">Businesses using it</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(reports.moduleCatalog || []).map((module) => (
                    <tr key={module.code} className="transition hover:bg-surface">
                      <td className="px-4 py-3">
                        <div className="font-bold text-ink">{module.name}</div>
                        <div className="text-xs text-muted">{module.code}</div>
                      </td>
                      <td className="px-4 py-3 text-muted">{humanize(module.category, "—")}</td>
                      <td className="px-4 py-3 text-muted">
                        {(module.availability?.includedPlans || []).map(planLabel).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-ink">{module.enabledTenantCount || 0}</td>
                      <td className="px-4 py-3 text-muted">{module.isActive ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                  {!(reports.moduleCatalog || []).length ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">No modules in the catalog.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
        </>
      ) : null}
    </div>
  );
}

function Breakdown({ title, icon, rows, empty }) {
  return (
    <Panel title={title} icon={icon}>
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-medium text-ink">{row.label}</span>
              <span className="shrink-0 text-base font-black text-brand">{row.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
    </Panel>
  );
}