import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Coins,
  History,
  MessageCircle,
  Package,
  Phone,
  Receipt,
  RefreshCw,
  Send,
  Settings2,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Clock,
  ExternalLink,
} from "lucide-react";

import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import {
  deliverDailySummaryReport,
  generateDailySummaryReport,
  getDailySummaryReport,
  getReportDeliveryLogs,
  getReportDeliverySettings,
  updateReportDeliverySettings,
} from "../../services/reportApi.js";
import { SectionTitle } from "../../components/ui/SectionTitle.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";
import { formatTransactionType } from "../../utils/transaction.js";
import { BusinessSetupRequired, OWNER_IMAGES } from "./ownerUi.jsx";

const SOURCE_LABELS = {
  cashier: "Counter POS",
  customer_portal: "Customer Portal",
  website: "Public Website",
  imported: "Imported Order",
  whatsapp: "WhatsApp Chat",
};

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

const defaultDeliveryForm = {
  enabled: true,
  whatsappEnabled: true,
  smsEnabled: false,
  deliveryTime: "21:00",
  timezone: "Asia/Karachi",
  whatsappRecipient: "",
  smsRecipient: "",
  languageMode: "auto",
  includeLowStock: true,
  includeTopItems: true,
  includeRecentOrders: true,
};

export function ReportsPage() {
  const { selectedTenant, isLoadingTenants } = useTenant();
  const { enabledModules } = useModules();
  const [summaryDate, setSummaryDate] = useState(todayDateValue());
  const [report, setReport] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState(defaultDeliveryForm);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [lastDelivery, setLastDelivery] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);

  // Progressive disclosure toggles
  const [showDeliveryConfig, setShowDeliveryConfig] = useState(false);
  const [showAllTopItems, setShowAllTopItems] = useState(false);
  const [showAllRecentTransactions, setShowAllRecentTransactions] = useState(false);

  const reportsEnabled = enabledModules.includes("reports");

  useEffect(() => {
    if (!selectedTenant?.id || !reportsEnabled) {
      setReport(null);
      return;
    }
    loadReport(summaryDate);
    loadDeliveryWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id, reportsEnabled, summaryDate]);

  async function loadReport(dateValue) {
    if (!selectedTenant?.id) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await getDailySummaryReport(selectedTenant.id, { date: dateValue });
      setReport(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load the daily summary."));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDeliveryWorkspace() {
    if (!selectedTenant?.id) return;
    try {
      const [settingsData, logsData] = await Promise.all([
        getReportDeliverySettings(selectedTenant.id),
        getReportDeliveryLogs(selectedTenant.id, { limit: 10 }),
      ]);
      setDeliveryForm({ ...defaultDeliveryForm, ...(settingsData.settings || {}) });
      setDeliveryLogs(logsData.items || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load daily report delivery settings."));
    }
  }

  async function handleGenerate() {
    if (!selectedTenant?.id) return;
    setIsGenerating(true);
    setError("");
    setMessage("");
    try {
      const data = await generateDailySummaryReport(selectedTenant.id, { date: summaryDate });
      setReport(data);
      setMessage(`Daily executive summary generated for ${summaryDate}.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to generate the daily summary."));
    } finally {
      setIsGenerating(false);
    }
  }

  function updateDeliveryField(field, value) {
    setDeliveryForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveDelivery(event) {
    event.preventDefault();
    if (!selectedTenant?.id) return;
    setIsSavingDelivery(true);
    setError("");
    setMessage("");
    try {
      const data = await updateReportDeliverySettings(selectedTenant.id, deliveryForm);
      setDeliveryForm({ ...defaultDeliveryForm, ...(data.settings || {}) });
      setMessage("Automated report delivery settings saved successfully.");
      await loadDeliveryWorkspace();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save delivery settings."));
    } finally {
      setIsSavingDelivery(false);
    }
  }

  async function handleDeliverNow(dryRun = false) {
    if (!selectedTenant?.id) return;
    setIsDelivering(true);
    setError("");
    setMessage("");
    setLastDelivery(null);
    try {
      const channels = [];
      if (deliveryForm.whatsappEnabled) channels.push("whatsapp");
      if (deliveryForm.smsEnabled) channels.push("sms");
      const data = await deliverDailySummaryReport(selectedTenant.id, { summaryDate, channels, dryRun });
      setLastDelivery(data);
      setReport(data.summary || report);
      setMessage(dryRun ? "Test report simulated and logged." : `Report dispatched: ${data.deliveryStatus}.`);
      await loadDeliveryWorkspace();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to deliver the daily summary."));
    } finally {
      setIsDelivering(false);
    }
  }

  if (isLoadingTenants) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin text-brand" />
        Loading reports workspace...
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Reports & Audits"
        description="Generate daily executive briefings, payment reconciliation summaries, and accountant-ready sales reports."
        icon={Receipt}
        image={OWNER_IMAGES.reports}
        previewTitle="Executive Reports & Daily Briefings"
        previewItems={[
          { title: "Daily Sales & Revenue Summary", desc: "Automated breakdown of cash in till, digital wallet transactions, and total orders." },
          { title: "Automated WhatsApp Delivery", desc: "Receive scheduled end-of-day executive performance summaries straight to your phone." },
          { title: "Accountant-Ready Exports", desc: "Export clean CSV and spreadsheet summaries for bookkeeping and tax reconciliation." },
        ]}
      />
    );
  }

  if (!reportsEnabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Enable the Reports module in Add-on Features to unlock daily executive summaries and automated WhatsApp briefings.
      </div>
    );
  }

  const metrics = report?.metrics || {};
  const topItems = report?.topItems || [];
  const recentTransactions = report?.recentTransactions || [];
  const lowStockItems = report?.lowStockItems || [];

  const visibleTopItems = showAllTopItems ? topItems : topItems.slice(0, 4);
  const visibleTransactions = showAllRecentTransactions ? recentTransactions : recentTransactions.slice(0, 4);

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
          src={OWNER_IMAGES.reports}
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
                <ClipboardCheck className="h-3.5 w-3.5 text-sky-400" />
                Executive Daily Briefing
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-sky-200 ring-1 ring-blue-400/30">
                <Calendar className="h-3 w-3" />
                {summaryDate}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl [text-shadow:0_2px_16px_rgba(0,0,0,0.6)]">
              Daily Business Summaries
            </h1>

            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-200 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
              Review daily business revenue, order volume, and inventory alerts. Schedule an automated evening briefing directly to your WhatsApp or phone.
            </p>

            {/* Quick Hero Stat Chips */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">Gross Sales</div>
                <div className="mt-1 flex items-baseline gap-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  <span className="text-xs font-bold text-emerald-400">Rs</span>
                  <span className="text-white font-black">{metrics.grossRevenue ? Number(metrics.grossRevenue).toLocaleString() : 0}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">New Orders</div>
                <div className="mt-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  {metrics.newOrders || 0}
                </div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">Avg Order Value</div>
                <div className="mt-1 flex items-baseline gap-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  <span className="text-xs font-bold text-sky-400">Rs</span>
                  <span className="text-white font-black">{Math.round(metrics.averageOrderValue || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate" title="Low Stock Alerts">Low Stock Alerts</div>
                <div className="mt-1 text-2xl font-black text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]">
                  {metrics.lowStockAlerts || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Hero Actions: Date selection & Controls */}
          <div className="flex flex-col gap-2.5 rounded-2xl border border-white/20 bg-slate-900/70 p-3.5 backdrop-blur-md shadow-2xl lg:min-w-[320px]">
            <div className="flex items-center text-black gap-2">
              <input
                type="date"
                value={summaryDate}
                onChange={(e) => setSummaryDate(e.target.value)}
                className="h-10 flex-1 rounded-xl border border-white/25 bg-slate-950/80 px-3 py-2 text-xs font-bold text-black shadow-inner backdrop-blur focus:outline-none focus:ring-2 focus:ring-sky-400 [color-scheme:dark]"
              />
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 px-4 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 transition active:scale-95 shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-white ${isGenerating ? "animate-spin" : ""}`} />
                <span>{isGenerating ? "Compiling..." : "Generate"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowDeliveryConfig((v) => !v)}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold backdrop-blur transition active:scale-95 ${
                  showDeliveryConfig
                    ? "border-sky-400 bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/40"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                <span className="truncate">{showDeliveryConfig ? "Close Delivery" : "Evening Delivery"}</span>
              </button>
              <Link
                to="/dashboard/analytics"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                <TrendingUp className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                <span className="truncate">Visual Analytics</span>
           </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Feedback Messages */}
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </motion.div>
      ) : null}

      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm"
        >
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      ) : null}

      {/* 2. AUTOMATED EVENING DELIVERY CONFIGURATION (Collapsible Drawer) */}
      <AnimatePresence>
        {showDeliveryConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-2xl border border-line bg-white shadow-card p-5 sm:p-6 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand" />
                  Automatic Evening Report Delivery
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Receive a daily executive summary directly on WhatsApp or SMS every evening at your chosen time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDelivering}
                  onClick={() => handleDeliverNow(true)}
                  className="rounded-xl border border-line bg-surface/50 px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface transition disabled:opacity-60"
                  title="Test delivery without sending real message"
                >
                  Simulate Send
                </button>
                <button
                  type="button"
                  disabled={isDelivering}
                  onClick={() => handleDeliverNow(false)}
                  className="rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-600 shadow-sm transition disabled:opacity-60"
                >
                  {isDelivering ? "Sending..." : "Send Now"}
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveDelivery} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Delivery Time</span>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs font-medium text-ink focus:border-brand focus:bg-white focus:outline-none"
                    value={deliveryForm.deliveryTime || "21:00"}
                    onChange={(e) => updateDeliveryField("deliveryTime", e.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Language Mode</span>
                  <select
                    className="w-full rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs font-medium text-ink focus:border-brand focus:bg-white focus:outline-none"
                    value={deliveryForm.languageMode || "auto"}
                    onChange={(e) => updateDeliveryField("languageMode", e.target.value)}
                  >
                    <option value="auto">Auto (Smart Bilingual)</option>
                    <option value="english">English</option>
                    <option value="roman_urdu">Roman Urdu</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">WhatsApp Mobile Number</span>
                  <input
                    type="text"
                    placeholder="+923001234567"
                    className="w-full rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs font-medium text-ink focus:border-brand focus:bg-white focus:outline-none"
                    value={deliveryForm.whatsappRecipient || ""}
                    onChange={(e) => updateDeliveryField("whatsappRecipient", e.target.value)}
                  />
                </label>
              </div>

              {/* Delivery channel checkboxes */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-brand"
                    checked={deliveryForm.enabled !== false}
                    onChange={(e) => updateDeliveryField("enabled", e.target.checked)}
                  />
                  <span>Scheduled Delivery Active</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-brand"
                    checked={deliveryForm.whatsappEnabled !== false}
                    onChange={(e) => updateDeliveryField("whatsappEnabled", e.target.checked)}
                  />
                  <span>Send via WhatsApp</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-brand"
                    checked={Boolean(deliveryForm.smsEnabled)}
                    onChange={(e) => updateDeliveryField("smsEnabled", e.target.checked)}
                  />
                  <span>Send via SMS</span>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingDelivery}
                  className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-60"
                >
                  {isSavingDelivery ? "Saving Settings..." : "Save Delivery Schedule"}
                </button>
              </div>
            </form>

            {/* Delivery Logs Preview */}
            {deliveryLogs.length > 0 && (
              <div className="pt-3 border-t border-line/60">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Recent Dispatches</div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {deliveryLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded-lg bg-surface/60 p-2 text-xs">
                      <span className="font-semibold text-ink">{log.summaryDate} • {log.channel}</span>
                      <span className={log.deliveryStatus === "delivered" ? "text-emerald-700 font-bold" : "text-muted"}>
                        {log.deliveryStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. REPORT CONTENT & BREAKDOWN */}
      {report ? (
        <div className="space-y-6">
          {/* Executive Narrative Card */}
          <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-card space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
              <Sparkles className="h-4 w-4" />
              <span>Daily Performance Briefing ({report.summaryDate})</span>
            </div>
            <h2 className="text-xl font-bold text-ink">{report.headline || "Daily Operations Recorded"}</h2>
            <p className="text-sm leading-relaxed text-muted font-normal">
              {report.analyticsSummary || "No operational anomalies detected for this trading day."}
            </p>
          </div>

          {/* Two-Column Detail Grid */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Top Items */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  Top Selling Products
                </h3>
                <span className="text-xs text-muted font-medium">{topItems.length} products</span>
              </div>

              <div className="space-y-2">
                {visibleTopItems.length ? (
                  visibleTopItems.map((item, idx) => (
                    <div
                      key={item.itemId || item.name || idx}
                      className="flex items-center justify-between rounded-xl border border-line bg-surface/40 p-2.5 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-ink">{item.name}</div>
                        <div className="text-[11px] text-muted">
                          {item.orders} orders • {item.quantity} units sold
                        </div>
                      </div>
                      <span className="font-bold text-emerald-700">Rs {item.revenue}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted">No items recorded for this date.</div>
                )}

                {topItems.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTopItems(!showAllTopItems)}
                    className="w-full text-center text-xs font-bold text-brand hover:underline pt-1"
                  >
                    {showAllTopItems ? "Show Top 4" : `Show All ${topItems.length} Top Products`}
                  </button>
                )}
              </div>
            </div>

            {/* Low Stock Items */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Low Stock Warnings
                </h3>
                <span className="text-xs text-muted font-medium">{lowStockItems.length} items</span>
              </div>

              <div className="space-y-2">
                {lowStockItems.length ? (
                  lowStockItems.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/40 p-2.5 text-xs"
                    >
                      <span className="font-semibold text-ink truncate mr-2">{item.name}</span>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 shrink-0">
                        {item.stock?.quantity ?? 0} left (Threshold: {item.stock?.lowStockThreshold ?? 0})
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted">No low stock items detected today.</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Orders Table with Progressive Disclosure */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Receipt className="h-4 w-4 text-brand" />
                Transactions Log
              </h3>
              <span className="text-xs text-muted font-medium">{recentTransactions.length} orders logged</span>
            </div>

            <div className="space-y-2">
              {visibleTransactions.length ? (
                visibleTransactions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-surface/30 p-2.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-ink">{item.transactionNumber}</div>
                      <div className="text-[11px] text-muted">
                        {formatTransactionType(item.transactionType)} • {SOURCE_LABELS[item.source] || item.source}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                      {String(item.status || "completed").replaceAll("_", " ")}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-muted">No transactions recorded for this date.</div>
              )}

              {recentTransactions.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllRecentTransactions(!showAllRecentTransactions)}
                  className="w-full text-center text-xs font-bold text-brand hover:underline pt-1"
                >
                  {showAllRecentTransactions ? "Show Less (Latest 4)" : `Show All ${recentTransactions.length} Transactions`}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}
