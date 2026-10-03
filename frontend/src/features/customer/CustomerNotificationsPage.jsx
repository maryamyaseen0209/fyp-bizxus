import { useEffect, useState } from "react";
import { Bell, CreditCard, MessageCircle, PackageCheck, Sparkles, Store, Truck } from "lucide-react";

import { ListSkeleton, PageBanner, SHOP_IMAGES, ShowMore, WarmEmptyState, notificationTypeLabel } from "./shopUi.jsx";
import { Stagger, StaggerItem } from "../../components/ui/motion.jsx";
import { getCustomerNotifications, markAllCustomerNotificationsRead, markCustomerNotificationRead } from "../../services/customerPortalApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";

// Fetched generously in one request, revealed in steps. Thirty cards is roughly four screens of
// near-identical rows; the reader almost always wants the newest handful and the odd older one.
const NOTIFICATION_FETCH_LIMIT = 30;
const NOTIFICATION_PAGE_SIZE = 3;

export function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // A boolean, not a count: one click reveals every remaining update rather than the next step.
const [showAllNotifications, setShowAllNotifications] = useState(false);

  useEffect(() => {
    refreshNotifications();
  }, []);

  async function refreshNotifications() {
    setError("");
    try {
      const result = await getCustomerNotifications({ page: 1, limit: NOTIFICATION_FETCH_LIMIT });
      setNotifications(result.items);
      setMeta(result.meta);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load notifications."));
    } finally {
      setIsLoading(false);
    }
  }

  // Optimistic removal.
  //
  // Marking as read used to wait for a round trip, and `markRead` then refetches the whole list.
  // That made the button feel dead for a beat on a slow connection, and prompted a second click —
  // which the API rejects, and which surfaces as an error banner over an otherwise fine list. The
  // row is removed locally straight away; if the request fails it is put back and the error is
  // shown, so the page never ends up quietly disagreeing with the server.
  async function markRead(notificationId) {
    const previous = notifications;
    setNotifications((current) => current.filter((entry) => entry.id !== notificationId));
    setMeta((current) => ({ ...current, unread: Math.max(0, (current.unread || 1) - 1) }));
    try {
      await markCustomerNotificationRead(notificationId);
    } catch (requestError) {
      setNotifications(previous);
      setMeta((current) => ({ ...current, unread: (current.unread || 0) + 1 }));
      setError(getApiErrorMessage(requestError, "Unable to mark that notification as read."));
    }
  }

  // Mark-all stays server-authoritative rather than optimistic. It is a bulk action over a list
  // the customer cannot see the whole of, so the summary count has to come from the server
  // rather than being guessed locally and then corrected.
  async function markAllRead() {
    try {
      await markAllCustomerNotificationsRead();
      await refreshNotifications();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to mark all notifications as read."));
    }
  }

  const unread = meta.unread || 0;

  // Slice first, then group by day — not the other way round. Grouping all thirty and collapsing
  // whole days would hide a day that held the one update the reader came for, and would make the
  // per-day counts claim items that were not on screen. Slicing first means every day heading
  // honestly describes the rows beneath it.
  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );
  const visibleNotifications = showAllNotifications
    ? sortedNotifications
    : sortedNotifications.slice(0, NOTIFICATION_PAGE_SIZE);
  // Recomputed per render so a mark-as-read re-groups immediately rather than after a refetch.
  const dayGroups = isLoading ? [] : groupByDay(visibleNotifications);

  return (
    <section className="space-y-6">
      {/* One banner, and the three-figure tally beneath it is gone: the unread count appeared in both
          places, twice saying the same number to a reader who only wanted to know how many
          messages were waiting. What survives is the split between unread and read, which the
          banner cannot express. */}
      <PageBanner
        eyebrow="Updates"
        title={
          isLoading
            ? "Notifications"
            : unread
              ? unread === 1
                ? "One update is waiting for you"
                : `${unread} updates are waiting for you`
              : "You are all caught up"
        }
        description={
          isLoading
            ? "Checking for updates…"
            : unread
              ? "Order confirmations, payment receipts and delivery progress from the businesses you buy from."
              : "Order confirmations, payment receipts and delivery updates land here as they happen."
        }
        image={SHOP_IMAGES.orders}
      >
        {!isLoading && notifications.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-brand-100 pt-4">
            <span className="text-xs text-muted">
              <span className="text-sm font-extrabold text-ink">{notifications.length - unread}</span> read
            </span>
            <button
              className="ml-auto rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45"
              onClick={markAllRead}
              disabled={unread === 0}
            >
              Mark all as read
            </button>
          </div>
        ) : null}
      </PageBanner>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        // Each day arrives in order rather than the whole fortnight appearing at once. Staggered
        // by day rather than by row: the headings are the landmarks, so they should be what the
        // eye follows.
        <Stagger className="space-y-5">
              {dayGroups.map((group) => (
                <StaggerItem key={group.label}>
            <section>
              {/* Day headings, sticky so a long list keeps its orientation while scrolling. */}
              <h2 className="sticky top-2 z-10 mb-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted shadow-sm ring-1 ring-line backdrop-blur">
                {group.label}
                <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand">{group.items.length}</span>
              </h2>

              <div className="space-y-2.5">
                {group.items.map((notification) => {
                  const unread = notification.status === "unread";
                  return (
                    <article
                      key={notification.id}
                      className={`group relative overflow-hidden rounded-xl p-4 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-lift ${
                        unread
                          ? "border border-brand-200 bg-gradient-to-r from-brand-50/90 to-white"
                          : "border border-line bg-white"
                      }`}
                    >
                      {/* A solid dot for unread, a hollow one for read. The row's left border and
                          tint already say "new", but a glance down a long list needs something
                          that survives at arm's length. */}
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-0 h-full w-1 ${
                          unread ? "bg-brand" : "bg-transparent"
                        }`}
                      />

                      {/* Each type gets its own mark, so an order update is distinguishable from
                          a payment one without reading the label above it. */}
                      <span
                        aria-hidden="true"
                        className={`absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-xl transition duration-300 group-hover:scale-110 ${
                          unread ? "bg-white text-brand shadow-sm ring-1 ring-brand-100" : "bg-surface text-subtle"
                        }`}
                      >
                        {notificationIcon(notification.type, 17)}
                      </span>

                      <div className="flex flex-col gap-3 pl-14 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
                              {notificationTypeLabel(notification.type)}
                            </span>
                          {unread ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand ring-1 ring-brand-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                              New
                            </span>
                          ) : null}
                          </div>
                          <div className={`mt-1.5 text-base font-bold ${unread ? "text-ink" : "text-muted"}`}>
                            {notification.title}
                          </div>
                          <div className="mt-1.5 text-sm leading-6 text-muted">{notification.message}</div>
                          <div className="mt-2 text-xs text-subtle">
                            {notification.tenant?.name ? `${notification.tenant.name} · ` : ""}
                            {new Date(notification.createdAt).toLocaleString()}
                          </div>
                        </div>

                        {unread ? (
                          <button
                            className="ui-btn-secondary shrink-0 self-start !py-2 !text-xs"
                            onClick={() => markRead(notification.id)}
                          >
                            Mark as read
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
                </StaggerItem>
              ))}
            </Stagger>
      )}

      {notifications.length ? (
        <ShowMore
          total={notifications.length}
          shown={visibleNotifications.length}
          expanded={showAllNotifications}
          noun="updates"
          onToggle={() => setShowAllNotifications((current) => !current)}
        />
      ) : null}

      {!isLoading && !error && !notifications.length ? (
        <WarmEmptyState
          icon={Bell}
          title="Nothing to read just yet"
          body="This is where a business tells you an order was received, a payment was confirmed, or a delivery is on its way."
          reassurance="You do not need to check back here constantly — we will keep this list, and your order page, up to date for you."
        />
      ) : null}
    </section>
  );
}

/**
 * Buckets notifications into "Today" / "Yesterday" / a date.
 *
 * Built from the browser's calendar rather than by subtracting 24 hours, because "Yesterday"
 * should mean yesterday even when the list spans a DST boundary or someone is reading at 1am.
 */
function groupByDay(notifications) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const buckets = new Map();

  for (const notification of notifications) {
    const created = new Date(notification.createdAt);
    // An unparseable timestamp falls into "Earlier" rather than producing "Invalid Date" as a
    // heading, which is what `toLocaleDateString` yields for a bad value.
    const label = Number.isNaN(created.getTime())
      ? "Earlier"
      : created >= startOfToday
        ? "Today"
        : created >= startOfYesterday
          ? "Yesterday"
          : created.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

    if (!buckets.has(label)) buckets.set(label, { label, items: [] });
    buckets.get(label).items.push(notification);
  }

  // "Earlier" is the only one with no natural order, and it is always last chronologically.
  return [...buckets.values()].sort((a, b) => {
    if (a.label === "Earlier") return 1;
    if (b.label === "Earlier") return -1;
    return a.label === "Today" ? -1 : b.label === "Today" ? 1 : 0;
  });
}

const NOTIFICATION_ICONS = {
  order_status: PackageCheck,
  order_created: Store,
  payment: CreditCard,
  payment_received: CreditCard,
  payment_confirmed: CreditCard,
  message: MessageCircle,
  chat: MessageCircle,
  review: Sparkles,
  promotion: Sparkles,
  offer: Sparkles,
  announcement: Sparkles,
  dispatch: Truck,
  out_for_delivery: Truck,
};

function notificationIcon(type, size) {
  const Icon = NOTIFICATION_ICONS[String(type || "")] || Bell;
  return <Icon size={size} strokeWidth={1.9} />;
}
