import {
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
  Layers,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Alert, Badge, Card, EmptyState, IconTile } from "../../components/ui/index.jsx";
import { humanizeModuleCode, moduleMeta } from "../../utils/moduleMeta.js";
import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { getPublicBusinessCategories } from "../../services/businessCategoryApi.js";
import { disableTenantModule, enableTenantModule } from "../../services/moduleApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";
import { BusinessSetupRequired, OWNER_IMAGES, OwnerHero } from "../dashboard/ownerUi.jsx";
import { EASE } from "../../components/ui/motion.jsx";

export function ModuleMarketplace() {
  const { selectedTenant, refreshTenants, selectTenant } = useTenant();
  const { tenantModules, tenantPlan, availablePlans, refreshTenantModules, isLoadingModules } = useModules();
  const [categories, setCategories] = useState([]);
  const [busyModule, setBusyModule] = useState("");
  const [serverError, setServerError] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all"); // 'all' | 'enabled' | 'suggested' | <category>
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [expandedTechDetails, setExpandedTechDetails] = useState({});

  useEffect(() => {
    getPublicBusinessCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (selectedTenant?.id) {
      refreshTenantModules(selectedTenant.id);
    }
  }, [selectedTenant?.id, refreshTenantModules]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedTenant?.businessCategoryId),
    [categories, selectedTenant],
  );

  const enabledCount = useMemo(
    () => tenantModules.filter((m) => m.tenantStatus === "enabled").length,
    [tenantModules],
  );

  const suggestedCount = useMemo(
    () => tenantModules.filter((m) => selectedCategory?.suggestedModules?.includes(m.code)).length,
    [tenantModules, selectedCategory],
  );

  // Group module categories for filter pills
  const availableCategories = useMemo(() => {
    const cats = new Set();
    tenantModules.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats);
  }, [tenantModules]);

  const filteredModules = useMemo(() => {
    if (activeCategoryFilter === "enabled") {
      return tenantModules.filter((m) => m.tenantStatus === "enabled");
    }
    if (activeCategoryFilter === "suggested") {
      return tenantModules.filter((m) => selectedCategory?.suggestedModules?.includes(m.code));
    }
    if (activeCategoryFilter !== "all") {
      return tenantModules.filter((m) => m.category === activeCategoryFilter);
    }
    return tenantModules;
  }, [tenantModules, activeCategoryFilter, selectedCategory]);

  function toggleTechDetails(moduleCode) {
    setExpandedTechDetails((prev) => ({
      ...prev,
      [moduleCode]: !prev[moduleCode],
    }));
  }

  async function toggleModule(module) {
    if (!selectedTenant) return;
    setBusyModule(module.code);
    setServerError("");
    setServerMessage("");
    try {
      const data =
        module.tenantStatus === "enabled"
          ? await disableTenantModule(selectedTenant.id, module.code)
          : await enableTenantModule(selectedTenant.id, module.code);
      const tenants = await refreshTenants();
      const updatedTenant = tenants.find((tenant) => tenant.id === selectedTenant.id) || data.tenant;
      selectTenant(updatedTenant);
      await refreshTenantModules(selectedTenant.id);
      setServerMessage(
        module.tenantStatus === "enabled"
          ? `${module.name} disabled successfully.`
          : `${module.name} enabled successfully.`,
      );
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Unable to update module."));
    } finally {
      setBusyModule("");
    }
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Add-on Features & Marketplace"
        description="Toggle and customize modules for your business — POS Cashier register, WhatsApp AI co-pilot, automated receipt dispatch, and inventory analytics."
        icon={Puzzle}
        image={OWNER_IMAGES.modules}
        previewTitle="Extensible Module Ecosystem"
        previewItems={[
          { title: "Point of Sale (POS) Cashiers", desc: "Enable counter till access, receipt printing, and cashier staff management." },
          { title: "WhatsApp AI Sales Assistant", desc: "Equip your WhatsApp with 24/7 autonomous order taking and catalog sharing." },
          { title: "Executive Reports & Audit Logs", desc: "Unlock daily executive sales summaries and accountant-ready CSV exports." },
        ]}
      />
    );
  }

  return (
    <section className="space-y-6">
      {/* Cinematic Hero */}
      <OwnerHero
        eyebrow="Add-on Features & Tools"
        title={`Features for ${selectedTenant.name}`}
        description="Customize your workspace by turning on the tools you need — POS Cashier register, WhatsApp AI co-pilot, automated receipt dispatch, and inventory analytics."
        image={OWNER_IMAGES.modules}
        stats={[
          { label: "Active Tools", value: enabledCount },
          { label: "Total Available", value: tenantModules.length },
          { label: "Active Tier", value: tenantPlan?.name || "Free" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPlanDetails((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-hero-work shadow-[0_14px_30px_-12px_rgba(3,10,26,0.7)] transition hover:bg-sky-50 active:scale-95"
            >
              <ShieldCheck size={14} className="text-brand" />
              <span>{showPlanDetails ? "Hide Plan Details" : "Review Plan Access"}</span>
              {showPlanDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        }
      />

      {serverMessage ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm"
        >
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span>{serverMessage}</span>
        </motion.div>
      ) : null}

      {serverError ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm"
        >
          <Info size={16} className="text-red-600 shrink-0" />
          <span>{serverError}</span>
        </motion.div>
      ) : null}

      {/* Plan Details (Progressive Disclosure) */}
      <AnimatePresence>
        {showPlanDetails && availablePlans.length ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink">Subscription & Module Quota</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    All tools in BizXus are fully unlocked for your business.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlanDetails(false)}
                  className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"
                >
                  <ChevronUp size={16} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availablePlans.map((plan) => {
                  const active = tenantPlan?.code === plan.code;
                  return (
                    <div
                      key={plan.code}
                      className={`relative rounded-2xl border p-4.5 transition ${
                        active
                          ? "border-brand bg-blue-50/40 ring-2 ring-brand/20 shadow-sm"
                          : "border-line bg-surface hover:bg-white"
                      }`}
                    >
                      {active ? (
                        <span className="absolute -top-2.5 right-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                          Active Plan
                        </span>
                      ) : null}
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-base font-bold text-ink">{plan.name}</div>
                        <Badge tone="green">{plan.priceLabel || "Free"}</Badge>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted">{plan.description}</p>
                      {active ? (
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-brand">
                          <Check size={14} strokeWidth={3} />
                          <span>Included in your workspace</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Suggested for Category */}
      {selectedCategory ? (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/80 via-white to-blue-50/50 p-5 shadow-card">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Sparkles size={16} className="text-brand" />
            <span>Recommended for {selectedCategory.name} Businesses</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Based on your business profile category, these add-ons typically drive the fastest results:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedCategory.suggestedModules.map((moduleCode) => {
              const meta = moduleMeta(moduleCode);
              const isEnabled = tenantModules.some((m) => m.code === moduleCode && m.tenantStatus === "enabled");
              return (
                <span
                  key={moduleCode}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs transition ${
                    isEnabled
                      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300"
                      : "bg-white text-ink ring-1 ring-sky-200"
                  }`}
                >
                  <meta.icon size={13} className={isEnabled ? "text-emerald-600" : "text-brand"} strokeWidth={2.3} />
                  <span>{meta.label}</span>
                  {isEnabled ? <Check size={12} className="text-emerald-600" /> : null}
                </span>
              );
            })}
          </div>

          {selectedCategory.analyticsSuggestions?.length ? (
            <div className="mt-4 pt-3 border-t border-sky-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <TrendingUp size={14} className="text-brand" />
                <span>Recommended metric indicators:</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {selectedCategory.analyticsSuggestions.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3.5 shadow-card">
        <button
          type="button"
          onClick={() => setActiveCategoryFilter("all")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            activeCategoryFilter === "all"
              ? "bg-brand text-white shadow-sm"
              : "bg-surface text-ink hover:bg-slate-100"
          }`}
        >
          <span>All Tools</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeCategoryFilter === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
            {tenantModules.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryFilter("enabled")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            activeCategoryFilter === "enabled"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-surface text-ink hover:bg-slate-100"
          }`}
        >
          <Check size={13} />
          <span>Active</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeCategoryFilter === "enabled" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
            {enabledCount}
          </span>
        </button>

        {suggestedCount > 0 ? (
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("suggested")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeCategoryFilter === "suggested"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <Sparkles size={13} />
            <span>Recommended</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeCategoryFilter === "suggested" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"}`}>
              {suggestedCount}
            </span>
          </button>
        ) : null}

        {availableCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategoryFilter(category)}
            className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeCategoryFilter === category
                ? "bg-brand text-white shadow-sm"
                : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <span>{humanizeModuleCode(category)}</span>
          </button>
        ))}
      </div>

      {isLoadingModules ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white py-12 text-sm text-muted shadow-card">
          <RefreshCw size={18} className="animate-spin text-brand" />
          <span>Loading module directory...</span>
        </div>
      ) : null}

      {/* Modules Cards Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {filteredModules.map((module) => {
            const suggested = selectedCategory?.suggestedModules?.includes(module.code);
            const enabled = module.tenantStatus === "enabled";
            const meta = moduleMeta(module.code);
            const hasTechDetails =
              module.dependencies?.length || module.blockingDependents?.length || module.category;
            const isExpanded = expandedTechDetails[module.code];

            return (
              <motion.article
                key={module.code}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, ease: EASE }}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-card transition duration-200 hover:shadow-lift ${
                  enabled ? "border-brand-200 ring-1 ring-brand-100" : "border-line"
                }`}
              >
                {/* Active Indicator Strip */}
                {enabled ? (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand to-sky-400" />
                ) : null}

                <div>
                  <div className="flex items-start gap-3.5">
                    <IconTile icon={meta.icon} tone={meta.tone} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-ink">{module.name}</h3>
                        {enabled ? (
                          <Badge tone="green" icon={Check}>
                            Active
                          </Badge>
                        ) : null}
                        {suggested && !enabled ? (
                          <Badge tone="purple" icon={Sparkles}>
                            Suggested
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted">{module.description}</p>
                    </div>
                  </div>

                  {/* Clean Technical Details (Progressive Disclosure) */}
                  {hasTechDetails ? (
                    <div className="mt-3.5 pt-3 border-t border-line-soft">
                      <button
                        type="button"
                        onClick={() => toggleTechDetails(module.code)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-ink transition"
                      >
                        <Info size={12} />
                        <span>{isExpanded ? "Hide technical requirements" : "Technical info"}</span>
                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>

                      <AnimatePresence>
                        {isExpanded ? (
                          <motion.dl
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-2 space-y-1 rounded-xl bg-surface p-3 text-[11px]"
                          >
                            <div className="flex gap-2">
                              <dt className="w-24 shrink-0 font-bold text-subtle">Category</dt>
                              <dd className="font-medium text-ink">{humanizeModuleCode(module.category)}</dd>
                            </div>
                            <div className="flex gap-2">
                              <dt className="w-24 shrink-0 font-bold text-subtle">Access</dt>
                              <dd className="font-medium text-emerald-700">Unlocked & Free</dd>
                            </div>
                            {module.dependencies?.length ? (
                              <div className="flex gap-2">
                                <dt className="w-24 shrink-0 font-bold text-subtle">Requires</dt>
                                <dd className="font-medium text-muted">
                                  {module.dependencies.map(humanizeModuleCode).join(", ")}
                                </dd>
                              </div>
                            ) : null}
                            {module.blockingDependents?.length ? (
                              <div className="flex gap-2">
                                <dt className="w-24 shrink-0 font-bold text-subtle">Required by</dt>
                                <dd className="font-medium text-muted">
                                  {module.blockingDependents.map(humanizeModuleCode).join(", ")}
                                </dd>
                              </div>
                            ) : null}
                          </motion.dl>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  ) : null}
                </div>

                {/* Footer Action */}
                <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3">
                  <span className="text-[11px] font-medium text-subtle">
                    {enabled ? "Active in your navigation" : "Ready to activate"}
                  </span>

                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-60 ${
                      enabled
                        ? "border border-line bg-surface text-ink hover:bg-slate-200"
                        : "bg-brand text-white shadow-sm hover:bg-brand/90"
                    }`}
                    disabled={busyModule === module.code}
                    onClick={() => toggleModule(module)}
                  >
                    {busyModule === module.code ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : enabled ? (
                      <>
                        <span>Turn Off</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} />
                        <span>Activate Feature</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      {!filteredModules.length && !isLoadingModules ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center shadow-card">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-brand">
            <Puzzle size={24} />
          </div>
          <div className="mt-3 text-base font-bold text-ink">No features in this category</div>
          <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
            Try switching to "All Tools" to view every available add-on feature.
          </p>
        </div>
      ) : null}
    </section>
  );
}

