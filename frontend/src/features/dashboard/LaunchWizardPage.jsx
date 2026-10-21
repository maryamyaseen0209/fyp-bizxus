import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useTenant } from "../../context/TenantContext.jsx";
import { finalizeLaunch, getLaunchStatus } from "../../services/onboardingApi.js";
import { formatApiError } from "../../utils/apiErrors.js";
import { getApiErrorMessage } from "../../services/apiError.js";
import { BusinessSetupRequired, OWNER_IMAGES, OwnerHero } from "./ownerUi.jsx";
import { EASE } from "../../components/ui/motion.jsx";

function StatusPill({ status }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 size={12} /> Ready
      </span>
    );
  }
  if (status === "missing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
        <AlertTriangle size={12} /> Action Needed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
      <Clock size={12} /> {status.replace("_", " ")}
    </span>
  );
}

function CheckRow({ check }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={`rounded-2xl border bg-white p-4.5 sm:p-5 shadow-card transition duration-200 hover:shadow-lift ${
        check.status === "missing" && check.required ? "border-amber-200/80 bg-amber-50/20" : "border-line"
      }`}
    >
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-ink">{check.title}</h3>
            <StatusPill status={check.status} />
            {!check.required ? (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                Optional
              </span>
            ) : (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                Required
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted">{check.description}</p>

          {/* Contextual indicators */}
          {check.meta?.missingModules?.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-amber-800">
              <span className="font-semibold">Missing modules:</span>
              {check.meta.missingModules.map((m) => (
                <span key={m} className="rounded-md bg-amber-100 px-1.5 py-0.5 font-medium">
                  {m}
                </span>
              ))}
            </div>
          ) : null}

          {(check.meta?.activeItems !== undefined || check.meta?.knowledgeDocuments !== undefined) ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-subtle">
              {check.meta?.activeItems !== undefined ? (
                <span>
                  Active products: <strong className="text-ink">{check.meta.activeItems}</strong>
                  {check.meta?.sellableItems !== undefined ? ` (Sellable: ${check.meta.sellableItems})` : ""}
                </span>
              ) : null}
              {check.meta?.knowledgeDocuments !== undefined ? (
                <span>
                  AI Knowledge documents: <strong className="text-ink">{check.meta.knowledgeDocuments}</strong>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {check.route ? (
          <div className="shrink-0 self-end sm:self-center">
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink shadow-sm transition hover:bg-slate-100 active:scale-95"
              to={check.route}
            >
              <span>{check.actionLabel || "Configure"}</span>
              <ArrowRight size={13} className="text-brand" />
            </Link>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export function LaunchWizardPage() {
  const { selectedTenant, refreshTenants, selectTenant } = useTenant();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'required' | 'action_needed'

  async function loadStatus() {
    if (!selectedTenant?.id) {
      setStatus(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getLaunchStatus(selectedTenant.id);
      setStatus(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load launch wizard."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus().catch(() => {});
  }, [selectedTenant?.id]);

  async function handleFinalize() {
    if (!selectedTenant?.id) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const data = await finalizeLaunch(selectedTenant.id, { publishWebsite: true, allowWarnings: true });
      setStatus(data);
      const tenants = await refreshTenants();
      const latest = tenants.find((tenant) => tenant.id === selectedTenant.id);
      if (latest) selectTenant(latest);
      setMessage(
        data.finalized?.publishError
          ? `Launch saved, but publish needs attention: ${formatApiError(data.finalized.publishError.detail)}`
          : "Launch finalized and submitted for admin website review.",
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to finalize launch."));
    } finally {
      setLoading(false);
    }
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Store Launch Guide"
        description="Follow our step-by-step launch roadmap to take your business from draft to published, AI-automated storefront."
        icon={Rocket}
        image={OWNER_IMAGES.setup}
        previewTitle="Launch Wizard Roadmap"
        previewItems={[
          { title: "Store Identity & Branding", desc: "Define your shop name, category, and direct WhatsApp contact." },
          { title: "Products & Checkout Rules", desc: "Upload items and activate Cash on Delivery or digital payment methods." },
          { title: "Publish & Go Live", desc: "Review the automated launch checklist and publish your live customer URL." },
        ]}
      />
    );
  }

  const summary = status?.summary || {};
  const checks = status?.checks || [];

  const requiredCount = checks.filter((c) => c.required).length;
  const completedRequired = checks.filter((c) => c.required && c.status === "complete").length;
  const missingCount = checks.filter((c) => c.status === "missing").length;

  const filteredChecks = useMemo(() => {
    if (filterMode === "required") {
      return checks.filter((c) => c.required);
    }
    if (filterMode === "action_needed") {
      return checks.filter((c) => c.status === "missing");
    }
    return checks;
  }, [checks, filterMode]);

  return (
    <section className="space-y-6">
      {/* Cinematic Hero */}
      <OwnerHero
        eyebrow="Launch & Readiness"
        title="Store Launch Guide"
        description="Verify readiness requirements, ensure product catalog and AI assistants are prepared, and submit your public storefront for review."
        image={OWNER_IMAGES.setup}
        stats={[
          { label: "Required Readiness", value: `${summary.requiredPercent ?? 0}%` },
          { label: "Overall Progress", value: `${summary.overallPercent ?? 0}%` },
          { label: "Storefront", value: summary.websiteStatus || selectedTenant.websiteStatus || "Draft" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleFinalize}
              disabled={loading || (status && !summary.canPublish)}
              title={status && !summary.canPublish ? "Complete required launch checks before requesting publishing." : "Finalize and request admin website review"}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-hero-work shadow-[0_14px_30px_-12px_rgba(3,10,26,0.7)] transition hover:bg-sky-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Rocket size={15} className="text-brand" />
              <span>{loading ? "Submitting..." : "Finalize & Request Review"}</span>
            </button>
            <button
              type="button"
              onClick={loadStatus}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 active:scale-95"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh Status</span>
            </button>
          </div>
        }
      />

      {message ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm"
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{message}</span>
        </motion.div>
      ) : null}

      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm"
        >
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </motion.div>
      ) : null}

      {/* Filter Tabs */}
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
            onClick={() => setFilterMode("required")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filterMode === "required" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <span>Required Only</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${filterMode === "required" ? "bg-white/20 text-white" : "bg-blue-100 text-brand"}`}>
              {completedRequired}/{requiredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("action_needed")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filterMode === "action_needed" ? "bg-amber-500 text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <AlertTriangle size={12} />
            <span>Action Needed</span>
            {missingCount > 0 ? (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${filterMode === "action_needed" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}>
                {missingCount}
              </span>
            ) : null}
          </button>
        </div>

        <div className="text-xs text-muted">
          <span>Overall Readiness: </span>
          <strong className="text-ink">{summary.overallPercent ?? 0}%</strong>
        </div>
      </div>

      {loading && !checks.length ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white py-12 text-sm text-muted shadow-card">
          <RefreshCw size={18} className="animate-spin text-brand" />
          <span>Assessing store readiness...</span>
        </div>
      ) : null}

      {/* Checklist List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredChecks.map((check) => (
            <CheckRow key={check.code} check={check} />
          ))}
        </AnimatePresence>

        {!filteredChecks.length && !loading ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center shadow-card">
            <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
            <div className="mt-3 text-base font-bold text-ink">All items in this filter are satisfied</div>
            <p className="mt-1 text-xs text-muted">Your store meets all the requirements in this category.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

