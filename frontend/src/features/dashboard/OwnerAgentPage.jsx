import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Sparkles,
  Send,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Package,
  ShoppingBag,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  User,
  SlidersHorizontal,
} from "lucide-react";

import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { isDebugMode } from "../../utils/displaySafety.js";
import { getOwnerAgentHistory, getOwnerAgentInsights, sendOwnerAgentMessage } from "../../services/ownerAgentApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";
import { BusinessSetupRequired, OWNER_IMAGES } from "./ownerUi.jsx";

const quickPrompts = [
  "Summarize today's business performance",
  "Which items are low stock?",
  "Show pending orders",
  "Which items are selling best?",
  "Give me promotion ideas",
  "What is my payment status?",
  "Summarize customer chats",
];

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function OwnerAgentPage() {
  const { selectedTenant, isLoadingTenants } = useTenant();
  const { enabledModules, isLoadingModules } = useModules();
  const [insights, setInsights] = useState(null);
  const [history, setHistory] = useState([]);
  const [messageText, setMessageText] = useState("Summarize today's business performance");
  const [lastContext, setLastContext] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAllLowStock, setShowAllLowStock] = useState(false);
  const [showAllTopItems, setShowAllTopItems] = useState(false);

  const ownerAgentEnabled = enabledModules.includes("owner_agent");
  const analyticsEnabled = enabledModules.includes("analytics");
  const reportsEnabled = enabledModules.includes("reports");

  async function loadWorkspace() {
    if (!selectedTenant?.id || !ownerAgentEnabled) {
      setInsights(null);
      setHistory([]);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const [insightData, historyData] = await Promise.all([
        getOwnerAgentInsights(selectedTenant.id),
        getOwnerAgentHistory(selectedTenant.id, { limit: 40 }),
      ]);
      setInsights(insightData);
      setHistory(historyData.items || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load owner assistant workspace."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspace().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id, ownerAgentEnabled]);

  async function handleSubmit(event) {
    if (event) event.preventDefault();
    if (!selectedTenant?.id || !messageText.trim() || isSending) return;
    const outgoing = messageText.trim();
    setIsSending(true);
    setError("");
    setNotice("");
    setHistory((current) => [
      ...current,
      { id: `local-${Date.now()}`, sender: "owner", messageText: outgoing, createdAt: new Date().toISOString() },
    ]);
    setMessageText("");
    try {
      const data = await sendOwnerAgentMessage(selectedTenant.id, { messageText: outgoing, includeHistory: true });
      setHistory(data.history || []);
      setLastContext(data);
      setNotice(`Assistant queried real-time ${data.intent?.replaceAll("_", " ") || "business"} data.`);
      const insightData = await getOwnerAgentInsights(selectedTenant.id);
      setInsights(insightData);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to get an owner assistant reply."));
    } finally {
      setIsSending(false);
    }
  }

  const visibleHistory = useMemo(() => history.slice(-20), [history]);

  if (isLoadingTenants || isLoadingModules) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin text-brand" />
        Loading AI business co-pilot...
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="AI Business Co-Pilot"
        description="Ask questions about your business, generate marketing copy, and get actionable operational advice from your personal AI co-pilot."
        icon={Bot}
        image={OWNER_IMAGES.bot}
        previewTitle="Your Personal AI Executive Assistant"
        previewItems={[
          { title: "Business Health Queries", desc: "Ask 'How were sales yesterday?' or 'Which product is running low on stock?'." },
          { title: "Marketing & Promo Campaigns", desc: "Draft promotional SMS and WhatsApp broadcast campaigns in seconds." },
          { title: "Strategic Recommendations", desc: "Get data-backed recommendations on pricing, bundles, and slow-moving items." },
        ]}
      />
    );
  }

  if (!ownerAgentEnabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Enable the Owner AI Assistant module first in your business settings.
      </div>
    );
  }

  if (!analyticsEnabled || !reportsEnabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Enable Analytics and Reports modules so the co-pilot has access to your sales, order, and stock metrics.
      </div>
    );
  }

  const topItems = insights?.topItems || [];
  const lowStockItems = insights?.lowStockItems || [];
  const visibleTopItems = showAllTopItems ? topItems : topItems.slice(0, 4);
  const visibleLowStock = showAllLowStock ? lowStockItems : lowStockItems.slice(0, 4);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. CINEMATIC OWNER AGENT HERO */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph */}
        <img
          src={OWNER_IMAGES.bot}
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
                <Bot className="h-3.5 w-3.5 text-sky-400" />
                AI Business Co-Pilot
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" />
                Active Co-Pilot
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl [text-shadow:0_2px_16px_rgba(0,0,0,0.6)]">
              Executive Business Assistant
            </h1>

            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-200 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
              Ask business questions in natural language. Your co-pilot inspects live sales figures, pending deliveries, inventory shortages, and customer feedback to give you instant operational clarity.
            </p>

            {/* Live Insight Stat Cards */}
            {insights?.cards?.length ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {insights.cards.map((card) => (
                  <div key={card.label} className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">{card.label}</div>
                    <div className="mt-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] truncate">{card.value}</div>
                    {card.hint && <div className="mt-0.5 text-[10px] font-medium text-sky-300 truncate">{card.hint}</div>}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Refresh Action */}
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col items-start lg:items-end">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => loadWorkspace().catch(() => {})}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg hover:bg-slate-100 disabled:opacity-60 transition"
            >
              <RefreshCw className={`h-4 w-4 text-brand ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Syncing..." : "Refresh Insights"}
            </button>
            <span className="text-xs text-slate-300">Live operational sync</span>
          </div>
        </div>
      </motion.section>

      {/* Notices */}
      {notice ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{notice}</span>
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

      {/* 2. MAIN CO-PILOT WORKSPACE (Chat on Left, Live Context & Actions on Right) */}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Left: Interactive Co-Pilot Conversation */}
        <div className="flex flex-col rounded-2xl border border-line bg-white shadow-card overflow-hidden h-[680px]">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Business Assistant Dialogue</h3>
                <p className="text-[11px] text-muted">Direct advisory link • Private to store management</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadWorkspace().catch(() => {})}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-surface transition"
            >
              <RefreshCw className="h-3 w-3 text-muted" />
              Sync
            </button>
          </div>

          {/* Transcript Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/30">
            {visibleHistory.length ? (
              visibleHistory.map((message) => {
                const isOwner = message.sender === "owner";
                return (
                  <motion.div
                    key={message.id || message._id || `${message.createdAt}-${message.sender}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-2.5 ${isOwner ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                        isOwner ? "bg-brand text-white" : "bg-slate-900 text-sky-300"
                      }`}
                    >
                      {isOwner ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        isOwner
                          ? "bg-brand text-white rounded-tr-none"
                          : "bg-white text-ink border border-line rounded-tl-none font-normal"
                      }`}
                    >
                      <div className="whitespace-pre-line text-sm">{message.messageText}</div>
                      <div
                        className={`mt-1.5 text-[10px] ${
                          isOwner ? "text-white/70 text-right" : "text-muted"
                        }`}
                      >
                        {formatDate(message.createdAt)}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted">
                <Bot className="h-10 w-10 text-brand/40 mb-2" />
                <p className="text-sm font-semibold text-ink">Ask your business co-pilot anything</p>
                <p className="text-xs text-muted max-w-sm mt-1">
                  Choose a prompt below or type a custom question about today&apos;s sales, low stock items, or customer trends.
                </p>
              </div>
            )}
          </div>

          {/* Quick Prompts Tray */}
          <div className="border-t border-line bg-surface/40 px-4 py-2.5 overflow-x-auto scrollbar-none flex items-center gap-1.5 flex-nowrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex-shrink-0 mr-1">
              Suggestions:
            </span>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setMessageText(prompt);
                }}
                className="flex-shrink-0 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand hover:text-brand transition shadow-xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="border-t border-line bg-white p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Ask about sales, stock, pending orders..."
                className="flex-1 rounded-xl border border-line bg-surface/50 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <button
                type="submit"
                disabled={isSending || !messageText.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 transition disabled:opacity-60 flex-shrink-0"
              >
                {isSending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Ask</span>
                  </>
                )}
              </button>
            </div>

            {/* Debug trace footer if in debug mode */}
            {isDebugMode && lastContext?.toolCalls?.length ? (
              <div className="mt-2 text-[10px] text-muted flex items-center gap-1">
                <SlidersHorizontal className="h-3 w-3 text-muted/60" />
                <span>Tools queried: {lastContext.toolCalls.map((t) => t.tool).join(", ")}</span>
              </div>
            ) : null}
          </form>
        </div>

        {/* Right: Operational Insights & Actions */}
        <div className="space-y-5">
          {/* Recommended Actions */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-ink">Recommended Actions</h3>
            </div>
            <div className="space-y-2">
              {(insights?.actions || []).length ? (
                insights.actions.map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-900 leading-relaxed font-medium"
                  >
                    <ArrowRight className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-line bg-surface/50 p-4 text-center text-xs text-muted">
                  No urgent business actions needed right now. Everything is running smoothly!
                </div>
              )}
            </div>
          </div>

          {/* Unified Store Pulse & Inventory Context Card */}
          <div className="rounded-2xl border border-line bg-white shadow-card overflow-hidden">
            {/* Tab Header */}
            <div className="flex items-center border-b border-line bg-slate-50/60 px-4 pt-2.5 gap-2">
              <button
                type="button"
                onClick={() => setShowAllLowStock(false)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                  !showAllTopItems
                    ? "border-rose-500 text-rose-700 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                <span>Low Stock ({lowStockItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAllTopItems(true)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                  showAllTopItems
                    ? "border-emerald-500 text-emerald-700 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span>Top Selling ({topItems.length})</span>
              </button>
            </div>

            {/* Tab Body: Low Stock */}
            {!showAllTopItems ? (
              <div className="p-4 space-y-2.5">
                {visibleLowStock.length ? (
                  visibleLowStock.map((item, idx) => (
                    <div
                      key={item.id || item.itemId || idx}
                      className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/40 p-2.5 text-xs"
                    >
                      <span className="font-semibold text-ink truncate mr-2">{item.name}</span>
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 flex-shrink-0">
                        {item.stock?.quantity ?? 0} left
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-line bg-surface/50 p-4 text-center text-xs text-muted">
                    All inventory levels are healthy!
                  </div>
                )}

                {lowStockItems.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllLowStock(!showAllLowStock)}
                    className="w-full text-center text-[11px] font-bold text-brand hover:underline pt-1"
                  >
                    {showAllLowStock ? "Show Less (Top 4)" : `Show All ${lowStockItems.length} Low Stock Items`}
                  </button>
                )}
              </div>
            ) : (
              /* Tab Body: Top Selling */
              <div className="p-4 space-y-2.5">
                {visibleTopItems.length ? (
                  visibleTopItems.map((item, idx) => (
                    <div
                      key={item.id || item.itemId || idx}
                      className="flex items-center justify-between rounded-xl border border-line bg-surface/40 p-2.5 text-xs"
                    >
                      <span className="font-semibold text-ink truncate mr-2">{item.name}</span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 flex-shrink-0">
                        {item.quantity ?? 0} sold
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-line bg-surface/50 p-4 text-center text-xs text-muted">
                    No sales recorded yet today.
                  </div>
                )}

                {topItems.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTopItems(!showAllTopItems)}
                    className="w-full text-center text-[11px] font-bold text-brand hover:underline pt-1"
                  >
                    {showAllTopItems ? "Show Less (Top 4)" : `Show All ${topItems.length} Top Items`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
