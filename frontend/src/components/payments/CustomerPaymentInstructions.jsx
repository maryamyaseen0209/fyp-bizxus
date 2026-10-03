import { Check } from "lucide-react";

import { getDefaultPaymentMethod, getSelectedPaymentMethod } from "./paymentMethods.js";

/**
 * The payment picker shown inside checkout and on the order page.
 *
 * Rewritten to be quiet. It used to be a blue-tinted panel of rounded buttons with a nested
 * white card of account details inside it — three frames and two accent colours wrapped around
 * what is fundamentally a radio group. Sitting directly above the delivery form, that much
 * framing made the payment column look like a different, louder part of the page.
 *
 * Now: one flat surface, the methods as a proper radio list, and the selected method's details
 * directly beneath it as a plain definition list. The radio semantics are real — arrow keys and
 * screen readers now behave the way a radio group is supposed to — because these were buttons
 * that merely looked like choices.
 */

function accountRows(method = {}) {
  return [
    ["Account title", method.accountTitle],
    ["Account / Number", method.accountNumber],
    ["Bank", method.bankName],
    ["IBAN", method.iban],
  ].filter(([, value]) => value);
}

export function CustomerPaymentInstructions({ options = {}, selectedMethod = "", onChange, compact = false }) {
  const methods = options.methods || [];
  const selectedCode = selectedMethod || getDefaultPaymentMethod(options);
  const selected = getSelectedPaymentMethod(options, selectedCode);

  if (!methods.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-sm leading-6 text-muted">
        This business has not set up payment methods yet, so the owner will confirm payment with you
        after you order.
      </div>
    );
  }

  const rows = accountRows(selected);

  return (
    <div className={compact ? "" : "rounded-xl border border-line bg-white"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-ink">How would you like to pay?</div>
          <p className="mt-1 text-xs leading-5 text-muted">
            {selected?.description || "Choose a method. Manual payments are verified by the business before an order is marked paid."}
          </p>
        </div>
        {options.paymentsDemoMode ? (
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
            Demo mode
          </span>
        ) : null}
      </div>

      {/* Radio group. `role="radiogroup"` with `role="radio"` children is what makes the arrow
          keys and the checked state announce correctly; a row of buttons announces as four
          unrelated buttons that happen to be highlighted. */}
      <div role="radiogroup" aria-label="Payment method" className="mt-3 grid gap-2">
        {methods.map((method) => {
          const isSelected = selectedCode === method.code;
          return (
            <button
              key={method.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange?.(method.code)}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                isSelected
                  ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-200"
                  : "border-line bg-white hover:border-brand-200 hover:bg-surface"
              }`}
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ring-1 ${
                  isSelected ? "bg-brand ring-brand" : "bg-white ring-line"
                }`}
              >
                {isSelected ? <Check size={10} strokeWidth={4} className="text-white" /> : null}
              </span>
              <span className={`text-sm ${isSelected ? "font-bold text-brand" : "font-semibold text-ink"}`}>
                {method.label}
              </span>
              {method.isOnline ? (
                <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide text-subtle">Online</span>
              ) : method.code === "cod" ? (
                <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide text-subtle">Cash</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-3 border-t border-line-soft pt-3">
          {rows.length ? (
            /* Account details as a definition list rather than a stack of tinted pills: these are
               values to be copied, and each one needs its label attached to its value. */
            <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 last:border-b-0">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {options.customerInstructions ? (
            <p className="mt-3 text-xs leading-5 text-muted">{options.customerInstructions}</p>
          ) : null}

          {selected.requiresOwnerApproval ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              Send your payment reference to the business. The order stays unpaid until they verify it.
            </p>
          ) : selected.isOnline ? (
            <div className="mt-3 space-y-2">
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs leading-5 text-brand-800">
                You will be taken to the {selected.label} payment page and returned here afterwards.
              </p>
              {selected.code === "stripe_test" && selected.mode !== "live" ? (
                <p className="rounded-lg bg-surface px-3 py-2 text-xs leading-5 text-muted">
                  Test mode — card {selected.testCard || "4242 4242 4242 4242"}, any future expiry, any
                  CVC.
                </p>
              ) : null}
              {selected.simulated ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  Simulated gateway — no real money moves.
                </p>
              ) : null}
            </div>
          ) : selected.code === "cod" ? (
            <p className="mt-3 rounded-lg bg-approve-50 px-3 py-2 text-xs leading-5 text-approve-800">
              Pay the business in cash when your order arrives. No payment is needed now.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
