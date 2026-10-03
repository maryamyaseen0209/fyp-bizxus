import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { PaymentProofBadge, PaymentStatusBadge } from "../../components/payments/PaymentStatusBadge.jsx";
import { Toast } from "../../components/ui/motion.jsx";
import { getCustomerTransactions, reorderCustomerTransaction } from "../../services/customerPortalApi.js";
import { formatTransactionType } from "../../utils/transaction.js";
import { getApiErrorMessage } from "../../services/apiError.js";
import { ListSkeleton, OrderStatusPill, PageBanner, SHOP_IMAGES, ShowMore, WarmEmptyState, journeyStage, needsAttention } from "./shopUi.jsx";

// The server is asked for a generous window once, then the page reveals it in steps. Fetching
// page-by-page instead would mean the list grows under the reader and the scroll position jumps
// each time, which is worse than a deliberate button.
const ORDER_FETCH_LIMIT = 20;
const ORDER_PAGE_SIZE = 3;

export function CustomerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({});
  const [message, setMessage] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // A boolean, not a count: one click reveals every remaining order rather than the next step.
const [showAllOrders, setShowAllOrders] = useState(false);

  useEffect(() => {
    // A bare .then() rendered the "no orders yet" empty state to a customer who does
    // have orders, and left an unhandled rejection behind. The loading flag additionally
    // stops that same empty state being shown to a brand-new customer for the moment
    // before their (genuinely empty) history arrives.
    getCustomerTransactions({ page: 1, limit: ORDER_FETCH_LIMIT })
      .then((result) => {
        setOrders(result.items);
        setMeta(result.meta);
        setError("");
      })
      .catch((requestError) => setError(getApiErrorMessage(requestError, "Unable to load your orders.")))
      .finally(() => setIsLoading(false));
  }, []);

  async function reorder(order) {
    setMessage("");
    setError("");
    try {
      const result = await reorderCustomerTransaction(order.id);
      setMessage(`Added the items from ${order.transactionNumber} to your cart.`);
      return result;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "That order could not be added to your cart."));
    }
    return undefined;
  }

  const total = meta.total || 0;
  const awaitingAction = orders.filter((order) => needsAttention(order.paymentStatus)).length;

  // "Active" means not finished and not stopped. An order that has been delivered is done; one
  // that was cancelled will never move, so neither belongs in a "still moving" count.
  const activeOrders = orders.filter((order) => {
    const stage = journeyStage(order.status);
    return stage !== "stopped" && stage < 4;
  });

  // Sorted newest-first before slicing. The API already returns them that way, but relying on
  // that would make "the most recent 6" silently wrong if the ordering ever changed server-side —
  // and this page is read precisely to find the most recent order.
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );
  const visibleOrders = showAllOrders ? sortedOrders : sortedOrders.slice(0, ORDER_PAGE_SIZE);

  return (
    <section className="space-y-6">
      {/* Copy is written for the two people who land here: someone with history, and someone
          who has just signed up. "0 orders found" served neither — to a newcomer it reads as
          the platform failing to find their orders, which is both deflating and untrue. */}
      {/* One banner. The counts that used to sit here — total orders, and how many need
          attention — are duplicated by the "still moving" panel directly beneath it, so they are
          gone. The banner now carries only what the panel does not: the total, and the fact that
          receipts and reordering live here. */}
      <PageBanner
        eyebrow="Orders"
        title={isLoading ? "Your orders" : `${total} ${total === 1 ? "order" : "orders"}`}
        description={
          isLoading
            ? "Loading your orders…"
            : total
              ? "Every order keeps its receipt, payment status and delivery progress. Reorder any of it in one tap."
              : "Everything you order will appear here, with its receipt and delivery status."
        }
        meta={total ? [{ value: total, label: total === 1 ? "order" : "orders in total" }] : []}
        image={SHOP_IMAGES.orders}
      />

      {/* The answer to the question this page is actually opened for: "where is my order?" The
          alternative was scrolling a table hunting for one cell. Plain card, no wash behind it —
          this sits directly above a list of twenty rows and anything decorative here is noise. */}
      {!isLoading && orders.length ? (
        <section className="rounded-2xl border border-line bg-gradient-to-br from-white to-brand-50/60 p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-ink">
                {activeOrders.length
                  ? activeOrders.length === 1
                    ? "One order is still moving"
                    : `${activeOrders.length} orders are still moving`
                  : "Nothing in transit right now"}
              </h2>
              <p className="mt-1 max-w-lg text-sm leading-6 text-muted">
                {activeOrders.length
                  ? "Open one to see where it has reached. There is no need to keep checking — you will get a notification when it moves."
                  : "Every order you have placed has been completed. Anything new will appear here and in your notifications."}
              </p>
            </div>
            {awaitingAction ? (
              <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 ring-1 ring-orange-200">
                {awaitingAction} waiting on payment
              </span>
            ) : null}
          </div>

          {activeOrders.length ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {activeOrders.slice(0, 3).map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/customer/orders/${order.id}`}
                    className="flex h-full items-start justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{order.transactionNumber}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </span>
                    <OrderStatusPill status={order.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          {orders.length ? (
            <>
              <div className="grid gap-3 lg:hidden">
                {visibleOrders.map((order) => (
                  <article key={order.id} className="rounded-xl border border-line bg-white p-4 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link className="font-bold text-ink hover:text-brand" to={`/customer/orders/${order.id}`}>{order.transactionNumber}</Link>
                        <div className="mt-1 text-xs text-muted">{new Date(order.createdAt).toLocaleString()}</div>
                      </div>
                      <PaymentStatusBadge compact status={order.paymentStatus} />
                    </div>
                    <div className="mt-3">
                      <OrderStatusPill status={order.status} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-surface px-3 py-2">
                        <div className="text-xs text-muted">Order</div>
                        <div className="font-semibold text-ink">{formatTransactionType(order.transactionType)}</div>
                      </div>
                      <div className="rounded-lg bg-surface px-3 py-2">
                        <div className="text-xs text-muted">Total</div>
                        <div className="font-semibold text-ink">{order.pricing?.total}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link className="ui-btn-secondary !py-2" to={`/customer/orders/${order.id}`}>
                        {needsAttention(order.paymentStatus) ? "Pay / upload proof" : "View order"}
                        <ArrowRight size={14} />
                      </Link>
                      <button
                        type="button"
                        className="ui-btn-secondary !py-2"
                        onClick={() => reorder(order)}
                      >
                        Reorder
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-xl border border-line bg-white shadow-card lg:block">
                <table className="min-w-full divide-y divide-line text-sm">
                  <thead className="bg-surface">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-ink">Order</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink">Where it is</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink">Payment</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink">Total</th>
                      <th className="px-4 py-3 text-left font-semibold text-ink">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-white">
                    {visibleOrders.map((order) => (
                      <tr key={order.id} className="transition hover:bg-surface">
                        <td className="px-4 py-3">
                          <Link className="font-semibold text-ink hover:text-brand" to={`/customer/orders/${order.id}`}>{order.transactionNumber}</Link>
                          <div className="text-xs text-muted">{new Date(order.createdAt).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-3 text-muted">{formatTransactionType(order.transactionType)}</td>
                        <td className="px-4 py-3">
                          <OrderStatusPill status={order.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            <PaymentStatusBadge compact status={order.paymentStatus} />
                            <PaymentProofBadge summary={order.paymentProofSummary} />
                            {order.paymentPreference?.methodLabel ? <div className="text-xs text-muted">{order.paymentPreference.methodLabel}</div> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-ink">{order.pricing?.total}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link className="rounded-xl border border-line px-3 py-1.5 text-sm font-semibold text-ink" to={`/customer/orders/${order.id}`}>
                              {needsAttention(order.paymentStatus) ? "Pay / proof" : "View"}
                            </Link>
                            <button
                              className="rounded-xl border border-line px-3 py-1.5 text-sm font-semibold text-ink"
                              onClick={() => reorder(order)}
                            >
                              Reorder
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Twenty orders rendered at once meant the oldest — often a year old — sat far
                  enough down that nobody scrolled to it, while the two or three orders someone
                  actually opened this page for were buried in a table of the rest. Showing a
                  slice and naming the remainder keeps the recent orders findable. */}
              <ShowMore
                total={orders.length}
                shown={visibleOrders.length}
                expanded={showAllOrders}
                noun="orders"
                onToggle={() => setShowAllOrders((current) => !current)}
              />
            </>
          ) : !error ? (
            <WarmEmptyState
              image={SHOP_IMAGES.empty}
              title="No orders yet — and that is completely fine"
              body="When you order from a business it will show up here with its receipt, payment status and delivery progress."
              reassurance="You can reorder anything you have bought before with a single tap, so you never have to find the same items again."
              actionTo="/customer/marketplace"
              actionLabel="Browse the marketplace"
            />
          ) : null}
        </>
      )}

      {/* Reordering used to insert a banner above the list, pushing every row the shopper
          was reading down the page. It floats now, and clears itself. */}
      <Toast message={message} onDismiss={() => setMessage("")} />
    </section>
  );
}
