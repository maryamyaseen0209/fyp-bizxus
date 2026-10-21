import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileCheck2,
  Layers,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Table as TableIcon,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useTenant } from "../../context/TenantContext.jsx";
import { getSubmissionExport, getSubmissionPackage, recordSubmissionSignoff } from "../../services/submissionApi.js";
import { BusinessSetupRequired, OWNER_IMAGES, OwnerHero } from "./ownerUi.jsx";
import { EASE } from "../../components/ui/motion.jsx";

const badgeStyles = {
  pass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  fail: "border-red-200 bg-red-50 text-red-800",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  ready_with_notes: "border-amber-200 bg-amber-50 text-amber-800",
  blocked: "border-red-200 bg-red-50 text-red-800",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        badgeStyles[status] || badgeStyles.warn
      }`}
    >
      {String(status || "warn").replaceAll("_", " ")}
    </span>
  );
}

function statusText(status) {
  return String(status || "loading").replaceAll("_", " ");
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function SubmissionCenterPage() {
  const queryClient = useQueryClient();
  const { selectedTenant } = useTenant();
  const tenantId = selectedTenant?.id;
  const [status, setStatus] = useState("ready");
  const [reviewerName, setReviewerName] = useState("");
  const [notes, setNotes] = useState("");
  const [includedArtifacts, setIncludedArtifacts] = useState([
    "latest_zip",
    "proposal_pdf",
    "demo_guide",
    "env_example",
    "seed_demo_data",
  ]);
  const [activeTab, setActiveTab] = useState("traceability"); // 'traceability' | 'artifacts' | 'signoff'

  const packageQuery = useQuery({
    queryKey: ["submission-package", tenantId],
    queryFn: () => getSubmissionPackage(tenantId),
    enabled: Boolean(tenantId),
    refetchInterval: 60000,
  });

  const signoffMutation = useMutation({
    mutationFn: () => recordSubmissionSignoff(tenantId, { status, reviewerName, notes, includedArtifacts }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submission-package", tenantId] });
      setNotes("");
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => getSubmissionExport(tenantId),
    onSuccess: (data) => {
      const slug = selectedTenant?.slug || "tenant";
      downloadJson(`bizxusai-${slug}-submission-snapshot.json`, data);
    },
  });

  const data = packageQuery.data;
  const summary = data?.summary || {};
  const artifactChecklist = data?.artifactChecklist || [];
  const includedSet = useMemo(() => new Set(includedArtifacts), [includedArtifacts]);
  const artifactSummary = summary.artifactSummary || {};
  const requiredArtifacts = useMemo(
    () => artifactChecklist.filter((artifact) => artifact.required).map((artifact) => artifact.code),
    [artifactChecklist],
  );
  const missingRequiredArtifacts = requiredArtifacts.filter((code) => !includedSet.has(code));
  const canSignOffReady = status === "blocked" || missingRequiredArtifacts.length === 0;

  function toggleArtifact(code) {
    setIncludedArtifacts((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Submission Center & Artifacts"
        description="Compile release artifacts, signoffs, documentation packages, and compliance checks for your business."
        icon={PackageCheck}
        image={OWNER_IMAGES.submission}
        previewTitle="Release & Submission Management"
        previewItems={[
          { title: "Compliance & Security Review", desc: "Automated verification of security headers, SSL certs, and privacy policies." },
          { title: "Exportable Release Package", desc: "Generate and download audited ZIP packages containing all tenant assets." },
          { title: "Digital Signoff Registry", desc: "Immutable signoff timestamps for final launch approvals." },
        ]}
      />
    );
  }

  return (
    <section className="space-y-6">
      {/* Cinematic Hero */}
      <OwnerHero
        eyebrow="Release & Final Deliverable"
        title="Submission Center & Evidence Package"
        description="Verify proposal-to-code traceability, compile required project artifacts, enforce clean packaging rules, and generate final evaluator evidence."
        image={OWNER_IMAGES.submission}
        stats={[
          { label: "Sign-off Status", value: statusText(summary.status) },
          { label: "Blocking Gaps", value: summary.blockingCount ?? 0 },
          {
            label: "Artifacts Included",
            value: `${artifactSummary.includedCount ?? includedArtifacts.length}/${artifactSummary.requiredCount ?? requiredArtifacts.length}`,
          },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-hero-work shadow-[0_14px_30px_-12px_rgba(3,10,26,0.7)] transition hover:bg-sky-50 active:scale-95 disabled:opacity-60"
            >
              <Download size={14} className="text-brand" />
              <span>{exportMutation.isPending ? "Generating Snapshot..." : "Export Evidence JSON"}</span>
            </button>
            <button
              type="button"
              onClick={() => packageQuery.refetch()}
              disabled={packageQuery.isFetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 active:scale-95"
            >
              <RefreshCw size={13} className={packageQuery.isFetching ? "animate-spin" : ""} />
              <span>Refresh Package</span>
            </button>
          </div>
        }
      />

      {packageQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white py-12 text-sm text-muted shadow-card">
          <RefreshCw size={18} className="animate-spin text-brand" />
          <span>Compiling submission evidence package...</span>
        </div>
      ) : packageQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-card">
          Could not load the submission package. Make sure the backend server is running and accessible.
        </div>
      ) : (
        <>
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("traceability")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === "traceability" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
                }`}
              >
                <FileCheck2 size={13} />
                <span>Proposal Traceability</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "traceability" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {(data?.proposalTraceability || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("artifacts")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === "artifacts" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
                }`}
              >
                <Archive size={13} />
                <span>Artifacts & Packaging Rules</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "artifacts" ? "bg-white/20 text-white" : "bg-blue-100 text-brand"}`}>
                  {artifactChecklist.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("signoff")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === "signoff" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
                }`}
              >
                <CheckCircle2 size={13} />
                <span>Final Sign-off & Audit Counts</span>
              </button>
            </div>

            <div className="text-xs text-muted">
              <span>Required QA: </span>
              <strong className="text-ink">{summary.requiredPercent ?? 0}%</strong>
              <span className="mx-1 text-line">·</span>
              <span>Overall QA: </span>
              <strong className="text-ink">{summary.overallPercent ?? 0}%</strong>
            </div>
          </div>

          {/* Tab 1: Proposal Traceability */}
          {activeTab === "traceability" ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <div className="p-5 border-b border-line bg-slate-50/50">
                <h3 className="text-sm font-bold text-ink">Proposal-to-Code Traceability Matrix</h3>
                <p className="mt-0.5 text-xs text-muted">
                  Audits project commitments against implemented features, code modules, and accessible UI test routes.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-line bg-surface text-[10px] font-bold uppercase tracking-wider text-subtle">
                    <tr>
                      <th className="py-3 px-4">Proposal Requirement Area</th>
                      <th className="py-3 px-4">Implemented Mechanism</th>
                      <th className="py-3 px-4">Verification Route</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {(data?.proposalTraceability || []).map((row) => (
                      <tr key={row.proposalArea} className="hover:bg-surface/50 transition">
                        <td className="py-3.5 px-4 font-bold text-ink">{row.proposalArea}</td>
                        <td className="py-3.5 px-4 text-muted">{row.implementedBy}</td>
                        <td className="py-3.5 px-4">
                          {row.evidenceRoute ? (
                            <Link
                              to={row.evidenceRoute}
                              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                            >
                              <span>{row.evidenceRoute}</span>
                              <ArrowRight size={11} />
                            </Link>
                          ) : (
                            <span className="text-subtle">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Tab 2: Artifact Checklist & Packaging Rules */}
          {activeTab === "artifacts" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Artifact Checklist */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Archive size={16} className="text-brand" />
                  <span>Submission Deliverables Checklist</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Check each artifact to include in the evaluator release package.
                </p>

                <div className="mt-4 space-y-3">
                  {artifactChecklist.map((artifact) => {
                    const isChecked = includedSet.has(artifact.code);
                    return (
                      <label
                        key={artifact.code}
                        className={`flex cursor-pointer gap-3.5 rounded-2xl border p-4 transition ${
                          isChecked ? "border-emerald-200 bg-emerald-50/30" : "border-line bg-surface hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 rounded text-brand focus:ring-brand"
                          checked={isChecked}
                          onChange={() => toggleArtifact(artifact.code)}
                        />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-ink">{artifact.title}</span>
                            {artifact.required ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                Required
                              </span>
                            ) : (
                              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted ring-1 ring-line">
                                Optional
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted">{artifact.description}</p>
                        </div>
                      </label>
                    );
                  })}

                  {missingRequiredArtifacts.length ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
                      Missing required artifacts before ready sign-off: <strong className="font-bold">{missingRequiredArtifacts.join(", ")}</strong>.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <span>All required deliverables are checked and ready for evaluator sign-off.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Packaging Rules */}
              <div className="space-y-4">
                {/* Submit These */}
                <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Deliverable Packaging Files</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">Files and documentation directories that must be present in submission zip.</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(data?.filesToSubmit || []).map((item) => (
                      <code key={item} className="rounded-lg bg-surface px-2.5 py-1 text-xs font-mono text-ink ring-1 ring-line">
                        {item}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Exclude These */}
                <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-card sm:p-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-red-900">
                    <ShieldAlert size={16} className="text-red-600" />
                    <span>Excluded & Sensitive Files</span>
                  </div>
                  <p className="mt-1 text-xs text-red-700">Never commit or include these private files in evaluation packages.</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(data?.filesToExclude || []).map((item) => (
                      <code key={item} className="rounded-lg bg-white px-2.5 py-1 text-xs font-mono text-red-800 ring-1 ring-red-200">
                        {item}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Tab 3: Final Sign-off & Audit Evidence Counts */}
          {activeTab === "signoff" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Evidence Counts */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <TableIcon size={16} className="text-brand" />
                  <span>Tenant Audit Evidence Counts</span>
                </div>
                <p className="mt-1 text-xs text-muted">Summary of real entities populated in the system database.</p>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(data?.counts || {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-line bg-surface p-3.5">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-subtle">{key.replaceAll("_", " ")}</dt>
                      <dd className="mt-1 text-2xl font-bold text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Sign-off Form */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <FileCheck2 size={16} className="text-brand" />
                  <span>Final Examiner Sign-off</span>
                </div>
                {data?.latestSignoff ? (
                  <div className="mt-3 rounded-xl bg-surface p-3 text-xs text-muted">
                    Last recorded sign-off: <strong className="text-ink">{statusText(data.latestSignoff.status)}</strong> by {data.latestSignoff.reviewerName || "Unknown"}
                  </div>
                ) : null}

                <div className="mt-4 space-y-3.5">
                  <label className="block text-xs font-bold text-ink">
                    Sign-off Status
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="form-input mt-1 text-xs">
                      <option value="ready">Ready</option>
                      <option value="ready_with_notes">Ready with notes</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </label>

                  <label className="block text-xs font-bold text-ink">
                    Reviewer Name
                    <input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} className="form-input mt-1 text-xs" placeholder="e.g. Supervisor / Final Examiner" />
                  </label>

                  <label className="block text-xs font-bold text-ink">
                    Submission Notes
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="form-input mt-1 min-h-24 text-xs" placeholder="Add final submission observations, known warnings, or evaluation remarks..." />
                  </label>

                  <button
                    type="button"
                    disabled={signoffMutation.isPending || !canSignOffReady}
                    onClick={() => signoffMutation.mutate()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-95 disabled:opacity-60"
                  >
                    <FileCheck2 size={14} />
                    <span>{signoffMutation.isPending ? "Saving..." : "Save Final Sign-off"}</span>
                  </button>

                  {!canSignOffReady ? (
                    <div className="text-xs text-amber-700">Select all required deliverables, or choose Blocked if submission cannot proceed.</div>
                  ) : null}
                  {signoffMutation.isError ? <div className="text-xs text-red-600">Could not record sign-off.</div> : null}
                  {signoffMutation.isSuccess ? <div className="text-xs text-emerald-700 font-bold">Final sign-off recorded successfully!</div> : null}
                </div>
              </div>
            </div>
          ) : null}

          {exportMutation.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 shadow-card">
              Could not export evidence JSON snapshot.
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

