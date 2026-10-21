import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Bot, CheckCircle2, MessageCircle, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { BusinessAiChatExperience, BusinessAiDraftOrderSummary } from "../../components/chat/BusinessAiChatExperience.jsx";
import { BusinessAiBasketPanel } from "../../components/chat/BusinessAiBasketPanel.jsx";
import { confirmCustomerDraftTransaction, getCustomerChatState, sendCustomerChatMessage } from "../../services/customerPortalApi.js";
import { formatTransactionSuccess } from "../../utils/transaction.js";
import { getApiErrorMessage } from "../../services/apiError.js";

const emptyReply = { tenant: null, conversation: null, messages: [], draftOrder: {}, basket: {}, checkoutReadiness: {} };

export function CustomerBusinessChatPage() {
  const { tenantSlug } = useParams();
  const { setCustomerSidebarPanel } = useOutletContext() || {};
  const navigate = useNavigate();
  const [chatState, setChatState] = useState(emptyReply);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draftQuantities, setDraftQuantities] = useState({});
  const [fulfillmentDraft, setFulfillmentDraft] = useState({ type: "", addressLine1: "", city: "" });

  useEffect(() => {
    async function loadChat() {
      setError("");
      try {
        const data = await getCustomerChatState(tenantSlug);
        setChatState(data);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load customer chat. Please refresh and try again."));
      }
    }
    loadChat();
  }, [tenantSlug]);

  async function submitMessage(event) {
    event?.preventDefault?.();
    if (!messageText.trim() || isSending) return;
    setIsSending(true);
    setError("");
    setNotice("");
    try {
      const data = await sendCustomerChatMessage(tenantSlug, { messageText: messageText.trim() });
      setChatState(data);
      setDraftQuantities({});
      setFulfillmentDraft({
        type: data.draftOrder?.fulfillmentPreference?.type === "delivery" ? "delivery" : "pickup",
        paymentMethod: data.tenant?.paymentOptions?.defaultMethod || "",
        addressLine1: "",
        city: "",
      });
      setMessageText("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Something went wrong while asking the assistant. Please try again."));
    } finally {
      setIsSending(false);
    }
  }

  async function confirmDraft() {
    if (!chatState.draftOrder?.items?.length) return;
    setIsConfirming(true);
    setError("");
    setNotice("");
    try {
      const fulfillmentType =
        fulfillmentDraft.type ||
        (chatState.draftOrder.fulfillmentPreference?.type === "delivery" ? "delivery" : "pickup");

      if (fulfillmentType === "delivery" && !fulfillmentDraft.addressLine1.trim()) {
        setError("Unable to confirm order because delivery address is missing.");
        return;
      }
      if (fulfillmentType === "delivery" && !fulfillmentDraft.city.trim()) {
        setError("Unable to confirm order because city is missing.");
        return;
      }

      const order = await confirmCustomerDraftTransaction(tenantSlug, {
        conversationId: chatState.conversation?.id,
        transactionType: chatState.draftOrder.transactionType || "auto",
        paymentMethod:
          fulfillmentDraft.paymentMethod || chatState.tenant?.paymentOptions?.defaultMethod || undefined,
        items: chatState.draftOrder.items.map((item) => ({
          itemId: item.itemId,
          quantity: Math.max(1, Math.min(99, Math.floor(Number(draftQuantities[item.itemId] || item.quantity) || 1))),
          selectedVariantIndex: item.selectedVariantIndex ?? null,
          selectedVariantName: item.selectedVariantName || "",
          selectedOptions: item.selectedOptions || {},
          variantSku: item.variantSku || "",
        })),
        fulfillment: {
          type: fulfillmentType,
          address:
            fulfillmentType === "delivery"
              ? { line1: fulfillmentDraft.addressLine1, city: fulfillmentDraft.city }
              : {},
        },
        notes: "Confirmed from customer AI chat.",
        customFields: {},
      });

      setNotice(`Your order has been confirmed. ${formatTransactionSuccess(order)}`);
      navigate(`/customer/orders/${order.id}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Something went wrong while creating your order. Please try again."));
    } finally {
      setIsConfirming(false);
    }
  }

  const business = chatState.tenant;

  useEffect(() => {
    if (!setCustomerSidebarPanel) return undefined;
    if (!business) {
      setCustomerSidebarPanel(null);
      return undefined;
    }

    const hasBasketLines = Boolean((chatState.basket?.lines || []).length);
    const hasDraftLines = Boolean((chatState.draftOrder?.items || []).length);

    setCustomerSidebarPanel(
      <div className="space-y-3">
        <BusinessAiBasketPanel
          basket={chatState.basket || {}}
          compact
          readiness={chatState.checkoutReadiness || {}}
        />
        {!hasBasketLines && hasDraftLines ? (
          <BusinessAiDraftOrderSummary
            business={business}
            compact
            draftOrder={chatState.draftOrder || {}}
            draftQuantities={draftQuantities}
            fulfillmentDraft={fulfillmentDraft}
            isConfirming={isConfirming}
            onConfirmDraft={confirmDraft}
            setDraftQuantities={setDraftQuantities}
            setFulfillmentDraft={setFulfillmentDraft}
            setMessageText={setMessageText}
          />
        ) : null}
      </div>
    );

    return () => setCustomerSidebarPanel(null);
  }, [
    business,
    chatState.basket,
    chatState.checkoutReadiness,
    chatState.draftOrder,
    draftQuantities,
    fulfillmentDraft,
    isConfirming,
    setCustomerSidebarPanel,
  ]);

  // ——— Error state ———
  if (error && !business) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-dashed border-sky-200 bg-gradient-to-b from-sky-50/80 to-white p-10 text-center shadow-sm"
      >
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 text-sky-600">
          <Bot size={26} strokeWidth={1.8} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">AI chat unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{error}</p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25"
          type="button"
          onClick={() => window.location.reload()}
        >
          Try again
        </motion.button>
      </motion.section>
    );
  }

  // ——— Loading skeleton ———
  if (!business) {
    return (
      <section className="space-y-6" aria-busy="true">
        <div className="flex flex-col gap-6 rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-[0_20px_50px_-20px_rgba(14,165,233,0.2)] sm:flex-row sm:items-center">
          <div className="skeleton-shimmer h-16 w-16 rounded-2xl bg-sky-100" />
          <div className="flex-1 space-y-3">
            <div className="skeleton-shimmer h-3 w-24 rounded bg-sky-100" />
            <div className="skeleton-shimmer h-7 w-64 rounded bg-sky-100" />
            <div className="skeleton-shimmer h-3 w-full max-w-xl rounded bg-sky-100" />
          </div>
        </div>
        <div className="skeleton-shimmer h-24 w-full rounded-2xl bg-sky-50" />
        <div className="skeleton-shimmer h-80 w-full rounded-2xl bg-sky-50" />
        <p className="sr-only" role="status">
          Loading the assistant…
        </p>
      </section>
    );
  }

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 140, damping: 18 },
    },
  };

  return (
    <section className="relative space-y-6 overflow-hidden">
      {/* Soft ambient blue glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-[0_20px_50px_-20px_rgba(14,165,233,0.22)] backdrop-blur-xl sm:p-8"
      >
        {/* Top shine line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/50 to-transparent" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring" }}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-50 text-sky-600 shadow-sm ring-1 ring-sky-100"
            >
              <Bot size={26} strokeWidth={1.8} />
            </motion.span>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-600/80">
                AI assistant
              </p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Ask {business.name}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Ask about prices, availability, sizes, colors, delivery, or just say what you want
                to order. The assistant will prepare a draft for you to confirm.
              </p>
            </div>
          </div>

          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm"
          >
            <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
            <span>Always asked before an order is placed</span>
          </motion.div>
        </div>

        {/* How it works steps */}
        <motion.ol
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-7 grid gap-4 border-t border-sky-100/80 pt-6 sm:grid-cols-3"
        >
          {[
            {
              icon: MessageCircle,
              title: "Ask anything",
              body: "Prices, sizes, colours, what's in stock today.",
            },
            {
              icon: Bot,
              title: "Get a draft",
              body: "The assistant builds the order, you see every line.",
            },
            {
              icon: ShoppingCart,
              title: "You confirm",
              body: "Nothing is ordered or charged until you say so.",
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <motion.li
                key={step.title}
                variants={item}
                className="group flex items-start gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-sky-100 hover:bg-sky-50/50"
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 transition group-hover:bg-sky-100 group-hover:text-sky-700">
                  <Icon size={16} strokeWidth={2} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">{step.title}</h2>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{step.body}</p>
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      </motion.div>

      {/* Error / Notice banners */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm backdrop-blur-sm"
            role="alert"
          >
            {error}
          </motion.div>
        )}
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 shadow-sm backdrop-blur-sm"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat experience */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100, damping: 18 }}
      >
        <BusinessAiChatExperience
          accentClass="text-sky-600"
          backLabel={`Back to ${business.name}`}
          backLink={`/customer/businesses/${tenantSlug}`}
          business={business}
          draftOrder={chatState.draftOrder || {}}
          draftQuantities={draftQuantities}
          error={error}
          fulfillmentDraft={fulfillmentDraft}
          isConfirming={isConfirming}
          isSending={isSending}
          messageText={messageText}
          messages={chatState.messages || []}
          notice={notice}
          onConfirmDraft={confirmDraft}
          onSubmitMessage={submitMessage}
          draftPlacement="external"
          setDraftQuantities={setDraftQuantities}
          setFulfillmentDraft={setFulfillmentDraft}
          setMessageText={setMessageText}
        />
      </motion.div>
    </section>
  );
}