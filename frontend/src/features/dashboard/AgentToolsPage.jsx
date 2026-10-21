import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Sparkles,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  ShoppingBag,
  MessageSquare,
  Globe,
  SlidersHorizontal,
  Bot,
  HelpCircle,
  FileText,
  Wrench,
  Check,
  Terminal,
} from "lucide-react";

import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { getUserFacingSourceTitles, humanizeInternalName, isDebugMode } from "../../utils/displaySafety.js";
import { getAgentTools, previewAgentRun } from "../../services/agentApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";
import { BusinessSetupRequired, OWNER_IMAGES } from "./ownerUi.jsx";

const samplePrompts = [
  "2 black shirts order kar do",
  "What sizes do you have in stock?",
  "Delivery timings and charges kya hain?",
  "Do you accept cash on delivery?",
];

function ToolEventCard({ event }) {
  const [showDetails, setShowDetails] = useState(false);
  const isSuccess = event.status === "success";

  return (
    <div className="rounded-xl border border-line bg-surface/50 p-3 text-xs">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-ink flex items-center gap-1.5">
            <Wrench className="h-3 w-3 text-brand" />
            <span>{humanizeInternalName(event.tool) || "Execution Step"}</span>
          </div>
          <div className="mt-0.5 text-muted">{event.summary}</div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isSuccess ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {isSuccess ? <Check className="h-2.5 w-2.5" /> : null}
          {event.status || "success"}
        </span>
      </div>

      {isDebugMode && event.output ? (
        <div className="mt-2 pt-2 border-t border-line/60">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[10px] font-semibold text-brand hover:underline flex items-center gap-1"
          >
            {showDetails ? "Hide payload" : "View raw output"}
            {showDetails ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </button>
          {showDetails && (
            <pre className="mt-2 max-h-36 overflow-auto rounded-lg bg-slate-900 p-2.5 text-[10px] text-sky-200 font-mono">
              {JSON.stringify(event.output, null, 2)}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AgentToolsPage() {
  const { selectedTenant, isLoadingTenants } = useTenant();
  const { enabledModules, isLoadingModules } = useModules();
  const [catalog, setCatalog] = useState(null);
  const [messageText, setMessageText] = useState("2 black shirts order kar do");
  const [channel, setChannel] = useState("owner_preview");
  const [preview, setPreview] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [showToolTrace, setShowToolTrace] = useState(false);

  const aiEnabled = enabledModules.includes("ai_chat");
  const previewSourceTitles = getUserFacingSourceTitles(preview?.ragSources || []);

  async function loadCatalog() {
    if (!selectedTenant || !aiEnabled) {
      setCatalog(null);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await getAgentTools(selectedTenant.id);
      setCatalog(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load agent tool catalog."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id, aiEnabled]);

  async function handlePreview(event) {
    if (event) event.preventDefault();
    if (!selectedTenant || !messageText.trim()) return;
    setIsPreviewing(true);
    setPreview(null);
    setError("");
    setNotice("");
    try {
      const data = await previewAgentRun(selectedTenant.id, { messageText, channel });
      setPreview(data);
      setNotice("Simulation completed. No actual message was sent to customers and no live order was placed.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to run agent preview."));
    } finally {
      setIsPreviewing(false);
    }
  }

  if (isLoadingTenants || isLoadingModules) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin text-brand" />
        Loading agent workspace...
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="AI Agent Tools & Integrations"
        description="Equip your AI assistant with real-time tools for inventory verification, shipping fee calculation, and order tracking."
        icon={Wrench}
        image={OWNER_IMAGES.tools}
        previewTitle="Autonomous Agent Superpowers"
        previewItems={[
          { title: "Live Stock Verification", desc: "Agent inspects live warehouse inventory before confirming customer orders." },
          { title: "Courier Fee Calculator", desc: "Calculates exact delivery charge based on customer city and package weight." },
          { title: "Order Status Lookup", desc: "Customers can ask 'Where is my order #104?' and receive live delivery tracking." },
        ]}
      />
    );
  }

  if (!aiEnabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Enable the AI Chat module before using the Agent Tool layer.
      </div>
    );
  }

  const allTools = catalog?.tools || [];
  const filteredTools = allTools.filter((t) => {
    const q = toolSearch.toLowerCase();
    return (
      (t.tool && t.tool.toLowerCase().includes(q)) ||
      (t.purpose && t.purpose.toLowerCase().includes(q)) ||
      (t.agent && t.agent.toLowerCase().includes(q))
    );
  });
  const visibleTools = showAllTools ? filteredTools : filteredTools.slice(0, 5);

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
        {/* Background Photograph - AI Tools, Connectors & Automations */}
        <img
          src={OWNER_IMAGES.tools}
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
                <Cpu className="h-3.5 w-3.5 text-sky-400" />
                Autonomous AI Tools
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" />
                Multi-Channel Ready
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl [text-shadow:0_2px_16px_rgba(0,0,0,0.6)]">
              AI Agent Tools &amp; Simulation Lab
            </h1>

            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-200 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
              Simulate and inspect the autonomous tools powering your store. Experience how the AI parses catalog items, understands customer intent, retrieves policies, and drafts orders across WhatsApp, Customer Portal, and Web.
            </p>

            {/* Quick Hero Stat Chips */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md shadow-inner">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-300">Active Tools</div>
                <div className="mt-1 text-2xl font-bold text-white">{allTools.length}</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md shadow-inner">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-300">Supported Channels</div>
                <div className="mt-1 text-2xl font-bold text-sky-200">4</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md shadow-inner">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-300">Execution Engine</div>
                <div className="mt-1 text-xl font-bold text-emerald-200 truncate">Autonomous</div>
              </div>
            </div>
          </div>

          {/* Quick Refresh */}
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col items-start lg:items-end">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => loadCatalog().catch(() => {})}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg hover:bg-slate-100 disabled:opacity-60 transition"
            >
              <RefreshCw className={`h-4 w-4 text-brand ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Syncing..." : "Reload Tool Catalog"}
            </button>
            <span className="text-xs text-slate-300">Unified agent architecture</span>
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

      {/* 2. MAIN SIMULATION LAB & TOOL CATALOG WORKSPACE */}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Left: Simulation Lab */}
        <div className="space-y-5">
          {/* Simulation Input Card */}
          <form onSubmit={handlePreview} className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <Play className="h-4 w-4 text-brand fill-brand" />
                  Real-Time Agent Simulation Lab
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Test how the AI assistant interprets customer inquiries without sending real messages or charging customers.
                </p>
              </div>
            </div>

            {/* Channel Selection */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Test Channel</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: "owner_preview", label: "Owner Preview", icon: Sparkles },
                  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
                  { value: "customer_portal", label: "Customer Portal", icon: ShoppingBag },
                  { value: "website", label: "Public Website", icon: Globe },
                ].map((ch) => {
                  const Icon = ch.icon;
                  const isSelected = channel === ch.value;
                  return (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => setChannel(ch.value)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-3 text-xs font-semibold transition ${
                        isSelected
                          ? "border-brand bg-brand-50 text-brand ring-1 ring-brand/30 shadow-xs"
                          : "border-line bg-surface/50 text-slate-700 hover:bg-surface"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt Quick Chips */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Sample Inquiries</span>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setMessageText(p)}
                    className="rounded-full border border-line bg-surface/40 px-3 py-1 text-xs text-slate-700 hover:border-brand hover:text-brand transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Message Input */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Customer Message</span>
              <textarea
                rows={3}
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="e.g. 2 black shirts order kar do, ya delivery timings kya hain?"
                className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand leading-relaxed"
              />
            </div>

            {/* Run Button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isPreviewing || !messageText.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 transition disabled:opacity-60"
              >
                {isPreviewing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Executing Agent Brain...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    Run Live Simulation
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Simulation Results View */}
          {preview ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Agent Generated Response */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-brand" />
                    <h3 className="text-sm font-bold text-ink">Simulated Agent Response</h3>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand">
                    Channel: {channel.replace("_", " ")}
                  </span>
                </div>

                <div className="rounded-xl border border-line bg-surface/40 p-4 text-sm leading-relaxed text-ink whitespace-pre-line font-normal">
                  {preview.reply || "No reply generated."}
                </div>

                {/* Intent & Language Badges */}
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <div className="rounded-lg bg-surface px-3 py-1.5 border border-line text-slate-700 font-medium">
                    <span className="text-muted mr-1">Detected Intent:</span>
                    <span className="font-semibold text-ink">{preview.meta?.intent || "General"}</span>
                  </div>
                  <div className="rounded-lg bg-surface px-3 py-1.5 border border-line text-slate-700 font-medium">
                    <span className="text-muted mr-1">Response Mode:</span>
                    <span className="font-semibold text-ink">{preview.meta?.responseSource || "Orchestrator"}</span>
                  </div>
                  {preview.meta?.languageMode && (
                    <div className="rounded-lg bg-surface px-3 py-1.5 border border-line text-slate-700 font-medium">
                      <span className="text-muted mr-1">Language:</span>
                      <span className="font-semibold text-ink">{preview.meta.languageMode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Draft Order Prepared Banner */}
              {preview.draftOrder?.items?.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-card space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <ShoppingBag className="h-4 w-4 text-amber-600" />
                    Draft Order Automatically Generated
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    The agent extracted product items and created a pending checkout structure from the customer&apos;s message.
                  </p>

                  <div className="space-y-1.5">
                    {preview.draftOrder.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl bg-white/90 p-2.5 text-xs font-medium text-slate-800 shadow-xs border border-amber-100"
                      >
                        <span>{item.name || item.title || `Item #${idx + 1}`}</span>
                        <span className="font-bold text-amber-900">Qty: {item.quantity || 1}</span>
                      </div>
                    ))}
                  </div>

                  {isDebugMode && (
                    <pre className="mt-2 max-h-36 overflow-auto rounded-lg bg-white p-3 text-[10px] text-amber-950 font-mono border border-amber-200">
                      {JSON.stringify(preview.draftOrder, null, 2)}
                    </pre>
                  )}
                </div>
              ) : null}

              {/* Matched Knowledge Documents */}
              {(previewSourceTitles.length > 0 || (isDebugMode && preview.ragSources?.length > 0)) && (
                <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-3">
                  <div className="flex items-center gap-2 text-ink font-bold text-sm">
                    <FileText className="h-4 w-4 text-brand" />
                    Knowledge Consulted
                  </div>
                  <div className="space-y-2">
                    {isDebugMode && preview.ragSources?.length
                      ? preview.ragSources.map((source, idx) => (
                          <div key={idx} className="rounded-xl border border-line bg-surface/50 p-3 text-xs">
                            <div className="font-semibold text-ink">{source.title || "Knowledge"}</div>
                            <div className="text-[10px] text-muted mt-0.5">
                              {source.sourceType} • confidence {source.confidence}
                            </div>
                            <p className="mt-1 text-muted leading-relaxed line-clamp-2">{source.excerpt}</p>
                          </div>
                        ))
                      : previewSourceTitles.map((title, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-xl border border-line bg-surface/40 p-2.5 text-xs font-semibold text-ink"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                            <span>{title}</span>
                          </div>
                        ))}
                  </div>
                </div>
              )}

              {/* Collapsible Execution Tool Trace */}
              {preview.toolCalls?.length ? (
                <div className="rounded-2xl border border-line bg-white shadow-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowToolTrace(!showToolTrace)}
                    className="flex w-full items-center justify-between p-4 text-left font-semibold text-ink hover:bg-surface/50 transition"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Terminal className="h-4 w-4 text-slate-600" />
                      <span>Execution Tool Trace ({preview.toolCalls.length} Steps)</span>
                    </div>
                    {showToolTrace ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                  </button>

                  {showToolTrace && (
                    <div className="border-t border-line p-4 space-y-2.5 bg-slate-50/50">
                      {preview.toolCalls.map((event, index) => (
                        <ToolEventCard key={`${event.tool}-${index}`} event={event} />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </div>

        {/* Right: AI Business Capabilities & Developer Tool Registry */}
        <div className="space-y-4">
          {/* Core Capabilities Card */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink">Integrated AI Capabilities</h3>
              <p className="text-xs text-muted mt-0.5">
                How BizXus AI powers customer interactions and sales for your store.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-line bg-surface/40 p-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-brand shrink-0">
                  <Search size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold text-ink">Catalog &amp; Inventory Search</div>
                  <div className="mt-0.5 text-xs text-muted leading-relaxed">
                    Instantly finds product details, variants, sizes, and real-time stock levels.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-line bg-surface/40 p-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-700 shrink-0">
                  <ShoppingBag size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold text-ink">Automated Checkout &amp; Order Drafting</div>
                  <div className="mt-0.5 text-xs text-muted leading-relaxed">
                    Interprets buying requests and prepares cart checkouts automatically.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-line bg-surface/40 p-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                  <Globe size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold text-ink">Urdu &amp; Multi-Language Processing</div>
                  <div className="mt-0.5 text-xs text-muted leading-relaxed">
                    Understands Roman Urdu, formal Urdu, and English customer dialects naturally.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-line bg-surface/40 p-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-700 shrink-0">
                  <FileText size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold text-ink">Store Policies &amp; Knowledge Base</div>
                  <div className="mt-0.5 text-xs text-muted leading-relaxed">
                    Retrieves exact delivery rules, return windows, and store FAQs.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Low-Level Developer Tool Registry */}
          <div className="rounded-2xl border border-line bg-white shadow-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAllTools(!showAllTools)}
              className="flex w-full items-center justify-between p-4 text-left font-semibold text-ink hover:bg-surface/50 transition"
            >
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted" />
                <span className="text-xs font-bold text-ink">
                  Developer Tool Registry ({allTools.length} Tools)
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted">
                <span>{showAllTools ? "Hide" : "Show"}</span>
                {showAllTools ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            <AnimatePresence>
              {showAllTools && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-line p-4 space-y-3"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted/60" />
                    <input
                      type="text"
                      value={toolSearch}
                      onChange={(e) => setToolSearch(e.target.value)}
                      placeholder="Filter tools..."
                      className="w-full rounded-xl border border-line bg-surface/50 pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted/60 focus:border-brand focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {filteredTools.map((tool) => (
                      <div
                        key={`${tool.agent}-${tool.tool}`}
                        className="rounded-xl border border-line bg-surface/30 p-2.5"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-semibold text-xs text-ink">{humanizeInternalName(tool.tool)}</span>
                          {tool.agent && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {tool.agent}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted leading-relaxed">{tool.purpose}</p>
                      </div>
                    ))}
                    {!filteredTools.length && (
                      <div className="p-3 text-center text-xs text-muted">No tools match filter.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
