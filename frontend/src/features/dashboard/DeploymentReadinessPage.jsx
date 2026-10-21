import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  KeyRound,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { getDemoAccounts, getReadinessReport } from "../../services/readinessApi.js";
import { formatDisplayValue, isDebugMode, withoutSecrets } from "../../utils/displaySafety.js";
import { OWNER_IMAGES, OwnerHero } from "./ownerUi.jsx";
import { EASE } from "../../components/ui/motion.jsx";

const statusStyles = {
  pass: "border-emerald-200/80 bg-emerald-50/40 text-emerald-900",
  warn: "border-amber-200/80 bg-amber-50/40 text-amber-900",
  fail: "border-red-200/80 bg-red-50/40 text-red-900",
};

function StatusIcon({ status }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
  return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />;
}

function StatusBadge({ status }) {
  const isPass = status === "pass";
  const isFail = status === "fail";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
        isPass
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
          : isFail
            ? "bg-red-100 text-red-800 ring-1 ring-red-300"
            : "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
      }`}
    >
      {status}
    </span>
  );
}

export function DeploymentReadinessPage() {
  const readinessQuery = useQuery({
    queryKey: ["deployment-readiness"],
    queryFn: getReadinessReport,
    refetchInterval: 60000,
  });
  const demoQuery = useQuery({ queryKey: ["demo-accounts"], queryFn: getDemoAccounts });
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'pass' | 'action_needed'
  const [showRuntimeDetails, setShowRuntimeDetails] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  const report = readinessQuery.data;
  const demo = demoQuery.data;
  const overall = report?.overallStatus || "loading";
  const checks = report?.checks || [];

  const filteredChecks = useMemo(() => {
    if (filterMode === "pass") {
      return checks.filter((c) => c.status === "pass");
    }
    if (filterMode === "action_needed") {
      return checks.filter((c) => c.status === "fail" || c.status === "warn");
    }
    return checks;
  }, [checks, filterMode]);

  const passCount = report?.totals?.pass ?? checks.filter((c) => c.status === "pass").length;
  const actionCount = (report?.totals?.warn ?? 0) + (report?.totals?.fail ?? 0);

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  }

  return (
    <section className="space-y-6">
      {/* Cinematic Hero */}
      <OwnerHero
        eyebrow="Diagnostics & Reliability"
        title="System Health & Deployment Readiness"
        description="Monitor runtime telemetry, verify database integrity, rate limiting, and security compliance before public presentation."
        image={OWNER_IMAGES.system}
        stats={[
          { label: "Overall Health", value: String(overall).replaceAll("_", " ") },
          { label: "Passed Checks", value: passCount },
          { label: "Action Items", value: actionCount },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => readinessQuery.refetch()}
              disabled={readinessQuery.isFetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-hero-work shadow-[0_14px_30px_-12px_rgba(3,10,26,0.7)] transition hover:bg-sky-50 active:scale-95"
            >
              <RefreshCw size={14} className={readinessQuery.isFetching ? "animate-spin text-brand" : "text-brand"} />
              <span>{readinessQuery.isFetching ? "Evaluating..." : "Run Health Scan"}</span>
            </button>
          </div>
        }
      />

      {readinessQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white py-12 text-sm text-muted shadow-card">
          <RefreshCw size={18} className="animate-spin text-brand" />
          <span>Scanning server runtime and health checks...</span>
        </div>
      ) : readinessQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-card">
          Could not load readiness report. Make sure the backend server is running and accessible.
        </div>
      ) : (
        <>
          {/* Quick Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  filterMode === "all" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
                }`}
              >
                <span>All Checks</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${filterMode === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {checks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("pass")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  filterMode === "pass" ? "bg-emerald-600 text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
                }`}
              >
                <CheckCircle2 size={13} />
                <span>Passing</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${filterMode === "pass" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                  {passCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("action_needed")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  filterMode === "action_needed" ? "bg-amber-500 text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
                }`}
              >
                <AlertTriangle size={13} />
                <span>Needs Attention</span>
                {actionCount > 0 ? (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${filterMode === "action_needed" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 font-extrabold"}`}>
                    {actionCount}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="text-xs text-muted">
              <span>App Version: </span>
              <strong className="text-ink">v{report?.runtime?.appVersion || "1.0.0"}</strong>
              <span className="mx-1.5 text-line">·</span>
              <span>{report?.runtime?.buildLabel || "Production"}</span>
            </div>
          </div>

          {/* Checklist Cards */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredChecks.map((check) => (
                <motion.article
                  key={check.code}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className={`rounded-2xl border p-4.5 sm:p-5 shadow-card transition hover:shadow-lift ${
                    statusStyles[check.status] || statusStyles.warn
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="mt-0.5">
                        <StatusIcon status={check.status} />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="text-sm font-bold text-ink">{check.label}</h3>
                        <p className="text-xs leading-relaxed text-muted">{check.message}</p>
                      </div>
                    </div>
                    <div className="shrink-0 self-end sm:self-center">
                      <StatusBadge status={check.status} />
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>

            {!filteredChecks.length ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center shadow-card">
                <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
                <div className="mt-3 text-sm font-bold text-ink">No items in this filter category</div>
              </div>
            ) : null}
          </div>

          {/* Dual Panel: Demo Accounts & Runtime Diagnostics */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Demo Accounts Credentials */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-ink">
                <KeyRound size={16} className="text-brand" />
                <span>Evaluator & Demo Credentials</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Pre-configured sample roles for reviewing customer and administrative flows.
              </p>

              {demoQuery.isLoading ? (
                <p className="mt-4 text-xs text-muted">Loading credentials...</p>
              ) : demo ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs">
                    <div>
                      <div className="font-bold text-ink">Business Owner Demo</div>
                      <div className="mt-0.5 text-muted">{demo.businessOwner.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${demo.businessOwner.email} / ${demo.businessOwner.password}`, "owner")}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-slate-50"
                    >
                      {copiedKey === "owner" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedKey === "owner" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs">
                    <div>
                      <div className="font-bold text-ink">Customer Portal Demo</div>
                      <div className="mt-0.5 text-muted">{demo.customer.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${demo.customer.email} / ${demo.customer.password}`, "customer")}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-slate-50"
                    >
                      {copiedKey === "customer" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedKey === "customer" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs">
                    <div>
                      <div className="font-bold text-ink">Public Storefront Slug</div>
                      <div className="mt-0.5 text-muted">/businesses/{demo.businessSlug}</div>
                    </div>
                    <a
                      href={`/businesses/${demo.businessSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-brand hover:bg-blue-100"
                    >
                      <span>Open ↗</span>
                    </a>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Runtime Diagnostics (Progressive Disclosure) */}
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <button
                type="button"
                onClick={() => setShowRuntimeDetails((v) => !v)}
                className="flex w-full items-center justify-between p-5 text-left transition hover:bg-surface/50"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
                    <Server size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">Runtime Diagnostics</h3>
                    <p className="text-xs text-muted">
                      {showRuntimeDetails ? "Hide technical parameters" : "View environment telemetry & ports"}
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-1 text-xs font-bold text-ink">
                  <span>{showRuntimeDetails ? "Collapse" : "Expand"}</span>
                  {showRuntimeDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </div>
              </button>

              <AnimatePresence>
                {showRuntimeDetails ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="border-t border-line bg-slate-50/50 p-5 text-xs"
                  >
                    <dl className="space-y-2">
                      {Object.entries(withoutSecrets(report?.runtime || {})).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-4 border-b border-line-soft pb-1.5 last:border-0">
                          <dt className="font-semibold text-muted">{key}</dt>
                          <dd className="font-mono text-ink text-right truncate max-w-xs">{formatDisplayValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

