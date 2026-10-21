import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Crown,
  ExternalLink,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { BusinessSetupRequired, OWNER_IMAGES } from "../dashboard/ownerUi.jsx";

import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { getCustomFields } from "../../services/customFieldApi.js";
import {
  createCustomer,
  deleteCustomer,
  getCustomerInsights,
  getCustomers,
  updateCustomer,
} from "../../services/customerApi.js";
import { formatApiError } from "../../utils/apiErrors.js";
import { getApiErrorMessage } from "../../services/apiError.js";

const emptyForm = {
  type: "customer",
  name: "",
  phone: "",
  email: "",
  addressLine1: "",
  city: "",
  tagsText: "",
  status: "active",
};

const segmentLabels = {
  all: "All Customers",
  high_value: "⭐ VIP / High Value",
  repeat: "🔁 Repeat Buyers",
  new: "🌱 New Customers",
  inactive: "Inactive",
};

export function CustomersPage() {
  const { selectedTenant } = useTenant();
  const { hasModule, isLoadingModules } = useModules();
  const customersModuleEnabled = hasModule("customers");

  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState({});
  const [insights, setInsights] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedTenant?.id && customersModuleEnabled) {
      refreshCustomers();
      getCustomerInsights(selectedTenant.id).then(setInsights).catch(() => setInsights(null));
      getCustomFields(selectedTenant.id, { moduleCode: "customers", entityType: "customer" })
        .then((data) => setFields(data.filter((f) => f.isActive)))
        .catch(() => setFields([]));
    }
  }, [selectedTenant?.id, statusFilter, segmentFilter, tagFilter, customersModuleEnabled]);

  async function refreshCustomers(nextSearch = search) {
    if (!selectedTenant?.id) return;
    setIsLoading(true);
    try {
      const result = await getCustomers(selectedTenant.id, {
        search: nextSearch,
        status: statusFilter || undefined,
        segment: segmentFilter !== "all" ? segmentFilter : undefined,
        tag: tagFilter || undefined,
        page: 1,
        limit: 50,
      });
      setCustomers(result.items || []);
      setMeta(result.meta || {});
      setAvailableTags(result.meta?.filters?.availableTags || []);
      if (result.meta?.insights) {
        setInsights(result.meta.insights);
      }
    } catch {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingCustomer(null);
    setModalOpen(false);
  }

  function openEditModal(customer) {
    setEditingCustomer(customer);
    setForm({
      type: customer.type || "customer",
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      addressLine1: customer.address?.line1 || "",
      city: customer.address?.city || "",
      tagsText: (customer.tags || []).join(", "),
      status: customer.status || "active",
    });
    setModalOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    setServerError("");
    setServerMessage("");
    setIsSaving(true);

    const payload = {
      type: form.type,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      address: {
        line1: form.addressLine1.trim(),
        city: form.city.trim(),
      },
      tags: form.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      status: form.status,
    };

    try {
      if (editingCustomer) {
        await updateCustomer(selectedTenant.id, editingCustomer.id, payload);
        setServerMessage("Customer updated successfully.");
      } else {
        await createCustomer(selectedTenant.id, payload);
        setServerMessage("Customer added successfully.");
      }
      setTimeout(() => setServerMessage(""), 3500);
      resetForm();
      await refreshCustomers();
      getCustomerInsights(selectedTenant.id).then(setInsights).catch(() => {});
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Unable to save customer."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(customerId, customerName) {
    if (!window.confirm(`Delete customer "${customerName}"? Their past order history will be kept.`)) return;
    try {
      await deleteCustomer(selectedTenant.id, customerId);
      setServerMessage("Customer removed.");
      setTimeout(() => setServerMessage(""), 3000);
      await refreshCustomers();
      getCustomerInsights(selectedTenant.id).then(setInsights).catch(() => {});
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Failed to delete customer."));
    }
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Customer CRM & Directory"
        description="Track customer orders, manage contact details, view spending habits, and build customer loyalty."
        icon={Users}
        image={OWNER_IMAGES.customers}
        previewTitle="Customer Relationship Management"
        previewItems={[
          { title: "Customer Profiles & History", desc: "Complete chronological history of orders, chat messages, and lifetime value." },
          { title: "Repeat Buyer Insights", desc: "Identify top customers and send automated re-order reminders." },
          { title: "WhatsApp Direct Messaging", desc: "Reach out directly to customers via WhatsApp for order status updates." },
        ]}
      />
    );
  }

  if (isLoadingModules) {
    return <div className="text-sm text-muted">Loading customer CRM...</div>;
  }

  if (!customersModuleEnabled) {
    return (
      <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-card">
        <Users className="mx-auto h-12 w-12 text-muted" />
        <h2 className="mt-4 text-xl font-extrabold text-ink">Customers Module Disabled</h2>
        <p className="mt-1 text-sm text-muted">Enable the Customers feature module to access customer directory.</p>
        <Link to="/dashboard/modules" className="mt-4 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white">
          Enable Feature
        </Link>
      </div>
    );
  }

  const summary = insights?.summary || {};

  const segmentCounts = useMemo(() => {
    let vip = 0;
    let repeat = 0;
    let newClients = 0;
    let inactive = 0;
    let calculatedSpent = 0;
    const list = Array.isArray(customers) ? customers : [];
    list.forEach((c) => {
      const isVip = (c.segments || []).includes("high_value") || (c.tags || []).includes("vip");
      const isRepeat = (c.segments || []).includes("repeat") || (c.stats?.totalTransactions > 1);
      const isNew = (c.segments || []).includes("new") || (c.stats?.totalTransactions <= 1);
      if (isVip) vip++;
      if (isRepeat) repeat++;
      if (isNew) newClients++;
      if (c.status === "inactive") inactive++;
      calculatedSpent += Number(c.stats?.totalSpent || 0);
    });
    return {
      all: list.length,
      high_value: summary.highValueCustomers ?? vip,
      repeat: summary.repeatCustomers ?? repeat,
      new: newClients,
      inactive,
      totalSpent: calculatedSpent,
    };
  }, [customers, summary]);

  const totalRegisteredCount = summary.totalCustomers ?? meta.total ?? (Array.isArray(customers) ? customers.length : 0);
  const repeatRegisteredCount = summary.repeatCustomers ?? segmentCounts.repeat;
  const repeatRate = summary.repeatCustomerRate ?? (totalRegisteredCount > 0 ? Math.round((repeatRegisteredCount / totalRegisteredCount) * 100) : 0);
  const vipRegisteredCount = summary.highValueCustomers ?? segmentCounts.high_value;
  const totalRevenueAmount = summary.totalCustomerRevenue ?? segmentCounts.totalSpent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. CINEMATIC CRM HERO - Vivid Photograph with Directional Vignette */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph - Customers & CRM interaction */}
        <img
          src={OWNER_IMAGES.customers}
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
                <Users size={13} className="text-sky-300" />
                Customer Directory & CRM Desk
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-sky-300 border border-blue-400/30 backdrop-blur">
                ● {totalRegisteredCount} Clients Registered
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              Customer Relationships & Loyalty
            </h1>

            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-xl">
              Directory of your buyers with contact info, 1-click WhatsApp messaging, purchase histories, and VIP spenders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-900 shadow-lg hover:bg-slate-100 transition"
            >
              <Plus size={16} /> Add New Customer
            </motion.button>
          </div>
        </div>

        {/* 2. CINEMATIC GLASSMORPHIC CRM METRICS */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Total Directory</span>
              <Users size={17} className="text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{totalRegisteredCount}</div>
            <div className="text-[11px] text-slate-300 font-medium">All registered clients</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Repeat Buyers</span>
              <UserCheck size={17} className="text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{repeatRegisteredCount}</div>
            <div className="text-[11px] text-emerald-300 font-medium">{repeatRate}% retention rate</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">VIP Spenders</span>
              <Crown size={17} className="text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{vipRegisteredCount}</div>
            <div className="text-[11px] text-slate-300 font-medium">Top revenue customers</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">Total Revenue</span>
              <ShoppingBag size={17} className="text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)] truncate">
              PKR {Number(totalRevenueAmount || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-300 font-medium">Customer lifetime value</div>
          </motion.div>
        </div>
      </motion.section>

      {serverMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {serverMessage}
        </div>
      ) : null}
      {serverError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {serverError}
        </div>
      ) : null}

      {/* 3. SEGMENT FILTER TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {Object.entries(segmentLabels).map(([key, label]) => {
          const count = segmentCounts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSegmentFilter(key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                segmentFilter === key
                  ? "bg-brand text-white shadow-sm"
                  : "bg-surface text-muted hover:bg-white hover:text-ink border border-line"
              }`}
            >
              <span>{label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                segmentFilter === key ? "bg-white/20 text-white" : "bg-line text-muted"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. SEARCH & TAG FILTER BAR */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form
            className="flex-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              refreshCustomers(search);
            }}
          >
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search by name, phone number, email, or tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 text-xs font-medium text-ink placeholder:text-muted outline-none focus:border-brand focus:bg-white"
              />
            </div>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs font-semibold text-ink outline-none focus:border-brand focus:bg-white"
            >
              <option value="">All Tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-xl bg-ink px-5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              Search
            </button>
          </form>

          {/* View Mode Toggle (Grid vs. Table) */}
          <div className="flex items-center gap-1 self-end lg:self-center rounded-xl border border-line bg-surface p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === "grid" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === "table" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
              title="Table view"
            >
              <List size={14} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. CUSTOMER DIRECTORY CARDS / LIST */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-brand" />
          Loading customers...
        </div>
      ) : !customers.length ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <Users size={36} className="mx-auto text-muted mb-2" />
          <h3 className="text-base font-extrabold text-ink">No customers found</h3>
          <p className="mt-1 text-xs text-muted">
            {search || tagFilter || segmentFilter !== "all"
              ? "No customers match your selected search."
              : "Customers will appear here automatically when they place an order, or you can add them manually."}
          </p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand hover:bg-brand-hover px-4 py-2 text-xs font-bold text-white shadow-sm transition"
          >
            <Plus size={15} /> Add Customer
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW: Clean, mathematically consistent rows */
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface/80 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Phone & WhatsApp</th>
                  <th className="py-3 px-4">Email & Location</th>
                  <th className="py-3 px-4">Orders & Lifetime Spend</th>
                  <th className="py-3 px-4">Segment / Tags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-xs font-medium text-ink">
                {customers.map((customer) => {
                  const initials = (customer.name || "C")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();
                  const phoneDigits = (customer.phone || "").replace(/[^0-9]/g, "");
                  const isVip = (customer.segments || []).includes("high_value") || (customer.tags || []).includes("vip");
                  const isRepeat = (customer.segments || []).includes("repeat") || (customer.stats?.totalTransactions > 1);

                  return (
                    <tr key={customer.id} className="hover:bg-blue-50/30 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-brand to-indigo-500 text-xs font-black text-white shadow-sm">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to={`/dashboard/customers/${customer.id}`}
                              className="font-bold text-ink hover:text-brand transition block truncate"
                            >
                              {customer.name}
                            </Link>
                            <div className="text-[11px] text-muted capitalize">{customer.type || "customer"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{customer.phone || "—"}</span>
                          {phoneDigits ? (
                            <a
                              href={`https://wa.me/${phoneDigits}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-emerald-200 bg-emerald-50 p-1 text-emerald-700 transition hover:bg-emerald-100"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </a>
                          ) : null}
                          {customer.phone ? (
                            <a
                              href={`tel:${customer.phone}`}
                              className="rounded-lg border border-line bg-surface p-1 text-ink transition hover:bg-white"
                              title="Call"
                            >
                              <Phone size={13} />
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="min-w-0">
                          <div className="text-muted truncate">{customer.email || "—"}</div>
                          <div className="text-[11px] text-muted truncate">{customer.address?.city || ""}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-ink">{customer.stats?.totalTransactions || 0} Orders</div>
                        <div className="text-[11px] text-muted">PKR {Number(customer.stats?.totalSpent || 0).toLocaleString()}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {isVip ? (
                            <span className="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-700">
                              VIP
                            </span>
                          ) : isRepeat ? (
                            <span className="rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700">
                              Repeat
                            </span>
                          ) : null}
                          {(customer.tags || []).slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold text-muted border border-line">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Link
                            to={`/dashboard/customers/${customer.id}`}
                            className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-bold text-ink transition hover:bg-white"
                          >
                            Profile
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEditModal(customer)}
                            className="rounded-lg border border-line bg-surface px-2 py-1 text-xs font-bold text-ink transition hover:bg-white"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW: Uniform animated cards with fixed-height slots */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer, index) => {
            const initials = (customer.name || "C")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();
            const phoneDigits = (customer.phone || "").replace(/[^0-9]/g, "");
            const isVip = (customer.segments || []).includes("high_value") || (customer.tags || []).includes("vip");
            const isRepeat = (customer.segments || []).includes("repeat") || (customer.stats?.totalTransactions > 1);

            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.35), ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group flex h-full min-h-[240px] flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-brand/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-brand to-indigo-500 text-sm font-black text-white shadow-sm">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to={`/dashboard/customers/${customer.id}`}
                          className="font-bold text-ink group-hover:text-brand transition block truncate text-sm"
                        >
                          {customer.name}
                        </Link>
                        <div className="text-xs text-muted truncate">{customer.phone}</div>
                      </div>
                    </div>

                    {isVip ? (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-purple-700 border border-purple-200">
                        VIP
                      </span>
                    ) : isRepeat ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 border border-blue-200">
                        Repeat
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3.5 min-h-[44px] space-y-1.5 text-xs text-muted">
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={13} className={`shrink-0 ${customer.email ? "text-muted" : "text-muted/30"}`} />
                      <span className={`truncate ${customer.email ? "" : "text-muted/40 italic"}`}>
                        {customer.email || "No email registered"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <MapPin size={13} className={`shrink-0 ${customer.address?.city ? "text-muted" : "text-muted/30"}`} />
                      <span className={`truncate ${customer.address?.city ? "" : "text-muted/40 italic"}`}>
                        {customer.address?.city || "No address specified"}
                      </span>
                    </div>
                  </div>

                  {/* Tags slot */}
                  <div className="mt-3 min-h-[24px] flex items-center">
                    {(customer.tags || []).length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {customer.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-bold text-muted border border-line">
                            {tag}
                          </span>
                        ))}
                        {customer.tags.length > 3 ? (
                          <span className="text-[10px] text-muted">+{customer.tags.length - 3}</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted/40 italic">No tags</span>
                    )}
                  </div>
                </div>

                {/* Bottom stats and action buttons */}
                <div className="mt-4 pt-3.5 border-t border-line/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-ink">
                      {customer.stats?.totalTransactions || 0} Orders
                    </div>
                    <div className="text-[11px] text-muted font-medium">
                      PKR {Number(customer.stats?.totalSpent || 0).toLocaleString()} spent
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {phoneDigits ? (
                      <a
                        href={`https://wa.me/${phoneDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    ) : null}

                    {customer.phone ? (
                      <a
                        href={`tel:${customer.phone}`}
                        className="rounded-xl border border-line bg-surface p-2 text-ink transition hover:bg-white"
                        title="Call Customer"
                      >
                        <Phone size={14} />
                      </a>
                    ) : null}

                    <Link
                      to={`/dashboard/customers/${customer.id}`}
                      className="rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-ink transition hover:bg-white"
                    >
                      Profile
                    </Link>

                    <button
                      type="button"
                      onClick={() => openEditModal(customer)}
                      className="rounded-xl p-1.5 text-muted hover:text-ink transition hover:bg-surface"
                      title="Edit customer"
                    >
                      <span className="text-xs font-bold">Edit</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 6. ADD / EDIT CUSTOMER MODAL */}
      <AnimatePresence>
        {modalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface">
                <div>
                  <h3 className="text-base font-extrabold text-ink">
                    {editingCustomer ? `Edit: ${editingCustomer.name}` : "Add New Customer"}
                  </h3>
                  <p className="text-xs text-muted">Contact info & profile details.</p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl p-2 text-muted hover:bg-line transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={submit} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-ink">Full Name *</label>
                  <input
                    required
                    placeholder="e.g. Usman Ali, Sara Khan"
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none focus:border-brand"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-ink">Phone / WhatsApp Number *</label>
                    <input
                      required
                      placeholder="03001234567"
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                      className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="client@gmail.com"
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-ink">City (Optional)</label>
                    <input
                      placeholder="Lahore, Karachi, Islamabad..."
                      value={form.city}
                      onChange={(e) => updateForm("city", e.target.value)}
                      className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink">Tags (comma-separated)</label>
                    <input
                      placeholder="vip, frequent, wholesale"
                      value={form.tagsText}
                      onChange={(e) => updateForm("tagsText", e.target.value)}
                      className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-ink">Address (Optional)</label>
                  <input
                    placeholder="House/Street address for deliveries..."
                    value={form.addressLine1}
                    onChange={(e) => updateForm("addressLine1", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-hover transition disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : editingCustomer ? "Update Customer" : "Save Customer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
