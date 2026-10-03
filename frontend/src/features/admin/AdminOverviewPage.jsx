import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  SquareStack,
  Tags,
  Users,
} from "lucide-react";

import { getAdminOverview } from "../../services/adminApi.js";
import { AdminHeader, AdminHero, CountUp, Notice, Panel, Reveal, StatusPill, humanize, planLabel } from "./adminUi.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

/**
 * Platform overview.
 *
 * What was removed and why:
 *
 * - The four-step strip ("Review businesses / Preview websites / Approve safely / Monitor
 *   platform"). `AdminLayout` already renders a Review -> Preview -> Approve -> Monitor ->
 *   Report strip above every admin page, so the two appeared stacked on this screen saying
 *   the same thing. The layout strip has since been removed too, since it also appeared on
 *   the Categories and Modules screens where "Approve" means nothing.
 * - The filled intro panel, replaced by the shared thin header.
 * - `SectionTitle`, which guesses an icon from the heading text. "Plan Mix" and "Top Modules"
 *   both matched the module keyword and rendered the same icon; the headings are now labelled
 *   with icons chosen for what they actually show.
 */

export function AdminOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getAdminOverview()
      .then((data) => {
        if (active) {
          setOverview(data);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getApiErrorMessage(requestError, "Unable to load admin overview."));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = overview?.summary || {};
  const pendingWebsites = summary.tenants?.pendingWebsiteReview || 0;
  const pendingUsers = summary.users?.suspended || 0;

  if (isLoading) {
    return (
      <div>
        <AdminHeader eyebrow="Platform control" title="Overview" icon={LayoutDashboard} description="Everything that needs a decision, in one place." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card border border-line bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div>
        <AdminHeader eyebrow="Platform control" title="Overview" icon={LayoutDashboard} />
        <Notice tone="error">{error}</Notice>
      </div>
    );
  }

  const stats = [
    { label: "Businesses", value: summary.tenants?.total || 0, hint: `${summary.tenants?.active || 0} active`, icon: Boxes },
    { label: "Awaiting review", value: pendingWebsites, hint: pendingWebsites ? "Needs your decision" : "Queue is clear", icon: CheckCircle2, tone: pendingWebsites ? "pending" : "approve" },
    { label: "Published sites", value: summary.tenants?.published || 0, hint: "Live storefronts", icon: ShieldCheck, tone: "approve" },
    { label: "Accounts", value: summary.users?.total || 0, hint: `${summary.users?.active || 0} active`, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <AdminHero
        skin="overview"
        eyebrow="Platform control"
        title="Overview"
        icon={LayoutDashboard}
        description="Everything that needs a decision, in one place. Counts refresh each time this page loads."
        stats={stats}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* The one thing that should be impossible to miss, stated once. */}
      {pendingWebsites ? (
        <Reveal>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-orange-600 ring-1 ring-orange-200">
                  <Boxes size={20} />
                </span>
                <div>
                  <div className="text-base font-extrabold text-ink">
                    {pendingWebsites} {pendingWebsites === 1 ? "business is" : "businesses are"} waiting for your review
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Each request shows a readiness checklist so you can approve only businesses that are actually
                    ready to go live.
                  </p>
                </div>
              </div>
              <Link className="ui-btn-primary shrink-0" to="/admin/tenants">
                Review now
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <div className="flex items-center gap-3 rounded-2xl border border-approve-200 bg-approve-50 px-5 py-4">
            <CheckCircle2 size={20} className="shrink-0 text-approve-600" />
            <p className="text-sm font-semibold text-approve-800">Nothing is waiting for review.</p>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.06}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Categories" value={summary.categories?.total || 0} hint={`${summary.categories?.active || 0} active`} icon={Tags} />
          <StatTile label="Modules" value={summary.modules?.total || 0} hint={`${summary.modules?.active || 0} active`} icon={SquareStack} />
          <StatTile label="New this week" value={summary.users?.newLast7Days || 0} hint="New accounts" icon={Users} />
          <StatTile label="Suspended users" value={pendingUsers} hint={pendingUsers ? "Needs review" : "None"} icon={ShieldCheck} />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid gap-4 xl:grid-cols-3">
          <Breakdown
            title="Plan mix"
            icon={CreditCard}
            rows={Object.entries(overview?.planBreakdown || {}).map(([code, count]) => ({ key: code, label: planLabel(code), value: count }))}
            empty="No paid plans yet."
          />
          <Breakdown
            title="Busiest categories"
            icon={Tags}
            rows={(overview?.topCategories || []).map((row) => ({ key: row.id, label: row.name, value: `${row.count} businesses` }))}
            empty="No category data yet."
          />
          <Breakdown
            title="Most-used modules"
            icon={SquareStack}
            rows={(overview?.topModules || []).map((row) => ({ key: row.code, label: humanize(row.code), value: `${row.count} enabled` }))}
            empty="No module usage yet."
          />
        </div>
      </Reveal>

      <Reveal delay={0.14}>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Newest users" icon={Users} description="Most recently registered accounts." lift>
            <ul className="divide-y divide-line-soft">
              {(overview?.recentUsers || []).map((user) => (
                <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink">{user.fullName || "Unnamed"}</div>
                    <div className="truncate text-xs text-muted">{user.email}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill value={user.status} />
                    <span className="text-[11px] font-semibold text-subtle">{humanize(user.accountType, "User")}</span>
                  </div>
                </li>
              ))}
            </ul>
            {!(overview?.recentUsers || []).length ? <p className="text-sm text-muted">No users yet.</p> : null}
          </Panel>

          <Panel title="Newest businesses" icon={Boxes} description="Most recently created workspaces." lift>
            <ul className="divide-y divide-line-soft">
              {(overview?.recentTenants || []).map((tenant) => (
                <li key={tenant.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink">{tenant.name}</div>
                    <div className="truncate text-xs text-muted">
                      {tenant.owner?.fullName || "No owner"} · {planLabel(tenant.settings?.planCode)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill value={tenant.status} />
                    <StatusPill value={tenant.websiteStatus} labels={{ published: "Site live", pending_review: "Site pending" }} />
                  </div>
                </li>
              ))}
            </ul>
            {!(overview?.recentTenants || []).length ? <p className="text-sm text-muted">No businesses yet.</p> : null}
          </Panel>
        </div>
      </Reveal>

      <Reveal delay={0.18}>
        <p className="text-center text-xs text-subtle">
          Looking for payment health?{" "}
          <Link to="/admin/payments" className="font-bold text-brand hover:underline">
            Open the payment monitor
          </Link>
          .
        </p>
      </Reveal>
    </div>
  );
}

/**
 * A stat with its label under the number rather than above it, so a row of six reads as one
 * band of figures instead of six competing cards.
 */
function StatTile({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-subtle">
        <Icon size={14} className="text-brand" />
        {label}
      </div>
      <div className="mt-2 text-3xl font-black leading-none tracking-tight text-ink">
        <CountUp value={value} />
      </div>
      <div className="mt-1.5 text-xs text-muted">{hint}</div>
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
              <span className="shrink-0 font-bold text-brand">{row.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
    </Panel>
  );
}