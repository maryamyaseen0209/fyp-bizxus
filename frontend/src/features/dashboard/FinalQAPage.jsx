import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Layers,
  ListChecks,
  PlayCircle,
  RefreshCw,
  Route,
  ShieldAlert,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useTenant } from "../../context/TenantContext.jsx";
import { getFinalQaChecklist, recordFinalQaDemoRun } from "../../services/qaApi.js";
import { formatDisplayValue, withoutSecrets } from "../../utils/displaySafety.js";
import { BusinessSetupRequired, OWNER_IMAGES, OwnerHero } from "./ownerUi.jsx";
import { EASE } from "../../components/ui/motion.jsx";

const badgeStyles = {
  pass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  fail: "border-red-200 bg-red-50 text-red-800",
};

function StatusIcon({ status }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
  return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />;
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeStyles[status] || badgeStyles.warn}`}>
      {status}
    </span>
  );
}

function scoreColor(status) {
  if (status === "demo_ready" || status === "pass") return "text-emerald-700";
  if (status === "needs_fixes" || status === "fail") return "text-red-700";
  return "text-amber-700";
}

export function FinalQAPage() {
  const queryClient = useQueryClient();
  const { selectedTenant } = useTenant();
  const [result, setResult] = useState("pass");
  const [notes, setNotes] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [checkedSteps, setCheckedSteps] = useState([]);
  const [activeTab, setActiveTab] = useState("checklist"); // 'checklist' | 'script' | 'blockers' | 'signoff'
  const [checklistFilter, setChecklistFilter] = useState("all"); // 'all' | 'pass' | 'action_needed'
  const [copiedCmd, setCopiedCmd] = useState("");

  const tenantId = selectedTenant?.id;
  const qaQuery = useQuery({
    queryKey: ["final-qa", tenantId],
    queryFn: () => getFinalQaChecklist(tenantId),
    enabled: Boolean(tenantId),
    refetchInterval: 60000,
  });

  const recordMutation = useMutation({
    mutationFn: () => recordFinalQaDemoRun(tenantId, { result, notes, reviewerName, checkedSteps }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-qa", tenantId] });
      setNotes("");
    },
  });

  const report = qaQuery.data;
  const summary = report?.summary;
  const checks = report?.checks || [];
  const demoScript = report?.demoScript || [];
  const commands = report?.commands || [];
  const blockingGaps = summary?.blockingGaps || [];
  const warnings = summary?.warnings || [];
  const nextActions = summary?.nextActions || [];

  const checkedStepSet = useMemo(() => new Set(checkedSteps), [checkedSteps]);

  function toggleStep(step) {
    setCheckedSteps((current) =>
      current.includes(step) ? current.filter((item) => item !== step) : [...current, step],
    );
  }

  const filteredChecks = useMemo(() => {
    if (checklistFilter === "pass") {
      return checks.filter((c) => c.status === "pass");
    }
    if (checklistFilter === "action_needed") {
      return checks.filter((c) => c.status === "fail" || c.status === "warn");
    }
    return checks;
  }, [checks, checklistFilter]);

  const passCount = checks.filter((c) => c.status === "pass").length;
  const actionCount = checks.filter((c) => c.status === "fail" || c.status === "warn").length;

  function copyCommand(cmd, name) {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(name);
    setTimeout(() => setCopiedCmd(""), 2000);
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="System QA & Verification"
        description="Run automated smoke tests, end-to-end integration verifications, and readiness audits for your store."
        icon={ClipboardCheck}
        image={OWNER_IMAGES.qa}
        previewTitle="Verification & Audit Suite"
        previewItems={[
          { title: "Automated Endpoint Health", desc: "Test API latency, database connections, and background job queue." },
          { title: "Checkout Simulation", desc: "Simulate end-to-end customer checkout and cashier POS orders." },
          { title: "One-Click Diagnostic Report", desc: "Generate a comprehensive health report ready for production signoff." },
        ]}
      />
    );
  }

  return (
    <section className="space-y-6">
      {/* Cinematic Hero */}
      <OwnerHero
        eyebrow="Quality Assurance & Verification"
        title="Full-System QA & Demo Audit"
        description="Verify end-to-end functionality across customer chat, RAG documents, WhatsApp agent, POS orders, and payment webhooks before final evaluation."
        image={OWNER_IMAGES.qa}
        stats={[
          { label: "Readiness", value: String(summary?.status || "Audit").replaceAll("_", " ") },
          { label: "Required Score", value: `${summary?.requiredPercent ?? 0}%` },
          { label: "Overall Passing", value: `${summary?.percent ?? 0}%` },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => qaQuery.refetch()}
              disabled={qaQuery.isFetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-hero-work shadow-[0_14px_30px_-12px_rgba(3,10,26,0.7)] transition hover:bg-sky-50 active:scale-95"
            >
              <RefreshCw size={14} className={qaQuery.isFetching ? "animate-spin text-brand" : "text-brand"} />
              <span>{qaQuery.isFetching ? "Running Audit..." : "Refresh Audit"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("signoff")}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 active:scale-95"
            >
              <PlayCircle size={14} />
              <span>Record Trial Run</span>
            </button>
          </div>
        }
      />

      {qaQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white py-12 text-sm text-muted shadow-card">
          <RefreshCw size={18} className="animate-spin text-brand" />
          <span>Executing system QA test suite...</span>
        </div>
      ) : qaQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-card">
          Could not load final QA checklist. Make sure the backend server is running and you are logged in.
        </div>
      ) : (
        <>
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("checklist")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === "checklist" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
                }`}
              >
                <ListChecks size={13} />
                <span>QA Checklist</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "checklist" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {checks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("script")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === "script" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
                }`}
              >
                <Route size={13} />
                <span>Demo Walkthrough Script</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "script" ? "bg-white/20 text-white" : "bg-blue-100 text-brand"}`}>
                  {checkedSteps.length}/{demoScript.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("blockers")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === "blockers" ? "bg-amber-500 text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
                }`}
              >
                <AlertTriangle size={13} />
                <span>Gaps & Recommendations</span>
                {blockingGaps.length + warnings.length > 0 ? (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "blockers" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 font-extrabold"}`}>
                    {blockingGaps.length + warnings.length}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("signoff")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === "signoff" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
                }`}
              >
                <PlayCircle size={13} />
                <span>Record Run & Terminal</span>
              </button>
            </div>

            <div className="text-xs text-muted">
              <span>Readiness: </span>
              <strong className={`capitalize ${scoreColor(summary?.status)}`}>
                {String(summary?.status || "Audit").replaceAll("_", " ")}
              </strong>
            </div>
          </div>

          {/* Tab 1: System QA Checklist */}
          {activeTab === "checklist" ? (
            <div className="space-y-4">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChecklistFilter("all")}
                  className={`rounded-xl px-3 py-1 text-xs font-bold ${
                    checklistFilter === "all" ? "bg-ink text-white" : "bg-surface text-muted hover:bg-slate-200"
                  }`}
                >
                  All ({checks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setChecklistFilter("pass")}
                  className={`rounded-xl px-3 py-1 text-xs font-bold ${
                    checklistFilter === "pass" ? "bg-emerald-600 text-white" : "bg-surface text-muted hover:bg-slate-200"
                  }`}
                >
                  Passing ({passCount})
                </button>
                <button
                  type="button"
                  onClick={() => setChecklistFilter("action_needed")}
                  className={`rounded-xl px-3 py-1 text-xs font-bold ${
                    checklistFilter === "action_needed" ? "bg-amber-500 text-white" : "bg-surface text-muted hover:bg-slate-200"
                  }`}
                >
                  Needs Attention ({actionCount})
                </button>
              </div>

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
                      className={`rounded-2xl border p-4.5 sm:p-5 shadow-card transition ${
                        badgeStyles[check.status] || badgeStyles.warn
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className="mt-0.5">
                            <StatusIcon status={check.status} />
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-ink">{check.title}</h3>
                              <StatusBadge status={check.status} />
                            </div>
                            <p className="text-xs leading-relaxed opacity-90">{check.description}</p>

                            {check.route ? (
                              <div className="pt-1.5">
                                <Link
                                  to={check.route}
                                  className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1 text-xs font-bold text-ink ring-1 ring-line hover:bg-white"
                                >
                                  <span>Test / Configure in {check.route}</span>
                                  <ArrowRight size={11} className="text-brand" />
                                </Link>
                              </div>
                            ) : null}

                            {Object.keys(check.evidence || {}).length ? (
                              <div className="mt-2.5 rounded-xl bg-white/60 p-2.5 text-[11px] opacity-90">
                                <div className="grid gap-1 md:grid-cols-2">
                                  {Object.entries(withoutSecrets(check.evidence)).slice(0, 4).map(([key, value]) => (
                                    <div key={key} className="truncate">
                                      <span className="font-bold">{key}:</span> {formatDisplayValue(value)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : null}

          {/* Tab 2: Demo Script */}
          {activeTab === "script" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-ink">Supervisor Demo Walkthrough Script</h3>
                    <p className="mt-0.5 text-xs text-muted">
                      Follow these sequential steps during project presentation. Check each step off as it completes.
                    </p>
                  </div>
                  <div className="text-xs font-bold text-brand">
                    {checkedSteps.length} of {demoScript.length} steps completed
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {demoScript.map((step) => {
                    const isChecked = checkedStepSet.has(step.step);
                    return (
                      <label
                        key={step.step}
                        className={`flex cursor-pointer gap-3.5 rounded-2xl border p-4 transition ${
                          isChecked ? "border-emerald-200 bg-emerald-50/40" : "border-line bg-surface hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 rounded text-brand focus:ring-brand"
                          checked={isChecked}
                          onChange={() => toggleStep(step.step)}
                        />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-ink">
                              Step {step.step}: {step.title}
                            </span>
                            {step.route ? (
                              <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-brand ring-1 ring-line">
                                {step.route}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted">{step.goal}</p>
                          <div className="mt-1 text-[11px] font-medium text-subtle">
                            Expected result: <span className="text-ink">{step.expectedResult}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {/* Tab 3: Gaps & Next Actions */}
          {activeTab === "blockers" ? (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Blocking Gaps */}
                <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-card">
                  <div className="flex items-center gap-2 text-sm font-bold text-red-900">
                    <ShieldAlert size={16} className="text-red-600" />
                    <span>Blocking Gaps ({blockingGaps.length})</span>
                  </div>
                  <p className="mt-1 text-xs text-red-700">These items must be satisfied before final submission.</p>

                  <div className="mt-4 space-y-2.5">
                    {blockingGaps.length ? (
                      blockingGaps.map((gap) => (
                        <div key={gap.code} className="rounded-xl border border-red-200 bg-white p-3 text-xs">
                          <div className="font-bold text-red-900">{gap.title}</div>
                          <div className="mt-1 text-muted">{gap.description}</div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={14} />
                        <span>No blocking gaps detected. System is ready!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Warnings */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-card">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span>Warnings & Non-Blocking Items ({warnings.length})</span>
                  </div>
                  <p className="mt-1 text-xs text-amber-700">Features are usable, but can be improved.</p>

                  <div className="mt-4 space-y-2.5">
                    {warnings.length ? (
                      warnings.slice(0, 6).map((warning) => (
                        <div key={warning.code} className="rounded-xl border border-amber-200 bg-white p-3 text-xs">
                          <div className="font-bold text-amber-900">{warning.title}</div>
                          <div className="mt-1 text-muted">{warning.description}</div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={14} />
                        <span>No warnings detected.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommended Next Actions */}
              {nextActions.length ? (
                <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink">
                    <Sparkles size={16} className="text-brand" />
                    <span>Recommended Next Actions</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {nextActions.map((action) => (
                      <div key={action.code} className="flex flex-col justify-between rounded-xl border border-line bg-surface p-3.5">
                        <div>
                          <div className="font-bold text-xs text-ink">{action.title}</div>
                          <div className="mt-1 text-xs text-muted">{action.action}</div>
                        </div>
                        {action.route ? (
                          <Link to={action.route} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
                            <span>Open route</span>
                            <ArrowRight size={12} />
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Tab 4: Record Demo Sign-off & Terminal */}
          {activeTab === "signoff" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Record Demo Run Form */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <PlayCircle size={16} className="text-brand" />
                  <span>Record Evaluator Demo Run</span>
                </div>
                <p className="mt-1 text-xs text-muted">Log the outcome of a supervisor or examiner demonstration.</p>

                {report?.latestDemoRun ? (
                  <div className="mt-3 rounded-xl bg-surface p-3 text-xs text-muted">
                    Last recorded run: <strong className="text-ink">{report.latestDemoRun.result}</strong> by {report.latestDemoRun.reviewerName || "Unknown"}
                    {report.latestDemoRun.demoCoverage ? (
                      <span className="block mt-0.5 text-subtle">
                        Coverage: {report.latestDemoRun.demoCoverage.checkedCount}/{report.latestDemoRun.demoCoverage.totalSteps} steps ({report.latestDemoRun.demoCoverage.percent}%)
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 space-y-3.5">
                  <label className="block text-xs font-bold text-ink">
                    Result
                    <select value={result} onChange={(event) => setResult(event.target.value)} className="form-input mt-1 text-xs">
                      <option value="pass">Pass</option>
                      <option value="warn">Pass with warnings</option>
                      <option value="fail">Fail / needs fixes</option>
                    </select>
                  </label>

                  <label className="block text-xs font-bold text-ink">
                    Reviewer Name
                    <input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} className="form-input mt-1 text-xs" placeholder="e.g. Supervisor / Evaluator" />
                  </label>

                  <label className="block text-xs font-bold text-ink">
                    Notes & Observations
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="form-input mt-1 min-h-24 text-xs" placeholder="Write feedback, tested edge cases, or remaining items..." />
                  </label>

                  <button
                    type="button"
                    disabled={recordMutation.isPending}
                    onClick={() => recordMutation.mutate()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-95 disabled:opacity-60"
                  >
                    <ClipboardCheck size={14} />
                    <span>{recordMutation.isPending ? "Saving..." : "Save Demo QA Run"}</span>
                  </button>

                  {recordMutation.isError ? <div className="text-xs text-red-600">Could not save demo run.</div> : null}
                  {recordMutation.isSuccess ? <div className="text-xs text-emerald-700 font-bold">Demo QA run saved successfully!</div> : null}
                </div>
              </div>

              {/* Terminal Verification Commands */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Terminal size={16} className="text-brand" />
                  <span>Terminal Verification Commands</span>
                </div>
                <p className="mt-1 text-xs text-muted">CLI scripts to run automated test harnesses and lint checks.</p>

                <div className="mt-4 space-y-3">
                  {commands.map((item) => (
                    <div key={item.name} className="rounded-xl border border-line bg-surface p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => copyCommand(item.command, item.name)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                        >
                          {copiedCmd === item.name ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedCmd === item.name ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <code className="mt-2 block overflow-x-auto rounded-lg bg-slate-900 p-2.5 text-[11px] font-mono text-sky-300">
                        {item.command}
                      </code>
                      <p className="mt-1.5 text-[11px] text-muted">{item.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

