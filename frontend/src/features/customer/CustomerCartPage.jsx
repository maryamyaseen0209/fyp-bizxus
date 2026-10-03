import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Minus, Plus, Receipt, X } from "lucide-react";

import { DynamicForm } from "../../components/dynamic/DynamicForm.jsx";
import { getDefaultPaymentMethod, getSelectedPaymentMethod } from "../../components/payments/paymentMethods.js";
import { isOnlinePaymentMethod, startOnlinePayment } from "../../services/paymentRedirect.js";
import { createCustomerTransaction, getCustomerCart, removeCartItem, updateCartItem } from "../../services/customerPortalApi.js";
import { capitalize, formatTransactionLabel, formatTransactionSuccess, transactionTypeOptions } from "../../utils/transaction.js";
import { Toast } from "../../components/ui/motion.jsx";
import { Stagger, StaggerItem } from "../../components/ui/motion.jsx";
import { SHOP_IMAGES, PageBanner, WarmEmptyState } from "./shopUi.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

// Three lines: enough to recognise the basket at a glance without pushing the delivery form and
// the total down the page.
const CART_LINE_PREVIEW = 3;

export function CustomerCartPage() {
  const navigate = useNavigate();
  const [carts, setCarts] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState({});
  const [checkoutDrafts, setCheckoutDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // One flag for every business block, which is deliberate: a shopper comparing two long baskets
  // is almost always comparing their totals, and the totals are always visible regardless of what
  // the line lists are doing. Per-block expansion would just mean a reader has to re-collapse the
  // blocks they are done with.
  const [expandedLines, setExpandedLines] = useState(false);

  useEffect(() => {
    refreshCart().finally(() => setIsLoading(false));
  }, []);

  async function refreshCart() {
    // Without this the empty state was shown for a failed load, which is
    // indistinguishable from a genuinely empty cart.
    let data;
    try {
      data = await getCustomerCart();
      setLoadFailed(false);
    } catch (requestError) {
      setLoadFailed(true);
      setError(getApiErrorMessage(requestError, "Unable to load your cart."));
      return;
    }
    setCarts(data);
    setTransactionTypes((current) => {
      const next = { ...current };
      data.forEach((cart) => {
        if (!(cart.tenantId in next)) {
          next[cart.tenantId] = "auto";
        }
      });
      return next;
    });
    setCheckoutDrafts((current) => {
      const next = { ...current };
      data.forEach((cart) => {
        if (!(cart.tenantId in next)) {
          const defaultValues = Object.fromEntries(
            (cart.checkoutConfig?.transactionCustomFields || []).map((field) => [field.key, field.defaultValue ?? ""]),
          );
          next[cart.tenantId] = {
            fulfillmentType: cart.checkoutConfig?.defaultFulfillmentType || "none",
            paymentMethod: getDefaultPaymentMethod(cart.checkoutConfig?.paymentOptions || {}),
            addressLine1: "",
            addressCity: "",
            notes: "",
            customFields: defaultValues,
          };
        }
      });
      return next;
    });
  }

  // Lines, not items: one item can be in the cart twice with different variants.
  async function changeQuantity(lineRef, quantity) {
    // Clearing the box yields Number("") === 0, which the API rejects with a 422 and
    // the quantity silently snapped back with no explanation.
    const nextQuantity = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    setError("");
    try {
      await updateCartItem(lineRef, { quantity: nextQuantity });
      await refreshCart();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update that quantity."));
    }
  }

  async function removeItem(lineRef) {
    setError("");
    try {
      await removeCartItem(lineRef);
      await refreshCart();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to remove that item."));
    }
  }

  async function checkout(tenantId) {
    setMessage("");
    setError("");
    const draft = checkoutDrafts[tenantId] || {};
    try {
      const transaction = await createCustomerTransaction({
        tenantId,
        transactionType: transactionTypes[tenantId] || "auto",
        paymentMethod: draft.paymentMethod || undefined,
        fulfillment: {
          type: draft.fulfillmentType || "none",
          address:
            draft.fulfillmentType === "delivery"
              ? { line1: draft.addressLine1 || "", city: draft.addressCity || "" }
              : {},
        },
        notes: draft.notes || "",
        customFields: draft.customFields || {},
      });
      await refreshCart();

      // An online method continues straight to the gateway, so placing the order and
      // paying feel like one step. The order already exists at this point, which is what
      // the payment is recorded against and what the customer returns to.
      if (isOnlinePaymentMethod(draft.paymentMethod)) {
        const cartConfig = carts.find((cart) => cart.tenantId === tenantId)?.checkoutConfig;
        const methodDetails = (cartConfig?.paymentOptions?.methods || []).find((entry) => entry.code === draft.paymentMethod) || null;
        setMessage("Order placed. Taking you to the payment page...");
        try {
          const outcome = await startOnlinePayment(transaction.id, draft.paymentMethod, methodDetails);
          // The emailed-code flow does not leave the app, so there is nothing to wait
          // for here: send the customer to the order, where the dialog opens.
          if (outcome?.otp) {
            navigate(`/customer/orders/${transaction.id}?pay=${draft.paymentMethod}`);
            return;
          }
          return;
        } catch (paymentError) {
          // The order exists either way, so this must not read like the checkout failed.
          // Send them to it, where the payment can be retried.
          setMessage("");
          setError(
            getApiErrorMessage(paymentError, "Your order was placed, but the payment page could not be opened. Open the order to try paying again."),
          );
          navigate(`/customer/orders/${transaction.id}`);
          return;
        }
      }

      setMessage(formatTransactionSuccess(transaction));
      navigate(`/customer/orders/${transaction.id}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to checkout cart."));
    }
  }

  function updateCheckoutDraft(tenantId, key, value) {
    setCheckoutDrafts((current) => ({
      ...current,
      [tenantId]: {
        fulfillmentType: current[tenantId]?.fulfillmentType || "none",
        paymentMethod: current[tenantId]?.paymentMethod || "",
        addressLine1: current[tenantId]?.addressLine1 || "",
        addressCity: current[tenantId]?.addressCity || "",
        notes: current[tenantId]?.notes || "",
        customFields: current[tenantId]?.customFields || {},
        [key]: value,
      },
    }));
  }

  function updateCheckoutCustomFields(tenantId, values) {
    setCheckoutDrafts((current) => ({
      ...current,
      [tenantId]: {
        fulfillmentType: current[tenantId]?.fulfillmentType || "none",
        paymentMethod: current[tenantId]?.paymentMethod || "",
        addressLine1: current[tenantId]?.addressLine1 || "",
        addressCity: current[tenantId]?.addressCity || "",
        notes: current[tenantId]?.notes || "",
        customFields: values,
      },
    }));
  }

  // Derived once, from the same per-line arithmetic the cards use, so the headline total can
  // never drift out of step with the sum of the totals shown beneath it.
  const cartSummary = carts.reduce(
    (summary, cart) => {
      const total = cart.itemsDetailed.reduce(
        (sum, item) => sum + Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity || 0),
        0,
      );
      return {
        total: summary.total + total,
        items: summary.items + cart.itemsDetailed.length,
        businesses: summary.businesses + 1,
      };
    },
    { total: 0, items: 0, businesses: 0 },
  );

  return (
    <section className="space-y-4">
      {/* One banner carrying the only two facts that matter here — how much is in the cart, and
          what it comes to. It used to be a card with a heading, a sentence and a boxed total,
          which is three boxes for two numbers. */}
      <PageBanner
        eyebrow="Cart"
        title={
          isLoading && !carts.length
            ? "Your cart"
            : cartSummary.items
              ? `${cartSummary.items} ${cartSummary.items === 1 ? "item" : "items"} from ${cartSummary.businesses} ${cartSummary.businesses === 1 ? "business" : "businesses"}`
              : "Your cart is empty"
        }
        description={
          cartSummary.items
            ? "Each business is confirmed, paid and delivered separately, so each one gets its own delivery and payment below."
            : "Browse the marketplace and add what you need — you can order from as many businesses as you like."
        }
        meta={cartSummary.items ? [{ value: cartSummary.total, label: "estimated total" }] : []}
        image={SHOP_IMAGES.cart}
      />

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      {/* Staggered, so three businesses arrive in order rather than as one block. Each block
          animates itself on mount, which is why expanding a line list cannot strand a card. */}
      <Stagger className="space-y-3">
        {carts.map((cart) => {
          const total = cart.itemsDetailed.reduce((sum, item) => sum + (Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity || 0)), 0);
          const checkoutConfig = cart.checkoutConfig || {};
          const allowedFulfillmentTypes = checkoutConfig.allowedFulfillmentTypes || ["none"];
          const checkoutDraft = checkoutDrafts[cart.tenantId] || {
            fulfillmentType: checkoutConfig.defaultFulfillmentType || "none",
            paymentMethod: getDefaultPaymentMethod(checkoutConfig.paymentOptions || {}),
            addressLine1: "",
            addressCity: "",
            notes: "",
            customFields: {},
          };

          // One click reveals every remaining line, not the next few.
          const visibleLines = expandedLines
            ? cart.itemsDetailed
            : cart.itemsDetailed.slice(0, CART_LINE_PREVIEW);
          const hiddenLineCount = cart.itemsDetailed.length - visibleLines.length;

          // Payment is a plain select here rather than the full panel, so the chosen method's
          // consequence is reduced to one sentence. Falls back to an empty list so the select
          // renders nothing rather than an empty dropdown when a business has configured no
          // methods at all.
          const paymentOptions = checkoutConfig.paymentOptions || {};
          const paymentMethods = paymentOptions.methods || [];
          const selectedPayment = getSelectedPaymentMethod(paymentOptions, checkoutDraft.paymentMethod || "");
          const selectedPaymentHint = selectedPayment?.code === "cod"
            ? "Pay the business in cash when your order arrives."
            : selectedPayment?.isOnline
              ? `You will be taken to ${selectedPayment.label} to pay, then brought back here.`
              : selectedPayment?.requiresOwnerApproval
                ? "Send your reference to the business — it stays unpaid until they verify it."
                : "";

          // The button has to agree with the order type the shopper picked above it, and say so
          // out loud — a "Place order" button on a booking is the kind of mismatch that makes
          // someone hesitate at the last step.
          const chosenType = transactionTypes[cart.tenantId] || "auto";
          const isStandardOrder = chosenType === "auto" || chosenType === "order";
          const checkoutLabel = isStandardOrder ? "Place order" : capitalize(formatTransactionLabel(chosenType));
          const typeNote = isStandardOrder
            ? null
            : `You are placing a ${formatTransactionLabel(chosenType).toLowerCase()} for this business.`;

return (
            /* Strictly three bands, read top to bottom: who this order is for, what is in it,
               then the details and the commit. No avatar, no "add more", no separate summary
               footer, no reassurance paragraphs — nothing that is not either something the
               shopper chose or something they must now decide. */
            <StaggerItem key={cart.id}>
            <section className="overflow-hidden rounded-xl border border-line bg-white shadow-card transition duration-300 hover:shadow-lift">
              <div className="flex items-baseline justify-between gap-3 border-b border-line-soft px-4 py-2.5">
                <h2 className="truncate text-sm font-bold text-ink">{cart.tenant?.name || "Business"}</h2>
                <span className="shrink-0 text-xs text-muted">
                  {cart.itemsDetailed.length} {cart.itemsDetailed.length === 1 ? "item" : "items"}
                </span>
              </div>

              {typeNote ? (
                <p className="border-b border-line-soft bg-brand-50/60 px-4 py-1.5 text-[11px] font-semibold text-brand">
                  {typeNote}
                </p>
              ) : null}

              {/* What they added. Name and variant on the left, the arithmetic on the right, and
                  the two controls needed to change it. The unit price and quantity are folded
                  into one muted expression rather than stacked, so a line is one line. */}
              <ul className="divide-y divide-line-soft">
                {visibleLines.map((item) => (
                  <li
                    key={`${cart.id}-${item.lineId || item.id}`}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-ink">
                        {item.name}
                        {item.selectedVariantName ? (
                          <span className="ml-1.5 text-brand">{item.selectedVariantName}</span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-muted">
                        {item.currency} {item.unitPrice ?? item.price}
                        {Number(item.quantity) > 1 ? ` × ${item.quantity}` : ""}
                      </div>
                    </div>

                    <div className="shrink-0 text-right text-sm font-bold text-ink">
                      {Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity || 0)}
                    </div>

                    {/* Stepper rather than a free-text number box. Typing into a number input is
                        how you send 0, a decimal or a negative, all of which the API rejects
                        with a 422 the shopper never sees explained. */}
                    <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md border border-line">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="px-1.5 py-1 text-ink transition hover:bg-surface disabled:opacity-30"
                        disabled={Number(item.quantity) <= 1}
                        onClick={() => changeQuantity(item.lineId || item.id, Number(item.quantity) - 1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-7 border-x border-line py-1 text-center text-xs font-bold text-ink">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        className="px-1.5 py-1 text-ink transition hover:bg-surface disabled:opacity-30"
                        disabled={Number(item.quantity) >= 99}
                        onClick={() => changeQuantity(item.lineId || item.id, Number(item.quantity) + 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      aria-label={`Remove ${item.name} from cart`}
                      className="shrink-0 rounded-md p-1 text-subtle transition hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeItem(item.lineId || item.id)}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {hiddenLineCount ? (
                <div className="px-4 py-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand transition hover:text-brand-hover"
                    onClick={() => setExpandedLines(true)}
                  >
                    Show all {hiddenLineCount} more {hiddenLineCount === 1 ? "line" : "lines"}
                  </button>
                </div>
              ) : null}

              {expandedLines && hiddenLineCount ? (
                <div className="px-4 pb-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand transition hover:text-brand-hover"
                    onClick={() => setExpandedLines(false)}
                  >
                    Show fewer lines
                  </button>
                </div>
              ) : null}

              {/* Details. Address and city only exist when delivery is actually selected, so a
                  pickup order shows one control instead of three empty ones. */}
              <div className="grid gap-2 border-t border-line-soft px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Delivery</span>
                  <select
                    className="form-input !py-1.5 text-sm"
                    value={checkoutDraft.fulfillmentType || "none"}
                    onChange={(event) => updateCheckoutDraft(cart.tenantId, "fulfillmentType", event.target.value)}
                  >
                    {allowedFulfillmentTypes.map((value) => (
                      <option key={value} value={value}>
                        {capitalize(value.replaceAll("_", " "))}
                      </option>
                    ))}
                  </select>
                </label>

                {checkoutDraft.fulfillmentType === "delivery" ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Address</span>
                      <input
                        className="form-input !py-1.5 text-sm"
                        placeholder="Street, block, area"
                        value={checkoutDraft.addressLine1 || ""}
                        onChange={(event) => updateCheckoutDraft(cart.tenantId, "addressLine1", event.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">City</span>
                      <input
                        className="form-input !py-1.5 text-sm"
                        placeholder="Lahore"
                        value={checkoutDraft.addressCity || ""}
                        onChange={(event) => updateCheckoutDraft(cart.tenantId, "addressCity", event.target.value)}
                      />
                    </label>
                  </>
                ) : null}

                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Note</span>
                  <input
                    className="form-input !py-1.5 text-sm"
                    placeholder="No onions, call on arrival"
                    value={checkoutDraft.notes || ""}
                    onChange={(event) => updateCheckoutDraft(cart.tenantId, "notes", event.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Payment</span>
                  <select
                    className="form-input !py-1.5 text-sm"
                    value={checkoutDraft.paymentMethod || ""}
                    onChange={(event) => updateCheckoutDraft(cart.tenantId, "paymentMethod", event.target.value)}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.code} value={method.code}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* The one consequence of the payment choice that matters before committing, plus
                  any extra questions the business configured — behind a disclosure, because most
                  carts never need them. */}
              {(selectedPaymentHint || (checkoutConfig.transactionCustomFields || []).length) ? (
                <div className="px-4 pb-2">
                  {selectedPaymentHint ? (
                    <p className="text-[11px] leading-5 text-muted">{selectedPaymentHint}</p>
                  ) : null}

                  {(checkoutConfig.transactionCustomFields || []).length ? (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-xs font-semibold text-brand">
                        Additional questions from this business
                      </summary>
                      <div className="mt-2.5">
                        <DynamicForm
                          fields={checkoutConfig.transactionCustomFields}
                          values={checkoutDraft.customFields || {}}
                          onChange={(values) => updateCheckoutCustomFields(cart.tenantId, values)}
                        />
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}

              {/* Commit. Total and the single control that spends it, on the last row, after
                  everything the shopper needed to decide has already been read. */}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line-soft bg-surface/60 px-4 py-2.5">
                {cart.tenant?.slug ? (
                  <Link
                    className="mr-auto text-xs font-semibold text-brand transition hover:text-brand-hover"
                    to={`/customer/businesses/${cart.tenant.slug}`}
                  >
                    Add more from this business
                  </Link>
                ) : null}

                <select
                  aria-label={`Order type for ${cart.tenant?.name || "this business"}`}
                  className="form-input !w-auto !py-1 text-xs"
                  value={transactionTypes[cart.tenantId] || "auto"}
                  onChange={(event) => setTransactionTypes((current) => ({ ...current, [cart.tenantId]: event.target.value }))}
                >
                  {transactionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                <span className="text-sm text-muted">Total</span>
                <span className="text-lg font-extrabold leading-none tracking-tight text-ink">{total}</span>

                <button
                  type="button"
                  className="ui-btn-primary !px-4 !py-2 !text-xs"
                  onClick={() => checkout(cart.tenantId)}
                >
                  {checkoutLabel}
                  <ArrowRight size={14} />
                </button>
              </div>
            </section>
            </StaggerItem>
          );
        })}
      </Stagger>

        {isLoading && !carts.length ? (
          /* Reserves the same three bands the real block uses — identity, lines, commit. A
             placeholder a different shape from the content it stands in for causes the page to
             jump on load, which defeats the point of having one. */
          <div className="space-y-3" aria-busy="true">
            {[0, 1].map((row) => (
              <div key={row} className="overflow-hidden rounded-xl border border-line bg-white">
                <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
                  <div className="skeleton-shimmer h-3.5 w-40 rounded" />
                  <div className="skeleton-shimmer h-2.5 w-12 rounded" />
                </div>
                <div className="space-y-3 px-4 py-2.5">
                  {[0, 1, 2].map((line) => (
                    <div key={line} className="skeleton-shimmer h-8 w-full rounded-md" />
                  ))}
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-line-soft bg-surface/60 px-4 py-2.5">
                  <div className="skeleton-shimmer h-7 w-24 rounded-md" />
                  <div className="skeleton-shimmer h-6 w-14 rounded" />
                  <div className="skeleton-shimmer h-7 w-24 rounded-md" />
                </div>
              </div>
            ))}
            <p className="sr-only" role="status">Loading your cart…</p>
          </div>
        ) : null}
        {!isLoading && loadFailed && !carts.length ? (
          <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
            <Receipt className="mx-auto text-brand" size={30} />
            <div className="mt-3 font-bold text-ink">We could not load your cart</div>
            <p className="mt-1 text-sm text-muted">This is a problem reaching the server, not an empty cart.</p>
            <button className="ui-btn-primary mt-5" type="button" onClick={() => refreshCart()}>
              Try again
            </button>
          </div>
        ) : null}
        {!isLoading && !loadFailed && !carts.length ? (
            <WarmEmptyState
              image={SHOP_IMAGES.empty}
              title="Your cart is empty"
              body="Nothing here yet. Browse the marketplace and add what you need — you can order from as many businesses as you like."
              reassurance="Your cart is kept between visits, so you can come back to it whenever you are ready."
              actionTo="/customer/marketplace"
              actionLabel="Start shopping"
            />
          ) : null}

      {/* Order confirmations float over the page. As a banner above the carts they pushed the
          whole list down at exactly the moment a shopper wants to see their new order. */}
      <Toast message={message} onDismiss={() => setMessage("")} />
    </section>
  );
}
