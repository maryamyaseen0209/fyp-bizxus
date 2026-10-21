import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  FileUp,
  Globe,
  MessageCircle,
  Package,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { BusinessSetupRequired, OWNER_IMAGES } from "./ownerUi.jsx";

import { PaymentLifecycleNote, PaymentProofBadge, PaymentStatusBadge } from "../../components/payments/PaymentStatusBadge.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { getTenantTransactions, updateTenantTransaction } from "../../services/transactionApi.js";
import { capitalize, formatTransactionType } from "../../utils/transaction.js";
import { getApiErrorMessage } from "../../services/apiError.js";

const SOURCE_CONFIG = {
  cashier: { label: "Counter POS", icon: Store, color: "text-amber-700 bg-amber-50 border-amber-200" },
  customer_portal: { label: "Customer Portal", icon: Globe, color: "text-blue-700 bg-blue-50 border-blue-200" },
  website: { label: "Online Store", icon: Globe, color: "text-sky-700 bg-sky-50 border-sky-200" },
  imported: { label: "Imported File", icon: FileUp, color: "text-purple-700 bg-purple-50 border-purple-200" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  api: { label: "API", icon: Sparkles, color: "text-slate-700 bg-slate-50 border-slate-200" },
};

function StatusPill({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    requested: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
    ready: "bg-purple-50 text-purple-700 border-purple-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    open: "bg-sky-50 text-sky-700 border-sky-200",
    closed: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const cls = styles[status] || "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${cls}`}>
      {String(status || "").replaceAll("_", " ")}
    </span>
  );
}

export function TransactionsPage() {
  const { selectedTenant } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState(() => searchParams.get("source") || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    if (selectedTenant?.id) {
      refreshTransactions();
    }
  }, [selectedTenant?.id, statusFilter, typeFilter, sourceFilter]);

  async function refreshTransactions(nextSearch = search) {
    if (!selectedTenant?.id) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await getTenantTransactions(selectedTenant.id, {
        search: nextSearch || undefined,
        status: statusFilter || undefined,
        transactionType: typeFilter || undefined,
        source: sourceFilter || undefined,
        page: 1,
        limit: 50,
      });
      setTransactions(result.items);
      setMeta(result.meta);
      setDrafts((current) => {
        const next = { ...current };
        result.items.forEach((t) => {
          next[t.id] = next[t.id] || {
            status: t.status,
            paymentStatus: t.paymentStatus,
            internalNotes: t.internalNotes || "",
          };
        });
        return next;
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load transactions."));
    } finally {
      setIsLoading(false);
    }
  }

  function updateDraft(transactionId, key, value) {
    setDrafts((current) => ({
      ...current,
      [transactionId]: {
        status: current[transactionId]?.status || "",
        paymentStatus: current[transactionId]?.paymentStatus || "",
        internalNotes: current[transactionId]?.internalNotes || "",
        [key]: value,
      },
    }));
  }

  async function handleQuickStatusChange(transactionId, newStatus) {
    if (!selectedTenant?.id) return;
    setSavingId(transactionId);
    setError("");
    setMessage("");
    try {
      const currentDraft = drafts[transactionId] || {};
      const payload = {
        ...currentDraft,
        status: newStatus,
      };
      const updated = await updateTenantTransaction(selectedTenant.id, transactionId, payload);
      setTransactions((current) => current.map((t) => (t.id === transactionId ? updated : t)));
      setDrafts((current) => ({
        ...current,
        [transactionId]: {
          status: updated.status,
          paymentStatus: updated.paymentStatus,
          internalNotes: updated.internalNotes || "",
        },
      }));
      setMessage(`Order ${updated.transactionNumber} marked as ${newStatus.replace("_", " ")}.`);
      setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update order status."));
    } finally {
      setSavingId("");
    }
  }

  async function saveTransaction(transactionId) {
    const draft = drafts[transactionId];
    if (!draft || !selectedTenant?.id) return;
    setSavingId(transactionId);
    setMessage("");
    setError("");
    try {
      const updated = await updateTenantTransaction(selectedTenant.id, transactionId, draft);
      setTransactions((current) => current.map((t) => (t.id === transactionId ? updated : t)));
      setDrafts((current) => ({
        ...current,
        [transactionId]: {
          status: updated.status,
          paymentStatus: updated.paymentStatus,
          internalNotes: updated.internalNotes || "",
        },
      }));
      setMessage(`Order ${updated.transactionNumber} updated successfully.`);
      setTimeout(() => setMessage(""), 3500);
      setExpandedId(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update transaction."));
    } finally {
      setSavingId("");
    }
  }

  const summary = meta.summary || {};
  const filters = meta.filters || {};

  // Tab filtering on top of fetched items
  const filteredTransactions = useMemo(() => {
    if (activeTab === "all") return transactions;
    if (activeTab === "pending") {
      return transactions.filter((t) => ["pending", "requested"].includes(t.status));
    }
    if (activeTab === "in_progress") {
      return transactions.filter((t) => ["confirmed", "processing", "ready"].includes(t.status));
    }
    if (activeTab === "completed") {
      return transactions.filter((t) => ["completed", "closed"].includes(t.status));
    }
    if (activeTab === "cancelled") {
      return transactions.filter((t) => ["cancelled", "rejected"].includes(t.status));
    }
    return transactions;
  }, [transactions, activeTab]);

  const counts = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;
    transactions.forEach((t) => {
      if (["pending", "requested"].includes(t.status)) pending++;
      else if (["confirmed", "processing", "ready"].includes(t.status)) inProgress++;
      else if (["completed", "closed"].includes(t.status)) completed++;
      else if (["cancelled", "rejected"].includes(t.status)) cancelled++;
    });
    return {
      all: transactions.length,
      pending,
      inProgress,
      completed,
      cancelled,
    };
  }, [transactions]);

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Orders & Sales"
        description="Manage customer orders, track payments, generate invoices, and print receipts across all sales channels."
        icon={Receipt}
        image={OWNER_IMAGES.orders}
        previewTitle="Order Processing & Sales Management"
        previewItems={[
          { title: "Multi-Channel Order Stream", desc: "Orders from website, WhatsApp, and cashier till in one synchronized queue." },
          { title: "Thermal Receipt Printing", desc: "One-click 80mm thermal receipt printing for counter transactions." },
          { title: "Delivery Status Tracking", desc: "Move orders from Pending to Confirmed, Dispatched, and Delivered with auto notifications." },
        ]}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. CINEMATIC ORDERS & SALES HERO - Luminous Indigo & Navy Aurora Atmosphere (Not Pitch Black) */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph - Sales orders & fulfillment desk */}
        <img
          src={OWNER_IMAGES.orders}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-center filter brightness-[0.72] contrast-[1.08] saturate-[1.15]"
          loading="eager"
        />

        {/* Directional cinematic vignette: deep contrast behind text, open vista on right */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/30"
        />

        {/* Subtle atmospheric ambient glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />

        {/* Glowing sky horizon light line */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent shadow-[0_0_12px_rgba(56,189,248,0.7)]"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-200 border border-white/20 backdrop-blur">
                <Receipt size={13} className="text-sky-300" />
                Orders & Sales Fulfillment Desk
              </span>
              {counts.pending > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 px-2.5 py-0.5 text-xs font-extrabold text-amber-300 border border-amber-400/35 backdrop-blur">
                  <Clock size={12} /> {counts.pending} Need Action
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-400/30 backdrop-blur">
                  ● All Orders Up to Date
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              Customer Orders & Requests
            </h1>

            <p className="text-xs sm:text-sm text-blue-100/85 leading-relaxed max-w-xl">
              Real-time fulfillment desk for online store orders, WhatsApp messages, and counter sales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => refreshTransactions()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </motion.button>
            <Link
              to="/dashboard/orders/import"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-extrabold text-slate-900 shadow-lg hover:bg-slate-100 transition"
            >
              <FileUp size={15} />
              Import Orders (CSV)
            </Link>
          </div>
        </div>

        {/* 2. CINEMATIC GLASSMORPHIC ORDER METRICS */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Total Orders</span>
              <Receipt size={17} className="text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{counts.all}</div>
            <div className="text-[11px] text-slate-300 font-medium">All registered orders</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className={`rounded-2xl border p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition ${
              counts.pending > 0 ? "border-amber-400/50 bg-amber-500/25" : "border-white/20 bg-slate-900/65 hover:bg-slate-900/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-black uppercase tracking-wider ${counts.pending > 0 ? "text-amber-300" : "text-slate-200"}`}>
                Needs Action
              </span>
              <Clock size={17} className={counts.pending > 0 ? "text-amber-300" : "text-amber-400"} />
            </div>
            <div className={`mt-2 text-2xl font-black ${counts.pending > 0 ? "text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]" : "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"}`}>{counts.pending}</div>
            <div className="text-[11px] text-slate-300 font-medium">New / unconfirmed</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">In Progress</span>
              <Package size={17} className="text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{counts.inProgress}</div>
            <div className="text-[11px] text-slate-300 font-medium">Confirmed & packing</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Completed</span>
              <CheckCircle2 size={17} className="text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{counts.completed}</div>
            <div className="text-[11px] text-slate-300 font-medium">Delivered & paid</div>
          </motion.div>
        </div>
      </motion.section>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      {/* 3. ORDER STATUS TABS (Fast 1-click filter for busy shop owners) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {[
          { id: "all", label: "All Orders", count: counts.all },
          { id: "pending", label: "⏳ Needs Action", count: counts.pending, alert: counts.pending > 0 },
          { id: "in_progress", label: "⚡ In Progress", count: counts.inProgress },
          { id: "completed", label: "✅ Completed", count: counts.completed },
          { id: "cancelled", label: "❌ Cancelled", count: counts.cancelled },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === tab.id
                ? "bg-brand text-white shadow-sm"
                : "bg-surface text-muted hover:bg-white hover:text-ink border border-line"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === tab.id
                  ? "bg-white/20 text-white"
                  : tab.alert
                    ? "bg-amber-100 text-amber-800"
                    : "bg-line text-muted"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. SEARCH & CHANNEL BAR */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            refreshTransactions(search);
          }}
        >
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by order #, customer name, phone, item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 text-xs font-medium text-ink placeholder:text-muted outline-none focus:border-brand focus:bg-white"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs font-semibold text-ink outline-none focus:border-brand focus:bg-white"
          >
            <option value="">All Channels & Sources</option>
            {(filters.sources || []).map((val) => (
              <option key={val} value={val}>
                {SOURCE_CONFIG[val]?.label || capitalize(val)}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-xl bg-ink px-5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            Search
          </button>
        </form>
      </div>

      {/* 5. ORDERS LIST */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-brand" />
          Loading orders...
        </div>
      ) : !filteredTransactions.length ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <Receipt size={36} className="mx-auto text-muted mb-2" />
          <h3 className="text-base font-extrabold text-ink">No orders found</h3>
          <p className="mt-1 text-xs text-muted">
            {activeTab === "pending"
              ? "All clear! There are no orders awaiting your action right now."
              : "No orders match your selected filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => {
            const draft = drafts[transaction.id] || {
              status: transaction.status,
              paymentStatus: transaction.paymentStatus,
              internalNotes: transaction.internalNotes || "",
            };
            const isExpanded = expandedId === transaction.id;
            const sourceInfo = SOURCE_CONFIG[transaction.source] || {
              label: transaction.source || "Direct",
              icon: Globe,
              color: "text-slate-700 bg-slate-50 border-slate-200",
            };
            const SourceIcon = sourceInfo.icon;
            const customerName = transaction.customerSnapshot?.name || "Guest Customer";
            const customerPhone = transaction.customerSnapshot?.phone;
            const itemsList = transaction.items || [];
            const isPending = ["pending", "requested"].includes(transaction.status);
            const isSavingThis = savingId === transaction.id;

            return (
              <div
                key={transaction.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                  isPending ? "border-amber-200/80 bg-amber-50/10" : "border-line"
                }`}
              >
                {/* Order Summary Row */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3.5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-brand">
                      <Receipt size={22} />
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-ink">{transaction.transactionNumber}</span>
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${sourceInfo.color}`}>
                          <SourceIcon size={12} />
                          {sourceInfo.label}
                        </span>
                        <StatusPill status={transaction.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span className="font-semibold text-ink">{customerName}</span>
                        {customerPhone ? (
                          <span className="inline-flex items-center gap-1 text-muted">
                            <Phone size={11} /> {customerPhone}
                          </span>
                        ) : null}
                        <span>·</span>
                        <span>{new Date(transaction.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-end">
                    <div className="text-right">
                      <div className="text-lg font-black text-ink">
                        PKR {Number(transaction.pricing?.total ?? 0).toLocaleString()}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <PaymentStatusBadge compact status={transaction.paymentStatus} />
                      </div>
                    </div>

                    {/* Quick Action Button for Shop Owners */}
                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleQuickStatusChange(transaction.id, "confirmed")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check size={14} /> Accept Order
                        </button>
                      ) : transaction.status === "confirmed" ? (
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleQuickStatusChange(transaction.id, "completed")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} /> Mark Completed
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : transaction.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-ink transition hover:bg-surface-hover"
                      >
                        {isExpanded ? "Hide Details" : "Details"}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items Preview Chips */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3 text-xs">
                  <span className="font-bold text-muted">Items ({itemsList.length}):</span>
                  {itemsList.length > 0 ? (
                    <>
                      {itemsList.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="rounded-lg bg-surface px-2 py-0.5 font-medium text-ink border border-line">
                          {item.quantity}x {item.name}
                        </span>
                      ))}
                      {itemsList.length > 3 ? (
                        <span className="text-[11px] font-bold text-muted">+{itemsList.length - 3} more</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[11px] italic text-muted/50">No items recorded</span>
                  )}
                </div>

                {/* Expandable Order Details & Workflow Drawer */}
                <AnimatePresence>
                  {isExpanded ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-line mt-4 pt-4"
                    >
                      <div className="grid gap-6 lg:grid-cols-2">
                        {/* Left: Full Items List & Customer Details */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Order Details</h4>
                          <div className="divide-y divide-line rounded-xl border border-line bg-surface/50">
                            {itemsList.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 text-xs">
                                <div>
                                  <span className="font-bold text-ink">{item.name}</span>
                                  <span className="ml-2 text-muted">x{item.quantity}</span>
                                  {item.selectedVariantName ? (
                                    <div className="text-[11px] text-muted">Variant: {item.selectedVariantName}</div>
                                  ) : null}
                                </div>
                                <span className="font-semibold text-ink">
                                  PKR {Number(item.subtotal ?? (item.unitPrice * item.quantity)).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>

                          {customerPhone ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={`https://wa.me/${customerPhone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                              >
                                <MessageCircle size={13} /> Chat on WhatsApp
                              </a>
                              <a
                                href={`tel:${customerPhone}`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-white"
                              >
                                <Phone size={13} /> Call Customer
                              </a>
                            </div>
                          ) : null}
                        </div>

                        {/* Right: Status, Payment & Notes Control */}
                        <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Manage Status & Notes</h4>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="text-[11px] font-bold text-muted uppercase">Fulfillment Status</label>
                              <select
                                value={draft.status || ""}
                                onChange={(e) => updateDraft(transaction.id, "status", e.target.value)}
                                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none"
                              >
                                {["pending", "confirmed", "processing", "ready", "completed", "cancelled"].map((st) => (
                                  <option key={st} value={st}>{capitalize(st.replace("_", " "))}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-muted uppercase">Payment Status</label>
                              <select
                                value={draft.paymentStatus || ""}
                                onChange={(e) => updateDraft(transaction.id, "paymentStatus", e.target.value)}
                                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none"
                              >
                                {["unpaid", "partially_paid", "paid", "refunded"].map((pst) => (
                                  <option key={pst} value={pst}>{capitalize(pst.replace("_", " "))}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-muted uppercase">Internal Staff Notes</label>
                            <textarea
                              rows={2}
                              value={draft.internalNotes || ""}
                              onChange={(e) => updateDraft(transaction.id, "internalNotes", e.target.value)}
                              placeholder="Notes for kitchen/delivery or payment confirmation..."
                              className="mt-1 w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink outline-none placeholder:text-muted focus:border-brand"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => saveTransaction(transaction.id)}
                              className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
                            >
                              {isSavingThis ? "Saving..." : "Save Updates"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
