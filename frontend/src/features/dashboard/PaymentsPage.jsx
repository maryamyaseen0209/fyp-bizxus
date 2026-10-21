import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  ExternalLink,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { CustomerPaymentInstructions } from "../../components/payments/CustomerPaymentInstructions.jsx";
import { PaymentProofBadge, PaymentStatusBadge } from "../../components/payments/PaymentStatusBadge.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { decidePaymentRecord, getOwnerPaymentReceiptHtml, getPaymentOverview, recordTransactionPayment, refundTransactionPayment, syncStripePaymentRecord, updatePaymentSettings } from "../../services/paymentApi.js";
import { SectionTitle } from "../../components/ui/SectionTitle.jsx";
import { EASE } from "../../components/ui/motion.jsx";
import { BusinessSetupRequired, OWNER_IMAGES, OwnerPanel } from "../dashboard/ownerUi.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

const defaultSettings = {
  codEnabled: true,
  manualEnabled: true,
  bankTransferEnabled: true,
  jazzCashEnabled: false,
  easyPaisaEnabled: false,
  stripeEnabled: false,
  paymentsDemoMode: true,
  requireOwnerApproval: true,
  bankName: "",
  jazzCashNumber: "",
  jazzCashAccountTitle: "",
  easyPaisaNumber: "",
  easyPaisaAccountTitle: "",
  bankAccountTitle: "",
  bankAccountNumber: "",
  bankIban: "",
  defaultMethod: "cod",
  customerInstructions: "",
};

const methodOptions = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "manual_bank", label: "Manual bank transfer" },
  { value: "jazzcash_mock", label: "JazzCash mock" },
  { value: "easypaisa_mock", label: "EasyPaisa mock" },
  { value: "stripe_test", label: "Stripe test card" },
];

export function PaymentsPage() {
  const { selectedTenant } = useTenant();
  const [settings, setSettings] = useState(defaultSettings);
  const [showGateway, setShowGateway] = useState(false);
  const [records, setRecords] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [stripeWebhookEvents, setStripeWebhookEvents] = useState([]);
  const [summary, setSummary] = useState({});
  const [drafts, setDrafts] = useState({});
  const [refundDrafts, setRefundDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPaymentId, setSavingPaymentId] = useState("");
  const [decisionDrafts, setDecisionDrafts] = useState({});
  const [expandedTxId, setExpandedTxId] = useState("");
  const [showAllOutstanding, setShowAllOutstanding] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);

  useEffect(() => {
    if (selectedTenant?.id) {
      refreshOverview();
    }
  }, [selectedTenant?.id]);

  async function refreshOverview() {
    if (!selectedTenant?.id) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await getPaymentOverview(selectedTenant.id, { page: 1, limit: 30 });
      const data = result.data || {};
      setSettings({ ...defaultSettings, ...(data.settings || {}) });
      setRecords(data.records || []);
      setOutstanding(data.outstandingTransactions || []);
      setStripeWebhookEvents(data.stripeWebhookEvents || []);
      setSummary(data.summary || {});
      setDrafts((current) => {
        const next = { ...current };
        (data.outstandingTransactions || []).forEach((transaction) => {
          const balance = transaction.paymentSummary?.balance ?? transaction.pricing?.total ?? 0;
          next[transaction.id] = next[transaction.id] || {
            amount: balance,
            method: data.settings?.defaultMethod || "cod",
            status: "paid",
            referenceNumber: "",
            notes: "",
          };
        });
        return next;
      });
      setRefundDrafts((current) => {
        const next = { ...current };
        (data.records || []).forEach((record) => {
          if (record.recordType === "payment" && ["paid", "completed"].includes(record.status)) {
            next[record.transactionId] = next[record.transactionId] || {
              amount: record.amount,
              method: record.method || "manual_bank",
              referenceNumber: "",
              notes: "",
            };
          }
        });
        return next;
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load payment overview."));
    } finally {
      setIsLoading(false);
    }
  }

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateDraft(transactionId, key, value) {
    setDrafts((current) => ({
      ...current,
      [transactionId]: { ...(current[transactionId] || {}), [key]: value },
    }));
  }

  function updateRefundDraft(transactionId, key, value) {
    setRefundDrafts((current) => ({
      ...current,
      [transactionId]: { ...(current[transactionId] || {}), [key]: value },
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSavingSettings(true);
    setMessage("");
    setError("");
    try {
      const updated = await updatePaymentSettings(selectedTenant.id, settings);
      setSettings({ ...defaultSettings, ...updated });
      setMessage("Payment settings saved.");
      await refreshOverview();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save payment settings."));
    } finally {
      setSavingSettings(false);
    }
  }

  async function submitPayment(transactionId) {
    const draft = drafts[transactionId];
    if (!draft) return;
    setSavingPaymentId(transactionId);
    setMessage("");
    setError("");
    try {
      await recordTransactionPayment(selectedTenant.id, transactionId, {
        ...draft,
        amount: Number(draft.amount || 0),
      });
      setMessage("Payment recorded.");
      await refreshOverview();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to record payment."));
    } finally {
      setSavingPaymentId("");
    }
  }

  async function submitRefund(transactionId) {
    const draft = refundDrafts[transactionId];
    if (!draft) return;
    setSavingPaymentId(`refund-${transactionId}`);
    setMessage("");
    setError("");
    try {
      await refundTransactionPayment(selectedTenant.id, transactionId, {
        ...draft,
        amount: Number(draft.amount || 0),
      });
      setMessage("Refund recorded.");
      await refreshOverview();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to record refund."));
    } finally {
      setSavingPaymentId("");
    }
  }

  function updateDecisionDraft(recordId, value) {
    setDecisionDrafts((current) => ({ ...current, [recordId]: value }));
  }

  async function submitDecision(recordId, decision) {
    setSavingPaymentId(`decision-${recordId}-${decision}`);
    setMessage("");
    setError("");
    try {
      await decidePaymentRecord(selectedTenant.id, recordId, {
        decision,
        notes: decisionDrafts[recordId] || "",
      });
      setMessage(decision === "approve" ? "Payment proof approved." : "Payment proof rejected.");
      await refreshOverview();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save payment decision."));
    } finally {
      setSavingPaymentId("");
    }
  }

  async function syncStripeRecord(recordId) {
    setSavingPaymentId(`stripe-sync-${recordId}`);
    setMessage("");
    setError("");
    try {
      const data = await syncStripePaymentRecord(selectedTenant.id, recordId);
      if (data.providerStatus === "paid") {
        setMessage("Stripe payment confirmed and transaction marked paid.");
      } else {
        setMessage(`Stripe payment checked. Current Stripe status: ${data.providerStatus || "pending"}.`);
      }
      await refreshOverview();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to sync Stripe payment."));
    } finally {
      setSavingPaymentId("");
    }
  }

  async function openReceipt(recordId) {
    setSavingPaymentId(`receipt-${recordId}`);
    setError("");
    try {
      const html = await getOwnerPaymentReceiptHtml(selectedTenant.id, recordId);
      openReceiptWindow(html);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to open payment receipt."));
    } finally {
      setSavingPaymentId("");
    }
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Payments & Settlement"
        description="Configure Cash on Delivery, JazzCash, Easypaisa, Raast bank transfers, and automated card processing for your storefront and counter."
        icon={CreditCard}
        image={OWNER_IMAGES.payments}
        previewTitle="Payment Capabilities For Your Store"
        previewItems={[
          { title: "Cash on Delivery (COD)", desc: "Zero setup fee, instantaneous activation for local parcel deliveries." },
          { title: "Mobile Wallets (JazzCash & Easypaisa)", desc: "Direct wallet-to-wallet transfer instructions or automated API webhooks." },
          { title: "Bank Wire & Raast P2M", desc: "Accept instant IBAN and phone-based instant bank settlements." },
        ]}
      />
    );
  }

  const visibleOutstanding = showAllOutstanding ? outstanding : outstanding.slice(0, 3);
  const visibleRecords = showAllRecords ? records : records.slice(0, 5);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. CINEMATIC PAYMENTS HERO - Vivid Photograph with Directional Vignette */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph - Contextual Payments & Checkout image */}
        <img
          src={OWNER_IMAGES.payments}
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
                <CreditCard size={13} className="text-sky-300" />
                Payments & Settlements Desk
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-sky-300 border border-blue-400/30 backdrop-blur">
                ● {summary.outstandingTransactions || 0} Orders Unpaid
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              Payment Methods & Cash Verification
            </h1>

            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-xl">
              Manage Cash on Delivery, Bank Transfers, JazzCash & EasyPaisa wallets. Verify customer transaction proofs and issue payment receipts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard/transactions"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-900 shadow-lg hover:bg-slate-100 transition"
            >
              <Receipt size={16} /> View Orders
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
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Net Collected</span>
              <Banknote size={17} className="text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] truncate">{formatMoney(summary.netReceived || 0)}</div>
            <div className="text-[11px] text-slate-300 font-medium">Net revenue kept</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Cash on Delivery</span>
              <Wallet size={17} className="text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] truncate">{formatMoney(summary.cod || 0)}</div>
            <div className="text-[11px] text-sky-200 font-medium">Collected via COD</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">Pending Proofs</span>
              <Clock size={17} className="text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)] truncate">{formatMoney(summary.pendingVerification || 0)}</div>
            <div className="text-[11px] text-amber-200 font-medium">Waiting for your check</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Unpaid Orders</span>
              <Receipt size={17} className="text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{summary.outstandingTransactions || 0}</div>
            <div className="text-[11px] text-slate-300 font-medium">Orders with balance</div>
          </motion.div>
        </div>
      </motion.section>

      {message ? <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 font-medium">{message}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-medium">{error}</div> : null}

      {/* The Stripe panels are setup and diagnostics, not something an owner opens this page to
          read. They were taking the top of the page, above the payment methods they actually
          manage, so they now sit folded away until asked for. */}
      <OwnerPanel
        title="Card payments and connection"
        description="Only needed if you take payments by card. Cash on delivery and bank transfer work without any of this."
        action={
          <button
            type="button"
            onClick={() => setShowGateway((open) => !open)}
            aria-expanded={showGateway}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink transition hover:bg-surface"
          >
            {showGateway ? "Hide" : "Show"}
            {showGateway ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        }
      >
        <AnimatePresence initial={false}>
          {showGateway ? (
            <motion.div
              key="gateway"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionTitle>Card payment status</SectionTitle>
              <p className="mt-1 text-sm leading-6 text-muted">Use test cards for demos. Local COD/manual methods still work independently.</p>
            </div>
            <span className={settings.stripeEnabled ? "w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700" : "w-fit rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600"}>
              {settings.stripeEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <StatusRow label="Secret key" ready={settings.stripeConfigured} readyText="Configured" missingText="Missing STRIPE_SECRET_KEY" />
            <StatusRow label="Webhook secret" ready={settings.stripeWebhookConfigured} readyText="Configured" missingText="Optional locally, required in production" />
            <StatusRow label="Currency" ready value={settings.stripeCurrency || "PKR"} />
          </div>
          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-3 text-xs leading-5 text-brand-800">
            Test card: 4242 4242 4242 4242, any future expiry, any CVC. Webhook URL: /api/v1/payments/stripe/webhook.
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <SectionTitle>Recent card events</SectionTitle>
          <div className="mt-4 space-y-2">
            {stripeWebhookEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-line bg-white p-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-ink">{event.eventType || "Card event"}</div>
                    <div className="mt-1 text-xs text-muted">{event.eventId}</div>
                    {event.error ? <div className="mt-1 text-xs text-red-700">{event.error}</div> : null}
                  </div>
                  <span className={event.status === "processed" ? "w-fit rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700" : event.status === "failed" ? "w-fit rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700" : "w-fit rounded-full bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700"}>
                    {event.status || "unknown"}
                  </span>
                </div>
              </div>
            ))}
            {!stripeWebhookEvents.length ? <div className="rounded-xl border border-dashed border-line bg-white p-4 text-sm text-muted">No card events received yet.</div> : null}
          </div>
        </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </OwnerPanel>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-sm" onSubmit={saveSettings}>
          <div>
            <SectionTitle>Payment Methods & Channels</SectionTitle>
            <p className="mt-1 text-xs text-muted">Enable the payment methods you want your customers to see at checkout.</p>
          </div>

          {/* Methods Group */}
          <div className="space-y-3">
            {/* 1. COD */}
            <div className="rounded-2xl border border-line p-3.5 bg-surface/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Cash on Delivery (COD)</h4>
                    <p className="text-[11px] text-muted">Customer pays rider in cash at delivery doorstep.</p>
                  </div>
                </div>
                <Toggle
                  label=""
                  checked={settings.codEnabled}
                  onChange={(val) => updateSetting("codEnabled", val)}
                />
              </div>
            </div>

            {/* 2. Bank Transfer */}
            <div className={`rounded-2xl border transition-all ${settings.bankTransferEnabled ? "border-brand/40 bg-blue-50/20 p-3.5" : "border-line p-3.5 bg-surface/60"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Bank Account Transfer</h4>
                    <p className="text-[11px] text-muted">Direct transfer to your official business bank account.</p>
                  </div>
                </div>
                <Toggle
                  label=""
                  checked={settings.bankTransferEnabled}
                  onChange={(val) => updateSetting("bankTransferEnabled", val)}
                />
              </div>

              {settings.bankTransferEnabled ? (
                <div className="mt-3.5 pt-3 border-t border-line/60 grid gap-3 sm:grid-cols-2">
                  <Field label="Bank Name">
                    <input className="form-input" value={settings.bankName || ""} onChange={(e) => updateSetting("bankName", e.target.value)} placeholder="HBL, Meezan, UBL..." />
                  </Field>
                  <Field label="Account Title">
                    <input className="form-input" value={settings.bankAccountTitle || ""} onChange={(e) => updateSetting("bankAccountTitle", e.target.value)} placeholder="Title on bank account" />
                  </Field>
                  <Field label="Account Number">
                    <input className="form-input" value={settings.bankAccountNumber || ""} onChange={(e) => updateSetting("bankAccountNumber", e.target.value)} placeholder="0123456789" />
                  </Field>
                  <Field label="IBAN (Optional)">
                    <input className="form-input" value={settings.bankIban || ""} onChange={(e) => updateSetting("bankIban", e.target.value)} placeholder="PK00XXXX0000..." />
                  </Field>
                </div>
              ) : null}
            </div>

            {/* 3. JazzCash */}
            <div className={`rounded-2xl border transition-all ${settings.jazzCashEnabled ? "border-brand/40 bg-blue-50/20 p-3.5" : "border-line p-3.5 bg-surface/60"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600 font-black text-xs">
                    JC
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">JazzCash Mobile Wallet</h4>
                    <p className="text-[11px] text-muted">Customer transfers via JazzCash mobile app or till.</p>
                  </div>
                </div>
                <Toggle
                  label=""
                  checked={settings.jazzCashEnabled}
                  onChange={(val) => updateSetting("jazzCashEnabled", val)}
                />
              </div>

              {settings.jazzCashEnabled ? (
                <div className="mt-3.5 pt-3 border-t border-line/60 grid gap-3 sm:grid-cols-2">
                  <Field label="JazzCash Mobile Number">
                    <input className="form-input" value={settings.jazzCashNumber || ""} onChange={(e) => updateSetting("jazzCashNumber", e.target.value)} placeholder="03XXXXXXXXX" />
                  </Field>
                  <Field label="Account Title">
                    <input className="form-input" value={settings.jazzCashAccountTitle || ""} onChange={(e) => updateSetting("jazzCashAccountTitle", e.target.value)} placeholder="Registered name" />
                  </Field>
                </div>
              ) : null}
            </div>

            {/* 4. EasyPaisa */}
            <div className={`rounded-2xl border transition-all ${settings.easyPaisaEnabled ? "border-brand/40 bg-blue-50/20 p-3.5" : "border-line p-3.5 bg-surface/60"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 font-black text-xs">
                    EP
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">EasyPaisa Mobile Wallet</h4>
                    <p className="text-[11px] text-muted">Customer transfers via EasyPaisa mobile app.</p>
                  </div>
                </div>
                <Toggle
                  label=""
                  checked={settings.easyPaisaEnabled}
                  onChange={(val) => updateSetting("easyPaisaEnabled", val)}
                />
              </div>

              {settings.easyPaisaEnabled ? (
                <div className="mt-3.5 pt-3 border-t border-line/60 grid gap-3 sm:grid-cols-2">
                  <Field label="EasyPaisa Mobile Number">
                    <input className="form-input" value={settings.easyPaisaNumber || ""} onChange={(e) => updateSetting("easyPaisaNumber", e.target.value)} placeholder="03XXXXXXXXX" />
                  </Field>
                  <Field label="Account Title">
                    <input className="form-input" value={settings.easyPaisaAccountTitle || ""} onChange={(e) => updateSetting("easyPaisaAccountTitle", e.target.value)} placeholder="Registered name" />
                  </Field>
                </div>
              ) : null}
            </div>
          </div>

          <div className="pt-3 border-t border-line grid gap-3 sm:grid-cols-2">
            <Toggle label="Require my approval for payment proofs" checked={settings.requireOwnerApproval} onChange={(value) => updateSetting("requireOwnerApproval", value)} />
            <Toggle label="Card payments (Stripe test)" checked={settings.stripeEnabled} onChange={(value) => updateSetting("stripeEnabled", value)} />
          </div>

          <Field label="Default Checkout Method">
            <select className="form-input" value={settings.defaultMethod || "cod"} onChange={(event) => updateSetting("defaultMethod", event.target.value)}>
              {methodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Customer Payment Instructions">
            <textarea className="form-input min-h-28" value={settings.customerInstructions || ""} onChange={(event) => updateSetting("customerInstructions", event.target.value)} />
          </Field>
          <div>
            <div className="mb-2 text-sm font-semibold text-ink">Customer preview</div>
            <CustomerPaymentInstructions compact options={buildOwnerPaymentPreview(settings)} selectedMethod={settings.defaultMethod || "cod"} onChange={(value) => updateSetting("defaultMethod", value)} />
          </div>
          <button className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={savingSettings}>
            {savingSettings ? "Saving..." : "Save Payment Settings"}
          </button>
        </form>

        <div className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <SectionTitle>Outstanding Transactions</SectionTitle>
              <p className="mt-1 text-xs sm:text-sm text-muted">
                Review proofs or record received payments to settle customer orders.
              </p>
            </div>
            {outstanding.length > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                {outstanding.length} Unpaid
              </span>
            )}
          </div>

          {isLoading ? <div className="text-sm text-muted">Loading payments...</div> : null}

          <div className="space-y-3">
            {visibleOutstanding.map((transaction) => {
              const draft = drafts[transaction.id] || {};
              const balance = transaction.paymentSummary?.balance ?? transaction.pricing?.total ?? 0;
              const isExpanded = expandedTxId === transaction.id;
              const hasProof = Boolean(transaction.paymentProofSummary?.hasProof);

              return (
                <div
                  key={transaction.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? "border-brand/50 bg-blue-50/20 shadow-md p-4 sm:p-5"
                      : "border-line bg-surface/70 hover:border-brand/30 p-4"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-ink">{transaction.transactionNumber}</span>
                        <PaymentStatusBadge compact status={transaction.paymentStatus} />
                        {hasProof && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                            Proof Attached
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        {transaction.customerSnapshot?.name || "Guest"} • {transaction.customerSnapshot?.phone || "No phone"}
                      </div>
                      {transaction.paymentPreference?.methodLabel ? (
                        <div className="w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
                          Customer chose {transaction.paymentPreference.methodLabel}
                        </div>
                      ) : null}
                      {transaction.paymentProofSummary ? (
                        <div className="mt-1">
                          <PaymentProofBadge summary={transaction.paymentProofSummary} />
                        </div>
                      ) : null}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                      <div className="text-right">
                        <div className="text-[11px] font-medium text-subtle uppercase tracking-wider">Balance Due</div>
                        <div className="text-base font-black text-ink">{formatMoney(balance)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedTxId(isExpanded ? "" : transaction.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                          isExpanded
                            ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                            : "bg-brand text-white hover:bg-brand-600"
                        }`}
                      >
                        {isExpanded ? "Close Form" : "Record Payment"}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Progressive Disclosure: Collapsible Payment Form */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-line/80">
                          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
                            Enter Received Payment Details
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Amount Received">
                              <input
                                className="form-input"
                                type="number"
                                min="1"
                                value={draft.amount ?? balance}
                                onChange={(event) => updateDraft(transaction.id, "amount", event.target.value)}
                              />
                            </Field>
                            <Field label="Payment Method">
                              <select
                                className="form-input"
                                value={draft.method || settings.defaultMethod || "cod"}
                                onChange={(event) => updateDraft(transaction.id, "method", event.target.value)}
                              >
                                {methodOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Record Status">
                              <select
                                className="form-input"
                                value={draft.status || "paid"}
                                onChange={(event) => updateDraft(transaction.id, "status", event.target.value)}
                              >
                                <option value="paid">Paid / verified</option>
                                <option value="pending_verification">Pending verification</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </Field>
                            <Field label="Reference Number">
                              <input
                                className="form-input"
                                placeholder="Bank auth code / TRX ID"
                                value={draft.referenceNumber || ""}
                                onChange={(event) => updateDraft(transaction.id, "referenceNumber", event.target.value)}
                              />
                            </Field>
                            <div className="sm:col-span-2">
                              <Field label="Notes (Optional)">
                                <textarea
                                  className="form-input min-h-16"
                                  placeholder="Cashier notes or transaction remarks..."
                                  value={draft.notes || ""}
                                  onChange={(event) => updateDraft(transaction.id, "notes", event.target.value)}
                                />
                              </Field>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="rounded-xl bg-ink px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 disabled:opacity-60 transition"
                              disabled={savingPaymentId === transaction.id}
                              onClick={() => submitPayment(transaction.id)}
                            >
                              {savingPaymentId === transaction.id ? "Recording..." : "Save & Mark as Paid"}
                            </button>
                            <button
                              type="button"
                              className="rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-muted hover:text-ink transition"
                              onClick={() => setExpandedTxId("")}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {!outstanding.length && !isLoading ? (
              <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted bg-surface/40">
                🎉 All orders are fully paid! No outstanding transactions.
              </div>
            ) : null}

            {outstanding.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllOutstanding((curr) => !curr)}
                className="w-full rounded-xl border border-dashed border-line bg-surface/60 py-3 text-center text-xs font-bold text-brand hover:bg-blue-50/50 hover:border-brand/40 transition flex items-center justify-center gap-1.5"
              >
                {showAllOutstanding ? (
                  <>
                    <span>Show Fewer Orders (Show top 3)</span>
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>Show All Unpaid Orders ({outstanding.length - 3} more)</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <SectionTitle>Recent Payment Records</SectionTitle>
            <p className="mt-1 text-xs sm:text-sm text-muted">Complete audit trail of all received cash, online proofs, and refunds.</p>
          </div>
          {records.length > 0 && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
              {records.length} Total Records
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-surface text-left text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">
              <tr>
                <th className="px-3 py-2">Transaction</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Proof / Reference</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleRecords.map((record) => {
                const refundDraft = refundDrafts[record.transactionId] || {};
                const isPendingStripe = record.recordType === "payment" && record.provider === "stripe" && record.status === "pending_verification";
                return (
                  <tr key={record.id}>
                    <td className="px-3 py-3 font-semibold text-ink">{record.transactionNumber}</td>
                    <td className="px-3 py-3 text-muted">{record.customerSnapshot?.name || "Guest"}</td>
                    <td className="px-3 py-3 capitalize text-muted">{record.recordType}</td>
                    <td className="px-3 py-3 capitalize text-muted">
                      {String(record.method || "").replaceAll("_", " ")}
                      {record.flow === "otp" ? (
                        <span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-amber-700">
                          Verification code
                        </span>
                      ) : null}
                      {record.customerMobile ? (
                        <span className="block text-[11px] normal-case text-subtle">{record.customerMobile}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-muted">{formatMoney(record.amount)}</td>
                    <td className="px-3 py-3"><PaymentStatusBadge compact status={record.status} /></td>
                    <td className="px-3 py-3 text-muted">
                      <div className="min-w-44 space-y-1">
                        <div>{record.referenceNumber || "No reference"}</div>
                        {record.provider === "stripe" ? (
                          <>
                            <div className="text-xs font-semibold text-brand-700">Stripe session: {record.providerSessionId || "Not captured"}</div>
                            {record.lastProviderSyncStatus ? <div className="text-xs text-muted">Last sync: {record.lastProviderSyncStatus}</div> : null}
                          </>
                        ) : null}
                        {record.screenshotUrl ? (
                          <a className="font-semibold text-brand" href={resolveUploadUrl(record.screenshotUrl)} target="_blank" rel="noreferrer">
                            View screenshot
                          </a>
                        ) : null}
                        {record.submittedBy === "customer" ? <div className="text-xs font-semibold text-brand-700">Submitted by customer</div> : null}
                        <button
                          type="button"
                          className="rounded-xl border border-line px-2.5 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
                          disabled={savingPaymentId === `receipt-${record.id}`}
                          onClick={() => openReceipt(record.id)}
                        >
                          {savingPaymentId === `receipt-${record.id}` ? "Opening..." : "Open receipt"}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {isPendingStripe ? (
                        <div className="min-w-44">
                          <button
                            className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                            disabled={savingPaymentId === `stripe-sync-${record.id}`}
                            onClick={() => syncStripeRecord(record.id)}
                          >
                            {savingPaymentId === `stripe-sync-${record.id}` ? "Syncing..." : "Sync Stripe"}
                          </button>
                          <p className="mt-2 max-w-48 text-xs leading-5 text-muted">Use this if the customer returned from Stripe but the webhook has not updated yet.</p>
                        </div>
                      ) : record.recordType === "payment" && record.status === "pending_verification" ? (
                        <div className="flex min-w-60 flex-col gap-2">
                          <input
                            className="form-input"
                            placeholder="Decision notes optional"
                            value={decisionDrafts[record.id] || ""}
                            onChange={(event) => updateDecisionDraft(record.id, event.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button className="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" disabled={savingPaymentId === `decision-${record.id}-approve`} onClick={() => submitDecision(record.id, "approve")}>
                              Approve
                            </button>
                            <button className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60" disabled={savingPaymentId === `decision-${record.id}-reject`} onClick={() => submitDecision(record.id, "reject")}>
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : record.recordType === "payment" && ["paid", "completed"].includes(record.status) ? (
                        <div className="flex flex-col gap-2 min-w-52">
                          <input className="form-input" type="number" min="1" value={refundDraft.amount ?? record.amount} onChange={(event) => updateRefundDraft(record.transactionId, "amount", event.target.value)} />
                          <input className="form-input" placeholder="Refund reference" value={refundDraft.referenceNumber || ""} onChange={(event) => updateRefundDraft(record.transactionId, "referenceNumber", event.target.value)} />
                          <button className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink" disabled={savingPaymentId === `refund-${record.transactionId}`} onClick={() => submitRefund(record.transactionId)}>
                            {savingPaymentId === `refund-${record.transactionId}` ? "Saving..." : "Record Refund"}
                          </button>
                        </div>
                      ) : <span className="text-xs text-muted">-</span>}
                    </td>
                  </tr>
                );
              })}
              {!records.length ? (
                <tr>
                  <td className="px-3 py-5 text-sm text-muted" colSpan="8">No payment records yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {records.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAllRecords((curr) => !curr)}
            className="w-full rounded-xl border border-dashed border-line bg-surface/60 py-2.5 text-center text-xs font-bold text-brand hover:bg-blue-50/50 hover:border-brand/40 transition flex items-center justify-center gap-1.5"
          >
            {showAllRecords ? (
              <>
                <span>Show Fewer Records (Show latest 5)</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Show All Payment Records ({records.length - 5} more)</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>
    </motion.section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm text-ink hover:bg-surface">
      <span className="font-medium">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
        <input type="checkbox" className="sr-only" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      </span>
    </label>
  );
}

function StatusRow({ label, ready, readyText = "Ready", missingText = "Needs setup", value = "" }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
      <span className="font-medium text-ink">{label}</span>
      <span className={ready ? "rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700" : "rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700"}>
        {value || (ready ? readyText : missingText)}
      </span>
    </div>
  );
}

function buildOwnerPaymentPreview(settings = {}) {
  const methods = [];
  if (settings.codEnabled) {
    methods.push({
      code: "cod",
      label: "Cash on Delivery",
      description: "Pay cash when your order is delivered or picked up.",
      requiresOwnerApproval: false,
    });
  }
  if (settings.manualEnabled || settings.bankTransferEnabled) {
    methods.push({
      code: "manual_bank",
      label: "Manual bank transfer",
      description: "Transfer the amount, then share the reference with the business for verification.",
      requiresOwnerApproval: true,
      accountTitle: settings.bankAccountTitle || "",
      accountNumber: settings.bankAccountNumber || "",
      bankName: settings.bankName || "",
      iban: settings.bankIban || "",
    });
  }
  if (settings.jazzCashEnabled) {
    methods.push({
      code: "jazzcash_mock",
      label: "JazzCash mock",
      description: "Send payment through JazzCash, then share the transaction ID for owner verification.",
      requiresOwnerApproval: true,
      accountTitle: settings.jazzCashAccountTitle || "",
      accountNumber: settings.jazzCashNumber || "",
      bankName: "JazzCash",
    });
  }
  if (settings.easyPaisaEnabled) {
    methods.push({
      code: "easypaisa_mock",
      label: "EasyPaisa mock",
      description: "Send payment through EasyPaisa, then share the transaction ID for owner verification.",
      requiresOwnerApproval: true,
      accountTitle: settings.easyPaisaAccountTitle || "",
      accountNumber: settings.easyPaisaNumber || "",
      bankName: "EasyPaisa",
    });
  }
  if (settings.stripeEnabled) {
    methods.push({
      code: "stripe_test",
      label: "Stripe test card",
      description: "Pay online with Stripe Checkout using a test card.",
      requiresOwnerApproval: false,
      isOnline: true,
      provider: "stripe",
      testCard: "4242 4242 4242 4242",
    });
  }
  return {
    enabled: methods.length > 0,
    methods,
    defaultMethod: settings.defaultMethod || methods[0]?.code || "cod",
    customerInstructions: settings.customerInstructions || "",
    paymentsDemoMode: settings.paymentsDemoMode,
    requireOwnerApproval: settings.requireOwnerApproval,
  };
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

function formatMoney(value) {
  const number = Number(value || 0);
  return `PKR ${number.toLocaleString()}`;
}

function resolveUploadUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
  return `${apiBase.replace("/api/v1", "")}${url}`;
}
