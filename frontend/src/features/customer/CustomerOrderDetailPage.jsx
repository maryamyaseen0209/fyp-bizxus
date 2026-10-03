import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, CreditCard, Receipt } from "lucide-react";

import { CustomerPaymentInstructions } from "../../components/payments/CustomerPaymentInstructions.jsx";
import { getDefaultPaymentMethod } from "../../components/payments/paymentMethods.js";
import { PaymentProofBadge, PaymentStatusBadge } from "../../components/payments/PaymentStatusBadge.jsx";
import { getCustomerOrderReceiptLink, orderReceiptUrl, getCustomerPaymentReceiptHtml, getCustomerTransaction, reorderCustomerTransaction, resolveUploadUrl, submitCustomerPaymentProof, syncCustomerStripeCheckout } from "../../services/customerPortalApi.js";
import { capitalize, formatTransactionType } from "../../utils/transaction.js";
import { isOnlinePaymentMethod, isOtpPaymentMethod, startOnlinePayment } from "../../services/paymentRedirect.js";
import { useCustomer } from "../../context/CustomerContext.jsx";
import { WalletOtpDialog } from "./WalletOtpDialog.jsx";
import { SectionTitle } from "../../components/ui/SectionTitle.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";
import { OrderJourney, OrderStatusPill, orderStatusLabel } from "./shopUi.jsx";

// Three of each. A customer who paid for an order is entitled to check every line, so these only
// ever hide a tail — the receipt link stays prominent and the expand state names the count held
// back, so nothing is concealed.
const ITEM_PREVIEW = 3;
const ATTEMPT_PREVIEW = 3;

export function CustomerOrderDetailPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [proofDraft, setProofDraft] = useState({ amount: "", method: "", referenceNumber: "", notes: "", proofFile: null });
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isStartingStripe, setIsStartingStripe] = useState(false);
  const [isSyncingStripe, setIsSyncingStripe] = useState(false);
  const [openingReceiptId, setOpeningReceiptId] = useState("");
  const syncedReturnRef = useRef("");
  // The emailed-code flow finishes on this page instead of leaving for a gateway.
  const [otpMethod, setOtpMethod] = useState(null);
  const [expandedItems, setExpandedItems] = useState(false);
  const [expandedAttempts, setExpandedAttempts] = useState(false);
  const { customer } = useCustomer();

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  // Checkout sends the customer here with ?pay=<method> when the chosen wallet settles
  // by emailed code. Opening the dialog on arrival keeps "place order" and "pay" feeling
  // like one step, the way a redirect gateway does.
  useEffect(() => {
    if (!order || otpMethod) return;
    const requested = new URLSearchParams(location.search).get("pay");
    if (!requested) return;
    const details = (order.paymentInstructions?.methods || []).find((entry) => entry.code === requested);
    if (details && isOtpPaymentMethod(details) && order.paymentStatus !== "paid") {
      setOtpMethod(details);
    }
  }, [order, otpMethod, location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "stripe_success") {
      const sessionId = params.get("session_id") || "";
      const syncKey = `${orderId}:${sessionId || "return"}`;
      if (syncedReturnRef.current === syncKey) return;
      syncedReturnRef.current = syncKey;
      syncStripeReturn(sessionId);
    }
    if (params.get("payment") === "stripe_cancelled") {
      setError("Stripe payment was cancelled. You can try again or choose another payment method.");
    }
    // JazzCash and Easypaisa settle server-side before redirecting here, so the order is
    // already up to date and only the confirmation still needs showing.
    const gatewayResult = params.get("payment");
    if (gatewayResult === "success") {
      setMessage("Payment received. Your order is now marked paid.");
    }
    if (gatewayResult === "cancelled") {
      setError("The payment was cancelled. You can try again or choose another payment method.");
    }
    if (gatewayResult === "failed") {
      setError("The payment could not be confirmed. Nothing was charged. Please try again.");
    }
  }, [location.search]);

  async function loadOrder() {
    // A 404 or 403 used to leave "Loading transaction..." on screen forever. This is
    // where customers land after checkout and after every gateway redirect, so a
    // permanent spinner is the worst possible outcome here.
    let data;
    try {
      data = await getCustomerTransaction(orderId);
      setLoadError("");
    } catch (requestError) {
      setLoadError(getApiErrorMessage(requestError, "This order could not be loaded."));
      return;
    }
    setOrder(data);
    setProofDraft((current) => ({
      ...current,
      amount: current.amount || data.paymentSummary?.balance || data.pricing?.total || "",
      method: current.method || data.paymentPreference?.method || getDefaultPaymentMethod(data.paymentInstructions || {}),
    }));
  }

  async function syncStripeReturn(sessionId) {
    setIsSyncingStripe(true);
    setMessage("Stripe payment completed. Syncing payment status...");
    setError("");
    try {
      const data = await syncCustomerStripeCheckout(orderId, { sessionId });
      if (data.providerStatus === "paid") {
        setMessage("Stripe payment confirmed. Your order is now marked paid.");
      } else {
        setMessage(`Stripe checkout was checked. Current Stripe status: ${data.providerStatus || "pending"}.`);
      }
      await loadOrder();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Stripe payment completed, but we could not sync the status yet. It may update when the webhook arrives."));
      setMessage("");
    } finally {
      setIsSyncingStripe(false);
    }
  }

  async function submitProof(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmittingProof(true);
    try {
      await submitCustomerPaymentProof(order.id, {
        ...proofDraft,
        amount: Number(proofDraft.amount || 0),
      });
      setMessage("Payment proof submitted. The business owner will verify it soon.");
      setProofDraft((current) => ({ ...current, referenceNumber: "", notes: "", proofFile: null }));
      await loadOrder();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to submit payment proof."));
    } finally {
      setIsSubmittingProof(false);
    }
  }

  // Covers Stripe, JazzCash, and Easypaisa. It is also the retry path when a customer
  // abandons a payment or the redirect fails, so it must work for every online method.
  async function startOnlineCheckout(method) {
    setMessage("");
    setError("");
    const details = (order.paymentInstructions?.methods || []).find((entry) => entry.code === method) || null;
    // A wallet configured for emailed codes stays here; everything else leaves for a
    // hosted page. The server tells us which through the method's `flow`.
    if (isOtpPaymentMethod(details)) {
      setOtpMethod(details);
      return;
    }
    setIsStartingStripe(true);
    try {
      await startOnlinePayment(order.id, method, details);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to open the payment page."));
      setIsStartingStripe(false);
    }
  }

  async function handleOtpPaid(result) {
    if (result?.transaction) {
      setOrder(result.transaction);
    }
    setMessage("Payment confirmed. Your order is marked as paid.");
    await loadOrder();
  }

  // The order receipt covers the whole order; the payment receipt below covers one
  // payment. Opened in a tab rather than fetched, because the server renders it and the
  // same URL is what goes out in the confirmation email.
  async function openOrderReceipt() {
    setError("");
    try {
      const { receiptToken } = await getCustomerOrderReceiptLink(order.id);
      window.open(orderReceiptUrl(receiptToken), "_blank", "noopener");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to open the receipt."));
    }
  }

  async function openReceipt(paymentRecordId) {
    setOpeningReceiptId(paymentRecordId);
    setError("");
    try {
      const html = await getCustomerPaymentReceiptHtml(order.id, paymentRecordId);
      openReceiptWindow(html);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to open payment receipt."));
    } finally {
      setOpeningReceiptId("");
    }
  }

  if (!order && loadError) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
        <div className="font-bold text-ink">This order is not available</div>
        <p className="mt-1 text-sm text-muted">{loadError}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="ui-btn-primary" type="button" onClick={() => loadOrder()}>
            Try again
          </button>
          <Link className="ui-btn-secondary" to="/customer/orders">
            Back to my orders
          </Link>
        </div>
      </section>
    );
  }

  // Every gateway redirect lands here, so a bare text line flashed for a beat and then the whole
  // page jumped in. The skeleton reserves the shape of the header the order is about to fill.
  if (!order) {
    return (
      <section className="space-y-6" aria-busy="true">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="relative space-y-4">
            <div className="skeleton-shimmer h-4 w-32 rounded" />
            <div className="skeleton-shimmer h-9 w-56 rounded" />
            <div className="skeleton-shimmer h-4 w-40 rounded" />
            <div className="flex gap-3 pt-3">
              {[0, 1, 2, 3, 4].map((step) => (
                <div key={step} className="flex flex-1 flex-col items-center gap-2">
                  <div className="skeleton-shimmer h-7 w-7 rounded-full" />
                  <div className="skeleton-shimmer h-2.5 w-14 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="sr-only" role="status">Loading your order…</p>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="skeleton-shimmer h-64 w-full rounded-2xl" />
          <div className="skeleton-shimmer h-48 w-full rounded-2xl" />
        </div>
      </section>
    );
  }

  const paymentMethods = order.paymentInstructions?.methods || [];
  const selectedMethod = proofDraft.method || order.paymentPreference?.method || getDefaultPaymentMethod(order.paymentInstructions || {});
  const settledStatuses = ["paid", "cod", "refunded"];
  const isOnlineMethod = isOnlinePaymentMethod(selectedMethod);
  const canPayOnline = isOnlineMethod && !settledStatuses.includes(order.paymentStatus);
  // A gateway confirms its own payments, so asking the customer for a reference to be
  // verified by hand only applies to the offline methods.
  const canSubmitProof = selectedMethod && !isOnlineMethod && selectedMethod !== "cod" && !settledStatuses.includes(order.paymentStatus);

  // A wholesale order can carry forty lines, and a customer who paid for them is entitled to see
  // them — so this collapses only a long tail, never the whole list, and says how many are held
  // back. Payment attempts are capped lower because the newest one is what matters and the rest
  // is a paper trail.
  const itemsShown = expandedItems ? order.items : (order.items || []).slice(0, ITEM_PREVIEW);
  const hiddenItemCount = Math.max(0, (order.items || []).length - itemsShown.length);
  const paymentRecords = order.paymentRecords || [];
  const attemptsShown = expandedAttempts ? paymentRecords : paymentRecords.slice(0, ATTEMPT_PREVIEW);
  const hiddenAttemptCount = paymentRecords.length - attemptsShown.length;
  const selectedMethodDetails = paymentMethods.find((method) => method.code === selectedMethod) || null;
  const onlineMethodLabel = selectedMethodDetails?.label || "the payment page";
  const nextAction =
    canPayOnline
      ? `Pay online with ${onlineMethodLabel}`
      : canSubmitProof
        ? "Submit payment proof"
        : order.paymentStatus === "paid"
          ? "Payment complete"
          : selectedMethod === "cod"
            ? "Pay cash on delivery"
            : "Track status";

  return (
    <section className="space-y-6">
      {otpMethod ? (
        <WalletOtpDialog
          order={order}
          method={otpMethod}
          customerEmail={customer?.email || ""}
          onClose={() => setOtpMethod(null)}
          onPaid={handleOtpPaid}
        />
      ) : null}
      {/* Was a purple-tinted panel whose only content was a "Next step" sentence. The status was
          a word in a table cell on the orders list; here, on the page someone opens specifically
          to find out what is happening, it is a rail that fills as the order advances.

          Flat white with hairline borders. Everything else on this page is white on white, so a
          coloured band here made the header look like it belonged to a different product. */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="text-sm font-semibold text-brand transition hover:text-brand-hover" to="/customer/orders">
            ← Back to orders
          </Link>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ui-btn-secondary !py-2 !text-xs" onClick={openOrderReceipt}>
              View receipt
            </button>
            <button
              type="button"
              className="ui-btn-secondary !py-2 !text-xs"
              onClick={async () => {
                // The orders list wraps its reorder button; this one did not, so a failure
                // here was an unhandled rejection and a button that appeared to do nothing.
                setError("");
                try {
                  const result = await reorderCustomerTransaction(order.id);
                  setMessage(`Items were added back to your cart for ${result.tenantSlug}.`);
                } catch (requestError) {
                  setError(getApiErrorMessage(requestError, "That order could not be added to your cart."));
                }
              }}
            >
              Reorder these items
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-line-soft pb-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Order</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{order.transactionNumber}</h1>
            <p className="mt-1 text-sm text-muted">Placed {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OrderStatusPill status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>

        <OrderJourney status={order.status} paymentStatus={order.paymentStatus} className="pt-5" />
      </div>
      {/* A confirmation here is the result of something the customer just did — a payment
          landing, a proof going through — so it stays inline and readable rather than becoming a
          toast that disappears before they have read it. */}
      {message ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-approve-200 bg-approve-50 px-4 py-3 text-sm font-semibold text-approve-800">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          {message}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-line bg-white p-5 shadow-card">
            <SectionTitle>Items</SectionTitle>
            {/* Each line gets a quantity badge rather than the sentence "Qty: 2", and the rows
                are numbered — on an order for twelve things from three businesses the count is
                how a shopper checks nothing was missed. */}
            <div className="mt-4 space-y-3">
              {itemsShown.map((item, index) => (
                <div
                  key={`${order.id}-${item.itemId}`}
                  className="flex items-center gap-4 rounded-xl border border-line-soft bg-surface/60 p-4 transition hover:border-brand-200 hover:bg-white"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-brand shadow-sm ring-1 ring-line">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{item.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand ring-1 ring-brand-100">
                        {item.quantity} × {item.unitPrice ?? "—"}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-bold text-ink">{item.subtotal}</div>
                </div>
              ))}

              {hiddenItemCount ? (
                <div className="border-t border-line-soft pt-3">
                  <button
                    type="button"
                    className="ui-btn-secondary !py-2 !text-xs"
                    onClick={() => setExpandedItems(true)}
                  >
                    Show all {hiddenItemCount} more {hiddenItemCount === 1 ? "item" : "items"}
                  </button>
                  <p className="mt-1.5 text-xs text-muted">
                    Showing {itemsShown.length} of {order.items.length}. Your receipt lists every
                    line.
                  </p>
                </div>
              ) : null}

              {expandedItems && (order.items || []).length > ITEM_PREVIEW ? (
                <div className="border-t border-line-soft pt-3">
                  <button
                    type="button"
                    className="ui-btn-secondary !py-2 !text-xs"
                    onClick={() => setExpandedItems(false)}
                  >
                    Show fewer items
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Payment. The amount and the single next action lead, because someone who opens this
              page to pay wants to know how much and how — not to read a form caption first.
              Exactly one of the three routes below can ever be live, so they are laid out as
              three labelled routes rather than three competing panels. */}
          <section className="rounded-xl border border-line bg-white p-5 shadow-card">
            <div className="flex flex-col gap-3 border-b border-line-soft pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">Payment</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {order.paymentStatus === "paid"
                    ? "This order is settled. No further payment is needed."
                    : `Next step: ${nextAction}`}
                </p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                  {order.paymentStatus === "paid" ? "Paid" : "Amount to pay"}
                </div>
                <div className="mt-0.5 text-xl font-extrabold tracking-tight text-ink">
                  {order.paymentSummary?.balance || order.pricing?.total}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PaymentStatusBadge status={order.paymentStatus} />
              <PaymentProofBadge summary={order.paymentProofSummary} />
            </div>

            {canPayOnline ? (
              /* Route 1 — a hosted gateway. One button, one explanation of where it goes. */
              <div className="mt-4 rounded-xl border border-line bg-surface/60 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <CreditCard size={15} className="text-brand" />
                  Pay online with {onlineMethodLabel}
                </div>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  You will be taken to the {onlineMethodLabel} payment page and brought back here
                  when it is done.
                  {selectedMethod === "stripe_test" && selectedMethodDetails?.mode !== "live"
                    ? " Use card 4242 4242 4242 4242 with any future expiry and CVC."
                    : ""}
                </p>
                {selectedMethodDetails?.simulated ? (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    Simulated gateway — no real money moves.
                  </p>
                ) : null}
                <button
                  type="button"
                  className="ui-btn-primary mt-3"
                  disabled={isStartingStripe}
                  onClick={() => startOnlineCheckout(selectedMethod)}
                >
                  {isStartingStripe ? "Opening payment page…" : `Pay with ${onlineMethodLabel}`}
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : null}

            {isSyncingStripe ? (
              <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-800">
                Checking Stripe payment status…
              </p>
            ) : null}

            {canSubmitProof ? (
              /* Route 2 — a manual transfer the business verifies by hand. Grouped so the amount
                 and method sit together at the top, and the reference and screenshot together
                 below, which is the order they are filled in. */
              <form className="mt-4" onSubmit={submitProof}>
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Receipt size={15} className="text-brand" />
                  Send proof of payment
                </div>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  For bank, JazzCash or Easypaisa transfers. The business verifies it by hand, so
                  your order stays unpaid until they do.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">Amount sent</span>
                    <input className="form-input" min="1" required type="number" value={proofDraft.amount} onChange={(event) => setProofDraft((current) => ({ ...current, amount: event.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">Paid with</span>
                    <select className="form-input" value={selectedMethod} onChange={(event) => setProofDraft((current) => ({ ...current, method: event.target.value }))}>
                      {paymentMethods.filter((method) => method.code !== "cod").map((method) => (
                        <option key={method.code} value={method.code}>{method.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">Reference or transaction ID</span>
                    <input className="form-input" placeholder="JazzCash / Easypaisa / bank reference" value={proofDraft.referenceNumber} onChange={(event) => setProofDraft((current) => ({ ...current, referenceNumber: event.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">Screenshot</span>
                    <input className="form-input" accept="image/*" type="file" onChange={(event) => setProofDraft((current) => ({ ...current, proofFile: event.target.files?.[0] || null }))} />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-ink">Note for the business</span>
                    <textarea className="form-input min-h-20" placeholder="Optional" value={proofDraft.notes} onChange={(event) => setProofDraft((current) => ({ ...current, notes: event.target.value }))} />
                  </label>
                </div>

                <button className="ui-btn-primary mt-4" disabled={isSubmittingProof}>
                  {isSubmittingProof ? "Submitting…" : "Submit proof for verification"}
                </button>
              </form>
            ) : !canPayOnline ? (
              /* Route 3 — nothing owed. Said plainly, because the absence of a form here is
                 otherwise indistinguishable from the page having failed to load one. */
              <p className="mt-4 text-sm leading-6 text-muted">
                {order.paymentStatus === "paid"
                  ? "This order is already marked paid, so there is nothing to submit."
                  : selectedMethod === "cod"
                    ? "Cash on delivery — the business will collect payment when your order arrives, so there is nothing to submit."
                    : "No payment proof is needed for this order right now."}
              </p>
            ) : null}

            {order.paymentInstructions && (canPayOnline || canSubmitProof) ? (
              <div className="mt-5 border-t border-line-soft pt-4">
                <CustomerPaymentInstructions
                  compact
                  options={order.paymentInstructions}
                  selectedMethod={order.paymentPreference?.method || order.paymentInstructions?.defaultMethod}
                />
              </div>
            ) : null}
          </section>

          {/* Proof history. A flat list of records rather than a stack of tinted cards — these
              are reference numbers to be matched against a bank statement, so the values need
              to read cleanly rather than sit inside decoration. */}
          <section className="rounded-xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-base font-bold text-ink">Payment attempts</h2>
            {/* The ternary wraps ONLY the list. Sibling `{...}` blocks cannot sit inside a
                ternary's parenthesised branch — that is a parse error, not a style choice — so
                the expanders live after it. */}
            {paymentRecords.length ? (
              <ul className="mt-4 divide-y divide-line-soft">
                {attemptsShown.map((record) => (
                  <li key={record.id} className="flex flex-col gap-3 py-3.5 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-ink">{record.methodLabel || record.method}</span>
                        <PaymentStatusBadge compact status={record.status} />
                      </div>
                      <dl className="mt-1.5 grid gap-x-5 gap-y-1 text-xs">
                        <div className="flex gap-2">
                          <dt className="text-muted">Reference</dt>
                          <dd className="font-semibold text-ink">{record.referenceNumber || "Not provided"}</dd>
                        </div>
                        {record.notes ? (
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-muted">Note</dt>
                            <dd className="text-ink">{record.notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {record.screenshotUrl ? (
                          <a className="text-xs font-semibold text-brand hover:underline" href={resolveUploadUrl(record.screenshotUrl)} target="_blank" rel="noreferrer">
                            View screenshot
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="text-xs font-semibold text-brand hover:underline disabled:opacity-60"
                          disabled={openingReceiptId === record.id}
                          onClick={() => openReceipt(record.id)}
                        >
                          {openingReceiptId === record.id ? "Opening…" : "Open receipt"}
                        </button>
                      </div>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <div className="text-sm font-bold text-ink">PKR {Number(record.amount || 0).toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted">No payment has been attempted for this order yet.</p>
            )}

            {hiddenAttemptCount ? (
              <div className="mt-3 border-t border-line-soft pt-3">
                <button
                  type="button"
                  className="ui-btn-secondary !py-2 !text-xs"
                  onClick={() => setExpandedAttempts(true)}
                >
                  Show all {hiddenAttemptCount} earlier {hiddenAttemptCount === 1 ? "attempt" : "attempts"}
                </button>
                <p className="mt-1.5 text-xs text-muted">
                  Showing {attemptsShown.length} of {paymentRecords.length}.
                </p>
              </div>
            ) : null}

            {expandedAttempts && hiddenAttemptCount ? (
              <div className="mt-3 border-t border-line-soft pt-3">
                <button
                  type="button"
                  className="ui-btn-secondary !py-2 !text-xs"
                  onClick={() => setExpandedAttempts(false)}
                >
                  Show fewer attempts
                </button>
              </div>
            ) : null}
          </section>
        </div>

        {/* Facts about the order itself. Sticky, because it is the reference someone scrolls back
            to while reading the payment section — but with no coloured banner in it. The "next
            step" used to live here as a blue box, which meant the actionable thing on the page
            was in the least findable position, after the totals. It now leads the payment card. */}
        <aside className="lg:sticky lg:top-6">
          <div className="rounded-xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-base font-bold text-ink">Order details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="Type" value={capitalize(formatTransactionType(order.transactionType))} />
              {/* Was the raw API value, capitalised — so "Awaiting payment" here, where the rest
                  of the app says "Waiting for payment". Same field, two vocabularies. */}
              <InfoRow label="Status" value={orderStatusLabel(order.status)} />
              <InfoRow label="Payment" value={order.paymentPreference?.methodLabel || "Not chosen"} />
              <InfoRow label="Placed via" value={capitalize(order.source || "-")} />
            </dl>

            <div className="mt-4 flex items-baseline justify-between border-t-2 border-line pt-3">
              <span className="text-sm font-bold text-ink">Total</span>
              <span className="text-xl font-extrabold tracking-tight text-ink">{order.pricing?.total}</span>
            </div>

            <div className="mt-4 rounded-lg bg-surface px-3 py-2.5 text-xs leading-5 text-muted">
              Your receipt is a separate document from your payment receipt. The receipt button at
              the top of this page covers the whole order; each attempt listed above has its own.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function openReceiptWindow(html) {
  const receiptWindow = window.open("", "_blank", "width=960,height=800");
  if (!receiptWindow) {
    throw new Error("Popup blocked. Please allow popups to view the receipt.");
  }
  receiptWindow.opener = null;
  receiptWindow.document.open();
  receiptWindow.document.write(html);
  receiptWindow.document.close();
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-line-soft pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="font-semibold capitalize text-ink">{value}</span>
    </div>
  );
}
