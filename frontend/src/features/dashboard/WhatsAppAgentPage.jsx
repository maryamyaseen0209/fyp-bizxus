import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Power,
  QrCode,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { isDebugMode } from "../../utils/displaySafety.js";
import { BusinessSetupRequired, OWNER_IMAGES } from "./ownerUi.jsx";
import {
  disconnectWhatsApp,
  getWhatsAppConversations,
  getWhatsAppSettings,
  refreshWhatsAppBridgeToken,
  saveWhatsAppSettings,
  sendWhatsAppTest,
  simulateWhatsAppInbound,
} from "../../services/whatsappApi.js";
import { SectionTitle } from "../../components/ui/SectionTitle.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

const defaultForm = {
  provider: "baileys",
  businessWhatsAppNumber: "",
  displayName: "",
  agentEnabled: true,
  autoReplyEnabled: true,
  handoffEnabled: true,
  handoffKeywords: "human, agent, admin, owner, representative, call me, insan, baat karni",
  welcomeMessage: "Assalam o Alaikum! Main BizXus AI assistant hoon. Aap products, prices, timing ya order ke bare mein pooch sakte hain.",
  fallbackReply: "Sorry, main is waqt WhatsApp reply complete nahi kar pa raha. Business owner ko notify kar diya gaya hai.",
  businessHoursMode: "always_on",
};

function toKeywordList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return "Not yet";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Not yet";
  }
}

export function WhatsAppAgentPage() {
  const { selectedTenant, isLoadingTenants } = useTenant();
  const { enabledModules, isLoadingModules } = useModules();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [mockForm, setMockForm] = useState({ customerPhone: "+923001234567", customerName: "Demo Customer", messageText: "2 burgers order kar do" });
  const [testForm, setTestForm] = useState({ toPhone: "+923001234567", messageText: "BizXus WhatsApp agent test message." });
  const [conversations, setConversations] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [showAdvancedBridge, setShowAdvancedBridge] = useState(false);
  const [showTestMessageForm, setShowTestMessageForm] = useState(false);
  const [showAllConversations, setShowAllConversations] = useState(false);
  const [showCustomMessages, setShowCustomMessages] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const aiEnabled = enabledModules.includes("ai_chat");
  const whatsappEnabled = enabledModules.includes("whatsapp_agent");
  const connected = Boolean(settings?.provider === "baileys" ? settings?.bridgeOnline : settings?.isConnected);
  const connectionStatus = settings?.connectionStatus || settings?.status || "not_configured";
  const webhookUrl = useMemo(() => {
    const base = import.meta.env.VITE_API_BASE_URL || "/api/v1";
    return `${base.replace(/\/$/, "")}/webhooks/whatsapp`;
  }, []);
  const apiBaseUrl = useMemo(() => {
    return new URL(import.meta.env.VITE_API_BASE_URL || "/api/v1", window.location.origin).href.replace(/\/$/, "");
  }, []);
  const bridgeStatusUrl = `${apiBaseUrl}/whatsapp/bridge/status`;
  const bridgeInboundUrl = `${apiBaseUrl}/whatsapp/bridge/inbound`;
  // The pairing page is per business, so the owner opens their own QR and never sees
  // another tenant on the same bridge. The API supplies it; the fallback keeps the
  // button working against an older backend.
  const bridgeQrUrl =
    settings?.bridgePairingUrl ||
    (selectedTenant ? `http://localhost:3005/pair/${encodeURIComponent(selectedTenant.id)}` : "http://localhost:3005");
  // Shown on screen with the token masked; `bridgeEnv` (with the real token) is only
  // ever written to the clipboard by the Copy env button.
  const bridgeEnvRedacted = selectedTenant
    ? [
        `BIZXUS_API_BASE_URL=${apiBaseUrl}`,
        `BIZXUS_TENANT_ID=${selectedTenant.id}`,
        "BIZXUS_WHATSAPP_BRIDGE_TOKEN=********  (use Copy env)",
        `WHATSAPP_AUTH_PATH=.baileys_auth/${selectedTenant.id}`,
        "PORT=3005",
      ].join("\n")
    : "";
  const bridgeEnv = selectedTenant
    ? [
        `BIZXUS_API_BASE_URL=${apiBaseUrl}`,
        `BIZXUS_TENANT_ID=${selectedTenant.id}`,
        `BIZXUS_WHATSAPP_BRIDGE_TOKEN=${settings?.bridgeToken || "SAVE_SETTINGS_FIRST"}`,
        `WHATSAPP_AUTH_PATH=.baileys_auth/${selectedTenant.id}`,
        "PORT=3005",
      ].join("\n")
    : "";

  async function loadWorkspace() {
    if (!selectedTenant || !aiEnabled || !whatsappEnabled) {
      setSettings(null);
      setConversations([]);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await getWhatsAppSettings(selectedTenant.id);
      const nextSettings = data.settings || {};
      setSettings(nextSettings);
      setForm({
        ...defaultForm,
        provider: nextSettings.provider || "baileys",
        businessWhatsAppNumber: nextSettings.businessWhatsAppNumber || selectedTenant.contact?.whatsapp || "",
        displayName: nextSettings.displayName || selectedTenant.name || "",
        agentEnabled: nextSettings.agentEnabled !== false,
        autoReplyEnabled: nextSettings.autoReplyEnabled !== false,
        handoffEnabled: nextSettings.handoffEnabled !== false,
        handoffKeywords: (nextSettings.handoffKeywords || defaultForm.handoffKeywords.split(",")).join(", "),
        welcomeMessage: nextSettings.welcomeMessage || defaultForm.welcomeMessage,
        fallbackReply: nextSettings.fallbackReply || defaultForm.fallbackReply,
        businessHoursMode: nextSettings.businessHoursMode || "always_on",
      });
      const conversationData = await getWhatsAppConversations(selectedTenant.id, { page: 1, limit: 8 });
      setConversations(conversationData.items || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load WhatsApp agent settings."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspace().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id, aiEnabled, whatsappEnabled]);

  useEffect(() => {
    if (!selectedTenant?.id || !aiEnabled || !whatsappEnabled) return undefined;
    let active = true;
    const timer = setInterval(() => {
      getWhatsAppSettings(selectedTenant.id).then((data) => {
        if (active) setSettings(data.settings || {});
      }).catch(() => {
        if (active) setSettings((current) => ({ ...current, bridgeOnline: false, connectionStatus: "status_unavailable" }));
      });
    }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [selectedTenant?.id, aiEnabled, whatsappEnabled]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!selectedTenant) return;
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await saveWhatsAppSettings(selectedTenant.id, {
        provider: form.provider,
        businessWhatsAppNumber: form.businessWhatsAppNumber,
        displayName: form.displayName,
        agentEnabled: form.agentEnabled,
        autoReplyEnabled: form.autoReplyEnabled,
        handoffEnabled: form.handoffEnabled,
        handoffKeywords: toKeywordList(form.handoffKeywords),
        welcomeMessage: form.welcomeMessage,
        fallbackReply: form.fallbackReply,
        businessHoursMode: form.businessHoursMode,
      });
      setSettings(data.settings);
      setNotice("WhatsApp agent settings saved successfully.");
      await loadWorkspace();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save WhatsApp settings."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!selectedTenant) return;
    const confirmed = window.confirm("Disconnect the WhatsApp agent for this business?");
    if (!confirmed) return;
    setError("");
    setNotice("");
    try {
      const data = await disconnectWhatsApp(selectedTenant.id);
      setSettings(data.settings);
      setNotice("WhatsApp agent disconnected.");
      await loadWorkspace();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to disconnect WhatsApp agent."));
    }
  }

  async function handleMockInbound(event) {
    event.preventDefault();
    if (!selectedTenant) return;
    setIsSimulating(true);
    setError("");
    setNotice("");
    setLastResult(null);
    try {
      const data = await simulateWhatsAppInbound(selectedTenant.id, mockForm);
      setLastResult(data);
      setNotice("Mock customer message processed by the WhatsApp AI agent.");
      await loadWorkspace();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to process mock WhatsApp message."));
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleSendTest(event) {
    event.preventDefault();
    if (!selectedTenant) return;
    setIsSendingTest(true);
    setError("");
    setNotice("");
    try {
      await sendWhatsAppTest(selectedTenant.id, testForm);
      setNotice("Test message logged successfully.");
      await loadWorkspace();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to send WhatsApp test message."));
    } finally {
      setIsSendingTest(false);
    }
  }

  async function handleRefreshToken() {
    if (!selectedTenant) return;
    const confirmed = window.confirm("Refresh the WhatsApp bridge token? Your currently running bridge will need the new token.");
    if (!confirmed) return;
    setIsRefreshingToken(true);
    setError("");
    setNotice("");
    try {
      const data = await refreshWhatsAppBridgeToken(selectedTenant.id);
      setSettings(data.settings);
      setNotice("WhatsApp bridge token refreshed. Update your bridge .env before restarting it.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to refresh WhatsApp bridge token."));
    } finally {
      setIsRefreshingToken(false);
    }
  }

  async function copyText(value, message = "Copied.") {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
    } catch {
      setError("Unable to copy text. Please select and copy it manually.");
    }
  }

  if (isLoadingTenants || isLoadingModules || isLoading) {
    return <div className="rounded-xl border border-line bg-white p-6 text-sm text-muted">Loading WhatsApp agent...</div>;
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="WhatsApp AI Sales Agent"
        description="Connect your WhatsApp Business number to automate order taking, product recommendations, and customer support 24/7."
        icon={MessageSquare}
        image={OWNER_IMAGES.whatsapp}
        previewTitle="WhatsApp AI Automation"
        previewItems={[
          { title: "Autonomous Order Taking", desc: "AI takes customer order, confirms delivery address, and creates order in dashboard." },
          { title: "Catalog Recommendations", desc: "AI sends product photos, prices, and answers questions in Urdu or English." },
          { title: "Seamless Human Handoff", desc: "Jump into any conversation when a customer requests manual assistance." },
        ]}
      />
    );
  }

  if (!aiEnabled || !whatsappEnabled) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Enable AI Chat and WhatsApp Agent modules before configuring the WhatsApp assistant.
      </div>
    );
  }

  const visibleConversations = showAllConversations ? conversations : conversations.slice(0, 3);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. CINEMATIC WHATSAPP HERO - Vivid Photograph with Directional Vignette */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph - Crisp & vivid */}
        <img
          src={OWNER_IMAGES.whatsapp}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-center filter brightness-[0.72] contrast-[1.08] saturate-[1.15]"
          loading="eager"
        />

        {/* Directional cinematic vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/30"
        />

        {/* Ambient atmospheric glow orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />

        {/* Glowing sky horizon light line */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.7)]"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-200 border border-white/20 backdrop-blur">
                <MessageCircle size={13} className="text-emerald-400" />
                WhatsApp 24/7 AI Automation
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold backdrop-blur ${
                connected 
                  ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/35" 
                  : "bg-amber-500/25 text-amber-300 border border-amber-400/35"
              }`}>
                ● {connected ? "WhatsApp Connected" : "Needs Setup / Pairing"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              WhatsApp Sales & Customer Agent
            </h1>

            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-xl">
              Automate customer replies, share product prices, take orders via WhatsApp, and transfer complex questions directly to human staff.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {settings?.provider === "baileys" && !connected ? (
              <a
                href={bridgeQrUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg hover:bg-emerald-600 transition"
              >
                <QrCode size={16} /> Scan WhatsApp QR
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("mock-simulator-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-900 shadow-lg hover:bg-slate-100 transition"
            >
              <Bot size={16} /> Test AI Simulator
            </button>
          </div>
        </div>

        {/* Metric cards inside hero */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md text-white shadow-sm flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/90">Agent Status</span>
              <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-white capitalize">{connected ? "Online Active" : "Standby"}</div>
            <div className="text-[11px] text-slate-300 font-medium">Provider: {form.provider === "baileys" ? "WhatsApp Web" : "Local Mock"}</div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md text-white shadow-sm flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-200/90">Linked Number</span>
              <PhoneCall size={16} className="text-sky-300" />
            </div>
            <div className="mt-2 text-base sm:text-lg font-black text-white truncate">{settings?.bridgeConnectedNumber || form.businessWhatsAppNumber || "Not Linked"}</div>
            <div className="text-[11px] text-sky-200 font-medium">Business Contact</div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md text-white shadow-sm flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200/90">Auto Reply</span>
              <Sparkles size={16} className="text-indigo-300" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-white capitalize">{form.autoReplyEnabled ? "24/7 Enabled" : "Paused"}</div>
            <div className="text-[11px] text-indigo-200 font-medium">{form.businessHoursMode === "always_on" ? "Always On" : "Business Hours"}</div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md text-white shadow-sm flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200/90">Conversations</span>
              <MessageCircle size={16} className="text-purple-300" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-white">{conversations.length}</div>
            <div className="text-[11px] text-purple-200 font-medium">Customer Threads</div>
          </div>
        </div>
      </motion.section>

      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium">{notice}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 font-medium">{error}</div> : null}

      {/* Primary Configuration & Connection Control Center */}
      <div className="space-y-5">
        <form onSubmit={handleSave} className="rounded-2xl border border-line bg-white p-6 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
            <div>
              <SectionTitle>Quick WhatsApp Controls</SectionTitle>
              <p className="mt-0.5 text-xs text-muted">
                Essential connection and automation settings for your business.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {connected ? (
                <button
                  className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                  onClick={handleDisconnect}
                  type="button"
                >
                  Disconnect Agent
                </button>
              ) : settings?.provider === "baileys" ? (
                <a
                  href={bridgeQrUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
                >
                  <QrCode size={14} />
                  <span>Scan QR to Connect</span>
                </a>
              ) : null}
              <button
                className="rounded-xl bg-brand px-4 py-1.5 text-xs font-extrabold text-white hover:bg-brand-600 shadow transition disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-ink">Business WhatsApp Number</span>
              <input
                className="form-input text-xs"
                value={form.businessWhatsAppNumber}
                onChange={(event) => updateForm("businessWhatsAppNumber", event.target.value)}
                placeholder="+923001234567"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-ink">Assistant Display Name</span>
              <input
                className="form-input text-xs"
                value={form.displayName}
                onChange={(event) => updateForm("displayName", event.target.value)}
                placeholder={selectedTenant.name}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-ink">Connection Mode</span>
              <select
                className="form-input text-xs"
                value={form.provider}
                onChange={(event) => updateForm("provider", event.target.value)}
              >
                <option value="baileys">WhatsApp Web (Linked Device QR)</option>
                <option value="mock">Local Simulator (Testing Only)</option>
              </select>
            </label>
          </div>

          {/* Quick automation switches */}
          <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t border-line/60">
            <label className="flex items-center justify-between rounded-xl border border-line bg-surface/50 p-3 text-xs font-bold text-ink cursor-pointer hover:bg-surface transition">
              <div>
                <div>AI Agent Active</div>
                <div className="text-[11px] font-normal text-muted">Master switch for AI replies</div>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-brand"
                checked={form.agentEnabled}
                onChange={(event) => updateForm("agentEnabled", event.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-line bg-surface/50 p-3 text-xs font-bold text-ink cursor-pointer hover:bg-surface transition">
              <div>
                <div>24/7 Auto-Reply</div>
                <div className="text-[11px] font-normal text-muted">Reply to customers automatically</div>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-brand"
                checked={form.autoReplyEnabled}
                onChange={(event) => updateForm("autoReplyEnabled", event.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-line bg-surface/50 p-3 text-xs font-bold text-ink cursor-pointer hover:bg-surface transition">
              <div>
                <div>Human Handoff</div>
                <div className="text-[11px] font-normal text-muted">Pass complex chats to staff</div>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-brand"
                checked={form.handoffEnabled}
                onChange={(event) => updateForm("handoffEnabled", event.target.checked)}
              />
            </label>
          </div>
        </form>

        {/* Accordion 1: Customize Welcome Greetings & Fallback */}
        <div className="rounded-2xl border border-line bg-white shadow-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCustomMessages((v) => !v)}
            className="flex w-full items-center justify-between p-5 text-left font-semibold text-ink hover:bg-surface/50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-brand">
                <MessageSquare size={16} />
              </div>
              <div>
                <span className="text-sm font-bold text-ink">Customize Welcome &amp; Fallback Messages</span>
                <p className="text-xs text-muted font-normal">
                  Greeting text, human handoff trigger keywords, and business operating schedule.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand">{showCustomMessages ? "Hide" : "Customize"}</span>
              {showCustomMessages ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
            </div>
          </button>

          <AnimatePresence>
            {showCustomMessages && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="border-t border-line p-5 sm:p-6 space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-ink">Operating Schedule</span>
                    <select
                      className="form-input text-xs"
                      value={form.businessHoursMode}
                      onChange={(event) => updateForm("businessHoursMode", event.target.value)}
                    >
                      <option value="always_on">Always Reply 24/7</option>
                      <option value="business_hours">Reply During Business Hours Only</option>
                      <option value="offline_handoff">Mark Human Handoff Outside Hours</option>
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-ink">Handoff Trigger Keywords</span>
                    <input
                      className="form-input text-xs"
                      value={form.handoffKeywords}
                      onChange={(event) => updateForm("handoffKeywords", event.target.value)}
                      placeholder="human, owner, call me, baat karni, insan"
                    />
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-ink">Customer Welcome Greeting</span>
                    <textarea
                      className="form-input min-h-20 text-xs"
                      value={form.welcomeMessage}
                      onChange={(event) => updateForm("welcomeMessage", event.target.value)}
                      placeholder="Hello! Welcome to our store. How can I assist you today?"
                    />
                    <span className="block text-[11px] text-muted">Sent automatically when a customer messages your WhatsApp for the first time.</span>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-ink">Fallback Reply</span>
                    <textarea
                      className="form-input min-h-16 text-xs"
                      value={form.fallbackReply}
                      onChange={(event) => updateForm("fallbackReply", event.target.value)}
                      placeholder="I'm forwarding your request to our support team..."
                    />
                    <span className="block text-[11px] text-muted">Sent if an unexpected error occurs or when the assistant needs human assistance.</span>
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white hover:bg-brand-600 transition shadow-sm"
                  >
                    {isSaving ? "Saving..." : "Save Messages"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion 2: Customer Simulator & Outbound Test */}
        <div id="mock-simulator-section" className="rounded-2xl border border-line bg-white shadow-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSimulator((v) => !v)}
            className="flex w-full items-center justify-between p-5 text-left font-semibold text-ink hover:bg-surface/50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Bot size={16} />
              </div>
              <div>
                <span className="text-sm font-bold text-ink">Test Simulator &amp; Outbound Messages</span>
                <p className="text-xs text-muted font-normal">
                  Simulate incoming WhatsApp customer questions in Urdu or English, or send a test alert.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand">{showSimulator ? "Hide" : "Open Simulator"}</span>
              {showSimulator ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
            </div>
          </button>

          <AnimatePresence>
            {showSimulator && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="border-t border-line p-5 sm:p-6 space-y-6"
              >
                {/* Inbound Simulator */}
                <form onSubmit={handleMockInbound} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">Simulate Inbound Message</span>
                    <span className="text-[11px] text-muted">Tests AI RAG response directly</span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {["Menu bhej do", "Zinger burger available hai?", "Delivery charges kya hain?", "2 items order kar do"].map((prompt) => (
                      <button
                        key={prompt}
                        className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand transition"
                        type="button"
                        onClick={() => setMockForm((current) => ({ ...current, messageText: prompt }))}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="form-input text-xs"
                      value={mockForm.customerPhone}
                      onChange={(event) => setMockForm((current) => ({ ...current, customerPhone: event.target.value }))}
                      placeholder="Demo phone (+92...)"
                    />
                    <input
                      className="form-input text-xs"
                      value={mockForm.customerName}
                      onChange={(event) => setMockForm((current) => ({ ...current, customerName: event.target.value }))}
                      placeholder="Customer Name"
                    />
                  </div>

                  <textarea
                    className="form-input min-h-20 text-xs"
                    value={mockForm.messageText}
                    onChange={(event) => setMockForm((current) => ({ ...current, messageText: event.target.value }))}
                    placeholder="Type customer question..."
                  />

                  <div className="flex justify-end">
                    <button
                      className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition flex items-center gap-2"
                      disabled={!connected || isSimulating}
                      type="submit"
                    >
                      <Send size={13} />
                      <span>{isSimulating ? "Simulating AI..." : "Simulate Customer Question"}</span>
                    </button>
                  </div>

                  {lastResult ? (
                    <div className="space-y-2 rounded-2xl border border-brand-200 bg-blue-50/50 p-4 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand">AI Assistant Response</span>
                        <span className={lastResult.handoffRequired ? "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800" : "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800"}>
                          {lastResult.handoffRequired ? "Handoff to Human" : "Handled by AI"}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-ink leading-relaxed shadow-sm border border-line/60 whitespace-pre-wrap">
                        {lastResult.reply}
                      </div>
                    </div>
                  ) : null}
                </form>

                {/* Outbound Test Message */}
                <div className="pt-4 border-t border-line/60">
                  <button
                    type="button"
                    onClick={() => setShowTestMessageForm((v) => !v)}
                    className="flex w-full items-center justify-between text-left text-xs font-bold text-slate-700 hover:text-brand"
                  >
                    <span>Send Test Outbound Notification</span>
                    <span className="text-[11px] text-muted">{showTestMessageForm ? "Hide" : "Open"}</span>
                  </button>

                  <AnimatePresence>
                    {showTestMessageForm && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        onSubmit={handleSendTest}
                        className="space-y-3 pt-3"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            className="form-input text-xs"
                            value={testForm.toPhone}
                            onChange={(event) => setTestForm((current) => ({ ...current, toPhone: event.target.value }))}
                            placeholder="Recipient phone (+92...)"
                          />
                          <input
                            className="form-input text-xs"
                            value={testForm.messageText}
                            onChange={(event) => setTestForm((current) => ({ ...current, messageText: event.target.value }))}
                            placeholder="Notification text..."
                          />
                        </div>
                        <button
                          className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                          disabled={!connected || isSendingTest}
                          type="submit"
                        >
                          {isSendingTest ? "Sending..." : "Send Outbound Message"}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion 3: Developer Endpoints & Bridge Config */}
        <div className="rounded-2xl border border-line bg-white shadow-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvancedBridge((v) => !v)}
            className="flex w-full items-center justify-between p-5 text-left font-semibold text-ink hover:bg-surface/50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700">
                <Terminal size={16} />
              </div>
              <div>
                <span className="text-sm font-bold text-ink">Developer Endpoints &amp; Webhooks</span>
                <p className="text-xs text-muted font-normal">
                  Technical webhook URLs, verify tokens, and local bridge credentials.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand">{showAdvancedBridge ? "Hide" : "Show Details"}</span>
              {showAdvancedBridge ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
            </div>
          </button>

          <AnimatePresence>
            {showAdvancedBridge && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="border-t border-line p-5 sm:p-6 space-y-4"
              >
                <div className="rounded-xl bg-surface/50 p-4 border border-line text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink block">Webhook Inbound URL</span>
                      <code className="text-[11px] text-muted break-all">{webhookUrl}</code>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-surface transition"
                      onClick={() => copyText(webhookUrl, "Webhook URL copied.")}
                    >
                      Copy URL
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line/60">
                    <div>
                      <span className="font-semibold text-ink block">Verify Token</span>
                      <span className="text-[11px] text-muted">{settings?.webhookVerifyToken ? "Configured" : "Not generated"}</span>
                    </div>
                    {settings?.webhookVerifyToken ? (
                      <button
                        type="button"
                        className="rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-surface transition"
                        onClick={() => copyText(settings.webhookVerifyToken, "Verify token copied.")}
                      >
                        Copy Token
                      </button>
                    ) : null}
                  </div>
                </div>

                {form.provider === "baileys" ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3 text-xs text-emerald-950">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Baileys Local Bridge Status &amp; Link</span>
                      {isDebugMode ? (
                        <button
                          type="button"
                          className="rounded-lg bg-white border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-800"
                          onClick={() => copyText(bridgeEnv, "Bridge environment copied.")}
                        >
                          Copy .env
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700"
                        href={bridgeQrUrl}
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        Open QR Pairing Page
                      </a>
                      <button
                        type="button"
                        className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 font-bold text-emerald-800"
                        onClick={() => copyText(bridgeQrUrl, "Pairing link copied.")}
                      >
                        Copy Pairing Link
                      </button>
                      {isDebugMode ? (
                        <button
                          type="button"
                          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-800"
                          disabled={isRefreshingToken}
                          onClick={handleRefreshToken}
                        >
                          {isRefreshingToken ? "Refreshing..." : "Refresh Token"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Recent WhatsApp Conversations */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle>Recent WhatsApp Conversations</SectionTitle>
            <p className="mt-1 text-xs sm:text-sm text-muted">
              Live conversation log of customers who interacted through WhatsApp.
            </p>
          </div>
          <button
            className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-white transition inline-flex items-center gap-1.5"
            onClick={() => loadWorkspace()}
            type="button"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Last Intent</th>
                <th className="px-4 py-3">Conversation Summary</th>
                <th className="px-4 py-3">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {visibleConversations.length ? (
                visibleConversations.map((conversation) => (
                  <tr key={conversation.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-ink">{conversation.externalCustomerName || "WhatsApp Customer"}</div>
                      <div className="text-xs text-muted">{conversation.externalCustomerPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-brand capitalize">
                        {String(conversation.lastIntent || "general").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted max-w-xs truncate">
                      {conversation.summary || "No summary recorded"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted font-medium">
                      {formatDate(conversation.lastMessageAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-muted" colSpan="4">
                    No WhatsApp customer conversations recorded yet. Use the simulator above to test.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {conversations.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllConversations((curr) => !curr)}
            className="w-full rounded-xl border border-dashed border-line bg-surface/60 py-2.5 text-center text-xs font-bold text-brand hover:bg-blue-50/50 hover:border-brand/40 transition flex items-center justify-center gap-1.5"
          >
            {showAllConversations ? (
              <>
                <span>Show Fewer Conversations (Show latest 3)</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Show All WhatsApp Conversations ({conversations.length - 3} more)</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>
    </motion.section>
  );
}
