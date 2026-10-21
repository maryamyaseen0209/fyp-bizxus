import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Globe,
  MessageCircle,
  Rocket,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { Card, EmptyState, SectionHeading } from "../../components/ui/index.jsx";
import { AreaChart } from "../../components/ui/charts.jsx";
import { BusinessSetupRequired, OWNER_IMAGES, OwnerHero, OwnerPrimaryAction, OwnerStat, Stagger, StaggerItem } from "./ownerUi.jsx";
import { motion } from "framer-motion";

import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { getAnalyticsSummary } from "../../services/analyticsApi.js";

export function DashboardHome() {
  const { selectedTenant, tenants, isLoadingTenants } = useTenant();
  const { enabledModules, tenantPlan } = useModules();
  const [analytics, setAnalytics] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCompletedGuide, setShowCompletedGuide] = useState(false);
  const analyticsEnabled = enabledModules.includes("analytics");

  useEffect(() => {
    let cancelled = false;
    async function loadOverview() {
      if (!selectedTenant || !analyticsEnabled) {
        setAnalytics(null);
        return;
      }
      try {
        const data = await getAnalyticsSummary(selectedTenant.id);
        if (!cancelled) setAnalytics(data);
      } catch {
        if (!cancelled) setAnalytics(null);
      }
    }
    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [selectedTenant, analyticsEnabled]);

  const analyticsSummary = analytics?.summary;
  const trends = analytics?.trends || [];
  const isPublished = selectedTenant?.websiteStatus === "published";
  const websiteUrl = selectedTenant?.slug ? `/businesses/${selectedTenant.slug}` : "";

  // The 4 essential steps any business owner needs to go from zero to live selling
  const setupSteps = useMemo(() => {
    if (!selectedTenant) return [];
    return [
      {
        step: 1,
        title: "Business Details",
        description: "Set your store name, business category, phone, WhatsApp number, and address.",
        done: Boolean(selectedTenant.businessCategoryId && selectedTenant.slug),
        to: "/dashboard/business",
        action: "Set up details",
        reviewAction: "Edit details",
        icon: Building2,
      },
      {
        step: 2,
        title: "Products & Services",
        description: "Add what you sell with prices, photos, and stock quantity.",
        done: (analyticsSummary?.totalItems ?? 0) > 0,
        to: "/dashboard/items",
        action: "Add first product",
        reviewAction: "Manage catalog",
        icon: Boxes,
      },
      {
        step: 3,
        title: "Storefront Design",
        description: "Customize your website template, hero banner, and the sections visitors see.",
        done: Boolean(selectedTenant.websiteSettings?.templateCode),
        to: "/dashboard/public-website",
        action: "Customize website",
        reviewAction: "Edit website",
        icon: Globe,
      },
      {
        step: 4,
        title: isPublished ? "Storefront is Live" : "Launch & Go Live",
        description: isPublished
          ? "Your website is live online and ready to receive customer orders."
          : "Publish your store to make it visible to customers and begin taking orders.",
        done: isPublished,
        to: "/dashboard/public-website",
        action: "Publish store now",
        reviewAction: "Website settings",
        icon: Rocket,
      },
    ];
  }, [selectedTenant, analyticsSummary, isPublished]);

  if (isLoadingTenants) {
    return <div className="text-sm text-muted">Loading your business workspace...</div>;
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Business Dashboard & Workspace"
        description="Initialize your business workspace to track real-time revenue, manage incoming orders, configure AI agents, and build your storefront."
        icon={Building2}
        image={OWNER_IMAGES.home}
        previewTitle="Everything You Need to Run Your Business"
        previewItems={[
          { title: "Storefront & Catalog", desc: "Publish a high-converting website and product catalog in under 60 seconds." },
          { title: "WhatsApp 24/7 AI Agent", desc: "Autonomous sales co-pilot that answers customers and takes orders day and night." },
          { title: "Unified Order Stream", desc: "Sync orders from your website, WhatsApp, and cashier counter till in real time." },
        ]}
      />
    );
  }

  const doneCount = setupSteps.filter((s) => s.done).length;
  const allDone = doneCount === setupSteps.length;
  const progress = Math.round((doneCount / setupSteps.length) * 100);
  const nextStep = setupSteps.find((s) => !s.done) || setupSteps[setupSteps.length - 1];

  function copyStoreLink() {
    if (!selectedTenant?.slug) return;
    const fullUrl = `${window.location.origin}/businesses/${selectedTenant.slug}`;
    navigator.clipboard?.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  }

  const analyticsCards = [
    {
      label: "Today's Orders",
      value: analyticsSummary?.todayOrders ?? 0,
      icon: CalendarClock,
      hint: "Orders placed today",
      tone: "lead",
    },
    {
      label: "Total Orders",
      value: analyticsSummary?.totalOrders ?? 0,
      icon: ShoppingCart,
      hint: "All-time customer orders",
      tone: "calm",
    },
    {
      label: "Products in Catalog",
      value: analyticsSummary?.totalItems ?? 0,
      icon: Boxes,
      hint: "Active products & services",
      tone: "calm",
    },
    {
      label: "Total Customers",
      value: analyticsSummary?.totalCustomers ?? 0,
      icon: Users,
      hint: "Registered customers",
      tone: "calm",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* 1. DISTINCT DASHBOARD MISSION CONTROL HERO - Cinematic Photo with Directional Vignette */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph - Vividly visible without heavy wash */}
        <img
          src={OWNER_IMAGES.store}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-center filter brightness-[0.72] contrast-[1.08] saturate-[1.15]"
          loading="eager"
        />

        {/* Directional cinematic vignette: high contrast on text side, clear photo visibility on right */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/30"
        />

        {/* Subtle atmospheric ambient glows */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />

        {/* Glowing top horizon accent line */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent shadow-[0_0_12px_rgba(56,189,248,0.7)]"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-200 border border-white/20 backdrop-blur">
                <Sparkles size={13} className="text-amber-300" />
                {isPublished ? "Business Operations Active" : "Getting Started Workspace"}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isPublished ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
              }`}>
                {isPublished ? "● Online Store Live" : "● Setup in Progress"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              {selectedTenant.name}
            </h1>

            <p className="text-xs sm:text-sm text-indigo-100/85 leading-relaxed">
              {isPublished
                ? "Your storefront is live and ready for customer orders. Monitor daily sales, manage catalog, and fulfill orders below."
                : "Welcome! Complete the 4 simple setup steps below to launch your online store and begin receiving customer orders."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!allDone ? (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to={nextStep.to}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-900 shadow-lg hover:bg-slate-100 transition"
                >
                  <span>Next: {nextStep.action}</span>
                  <ArrowRight size={15} />
                </Link>
              </motion.div>
            ) : (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/dashboard/transactions"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-900 shadow-lg hover:bg-slate-100 transition"
                >
                  <span>View Orders</span>
                  <ArrowRight size={15} />
                </Link>
              </motion.div>
            )}

            {websiteUrl ? (
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-xs sm:text-sm font-bold text-white backdrop-blur hover:bg-white/20 transition"
              >
                <Globe size={15} />
                <span>{isPublished ? "Open Store" : "Preview Store"}</span>
              </motion.a>
            ) : null}
          </div>
        </div>
      </motion.section>

      {/* 2. THE 4-STEP LAUNCH PROCESS (Visual Roadmap) */}
      {!allDone || showCompletedGuide ? (
        <Card className="border-blue-100 bg-white/95 shadow-[0_16px_42px_rgba(16,22,51,0.06)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand">
                  <Sparkles size={12} /> Step-by-Step Launch Guide
                </span>
                {allDone ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    All Steps Complete ✓
                  </span>
                ) : null}
              </div>
              <h2 className="mt-1.5 text-xl font-extrabold text-ink">
                {allDone ? "Your business is fully configured" : `${doneCount} of ${setupSteps.length} steps completed`}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {allDone
                  ? "Great job! All essential setup steps have been completed."
                  : "Complete these steps in order to launch your store to the public."}
              </p>
            </div>

            <div className="w-full sm:w-60">
              <div className="mb-1.5 flex justify-between text-xs font-bold text-muted">
                <span>Setup Progress</span>
                <span className="text-ink">{progress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-blue-100/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <ol className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {setupSteps.map((step) => {
              const isNext = !step.done && step.title === nextStep.title;
              const Icon = step.icon;
              return (
                <li key={step.title} className="h-full">
                  <Link
                    to={step.to}
                    className={`group relative flex h-full min-h-[195px] flex-col justify-between rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${
                      step.done
                        ? "border-emerald-200 bg-emerald-50/50"
                        : isNext
                          ? "border-brand bg-brand-50/50 ring-2 ring-brand/30"
                          : "border-blue-100/70 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`grid h-10 w-10 place-items-center rounded-xl ${
                            step.done
                              ? "bg-emerald-100 text-emerald-700"
                              : isNext
                                ? "bg-brand text-white shadow-sm"
                                : "bg-surface text-muted"
                          }`}
                        >
                          <Icon size={20} />
                        </span>
                        {step.done ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 size={16} /> Done
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-black uppercase text-muted">
                            <Circle size={8} /> Step {step.step}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3.5 text-sm font-extrabold text-ink">{step.title}</h3>
                      <p className="mt-1 min-h-[36px] text-xs leading-relaxed text-muted line-clamp-2">
                        {step.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line/50 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                        step.done ? "text-emerald-700" : isNext ? "text-brand" : "text-muted"
                      }`}>
                        {step.done ? step.reviewAction : step.action}
                        <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                      </span>
                      {isNext ? (
                        <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Current
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>

          {allDone ? (
            <div className="mt-4 text-right">
              <button
                type="button"
                onClick={() => setShowCompletedGuide(false)}
                className="text-xs font-bold text-muted hover:text-ink transition"
              >
                Hide guide
              </button>
            </div>
          ) : null}
        </Card>
      ) : (
        /* Collapsed guide bar when fully published */
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-3.5 text-emerald-900 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <span className="text-sm font-bold text-emerald-900">Your store setup is 100% complete!</span>
              <span className="hidden sm:inline text-xs text-emerald-700 ml-2">All 4 foundation steps are done.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCompletedGuide(true)}
            className="text-xs font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
          >
            Review Setup Steps
          </button>
        </div>
      )}

      {/* 3. QUICK ACTIONS (Direct shortcuts for daily management) */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/dashboard/items"
            className="group flex h-full min-h-[82px] items-center gap-3.5 rounded-2xl border border-line bg-white p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_12px_28px_rgba(37,99,235,0.08)] active:scale-[0.98]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand shadow-xs transition duration-200 group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
              <Boxes size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink transition group-hover:text-brand">Add Product / Service</div>
              <div className="mt-0.5 text-xs text-muted">Update catalog, prices & stock</div>
            </div>
          </Link>

          <Link
            to="/dashboard/transactions"
            className="group flex h-full min-h-[82px] items-center gap-3.5 rounded-2xl border border-line bg-white p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-[0_12px_28px_rgba(139,92,246,0.08)] active:scale-[0.98]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600 shadow-xs transition duration-200 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white">
              <ShoppingCart size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink transition group-hover:text-purple-600">View Customer Orders</div>
              <div className="mt-0.5 text-xs text-muted">Process and track fulfillment</div>
            </div>
          </Link>

          <Link
            to="/dashboard/whatsapp-agent"
            className="group flex h-full min-h-[82px] items-center gap-3.5 rounded-2xl border border-line bg-white p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_12px_28px_rgba(16,185,129,0.08)] active:scale-[0.98]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 shadow-xs transition duration-200 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
              <MessageCircle size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink transition group-hover:text-emerald-600">WhatsApp Automation</div>
              <div className="mt-0.5 text-xs text-muted">Auto-respond & take orders</div>
            </div>
          </Link>

          <Link
            to="/dashboard/public-website"
            className="group flex h-full min-h-[82px] items-center gap-3.5 rounded-2xl border border-line bg-white p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_12px_28px_rgba(56,189,248,0.08)] active:scale-[0.98]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 shadow-xs transition duration-200 group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white">
              <Globe size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink transition group-hover:text-sky-600">Customize Website</div>
              <div className="mt-0.5 text-xs text-muted">Change banners, colors & copy</div>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. PERFORMANCE NUMBERS AT A GLANCE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Business Overview</h2>
          <Link to="/dashboard/analytics" className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1">
            Detailed Analytics <ArrowRight size={13} />
          </Link>
        </div>
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {analyticsCards.map((card) => (
            <StaggerItem key={card.label} className="h-full">
              <OwnerStat
                label={card.label}
                value={card.value}
                icon={card.icon}
                hint={card.hint}
                tone={card.tone}
              />
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      {/* 5. SALES & ORDERS TREND */}
      {trends.length ? (
        <Card className="border-blue-100 bg-white/90 shadow-[0_16px_42px_rgba(16,22,51,0.06)]">
          <SectionHeading
            icon={BarChart3}
            title="Sales & Orders Trend (Last 7 Days)"
            description="Daily orders and revenue generated by your business"
            actions={
              <Link className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline" to="/dashboard/analytics">
                Full analytics <ArrowRight size={15} />
              </Link>
            }
          />
          <div className="mt-4">
            <AreaChart
              data={trends}
              height={240}
              series={[
                { key: "orders", name: "Orders", color: "#1D4ED8" },
                { key: "revenue", name: "Revenue (PKR)", color: "#38BDF8", area: false },
              ]}
            />
          </div>
        </Card>
      ) : null}

      {/* 6. STORE LINK & BUSINESS SUMMARY */}
      <section className="rounded-3xl border border-blue-100/80 bg-white p-6 shadow-card transition duration-200 hover:shadow-lift">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-extrabold text-ink">{selectedTenant.name}</span>
              <span className="rounded-full border border-blue-100 bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand shadow-xs">
                {tenantPlan?.displayName || "Basic Free"}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isPublished ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                <span className="relative flex h-2 w-2">
                  {isPublished ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  )}
                </span>
                {isPublished ? "Website Live" : "Website Draft"}
              </span>
            </div>
            <p className="text-xs text-muted">
              {selectedTenant.slug ? `Store link: /businesses/${selectedTenant.slug}` : "No slug assigned yet"}
            </p>
          </div>

          {selectedTenant.slug ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={copyStoreLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-ink shadow-xs transition hover:bg-white hover:border-brand/30 active:scale-95"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiedLink ? "Link Copied!" : "Copy Store Link"}
              </button>

              <a
                href={`/businesses/${selectedTenant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-bright active:scale-95"
              >
                <ExternalLink size={14} />
                Visit Storefront
              </a>
            </div>
          ) : null}
        </div>
      </section>
    </motion.div>
  );
}
