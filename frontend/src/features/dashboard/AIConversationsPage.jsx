import { useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Globe,
  Layers,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Terminal,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { formatAnswerSource, formatDisplayValue, getUserFacingSourceTitles, isDebugMode } from "../../utils/displaySafety.js";
import { getOwnerConversationDetail, getOwnerConversations, getTenantRagStatus, reindexTenantRag } from "../../services/aiConversationApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";
import { BusinessSetupRequired, OWNER_IMAGES } from "./ownerUi.jsx";

export function AIConversationsPage() {
  const { selectedTenant, isLoadingTenants } = useTenant();
  const { enabledModules } = useModules();
  const [conversationList, setConversationList] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [detail, setDetail] = useState(null);
  const [ragStatus, setRagStatus] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [showAllList, setShowAllList] = useState(false);
  const [showRagDetails, setShowRagDetails] = useState(false);
  const aiEnabled = enabledModules.includes("ai_chat");

  useEffect(() => {
    async function loadConversations() {
      if (!selectedTenant || !aiEnabled) {
        setConversationList([]);
        setSelectedConversationId("");
        setDetail(null);
        return;
      }
      setIsLoading(true);
      setError("");
      try {
        const data = await getOwnerConversations(selectedTenant.id);
        setConversationList(data.items || []);
        const nextId = data.items?.[0]?.id || "";
        setSelectedConversationId(nextId);
        const ragData = await getTenantRagStatus(selectedTenant.id);
        setRagStatus(ragData.rag || null);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load AI conversations."));
      } finally {
        setIsLoading(false);
      }
    }

    loadConversations();
  }, [selectedTenant, aiEnabled]);

  useEffect(() => {
    async function loadDetail() {
      if (!selectedTenant || !selectedConversationId) {
        setDetail(null);
        return;
      }
      try {
        const data = await getOwnerConversationDetail(selectedTenant.id, selectedConversationId);
        setDetail(data);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load conversation detail."));
      }
    }

    loadDetail();
  }, [selectedConversationId, selectedTenant]);

  async function handleReindex() {
    if (!selectedTenant) return;
    setIsReindexing(true);
    setError("");
    setNotice("");
    try {
      const data = await reindexTenantRag(selectedTenant.id);
      setRagStatus(data.rag || null);
      setNotice("RAG reindex completed successfully.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to reindex tenant knowledge."));
    } finally {
      setIsReindexing(false);
    }
  }

  if (isLoadingTenants) {
    return <section className="text-sm text-muted">Loading AI workspace...</section>;
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="AI Conversations History"
        description="Inspect and review live chats between customers and your AI assistant across all sales channels."
        icon={MessageSquare}
        image={OWNER_IMAGES.ai}
        previewTitle="Customer Conversation Auditing"
        previewItems={[
          { title: "Full Chat Logs & Transcripts", desc: "Review real-time conversations of customer inquiries and order negotiations." },
          { title: "Conversion Tracking", desc: "See which automated conversations successfully converted into confirmed sales." },
          { title: "AI Quality & Confidence Ratings", desc: "Monitor response accuracy and pinpoint topics that require additional knowledge." },
        ]}
      />
    );
  }

  if (!aiEnabled) {
    return <section className="text-sm text-muted">Enable the AI chat module to review public and customer conversations.</section>;
  }

  const visibleList = showAllList ? conversationList : conversationList.slice(0, 5);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. CINEMATIC AI CONVERSATIONS HERO */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        <img
          src={OWNER_IMAGES.ai}
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

        {/* Subtle ambient glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />

        {/* Glowing sky horizon line */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent shadow-[0_0_12px_rgba(56,189,248,0.7)]"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-200 border border-white/20 backdrop-blur">
                <Sparkles size={13} className="text-sky-300" />
                Customer AI Conversations Desk
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-sky-300 border border-blue-400/30 backdrop-blur">
                ● {conversationList.length} Customer Chats
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              AI Inquiries & Chat Transcripts
            </h1>

            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-xl">
              Inspect automated interactions across your storefront and WhatsApp. Monitor customer order requests, product queries, and AI knowledge retrieval in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReindex}
              disabled={isReindexing}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-900 shadow-lg hover:bg-slate-100 transition disabled:opacity-60"
            >
              <RefreshCw size={15} className={isReindexing ? "animate-spin" : ""} />
              <span>{isReindexing ? "Reindexing Brain..." : "Reindex Knowledge"}</span>
            </button>
          </div>
        </div>

        {/* Metric cards inside hero */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md text-white shadow-sm flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-200/90">Total Chats</span>
              <MessageSquare size={16} className="text-sky-300" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{conversationList.length}</div>
            <div className="text-[11px] text-slate-300 font-medium">Logged interactions</div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md text-white shadow-sm flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200/90">Active Knowledge</span>
              <Database size={16} className="text-indigo-300" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{ragStatus?.activeKnowledgeDocumentCount || 0}</div>
            <div className="text-[11px] text-indigo-200 font-medium">Synced documents</div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md text-white shadow-sm flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200/90">Indexed Chunks</span>
              <Layers size={16} className="text-purple-300" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{ragStatus?.chunkCount || 0}</div>
            <div className="text-[11px] text-purple-200 font-medium">RAG vectors embedded</div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md text-white shadow-sm flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/90">Brain Status</span>
              <CheckCircle2 size={16} className="text-emerald-300" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-white capitalize">{ragStatus?.embeddingProvider || "Active"}</div>
            <div className="text-[11px] text-emerald-200 font-medium">RAG retrieval online</div>
          </div>
        </div>
      </motion.section>

      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium">{notice}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 font-medium">{error}</div> : null}

      {/* 2-Column Messenger Workspace */}
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Column: Conversation Directory */}
        <aside className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between pb-2 border-b border-line/60">
            <div>
              <h2 className="text-base font-extrabold text-ink">Conversations</h2>
              <p className="text-xs text-muted">Select a thread to review messages.</p>
            </div>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-muted border border-line">
              {conversationList.length}
            </span>
          </div>

          {/* Developer RAG engine debug info (debug mode only) */}
          {isDebugMode && ragStatus ? (
            <div className="rounded-xl border border-line bg-surface/50 p-3 text-xs">
              <button
                type="button"
                onClick={() => setShowRagDetails((v) => !v)}
                className="flex w-full items-center justify-between text-left font-bold text-ink hover:text-brand"
              >
                <div className="flex items-center gap-1.5">
                  <Database size={13} className="text-muted" />
                  <span>Knowledge RAG Engine</span>
                </div>
                {showRagDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              <AnimatePresence>
                {showRagDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-1.5 pt-2 mt-2 border-t border-line/60 text-muted"
                  >
                    <div>Documents: <span className="font-semibold text-ink">{ragStatus.knowledgeDocumentCount || 0}</span> ({ragStatus.activeKnowledgeDocumentCount || 0} active)</div>
                    <div>Chunks indexed: <span className="font-semibold text-ink">{ragStatus.chunkCount || 0}</span></div>
                    <div>Embedding Provider: <span className="font-semibold text-ink">{ragStatus.embeddingProvider || "default"}</span></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}

          {isLoading ? <div className="text-xs text-muted py-2">Loading conversation log...</div> : null}

          <div className="space-y-2.5">
            {visibleList.map((conversation) => {
              const isSelected = selectedConversationId === conversation.id;
              const isWhatsApp = conversation.channel === "whatsapp";
              const isWebsite = conversation.channel === "website" || conversation.channel === "public_website";

              return (
                <button
                  key={conversation.id}
                  className={`w-full rounded-2xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? "border-brand bg-blue-50/40 shadow-sm ring-1 ring-brand/30"
                      : "border-line bg-surface/50 hover:bg-surface hover:border-brand/30"
                  }`}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs ${
                        isWhatsApp ? "bg-emerald-100 text-emerald-700" : isWebsite ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {isWhatsApp ? <MessageCircle size={14} /> : isWebsite ? <Globe size={14} /> : <MessageSquare size={14} />}
                      </span>
                      <span className="font-extrabold text-xs text-ink capitalize">
                        {String(conversation.channel || "Chat").replaceAll("_", " ")}
                      </span>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase text-subtle border border-line">
                      {conversation.status || "active"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-muted line-clamp-2 leading-relaxed">
                    {conversation.summary || "Customer started an automated conversation."}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] text-subtle">
                    {conversation.languageDetected ? (
                      <span className="rounded bg-white px-1.5 py-0.5 font-bold uppercase border border-line">
                        {conversation.languageDetected}
                      </span>
                    ) : null}
                    {conversation.lastAssistantSource ? (
                      <span className="rounded bg-white px-1.5 py-0.5 border border-line">
                        {formatAnswerSource(conversation.lastAssistantSource)}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}

            {!conversationList.length && !isLoading ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface/50 p-6 text-center text-xs text-muted">
                No customer AI conversations logged yet.
              </div>
            ) : null}

            {conversationList.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllList((curr) => !curr)}
                className="w-full mt-2 rounded-xl border border-dashed border-line bg-surface/60 py-2.5 text-center text-xs font-bold text-brand hover:bg-blue-50/50 hover:border-brand/40 transition flex items-center justify-center gap-1.5"
              >
                {showAllList ? (
                  <>
                    <span>Show Fewer Threads (Show top 5)</span>
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>Show All Conversations ({conversationList.length - 5} more)</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </aside>

        {/* Right Column: Interactive Chat Transcript Pane */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card flex flex-col min-h-[500px]">
          {detail?.conversation ? (
            <>
              {/* Transcript Header */}
              <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-base text-ink capitalize">
                      {String(detail.conversation.channel || "Customer Chat").replaceAll("_", " ")}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 border border-emerald-200">
                      {detail.conversation.status || "Resolved"}
                    </span>
                    {detail.conversation.languageDetected ? (
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-bold text-muted border border-line">
                        Language: {detail.conversation.languageDetected.toUpperCase()}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    Last message: {detail.conversation.lastMessageAt ? new Date(detail.conversation.lastMessageAt).toLocaleString() : "Just now"}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {detail.conversation.lastAssistantSource ? (
                    <span className="rounded-xl bg-blue-50 px-3 py-1 font-bold text-brand border border-blue-200">
                      Answered via: {formatAnswerSource(detail.conversation.lastAssistantSource)}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Message Transcript Bubbles */}
              <div className="mt-6 space-y-4 flex-1 overflow-y-auto pr-1">
                {(detail.messages || []).map((message) => {
                  const isOwnerOrAi = message.sender === "assistant" || message.sender === "agent";
                  const sources = getUserFacingSourceTitles(message.ragSources || []);

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isOwnerOrAi ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar */}
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs shadow-sm ${
                        isOwnerOrAi ? "bg-brand text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        {isOwnerOrAi ? <Bot size={16} /> : <User size={16} />}
                      </span>

                      {/* Bubble Card */}
                      <div className={`max-w-[85%] rounded-2xl p-4 space-y-2 ${
                        isOwnerOrAi
                          ? "bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200/80 text-ink shadow-sm"
                          : "bg-surface border border-line text-ink"
                      }`}>
                        <div className="flex items-center justify-between gap-3 text-[11px] text-subtle font-medium">
                          <span className="font-bold capitalize text-ink">
                            {isOwnerOrAi ? "BizXus AI Assistant" : message.sender || "Customer"}
                          </span>
                          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>

                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.messageText}
                        </div>

                        {/* RAG Sources Cited */}
                        {sources.length > 0 && (
                          <div className="pt-2 border-t border-line/60 text-[11px] text-muted flex items-center gap-1.5 font-medium">
                            <Sparkles size={12} className="text-brand shrink-0" />
                            <span>Referenced from: <strong className="text-ink">{[...new Set(sources)].join(", ")}</strong></span>
                          </div>
                        )}

                        {isDebugMode && message.intent ? (
                          <div className="pt-1 text-[10px] text-muted">
                            Intent: {message.intent} {message.confidence ? `(${Math.round(message.confidence * 100)}%)` : ""}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center py-20 text-center">
              <div className="space-y-2 max-w-sm">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-brand">
                  <MessageSquare size={22} />
                </div>
                <h3 className="text-base font-extrabold text-ink">No Conversation Selected</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Select any customer thread from the left to view the automated dialog transcript and AI sources.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
