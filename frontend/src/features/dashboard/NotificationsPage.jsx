import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Filter,
  Package,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import {
  getBusinessNotifications,
  markAllBusinessNotificationsRead,
  markBusinessNotificationRead,
  refreshBusinessStockAlerts,
} from "../../services/notificationApi.js";
import { OrderMessageSettings } from "./OrderMessageSettings.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";
import { BusinessSetupRequired, OWNER_IMAGES, OwnerHero } from "./ownerUi.jsx";
import { EASE } from "../../components/ui/motion.jsx";

const NOTIFICATION_TYPE_LABELS = {
  new_order: "New order",
  low_stock: "Low stock alert",
  payment_received: "Payment received",
  payment_pending: "Payment awaiting approval",
  order_status_change: "Order status changed",
  stock_alert: "Stock alert",
  system: "System message",
};

export function NotificationsPage() {
  const { selectedTenant, isLoadingTenants } = useTenant();
  const { enabledModules } = useModules();
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState({});
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread' | 'orders' | 'stock' | 'payments'
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingStock, setIsRefreshingStock] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(8);

  const notificationsEnabled = enabledModules.includes("notifications");

  useEffect(() => {
    if (!selectedTenant?.id || !notificationsEnabled) {
      setNotifications([]);
      setMeta({});
      return;
    }
    refreshNotifications();
  }, [selectedTenant?.id, notificationsEnabled, typeFilter, statusFilter]);

  async function refreshNotifications() {
    if (!selectedTenant?.id) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await getBusinessNotifications(selectedTenant.id, {
        page: 1,
        limit: 50,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setNotifications(result.items || []);
      setMeta(result.meta || {});
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load business notifications."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkRead(notificationId) {
    if (!selectedTenant?.id) return;
    setMessage("");
    setError("");
    try {
      await markBusinessNotificationRead(selectedTenant.id, notificationId);
      await refreshNotifications();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update notification."));
    }
  }

  async function handleMarkAllRead() {
    if (!selectedTenant?.id) return;
    setMessage("");
    setError("");
    try {
      const result = await markAllBusinessNotificationsRead(selectedTenant.id);
      setMessage(`${result.updatedCount || 0} notifications marked as read.`);
      await refreshNotifications();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to mark all notifications as read."));
    }
  }

  async function handleRefreshStockAlerts() {
    if (!selectedTenant?.id) return;
    setIsRefreshingStock(true);
    setMessage("");
    setError("");
    try {
      const result = await refreshBusinessStockAlerts(selectedTenant.id);
      setMessage(`Stock alerts refreshed. ${result.activeLowStockAlerts || 0} active, ${result.clearedAlerts || 0} cleared.`);
      await refreshNotifications();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to refresh stock alerts."));
    } finally {
      setIsRefreshingStock(false);
    }
  }

  // Filter based on active quick tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => n.status === "unread");
    }
    if (activeTab === "orders") {
      return notifications.filter((n) => n.type === "new_order" || n.type === "order_status_change");
    }
    if (activeTab === "stock") {
      return notifications.filter((n) => n.type === "low_stock" || n.type === "stock_alert");
    }
    if (activeTab === "payments") {
      return notifications.filter((n) => n.type === "payment_received" || n.type === "payment_pending");
    }
    return notifications;
  }, [notifications, activeTab]);

  const unreadCount = meta.unread || notifications.filter((n) => n.status === "unread").length;
  const stockCount = notifications.filter((n) => n.type === "low_stock" || n.type === "stock_alert").length;
  const orderCount = notifications.filter((n) => n.type === "new_order" || n.type === "order_status_change").length;
  const paymentCount = notifications.filter((n) => n.type === "payment_received" || n.type === "payment_pending").length;

  if (isLoadingTenants) {
    return <section className="text-sm text-muted">Loading notifications workspace...</section>;
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Notifications & Alerts"
        description="Receive instant push notifications, order alerts, low stock warnings, and customer message alerts across all channels."
        icon={Bell}
        image={OWNER_IMAGES.notifications}
        previewTitle="Real-time Notification Center"
        previewItems={[
          { title: "Instant Order Alerts", desc: "Sound and visual alerts the moment a customer places an order on your site or POS." },
          { title: "WhatsApp Customer Alerts", desc: "Get notified when a customer requires manual follow-up or custom support." },
          { title: "Proactive Stock Warnings", desc: "Never run out of bestsellers with automated inventory threshold triggers." },
        ]}
      />
    );
  }

  if (!notificationsEnabled) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="flex items-center gap-3 text-base font-bold text-ink">
            <Bell size={20} className="text-brand" />
            Business Notifications Disabled
          </div>
          <p className="mt-2 text-sm text-muted">
            Enable the notifications module in Add-on Features to receive real-time business alerts for stock and orders.
          </p>
        </div>
        <OrderMessageSettings tenantId={selectedTenant.id} />
      </section>
    );
  }

  const filters = meta.filters || {};
  const visibleNotifications = filteredNotifications.slice(0, displayLimit);
  const remainingCount = Math.max(0, filteredNotifications.length - displayLimit);

  return (
    <section className="space-y-6">
      {/* Cinematic Hero */}
      <OwnerHero
        eyebrow="Notifications & Activity"
        title="Business alerts & updates"
        description="Monitor real-time updates for customer orders, inventory stock warnings, and payment transactions in one central inbox."
        image={OWNER_IMAGES.notifications}
        stats={[
          { label: "Unread", value: unreadCount },
          { label: "Stock Alerts", value: stockCount },
          { label: "Total In Feed", value: notifications.length },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-hero-work shadow-[0_14px_30px_-12px_rgba(3,10,26,0.7)] transition hover:bg-sky-50 active:scale-95"
              onClick={handleMarkAllRead}
              type="button"
              disabled={unreadCount === 0}
            >
              <CheckCheck size={16} className="text-brand" />
              Mark all as read
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 active:scale-95 disabled:opacity-60"
              disabled={isRefreshingStock}
              onClick={handleRefreshStockAlerts}
              type="button"
            >
              <RefreshCw size={15} className={isRefreshingStock ? "animate-spin" : ""} />
              {isRefreshingStock ? "Scanning stock..." : "Refresh stock alerts"}
            </button>
          </div>
        }
      />

      {message ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm"
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{message}</span>
        </motion.div>
      ) : null}

      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm"
        >
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </motion.div>
      ) : null}

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab("all"); setDisplayLimit(8); }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-brand text-white shadow-sm"
                : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <span>All Alerts</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("unread"); setDisplayLimit(8); }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "unread"
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 ? (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "unread" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 font-extrabold"}`}>
                {unreadCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("orders"); setDisplayLimit(8); }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "orders"
                ? "bg-brand text-white shadow-sm"
                : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <ShoppingBag size={13} />
            <span>Orders</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "orders" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {orderCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("stock"); setDisplayLimit(8); }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "stock"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <AlertTriangle size={13} />
            <span>Stock Warnings</span>
            {stockCount > 0 ? (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "stock" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"}`}>
                {stockCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("payments"); setDisplayLimit(8); }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "payments"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <CreditCard size={13} />
            <span>Payments</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "payments" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {paymentCount}
            </span>
          </button>
        </div>

        {/* Granular filter dropdown */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-subtle shrink-0" />
          <select
            className="form-input py-1.5 text-xs text-ink"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setActiveTab("all");
            }}
          >
            <option value="">All specific types</option>
            {(filters.types || []).map((value) => (
              <option key={value} value={value}>
                {NOTIFICATION_TYPE_LABELS[value] || value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white py-12 text-sm text-muted shadow-card">
          <RefreshCw size={18} className="animate-spin text-brand" />
          <span>Loading alerts feed...</span>
        </div>
      ) : null}

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {visibleNotifications.map((notification) => {
            const isUnread = notification.status === "unread";
            const isStockAlert = notification.type === "low_stock" || notification.type === "stock_alert";
            const isOrder = notification.type === "new_order" || notification.type === "order_status_change";
            const isPayment = notification.type === "payment_received" || notification.type === "payment_pending";

            return (
              <motion.article
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, ease: EASE }}
                className={`group relative overflow-hidden rounded-2xl border transition ${
                  isUnread
                    ? isStockAlert
                      ? "border-amber-300 bg-amber-50/70 shadow-sm"
                      : "border-blue-200 bg-blue-50/50 shadow-sm"
                    : "border-line bg-white shadow-card hover:border-slate-300"
                } p-4 sm:p-5`}
              >
                {/* Visual side accent for unread */}
                {isUnread ? (
                  <div
                    className={`absolute inset-y-0 left-0 w-1.5 ${
                      isStockAlert ? "bg-amber-500" : "bg-brand"
                    }`}
                  />
                ) : null}

                <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Icon Tile */}
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm ${
                        isStockAlert
                          ? "bg-amber-100 text-amber-700"
                          : isOrder
                            ? "bg-blue-100 text-blue-700"
                            : isPayment
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isStockAlert ? (
                        <AlertTriangle size={18} />
                      ) : isOrder ? (
                        <ShoppingBag size={18} />
                      ) : isPayment ? (
                        <CreditCard size={18} />
                      ) : (
                        <Bell size={18} />
                      )}
                    </div>

                    {/* Notification Details */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-ink ring-1 ring-line">
                          {NOTIFICATION_TYPE_LABELS[notification.type] || notification.type?.replaceAll("_", " ")}
                        </span>
                        {isUnread ? (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-xs">
                            Unread
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-subtle">
                            Resolved
                          </span>
                        )}
                        <span className="text-[11px] text-subtle">
                          {new Date(notification.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-ink pt-0.5">{notification.title}</h3>
                      <p className="text-sm leading-relaxed text-muted">{notification.message}</p>

                      {/* Metadata Chips */}
                      {(notification.metadata?.transactionNumber || notification.metadata?.itemName) ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          {notification.metadata?.transactionNumber ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-semibold text-ink ring-1 ring-line">
                              <ShoppingBag size={12} className="text-brand" />
                              Order #{notification.metadata.transactionNumber}
                            </span>
                          ) : null}
                          {notification.metadata?.itemName ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-semibold text-ink ring-1 ring-line">
                              <Package size={12} className="text-brand" />
                              {notification.metadata.itemName}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 self-end sm:self-center">
                    {isUnread ? (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-sm transition hover:bg-surface active:scale-95"
                        onClick={() => handleMarkRead(notification.id)}
                        type="button"
                      >
                        <CheckCheck size={14} className="text-brand" />
                        Mark read
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-subtle">
                        <CheckCircle2 size={13} className="text-emerald-500" /> Done
                      </span>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {!filteredNotifications.length && !isLoading ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center shadow-card">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-brand">
              <Bell size={24} />
            </div>
            <div className="mt-3 text-base font-bold text-ink">No alerts right now</div>
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
              {activeTab !== "all" || typeFilter
                ? "No alerts match the active filter criteria. Try viewing 'All Alerts'."
                : "Real-time alerts for customer purchases, inventory stock thresholds, and payment updates will be delivered here automatically."}
            </p>
          </div>
        ) : null}

        {/* Show More Button if list is long */}
        {remainingCount > 0 ? (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setDisplayLimit((prev) => prev + 12)}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-xs font-bold text-ink shadow-card transition hover:bg-surface active:scale-95"
            >
              <span>Show {remainingCount} more alerts</span>
              <ChevronDown size={14} />
            </button>
          </div>
        ) : visibleNotifications.length > 8 ? (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setDisplayLimit(8)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
            >
              <span>Collapse to top 8</span>
              <ChevronUp size={13} />
            </button>
          </div>
        ) : null}
      </div>

      {/* Collapsible Customer Automated Confirmations (Clean Progressive Disclosure) */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <button
          type="button"
          onClick={() => setIsSettingsExpanded((v) => !v)}
          className="flex w-full items-center justify-between p-5 text-left transition hover:bg-surface/50"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Automated Customer Confirmations</h2>
              <p className="mt-0.5 text-xs text-muted">
                Control the automatic emails & WhatsApp receipts customers receive after ordering.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink">
            <span>{isSettingsExpanded ? "Hide Settings" : "Configure Settings"}</span>
            {isSettingsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        <AnimatePresence>
          {isSettingsExpanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="border-t border-line bg-slate-50/50 p-5 sm:p-6"
            >
              <OrderMessageSettings tenantId={selectedTenant.id} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}


