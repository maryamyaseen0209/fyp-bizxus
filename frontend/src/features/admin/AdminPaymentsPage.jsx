import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Webhook } from "lucide-react";

import { PaymentStatusBadge } from "../../components/payments/PaymentStatusBadge.jsx";
import { getAdminPayments } from "../../services/adminApi.js";
import { AdminHero, Notice, Panel, StatusPill, humanize } from "./adminUi.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

/**
 * Payment monitor.
 *
 * Removed: the "Check records / Verify paid / Watch failures" chip row. Those were static
 * text with icons, and each one simply named a section further down the page — they looked
 * like controls and did nothing.
 *
 * The six flat stat cards became two grouped figures, because "Stripe paid", "Stripe pending"
 * and "Paid count" were three cards describing one thing, and the numbers that actually need
 * monitoring — failed webhooks — were last in the row rather than first.
 */

export function AdminPaymentsPage() {
  const [data, setData] = useState({ summary: {}, records: [], stripeWebhookEvents: [] });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const result = await getAdminPayments();
        if (active) setData(result);
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError, "Unable to load payments."));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const summary = data.summary || {};
  const failedWebhooks = summary.failedWebhookEvents || 0;

  return (
    <div className="space-y-6">
      <AdminHero
        skin="payments"
        eyebrow="Money"
        title="Payments"
        icon={CreditCard}
        description="Payment records across every business, and whether Stripe is still talking to us."
        stats={[
          { label: "Records", value: summary.totalPaymentRecords || 0, hint: "Across all businesses", icon: CreditCard },
          { label: "Settled", value: summary.stripePaidAmount || 0, format: formatCompactMoney, hint: `${summary.stripePaidCount || 0} payments`, icon: CheckCircle2, tone: "approve" },
          { label: "Awaiting", value: summary.stripePendingAmount || 0, format: formatCompactMoney, hint: "Not yet confirmed by Stripe", icon: CreditCard, tone: summary.stripePendingAmount ? "pending" : "approve" },
          { label: "Webhook failures", value: failedWebhooks, hint: failedWebhooks ? "Needs attention" : "All processing", icon: AlertTriangle, tone: failedWebhooks ? "danger" : "approve" },
        ]}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Panel
        lift
        title="Payment records"
        icon={CreditCard}
        description={`${summary.totalPaymentRecords || 0} records across all businesses. Scroll sideways for provider references.`}
      >
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="min-w-full divide-y divide-line text-sm">
            <caption className="sr-only">Payment records</caption>
            <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">
              <tr>
                <th scope="col" className="px-4 py-3">Business</th>
                <th scope="col" className="px-4 py-3">Transaction</th>
                <th scope="col" className="px-4 py-3">Method</th>
                <th scope="col" className="px-4 py-3 text-right">Amount</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(data.records || []).map((record) => (
                <tr key={record.id} className="transition hover:bg-surface">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{record.tenant?.name || "Unknown"}</div>
                    <div className="text-xs text-muted">{record.tenant?.slug || "—"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{record.transactionNumber || "—"}</td>
                  <td className="px-4 py-3 text-muted">{humanize(record.method, "—")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-ink">{formatMoney(record.amount)}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge compact status={record.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted">{record.providerPaymentIntentId || record.providerSessionId || record.referenceNumber || "—"}</td>
                </tr>
              ))}
              {!(data.records || []).length && !isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">No payment records yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        lift
        title="Stripe webhook health"
        icon={Webhook}
        description="Events Stripe sent us. A failure here means a payment may not be reflected in the business's order."
      >
        <div className="space-y-2">
          {(data.stripeWebhookEvents || []).map((event) => (
            <div key={event.id} className="flex flex-col gap-2 rounded-xl border border-line p-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{event.eventType || "stripe event"}</div>
                <div className="truncate text-xs text-muted">{event.eventId}</div>
                {event.error ? <div className="mt-1 text-xs font-semibold text-red-700">{event.error}</div> : null}
              </div>
              <StatusPill value={event.status} />
            </div>
          ))}
          {!(data.stripeWebhookEvents || []).length && !isLoading ? (
            <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center text-sm text-muted">
              No Stripe events recorded yet.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function formatMoney(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

/**
 * The hero figures are capped rather than spelled out — "PKR 1.24M" reads at a glance where
 * "PKR 1,238,400" wraps and competes with the tiles below it. The table still shows the exact
 * amount for every record.
 */
function formatCompactMoney(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000) return `PKR ${(number / 1_000_000).toFixed(2)}M`;
  if (number >= 1_000) return `PKR ${Math.round(number / 1_000)}K`;
  return `PKR ${number.toLocaleString()}`;
}