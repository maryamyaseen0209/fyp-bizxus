import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileSpreadsheet,
  KeyRound,
  Plus,
  Power,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Alert, Card, EmptyState, PageHeader } from "../../components/ui/index.jsx";
import { BusinessSetupRequired, OWNER_IMAGES } from "../dashboard/ownerUi.jsx";
import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import {
  createTenantCashier,
  getTenantCashiers,
  removeTenantCashier,
  resetTenantCashierPassword,
  setTenantCashierStatus,
  updateTenantCashier,
} from "../../services/cashierApi.js";
import { enableTenantModule } from "../../services/moduleApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  employeeCode: "",
  password: "",
  canViewAllCashierOrders: false,
  canAddCustomItems: true,
  canApplyDiscount: true,
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function formatMoney(value) {
  return `PKR ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function formatDate(value) {
  if (!value) return "Never";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Never" : parsed.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}

export function CashiersPage() {
  const { selectedTenant } = useTenant();
  const { hasModule, refreshTenantModules, isLoadingModules } = useModules();
  const [cashiers, setCashiers] = useState([]);
  const [summary, setSummary] = useState({});
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState({});
  const [resetTarget, setResetTarget] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAllCashiers, setShowAllCashiers] = useState(false);

  const moduleEnabled = hasModule("cashier");

  const load = useCallback(async () => {
    if (!selectedTenant?.id || !moduleEnabled) return;
    setIsLoading(true);
    setError("");
    try {
      const activeOnly = filter === "active" ? true : filter === "inactive" ? false : undefined;
      const result = await getTenantCashiers(selectedTenant.id, activeOnly === undefined ? {} : { activeOnly });
      setCashiers(result.items);
      setSummary(result.meta?.summary || {});
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load cashiers."));
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenant?.id, filter, moduleEnabled]);

  useEffect(() => {
    load();
  }, [load]);

  async function enableModule() {
    setError("");
    try {
      await enableTenantModule(selectedTenant.id, "cashier");
      await refreshTenantModules(selectedTenant.id);
      setMessage("Cashier module enabled.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to enable the cashier module."));
    }
  }

  async function submitNewCashier(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createTenantCashier(selectedTenant.id, {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        employeeCode: form.employeeCode,
        password: form.password,
        permissions: {
          canViewAllCashierOrders: form.canViewAllCashierOrders,
          canAddCustomItems: form.canAddCustomItems,
          canApplyDiscount: form.canApplyDiscount,
        },
      });
      setMessage(
        `${created.cashier.fullName} can now sign in at the business login with ${created.cashier.email || created.cashier.phone}. Share the temporary password you just set.`,
      );
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to create this cashier."));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEdit(cashierId) {
    setIsSaving(true);
    setError("");
    try {
      await updateTenantCashier(selectedTenant.id, cashierId, {
        fullName: editDraft.fullName,
        phone: editDraft.phone,
        email: editDraft.email,
        employeeCode: editDraft.employeeCode,
        permissions: {
          canViewAllCashierOrders: Boolean(editDraft.canViewAllCashierOrders),
          canAddCustomItems: Boolean(editDraft.canAddCustomItems),
          canApplyDiscount: Boolean(editDraft.canApplyDiscount),
        },
      });
      setEditingId("");
      setMessage("Cashier updated.");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update this cashier."));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(cashier) {
    setError("");
    try {
      await setTenantCashierStatus(selectedTenant.id, cashier.id, !cashier.isActive);
      setMessage(
        cashier.isActive
          ? `${cashier.fullName} is deactivated and signed out of any open session.`
          : `${cashier.fullName} can sign in again.`,
      );
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to change this cashier's status."));
    }
  }

  async function submitPasswordReset(cashierId) {
    setIsSaving(true);
    setError("");
    try {
      await resetTenantCashierPassword(selectedTenant.id, cashierId, { password: resetPassword, mustChangeOnNextLogin: true });
      setResetTarget("");
      setResetPassword("");
      setMessage("Password reset. The cashier is signed out and must set a new password at their next login.");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to reset the password."));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeAccess(cashier) {
    if (!window.confirm(`Remove ${cashier.fullName}'s login? Their past orders and receipts are kept.`)) return;
    setError("");
    try {
      await removeTenantCashier(selectedTenant.id, cashier.id);
      setMessage(`${cashier.fullName} can no longer sign in.`);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to remove this cashier."));
    }
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Cashiers & POS Terminals"
        description="Add cashier staff accounts, assign till PINs, monitor shift cash balances, and manage terminal access."
        icon={UserCheck}
        image={OWNER_IMAGES.cashier}
        previewTitle="Cashier Counter Management"
        previewItems={[
          { title: "Multi-Staff Accounts", desc: "Create PIN-protected sub-accounts for your counter team without sharing owner access." },
          { title: "Shift Cash Auditing", desc: "Track opening float, cash collected, and closing reconciliation per shift." },
          { title: "Fast Touch POS", desc: "Barcode scanning, instant item search, and thermal receipt printing." },
        ]}
      />
    );
  }

  if (isLoadingModules) {
    return <div className="py-8 text-sm text-muted">Loading module settings...</div>;
  }

  if (!moduleEnabled) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-blue-900/85 p-8 sm:p-12 shadow-2xl text-white border border-blue-500/20 text-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 border border-white/20 backdrop-blur mb-4">
            <Store size={32} className="text-sky-300" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">In-Store Point of Sale & Cashier Counters</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-200/90 leading-relaxed">
            Turn on the Cashier & POS module to give your counter staff their own login for in-store orders, rapid barcode scanning, and instant receipt printing.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={enableModule}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-extrabold text-slate-900 shadow-xl hover:bg-slate-100 transition"
            >
              <Store size={18} /> Enable Cashier & POS Counter
            </button>
          </div>
        </div>
      </motion.section>
    );
  }

  const visibleCashiers = showAllCashiers ? cashiers : cashiers.slice(0, 3);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. CINEMATIC POS HERO - Vivid Photograph with Directional Vignette */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph - Retail counter & Cashier POS */}
        <img
          src={OWNER_IMAGES.cashier}
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
                <Store size={13} className="text-sky-300" />
                In-Store Point of Sale & Counter Team
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-sky-300 border border-blue-400/30 backdrop-blur">
                ● {summary.active ?? 0} Staff Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              Cashier Tills & Counter Sales
            </h1>

            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-xl">
              Give counter staff their own login for in-store orders, barcode scanning, and instant customer receipts. All counter sales sync into your business analytics automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => setShowForm((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-900 shadow-lg hover:bg-slate-100 transition"
            >
              {showForm ? <X size={16} /> : <UserPlus size={16} />}
              <span>{showForm ? "Close Form" : "Add New Cashier"}</span>
            </motion.button>

            <Link
              to="/cashier"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-xs sm:text-sm font-bold text-white border border-white/20 backdrop-blur hover:bg-white/20 transition"
            >
              <Store size={15} /> Open Till Screen
            </Link>

            <Link
              to="/dashboard/orders/import"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-xs sm:text-sm font-bold text-white border border-white/20 backdrop-blur hover:bg-white/20 transition"
            >
              <FileSpreadsheet size={15} /> Import Past Orders
            </Link>
          </div>
        </div>

        {/* Cinematic Metric cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Total Staff</span>
              <Users size={17} className="text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{summary.total ?? 0}</div>
            <div className="text-[11px] text-slate-300 font-medium">Registered cashiers</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Active Till Logins</span>
              <ShieldCheck size={17} className="text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{summary.active ?? 0}</div>
            <div className="text-[11px] text-slate-300 font-medium">Can sign in right now</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Till Orders</span>
              <Receipt size={17} className="text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{summary.totalOrders ?? 0}</div>
            <div className="text-[11px] text-slate-300 font-medium">Handled at counter</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">Counter Sales</span>
              <ShoppingBag size={17} className="text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)] truncate">
              {formatMoney(summary.totalSales)}
            </div>
            <div className="text-[11px] text-slate-300 font-medium">Lifetime revenue at till</div>
          </motion.div>
        </div>
      </motion.section>

      {showForm ? (
        <Card as="form" onSubmit={submitNewCashier} className="space-y-4">
          <h2 className="text-base font-bold text-ink">New cashier</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Full name">
              <input className="form-input" required minLength={2} value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            </Field>
            <Field label="Employee code (optional)">
              <input className="form-input" value={form.employeeCode} onChange={(event) => setForm((current) => ({ ...current, employeeCode: event.target.value }))} />
            </Field>
            <Field label="Email (sign-in)">
              <input className="form-input" type="email" placeholder="cashier@yourbusiness.pk" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="Phone">
              <input className="form-input" placeholder="03001234567" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="Temporary password" className="md:col-span-2">
              <input className="form-input" type="text" required minLength={8} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              <span className="text-xs font-normal text-muted">
                At least 8 characters with three of: lowercase, uppercase, number, symbol. Share it with the cashier and reset it whenever you need to.
              </span>
            </Field>
          </div>

          <fieldset className="rounded-xl border border-line bg-surface p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-subtle">What this cashier may do</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <Toggle
                label="See all cashier orders"
                hint="Off means they see only their own."
                checked={form.canViewAllCashierOrders}
                onChange={(value) => setForm((current) => ({ ...current, canViewAllCashierOrders: value }))}
              />
              <Toggle
                label="Add manual items"
                hint="Items not in your catalog."
                checked={form.canAddCustomItems}
                onChange={(value) => setForm((current) => ({ ...current, canAddCustomItems: value }))}
              />
              <Toggle
                label="Apply discounts"
                checked={form.canApplyDiscount}
                onChange={(value) => setForm((current) => ({ ...current, canApplyDiscount: value }))}
              />
            </div>
          </fieldset>

          <div className="flex gap-2">
            <button type="submit" className="ui-btn-primary" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create cashier"}
            </button>
            <button type="button" className="ui-btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.value || "all"}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              filter === option.value ? "bg-brand text-white" : "border border-line bg-white text-muted hover:bg-surface"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading ? <div className="py-6 text-sm text-muted">Loading cashiers...</div> : null}

      {!isLoading && !cashiers.length ? (
        <EmptyState
          icon={Users}
          title="No cashiers yet"
          description="Add your first counter account. They will sign in at the normal business login and go straight to the till screen."
          actionLabel="Add cashier"
          onAction={() => setShowForm(true)}
        />
      ) : null}

      <div className="space-y-3">
        {visibleCashiers.map((cashier, index) => {
          const isEditing = editingId === cashier.id;
          const initials = (cashier.fullName || "C")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
          return (
            <motion.div
              key={cashier.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-brand/40 hover:shadow-md space-y-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-brand to-indigo-500 text-sm font-black text-white shadow-sm">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-ink">{cashier.fullName}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border ${
                        cashier.isActive 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {cashier.isActive ? "Active Till" : "Inactive / Suspended"}
                      </span>
                      {cashier.employeeCode ? (
                        <span className="rounded-md bg-surface border border-line px-2 py-0.5 text-[10px] font-bold text-muted">
                          Code: {cashier.employeeCode}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-muted flex flex-wrap items-center gap-2">
                      <span>{cashier.email || "No email"}</span>
                      {cashier.phone ? <span>● {cashier.phone}</span> : null}
                      <span className="text-subtle">● Last login: {formatDate(cashier.lastLoginAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-line/60">
                  <Metric label="Orders" value={cashier.stats?.totalOrders ?? 0} />
                  <Metric label="Sales" value={formatMoney(cashier.stats?.totalSales)} />
                  <Metric label="Last sale" value={cashier.stats?.lastOrderAt ? formatDate(cashier.stats.lastOrderAt) : "—"} />
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Full name">
                      <input className="form-input" value={editDraft.fullName || ""} onChange={(event) => setEditDraft((current) => ({ ...current, fullName: event.target.value }))} />
                    </Field>
                    <Field label="Employee code">
                      <input className="form-input" value={editDraft.employeeCode || ""} onChange={(event) => setEditDraft((current) => ({ ...current, employeeCode: event.target.value }))} />
                    </Field>
                    <Field label="Email">
                      <input className="form-input" value={editDraft.email || ""} onChange={(event) => setEditDraft((current) => ({ ...current, email: event.target.value }))} />
                    </Field>
                    <Field label="Phone">
                      <input className="form-input" value={editDraft.phone || ""} onChange={(event) => setEditDraft((current) => ({ ...current, phone: event.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Toggle label="See all cashier orders" checked={Boolean(editDraft.canViewAllCashierOrders)} onChange={(value) => setEditDraft((current) => ({ ...current, canViewAllCashierOrders: value }))} />
                    <Toggle label="Add manual items" checked={Boolean(editDraft.canAddCustomItems)} onChange={(value) => setEditDraft((current) => ({ ...current, canAddCustomItems: value }))} />
                    <Toggle label="Apply discounts" checked={Boolean(editDraft.canApplyDiscount)} onChange={(value) => setEditDraft((current) => ({ ...current, canApplyDiscount: value }))} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="ui-btn-primary" disabled={isSaving} onClick={() => saveEdit(cashier.id)}>
                      Save changes
                    </button>
                    <button type="button" className="ui-btn-secondary" onClick={() => setEditingId("")}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {resetTarget === cashier.id ? (
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
                  <Field label="New temporary password" className="min-w-[16rem] flex-1">
                    <input className="form-input" type="text" minLength={8} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />
                  </Field>
                  <button type="button" className="ui-btn-primary" disabled={isSaving || resetPassword.length < 8} onClick={() => submitPasswordReset(cashier.id)}>
                    Reset password
                  </button>
                  <button type="button" className="ui-btn-secondary" onClick={() => { setResetTarget(""); setResetPassword(""); }}>
                    Cancel
                  </button>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                <button
                  type="button"
                  className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-white transition"
                  onClick={() => {
                    setEditingId(isEditing ? "" : cashier.id);
                    setEditDraft({
                      fullName: cashier.fullName,
                      email: cashier.email,
                      phone: cashier.phone,
                      employeeCode: cashier.employeeCode,
                      ...cashier.permissions,
                    });
                  }}
                >
                  {isEditing ? "Close editor" : "Edit Details"}
                </button>
                <button type="button" className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-white transition inline-flex items-center gap-1.5" onClick={() => setResetTarget(resetTarget === cashier.id ? "" : cashier.id)}>
                  <KeyRound size={13} />
                  Reset Password
                </button>
                <button type="button" className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-white transition inline-flex items-center gap-1.5" onClick={() => toggleStatus(cashier)}>
                  <Power size={13} />
                  {cashier.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                  onClick={() => removeAccess(cashier)}
                >
                  Remove Access
                </button>
                <Link to={`/dashboard/transactions?source=cashier`} className="ml-auto self-center text-xs font-bold text-brand hover:underline inline-flex items-center gap-1">
                  <span>View till orders</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </motion.div>
          );
        })}

        {cashiers.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllCashiers((curr) => !curr)}
            className="w-full rounded-xl border border-dashed border-line bg-surface/60 py-3 text-center text-xs font-bold text-brand hover:bg-blue-50/50 hover:border-brand/40 transition flex items-center justify-center gap-1.5"
          >
            {showAllCashiers ? (
              <>
                <span>Show Fewer Cashiers (Show top 3)</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Show All Registered Cashiers ({cashiers.length - 3} more)</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>
    </motion.section>
  );
}

function Field({ label, className = "", children }) {
  return (
    <label className={`block space-y-1.5 text-sm font-semibold text-ink ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-white px-3 py-2.5 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="font-semibold text-ink">{label}</span>
        {hint ? <span className="block text-xs font-normal text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-subtle">{label}</div>
      <div className="text-sm font-extrabold text-ink">{value}</div>
    </div>
  );
}
