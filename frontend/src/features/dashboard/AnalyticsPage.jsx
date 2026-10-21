import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Globe,
  Lightbulb,
  MessageSquare,
  Package,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import { Alert, Badge, Card, EmptyState, IconTile, SectionHeading, StatCard } from "../../components/ui/index.jsx";
import { AreaChart, ProgressRing, RankedBarList, SERIES_COLORS, formatCompact } from "../../components/ui/charts.jsx";
import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { getAnalyticsSummary } from "../../services/analyticsApi.js";
import { formatTransactionType } from "../../utils/transaction.js";
import { SectionTitle } from "../../components/ui/SectionTitle.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";
import { BusinessSetupRequired, OWNER_IMAGES } from "./ownerUi.jsx";

const STATUS_TONE = {
  paid: "green",
  completed: "green",
  confirmed: "green",
  pending: "orange",
  pending_verification: "orange",
  cancelled: "red",
  rejected: "red",
};

export function AnalyticsPage() {
  const { selectedTenant, isLoadingTenants } = useTenant();
  const { enabledModules } = useModules();
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'products' | 'transactions'
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const analyticsEnabled = enabledModules.includes("analytics");

  async function loadAnalytics() {
    if (!selectedTenant || !analyticsEnabled) {
      setAnalytics(null);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await getAnalyticsSummary(selectedTenant.id);
      setAnalytics(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load analytics."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id, analyticsEnabled]);

  if (isLoadingTenants) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin text-brand" />
        Loading analytics workspace...
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Analytics & Performance"
        description="Track real-time store revenue, average order value, conversion rates, and sales channel performance."
        icon={TrendingUp}
        image={OWNER_IMAGES.analytics}
        previewTitle="Business Intelligence & Analytics"
        previewItems={[
          { title: "Real-time Sales Tracking", desc: "Track daily, weekly, and monthly revenue performance with live interactive charts." },
          { title: "Channel Attribution", desc: "Compare sales performance across WhatsApp, online storefront, and cashier POS." },
          { title: "Top Performing Products", desc: "Identify your bestselling items and inventory turnover velocity." },
        ]}
      />
    );
  }

  if (!analyticsEnabled) {
    return (
      <EmptyState
        icon={BarChart3}
        title={`Enable analytics for ${selectedTenant.name}`}
        description="Live charts, revenue tracking, and conversion reporting unlock once the analytics module is enabled."
        actionLabel="Manage Modules"
        actionTo="/dashboard/modules"
      />
    );
  }

  const summary = analytics?.summary || {};
  const revenue = analytics?.revenue || {};
  const trends = analytics?.trends || [];
  const topItems = analytics?.topItems || [];
  const conversion = analytics?.conversion || {};
  const categoryGuidance = analytics?.categoryGuidance || {};
  const recentTransactions = analytics?.recentTransactions || [];
  const lowStockItems = analytics?.lowStockItems || [];

  const totalRequests =
    (summary.totalQuotes ?? 0) + (summary.totalBookings ?? 0) + (summary.totalInquiries ?? 0);

  const visibleTransactions = showAllTransactions ? recentTransactions : recentTransactions.slice(0, 5);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. CINEMATIC HERO BANNER */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph */}
        <img
          src={OWNER_IMAGES.analytics}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-center filter brightness-[0.70] contrast-[1.10] saturate-[1.15]"
          loading="eager"
        />

        {/* Directional cinematic vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/30"
        />
        {/* Horizon highlight */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent"
        />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-300 ring-1 ring-white/15 backdrop-blur-md">
                <BarChart3 className="h-3.5 w-3.5 text-sky-400" />
                Revenue &amp; Intelligence
              </span>
              {analytics?.generatedAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  Live Sync
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl [text-shadow:0_2px_16px_rgba(0,0,0,0.6)]">
              Business Analytics &amp; Growth
            </h1>

            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-200 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
              Track real-time gross revenue, customer order volume, product demand trends, and operational conversion across your online store and cashier channels.
            </p>

            {/* Quick Hero Stat Chips */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">Gross Revenue</div>
                <div className="mt-1 flex items-baseline gap-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  <span className="text-xs font-bold text-emerald-400">Rs</span>
                  <span className="text-white font-black">{formatCompact(revenue.grossRevenue)}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">Avg Order Value</div>
                <div className="mt-1 flex items-baseline gap-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  <span className="text-xs font-bold text-sky-400">Rs</span>
                  <span className="text-white font-black">{formatCompact(revenue.averageOrderValue)}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">Total Orders</div>
                <div className="mt-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{summary.totalOrders ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">Today Orders</div>
                <div className="mt-1 text-2xl font-black text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]">{summary.todayOrders ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Hero Actions */}
          <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col items-start lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={loadAnalytics}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-lg hover:bg-slate-100 disabled:opacity-60 transition active:scale-95"
              >
                <RefreshCw className={`h-4 w-4 text-brand ${isLoading ? "animate-spin" : ""}`} />
                <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
              </button>
              <Link
                to="/dashboard/reports"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white shadow-sm backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                <ClipboardCheck className="h-4 w-4 text-sky-300" />
                <span>Daily Briefing</span>
              </Link>
            </div>
            <span className="text-xs text-slate-300">
              {analytics?.generatedAt ? `Synced ${new Date(analytics.generatedAt).toLocaleTimeString()}` : "Live data"}
            </span>
          </div>
        </div>
      </motion.section>

      {error ? <Alert tone="red">{error}</Alert> : null}

      {/* 2. TABBED NAVIGATION: Overview & Trends, Products & Stock, Transactions & Insights */}
      <div className="flex items-center border-b border-line bg-white rounded-2xl px-3 pt-2 shadow-card gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition whitespace-nowrap ${
            activeTab === "overview"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Revenue &amp; Trends</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition whitespace-nowrap ${
            activeTab === "products"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Top Products &amp; Stock</span>
          {lowStockItems.length > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
              {lowStockItems.length} alert{lowStockItems.length > 1 ? "s" : ""}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition whitespace-nowrap ${
            activeTab === "transactions"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Recent Activity &amp; Guidance</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & REVENUE CHARTS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Secondary stats row */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Customers" value={summary.totalCustomers ?? 0} icon={Users} tone="blue" />
            <StatCard label="Catalog Items" value={summary.totalItems ?? 0} icon={Boxes} tone="violet" />
            <StatCard label="Total Transactions" value={summary.totalTransactions ?? 0} icon={Receipt} tone="purple" />
            <StatCard label="Customer Portal Orders" value={summary.marketplaceOrderCount ?? 0} hint="Self-service portal" icon={Store} tone="green" />
          </div>

          {/* Area charts */}
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <SectionHeading icon={ShoppingCart} title="Order Volume Trend" description="Total orders placed per day" />
              <AreaChart
                data={trends}
                series={[{ key: "orders", name: "Orders", color: SERIES_COLORS.purple }]}
                height={230}
              />
            </Card>

            <Card>
              <SectionHeading icon={Coins} title="Captured Revenue Trend" description="Gross revenue captured per day" />
              <AreaChart
                data={trends}
                series={[{ key: "revenue", name: "Revenue", color: SERIES_COLORS.blue }]}
                height={230}
              />
            </Card>
          </div>

          {/* Demand Mix & Conversion */}
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <SectionHeading
                icon={ClipboardList}
                title="Customer Demand Mix"
                description="Orders, quotes, bookings, and inquiries"
                actions={<Badge tone="violet">{totalRequests} total requests</Badge>}
              />
              <AreaChart
                data={trends}
                height={260}
                series={[
                  { key: "orders", name: "Orders", color: SERIES_COLORS.purple },
                  { key: "quotes", name: "Quotes", color: SERIES_COLORS.blue, area: false },
                  { key: "bookings", name: "Bookings", color: SERIES_COLORS.orange, area: false },
                  { key: "inquiries", name: "Inquiries", color: SERIES_COLORS.green, area: false },
                ]}
              />
            </Card>

            <Card>
              <SectionHeading icon={TrendingUp} title="Conversion Ratios" description="Operational efficiency metrics" />
              <div className="grid grid-cols-2 gap-4 pt-3">
                <ProgressRing value={conversion.marketplaceShare ?? 0} label="Marketplace" caption="Share of orders" color={SERIES_COLORS.purple} />
                <ProgressRing value={conversion.quoteApprovalRate ?? 0} label="Quotes" caption="Approval rate" color={SERIES_COLORS.blue} />
                <ProgressRing value={conversion.bookingConfirmationRate ?? 0} label="Bookings" caption="Confirmation rate" color={SERIES_COLORS.orange} />
                <ProgressRing value={conversion.inquiryResponseRate ?? 0} label="Inquiries" caption="Response rate" color={SERIES_COLORS.green} />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: TOP PRODUCTS & INVENTORY PRESSURE */}
      {activeTab === "products" && (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Top Selling Products */}
          <Card>
            <SectionHeading
              icon={Package}
              title="Top Products by Revenue"
              description="Ranked by gross sales volume"
              actions={<Badge tone="slate">{topItems.length} items ranked</Badge>}
            />
            {topItems.length ? (
              <div className="pt-2">
                <RankedBarList
                  items={topItems.map((item) => ({
                    id: `${item.itemId}-${item.name}`,
                    name: item.name,
                    value: item.revenue,
                    caption: `${item.quantity} sold · ${item.orders} orders`,
                  }))}
                />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">
                Not enough order activity recorded yet to rank items.
              </p>
            )}
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <SectionHeading
              icon={AlertTriangle}
              title="Inventory Pressure &amp; Low Stock"
              description="Items nearing or below their minimum reorder threshold"
              actions={<Badge tone={lowStockItems.length ? "orange" : "green"}>{lowStockItems.length} low stock</Badge>}
            />
            <div className="space-y-3 pt-2">
              {lowStockItems.map((item) => {
                const quantity = item.stock?.quantity ?? 0;
                const threshold = item.stock?.lowStockThreshold ?? 0;
                const pct = threshold > 0 ? Math.min(100, Math.round((quantity / threshold) * 100)) : 0;
                return (
                  <div key={item.id} className="rounded-xl border border-orange-200 bg-orange-50/70 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold text-ink">{item.name}</span>
                      <span className="shrink-0 text-xs font-extrabold text-orange-700">
                        {quantity} left (Threshold: {threshold})
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100">
                      <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${Math.max(6, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
              {!lowStockItems.length ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  All catalog items are currently stocked safely above their reorder thresholds.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: RECENT ACTIVITY & AI GUIDANCE */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          {/* AI Executive Summary Card */}
          {analytics?.dashboardSummary ? (
            <Card className="border-brand-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white">
              <div className="flex items-start gap-4">
                <IconTile icon={Sparkles} tone="purple" size={44} />
                <div className="min-w-0">
                  <SectionTitle>Executive AI Summary</SectionTitle>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink font-normal">{analytics.dashboardSummary}</p>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Category Guidance */}
          {categoryGuidance.categoryName || categoryGuidance.suggestions?.length ? (
            <Card>
              <SectionHeading
                icon={Lightbulb}
                title="Category Strategic Guidance"
                description="Actionable operational advice tailored to your market niche"
                actions={<Badge tone="violet">{categoryGuidance.categoryName || "General Retail"}</Badge>}
              />
              <div className="grid gap-6 pt-2 xl:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Focus Recommendations</div>
                  <ul className="mt-3 space-y-2">
                    {(categoryGuidance.suggestions || []).map((item) => (
                      <li key={item} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface/50 px-3.5 py-2.5 text-xs text-ink leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {!categoryGuidance.suggestions?.length ? (
                      <li className="text-xs text-muted">No custom suggestions available yet.</li>
                    ) : null}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Operational Health Checks</div>
                  <ul className="mt-3 space-y-2">
                    {(categoryGuidance.insights || []).map((item) => {
                      const isAlert = item.status === "attention";
                      return (
                        <li
                          key={item.label}
                          className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
                            isAlert
                              ? "border-orange-200 bg-orange-50 text-orange-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {isAlert ? <AlertTriangle size={15} className="shrink-0 text-orange-600" /> : <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />}
                          <span>{item.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Recent Transactions List with Progressive Disclosure */}
          <Card>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <SectionHeading
                icon={Receipt}
                title="Recent Transactions"
                description="Latest checkout orders across your storefront, POS, and WhatsApp"
                actions={<Badge tone="slate">{recentTransactions.length} total logged</Badge>}
              />
            </div>

            <div className="divide-y divide-line-soft pt-1">
              {visibleTransactions.map((order) => (
                <div key={order.id} className="flex items-center gap-4 py-3">
                  <IconTile icon={ShoppingCart} tone="violet" size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-ink">{order.transactionNumber}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-muted">
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className="capitalize">{formatTransactionType(order.transactionType)}</span>
                      <span>·</span>
                      <span className="capitalize">{order.source}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-extrabold text-ink">{formatCompact(order.pricing?.total ?? 0)}</div>
                    <Badge tone={STATUS_TONE[order.status] || "slate"} className="mt-1 capitalize">
                      {String(order.status || "").replaceAll("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}

              {!recentTransactions.length ? (
                <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-center text-xs text-muted">
                  No customer transactions recorded yet.
                </p>
              ) : null}
            </div>

            {/* Progressive disclosure */}
            {recentTransactions.length > 5 && (
              <div className="pt-3 text-center border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAllTransactions(!showAllTransactions)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                >
                  {showAllTransactions ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Show Less (Latest 5)
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Show All {recentTransactions.length} Transactions
                    </>
                  )}
                </button>
              </div>
            )}
          </Card>
        </div>
      )}
    </motion.section>
  );
}
