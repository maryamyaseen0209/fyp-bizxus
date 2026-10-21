import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  FileText,
  UploadCloud,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  File,
  Tag,
  Filter,
  Layers,
  AlertCircle,
  HelpCircle,
  Send,
  SlidersHorizontal,
  Save,
  Plus,
} from "lucide-react";

import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import {
  createKnowledgeText,
  deleteKnowledgeDocument,
  getKnowledgeDocument,
  getKnowledgeDocuments,
  reindexKnowledgeBase,
  testKnowledgeBaseQuestion,
  updateKnowledgeDocument,
  uploadKnowledgeDocument,
} from "../../services/knowledgeBaseApi.js";
import { humanizeInternalName, isDebugMode } from "../../utils/displaySafety.js";
import { getApiErrorMessage } from "../../services/apiError.js";
import { BusinessSetupRequired, OWNER_IMAGES } from "./ownerUi.jsx";

const sourceLabels = {
  owner_text: "Owner text",
  owner_upload: "Owner upload",
  item: "Catalog item",
  tenant_profile: "Business profile",
};

function sourceLabel(sourceType) {
  return sourceLabels[sourceType] || sourceType?.replaceAll("_", " ") || "Knowledge";
}

function isOwnerDocument(document) {
  return ["owner_text", "owner_upload"].includes(document?.sourceType);
}

function normalizeTagsInput(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function KnowledgeBasePage() {
  const { selectedTenant, isLoadingTenants } = useTenant();
  const { enabledModules, isLoadingModules } = useModules();
  const [documents, setDocuments] = useState([]);
  const [meta, setMeta] = useState({});
  const [search, setSearch] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [textForm, setTextForm] = useState({ title: "", tags: "", content: "", isActive: true });
  const [uploadForm, setUploadForm] = useState({ title: "", tags: "", isActive: true, file: null });
  const [editForm, setEditForm] = useState({ title: "", tags: "", content: "", isActive: true });
  const [testForm, setTestForm] = useState({ question: "" });
  const [testResult, setTestResult] = useState(null);

  // UI state for non-technical clarity
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'upload'
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [showTestSandbox, setShowTestSandbox] = useState(false);

  const aiEnabled = enabledModules.includes("ai_chat");
  const summary = meta.summary || {};
  const pagination = meta || {};

  const filteredSourceOptions = useMemo(
    () => [
      { value: "", label: "All sources" },
      { value: "owner_text", label: "Owner text" },
      { value: "owner_upload", label: "Owner uploads" },
      { value: "item", label: "Catalog items" },
      { value: "tenant_profile", label: "Business profile" },
    ],
    [],
  );

  async function loadDocuments(nextSelectedId = selectedDocumentId) {
    if (!selectedTenant || !aiEnabled) {
      setDocuments([]);
      setSelectedDocumentId("");
      setSelectedDocument(null);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await getKnowledgeDocuments(selectedTenant.id, {
        search,
        sourceType: sourceType || undefined,
        page: 1,
        limit: 50,
      });
      setDocuments(data.items || []);
      setMeta(data.meta || {});
      const firstId = data.items?.[0]?.id || "";
      const stillExists = data.items?.some((document) => document.id === nextSelectedId);
      setSelectedDocumentId(stillExists ? nextSelectedId : firstId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load knowledge base."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments("").catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id, aiEnabled, sourceType]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadDocuments(selectedDocumentId).catch(() => {});
    }, 350);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    async function loadDetail() {
      if (!selectedTenant || !selectedDocumentId) {
        setSelectedDocument(null);
        return;
      }
      try {
        const data = await getKnowledgeDocument(selectedTenant.id, selectedDocumentId);
        const document = data.document;
        setSelectedDocument(document);
        setEditForm({
          title: document.title || "",
          tags: (document.tags || []).join(", "),
          content: document.content || "",
          isActive: Boolean(document.isActive),
        });
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load knowledge document."));
      }
    }
    loadDetail();
  }, [selectedDocumentId, selectedTenant]);

  async function handleCreateText(event) {
    event.preventDefault();
    if (!selectedTenant) return;
    setIsSavingText(true);
    setError("");
    setNotice("");
    try {
      const data = await createKnowledgeText(selectedTenant.id, {
        title: textForm.title,
        content: textForm.content,
        moduleCode: "ai_chat",
        tags: normalizeTagsInput(textForm.tags),
        isActive: textForm.isActive,
      });
      setTextForm({ title: "", tags: "", content: "", isActive: true });
      setShowAddDrawer(false);
      setNotice("Text knowledge saved and indexed into AI assistant successfully.");
      await loadDocuments(data.document?.id || "");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save text knowledge."));
    } finally {
      setIsSavingText(false);
    }
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!selectedTenant) return;
    if (!uploadForm.file) {
      setError("Choose a TXT, PDF, DOCX, CSV, or Excel file first.");
      return;
    }
    setIsUploading(true);
    setError("");
    setNotice("");
    try {
      const data = await uploadKnowledgeDocument(selectedTenant.id, {
        file: uploadForm.file,
        title: uploadForm.title,
        moduleCode: "ai_chat",
        tags: uploadForm.tags,
        isActive: uploadForm.isActive,
      });
      setUploadForm({ title: "", tags: "", isActive: true, file: null });
      setShowAddDrawer(false);
      const fileInput = document.getElementById("knowledge-upload-file");
      if (fileInput) fileInput.value = "";
      setNotice("File uploaded, text extracted, and indexed into AI assistant successfully.");
      await loadDocuments(data.document?.id || "");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to upload knowledge document."));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();
    if (!selectedTenant || !selectedDocument || !isOwnerDocument(selectedDocument)) return;
    setIsUpdating(true);
    setError("");
    setNotice("");
    try {
      const data = await updateKnowledgeDocument(selectedTenant.id, selectedDocument.id, {
        title: editForm.title,
        content: editForm.content,
        moduleCode: selectedDocument.moduleCode || "ai_chat",
        tags: normalizeTagsInput(editForm.tags),
        isActive: editForm.isActive,
      });
      setSelectedDocument(data.document);
      setNotice("Knowledge document updated and reindexed successfully.");
      await loadDocuments(data.document?.id || selectedDocument.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update knowledge document."));
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!selectedTenant || !selectedDocument || !isOwnerDocument(selectedDocument)) return;
    const confirmed = window.confirm("Delete this knowledge document from the AI assistant? This cannot be undone.");
    if (!confirmed) return;
    setError("");
    setNotice("");
    try {
      await deleteKnowledgeDocument(selectedTenant.id, selectedDocument.id);
      setSelectedDocument(null);
      setSelectedDocumentId("");
      setNotice("Knowledge document deleted successfully.");
      await loadDocuments("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to delete knowledge document."));
    }
  }

  async function handleReindex() {
    if (!selectedTenant) return;
    setIsReindexing(true);
    setError("");
    setNotice("");
    try {
      await reindexKnowledgeBase(selectedTenant.id);
      setNotice("Full knowledge base reindex completed successfully.");
      await loadDocuments(selectedDocumentId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to reindex knowledge base."));
    } finally {
      setIsReindexing(false);
    }
  }

  async function handleTestQuestion(event) {
    event.preventDefault();
    if (!selectedTenant || !testForm.question.trim()) return;
    setIsTesting(true);
    setError("");
    setNotice("");
    try {
      const data = await testKnowledgeBaseQuestion(selectedTenant.id, {
        question: testForm.question.trim(),
        channel: "owner_preview",
      });
      setTestResult(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to test this knowledge question."));
    } finally {
      setIsTesting(false);
    }
  }

  if (isLoadingTenants || isLoadingModules) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin text-brand" />
        Loading knowledge base workspace...
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="AI Knowledge Base"
        description="Train your AI agent on your shop's return policy, delivery hours, bank details, and FAQs with simple text or document uploads."
        icon={BookOpen}
        image={OWNER_IMAGES.knowledge}
        previewTitle="Store Intelligence & Training"
        previewItems={[
          { title: "Custom FAQ Training", desc: "Teach your assistant shop policies, return windows, and operational hours." },
          { title: "Document & PDF Uploads", desc: "Upload price sheets, menus, and product catalogs for instant semantic search." },
          { title: "Multi-Language Responses", desc: "AI answers customers naturally in Urdu, Roman Urdu, or English." },
        ]}
      />
    );
  }

  if (!aiEnabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Enable the AI Chat module before uploading business knowledge into the AI assistant.
      </div>
    );
  }

  const visibleDocuments = showAllDocuments ? documents : documents.slice(0, 5);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. CINEMATIC KNOWLEDGE BASE HERO - Vivid Themed Photo with Directional Scrim */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph */}
        <img
          src={OWNER_IMAGES.knowledge}
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
                <BookOpen className="h-3.5 w-3.5" />
                AI Knowledge Hub &amp; Policies
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" />
                Indexed &amp; Active
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl [text-shadow:0_2px_16px_rgba(0,0,0,0.6)]">
              Business Knowledge &amp; Policy Hub
            </h1>

            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-200 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
              Teach your AI assistant how your business operates. Add FAQs, return policies, delivery zones, menus, and pricing rules so customer queries are resolved accurately 24/7.
            </p>

            {/* Quick Hero Stat Chips */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">Total Docs</div>
                <div className="mt-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{pagination.total || documents.length || 0}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">Uploaded Files</div>
                <div className="mt-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{summary.ownerUploadCount || 0}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">Text FAQs</div>
                <div className="mt-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{summary.ownerTextCount || 0}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-slate-900/65 p-3.5 backdrop-blur-md shadow-lg transition hover:bg-slate-900/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">System Docs</div>
                <div className="mt-1 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{summary.systemDocumentCount || 0}</div>
              </div>
            </div>
          </div>

          {/* Hero Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={() => setShowAddDrawer((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg hover:bg-brand-600 transition"
            >
              <Plus className="h-4 w-4" />
              <span>{showAddDrawer ? "Close Add Form" : "Add Knowledge"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTestSandbox((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow hover:bg-white/25 backdrop-blur transition border border-white/20"
            >
              <Sparkles className="h-4 w-4 text-sky-300" />
              <span>{showTestSandbox ? "Hide Test Sandbox" : "Ask Test Question"}</span>
            </button>

            <button
              type="button"
              disabled={isReindexing}
              onClick={handleReindex}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 shadow-lg hover:bg-slate-100 disabled:opacity-60 transition"
            >
              <RefreshCw className={`h-4 w-4 text-brand ${isReindexing ? "animate-spin" : ""}`} />
              <span>{isReindexing ? "Reindexing..." : "Reindex All"}</span>
            </button>
          </div>
        </div>
      </motion.section>

      {/* Feedback Messages */}
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

      {/* 2. UNIFIED ADD KNOWLEDGE HUB (Expandable Drawer on demand) */}
      <AnimatePresence>
        {showAddDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-2xl border border-line bg-white shadow-card"
          >
            {/* Tab Headers */}
            <div className="flex items-center justify-between border-b border-line bg-slate-50/60 px-5 pt-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("text")}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === "text"
                      ? "border-brand text-brand bg-white rounded-t-lg"
                      : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Write Policy or FAQ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === "upload"
                      ? "border-brand text-brand bg-white rounded-t-lg"
                      : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload Document (PDF, Word, Excel)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAddDrawer(false)}
                className="text-xs font-bold text-muted hover:text-ink pb-2"
              >
                Cancel / Close
              </button>
            </div>

            {/* Tab 1: Write Policy or FAQ */}
            {activeTab === "text" && (
              <form onSubmit={handleCreateText} className="p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-ink">Add Custom Text Policy or Instructions</h3>
                  <p className="mt-1 text-xs sm:text-sm text-muted">
                    Best for delivery zones, refund policies, store hours, warranty notes, or commonly asked customer questions.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Topic / Title</span>
                    <input
                      type="text"
                      required
                      value={textForm.title}
                      onChange={(e) => setTextForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Free Delivery Policy & Timing"
                      className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Tags (comma separated)</span>
                    <div className="relative">
                      <Tag className="absolute left-3 top-3 h-4 w-4 text-muted/60" />
                      <input
                        type="text"
                        value={textForm.tags}
                        onChange={(e) => setTextForm((prev) => ({ ...prev, tags: e.target.value }))}
                        placeholder="delivery, timing, free shipping"
                        className="w-full rounded-xl border border-line bg-surface/50 pl-9 pr-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Knowledge Content</span>
                  <textarea
                    required
                    rows={4}
                    value={textForm.content}
                    onChange={(e) => setTextForm((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="Write the exact rules or information the AI assistant should know and provide to customers..."
                    className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand leading-relaxed"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={textForm.isActive}
                      onChange={(e) => setTextForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                    />
                    <span>Active in AI assistant responses</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSavingText}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 transition disabled:opacity-60"
                  >
                    {isSavingText ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving &amp; Indexing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Save &amp; Index Knowledge
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Upload File */}
            {activeTab === "upload" && (
              <form onSubmit={handleUpload} className="p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-ink">Upload Document to Knowledge Base</h3>
                  <p className="mt-1 text-xs sm:text-sm text-muted">
                    Supported formats: PDF, Word (DOCX), Excel (XLSX, CSV), Markdown (MD), or Plain Text (TXT) up to 10MB.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Document Title (Optional)</span>
                    <input
                      type="text"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Menu &amp; Catering Rates 2026"
                      className="w-full rounded-xl border border-line bg-surface/50 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Tags (comma separated)</span>
                    <div className="relative">
                      <Tag className="absolute left-3 top-3 h-4 w-4 text-muted/60" />
                      <input
                        type="text"
                        value={uploadForm.tags}
                        onChange={(e) => setUploadForm((prev) => ({ ...prev, tags: e.target.value }))}
                        placeholder="menu, catalog, pricing, sizes"
                        className="w-full rounded-xl border border-line bg-surface/50 pl-9 pr-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Choose File</span>
                  <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface/40 p-6 transition hover:bg-surface">
                    <UploadCloud className="h-10 w-10 text-brand/60" />
                    <span className="mt-2 text-sm font-medium text-ink">
                      {uploadForm.file ? uploadForm.file.name : "Select or drag a file to upload"}
                    </span>
                    <span className="mt-1 text-xs text-muted">
                      {uploadForm.file
                        ? `${(uploadForm.file.size / 1024).toFixed(1)} KB`
                        : "PDF, DOCX, XLSX, CSV, TXT (Max 10MB)"}
                    </span>
                    <input
                      id="knowledge-upload-file"
                      type="file"
                      accept=".txt,.md,.csv,.xlsx,.xlsm,.pdf,.docx"
                      required
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setUploadForm((prev) => ({
                          ...prev,
                          file,
                          title: prev.title || (file ? file.name.replace(/\.[^.]+$/, "") : ""),
                        }));
                        setError("");
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadForm.isActive}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                    />
                    <span>Active in AI assistant responses</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isUploading || !uploadForm.file}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 transition disabled:opacity-60"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Extracting &amp; Indexing...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        {uploadForm.file ? "Upload &amp; Index Document" : "Select File First"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. TEST PLAYGROUND (Collapsible AI Test Sandbox) */}
      <div className="rounded-2xl border border-line bg-white shadow-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTestSandbox(!showTestSandbox)}
          className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold text-ink hover:bg-surface/50 transition"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-brand" />
            <div>
              <span className="text-base font-bold text-ink">Ask a Test Question</span>
              <p className="text-xs text-muted font-normal">
                Preview how the AI will answer customer questions using your indexed knowledge and catalog.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand">{showTestSandbox ? "Hide Sandbox" : "Open Sandbox"}</span>
            {showTestSandbox ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </div>
        </button>

        <AnimatePresence>
          {showTestSandbox && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="border-t border-line p-5 sm:p-6"
            >
              <form onSubmit={handleTestQuestion} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={testForm.question}
                    onChange={(e) => setTestForm({ question: e.target.value })}
                    placeholder="e.g. Do you deliver to Bahria Town? What is the exchange policy?"
                    className="flex-1 rounded-xl border border-line bg-surface/50 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <button
                    type="submit"
                    disabled={isTesting || !testForm.question.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-60"
                  >
                    {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>{isTesting ? "Testing..." : "Test Answer"}</span>
                  </button>
                </div>
              </form>

              {testResult ? (
                <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Answer Preview
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink font-normal">
                    {testResult.reply || "No answer generated."}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full bg-white px-2.5 py-1 font-medium shadow-sm">
                      Knowledge sources used: {testResult.meta?.knowledgeCount || 0}
                    </span>
                    {isDebugMode && testResult.meta?.intent && (
                      <span className="rounded-full bg-white px-2.5 py-1 font-medium shadow-sm">
                        Intent: {testResult.meta.intent}
                      </span>
                    )}
                  </div>

                  {testResult.ragSources?.length ? (
                    <div className="mt-3 pt-3 border-t border-brand-100">
                      <div className="text-xs font-semibold text-slate-700">Matched Sources:</div>
                      <div className="mt-1.5 space-y-1.5">
                        {testResult.ragSources.slice(0, 3).map((source, idx) => (
                          <div key={idx} className="rounded-lg bg-white/80 p-2 text-xs text-slate-700 shadow-sm">
                            <span className="font-semibold text-ink">{source.title || "Document"}</span>
                            <span className="ml-2 text-muted">— {source.excerpt?.slice(0, 120)}...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. INDEXED KNOWLEDGE BROWSER & DOCUMENT DETAIL */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Left: Indexed Documents List */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Indexed Documents &amp; Catalogs</h2>
              <p className="text-xs text-muted">
                Showing {visibleDocuments.length} of {documents.length} knowledge entries
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted/60" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter docs..."
                  className="w-36 sm:w-44 rounded-xl border border-line bg-surface/50 pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted/60 focus:border-brand focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="rounded-xl border border-line bg-surface/50 px-3 py-1.5 text-xs font-medium text-ink focus:border-brand focus:bg-white focus:outline-none"
              >
                {filteredSourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin text-brand" />
              Loading knowledge...
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleDocuments.map((doc) => {
                const isSelected = selectedDocumentId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedDocumentId(doc.id)}
                    className={`w-full text-left rounded-xl p-3.5 transition border ${
                      isSelected
                        ? "border-brand bg-brand-50/60 shadow-sm ring-1 ring-brand/20"
                        : "border-line bg-white hover:bg-surface/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-ink truncate">{doc.title}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              doc.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {doc.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed">
                          {doc.contentPreview || "No preview available."}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize">
                          {sourceLabel(doc.sourceType)}
                        </span>
                        <span className="text-[10px] text-muted">{doc.chunkCount || 0} chunks</span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {!documents.length && !isLoading ? (
                <div className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-xs text-muted">
                  No knowledge documents found matching your filter.
                </div>
              ) : null}

              {/* Progressive disclosure toggle */}
              {documents.length > 5 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllDocuments(!showAllDocuments)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                  >
                    {showAllDocuments ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Show Less (Top 5)
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Show All {documents.length} Knowledge Documents
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Selected Document Detail / Edit */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          {selectedDocument ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="flex items-start justify-between border-b border-line pb-3.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand">Document Inspector</span>
                  <h3 className="text-base font-bold text-ink mt-0.5">{selectedDocument.title}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize">
                    {sourceLabel(selectedDocument.sourceType)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {selectedDocument.chunkCount || 0} chunks
                  </span>
                </div>
              </div>

              {isOwnerDocument(selectedDocument) ? (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-700">Title</span>
                    <input
                      type="text"
                      required
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs font-medium text-ink focus:border-brand focus:bg-white focus:outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-700">Tags</span>
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, tags: e.target.value }))}
                      className="w-full rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs font-medium text-ink focus:border-brand focus:bg-white focus:outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-700">Content Used by AI Assistant</span>
                    <textarea
                      required
                      rows={9}
                      value={editForm.content}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                      className="w-full rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none leading-relaxed"
                    />
                  </label>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                        className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand"
                      />
                      <span>Active in AI/RAG</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>

                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition disabled:opacity-60"
                      >
                        {isUpdating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        <span>{isUpdating ? "Saving..." : "Update &amp; Reindex"}</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
                    This document was automatically generated from your business catalog or profile. To update it, edit the catalog item or business details and click &quot;Reindex All Knowledge&quot;.
                  </div>
                  <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface/50 p-3.5 text-xs leading-relaxed text-muted font-mono">
                    {selectedDocument.content || "No content available."}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center text-xs text-muted">
              <File className="mb-2 h-8 w-8 text-slate-300" />
              Select any knowledge document from the left list to view or edit its contents.
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
