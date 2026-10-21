import { useEffect, useState } from "react";
import { Building2, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageBanner, PageSurface } from "./shopUi.jsx";
import { Toast } from "../../components/ui/motion.jsx";
import { useCustomer } from "../../context/CustomerContext.jsx";
import { updateCustomerProfile } from "../../services/customerAuthApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";

export function CustomerProfileSettings() {
  const { customer, customerProfile, refreshCustomerMe } = useCustomer();
  const [form, setForm] = useState({ phone: "", line1: "", city: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    refreshCustomerMe().catch(() => {});
  }, [refreshCustomerMe]);

  useEffect(() => {
    if (!customerProfile) return;
    setForm({
      phone: customerProfile.phone || customer?.phone || "",
      line1: customerProfile.defaultAddress?.line1 || "",
      city: customerProfile.defaultAddress?.city || "",
    });
  }, [customerProfile, customer]);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSaving(true);
    try {
      await updateCustomerProfile({
        phone: form.phone,
        defaultAddress: { line1: form.line1, city: form.city },
        savedAddresses: customerProfile?.savedAddresses || [],
        preferences: customerProfile?.preferences || {},
      });
      await refreshCustomerMe();
      setMessage("Saved. We will use these details for your next order.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save your details."));
    } finally {
      setIsSaving(false);
    }
  }

  const displayName = customer?.fullName?.trim();

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.15 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 120, damping: 18 },
    },
  };

  return (
    <PageSurface className="relative overflow-hidden space-y-8">
      {/* Soft cinematic blue ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <PageBanner
        eyebrow="Your account"
        title={displayName || "Your details"}
        description={
          displayName
            ? "Keep these up to date and checkout gets quicker every time. Businesses only see your delivery details once you order."
            : "Fill these in once and every future order takes seconds. Nothing is shared with a business until you order."
        }
        // image={SHOP_IMAGES.account}
      >
        {customer?.email ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4 truncate border-t border-sky-100/80 pt-4 text-sm text-sky-700/80"
          >
            {customer.email}
          </motion.p>
        ) : null}
      </PageBanner>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm backdrop-blur-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main card */}
      <motion.form
        variants={container}
        initial="hidden"
        animate="show"
        onSubmit={submit}
        className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-[0_20px_50px_-20px_rgba(14,165,233,0.25)] backdrop-blur-xl sm:p-8 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-6"
      >
        {/* Subtle top shine */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />

        <motion.div variants={item}>
          <Field
            label="Phone number"
            value={form.phone}
            placeholder="03001234567"
            hint="Businesses use this to confirm orders with you, not for anything else."
            icon={Phone}
            onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
          />
        </motion.div>

        <motion.div variants={item}>
          <Field
            label="Email"
            value={customer?.email || ""}
            disabled
            hint="Where your receipts and order updates are sent."
            icon={Mail}
            onChange={() => {}}
          />
        </motion.div>

        <motion.div variants={item} className="md:col-span-2">
          <Field
            label="Default delivery address"
            value={form.line1}
            placeholder="House number, street, block or area"
            hint="Pre-fills delivery on every order, so you are not typing it each time."
            icon={MapPin}
            onChange={(value) => setForm((current) => ({ ...current, line1: value }))}
          />
        </motion.div>

        <motion.div variants={item}>
          <Field
            label="City"
            value={form.city}
            placeholder="Lahore"
            hint="Paired with your address above to complete a delivery."
            icon={Building2}
            onChange={(value) => setForm((current) => ({ ...current, city: value }))}
          />
        </motion.div>

        <motion.div variants={item} className="flex flex-col justify-end gap-4">
          <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white px-4 py-3.5 text-xs leading-5 text-sky-800/80 shadow-sm">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
              <ShieldCheck size={15} strokeWidth={2.2} />
            </div>
            <p>
              You can change any of this at any time, and nothing is shared with businesses until you
              order.
            </p>
          </div>

          <motion.button
            type="submit"
            disabled={isSaving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-sky-500/40 disabled:opacity-70 sm:self-start"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </>
              ) : (
                <>
                  <Sparkles size={16} className="opacity-90" />
                  Save changes
                </>
              )}
            </span>
            {/* Shine sweep */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </motion.button>
        </motion.div>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="px-1 text-center text-xs leading-6 text-sky-700/70 sm:text-left"
      >
        We never sell or share your details. Businesses see your delivery address only after you
        order, and your phone number only to confirm it.
      </motion.p>

      <Toast message={message} onDismiss={() => setMessage("")} />
    </PageSurface>
  );
}

function Field({ label, value, onChange, hint, icon: Icon, placeholder, disabled = false, className = "" }) {
  return (
    <div className={`group ${className}`}>
      <label className="mb-2.5 flex items-center gap-2.5 text-sm font-semibold text-slate-800">
        {Icon ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 shadow-sm ring-1 ring-sky-100 transition-all group-focus-within:bg-sky-100 group-focus-within:text-sky-700 group-focus-within:ring-sky-200">
            <Icon size={15} strokeWidth={2.2} />
          </span>
        ) : null}
        {label}
      </label>

      <div className="relative">
        <input
          className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        {/* Soft focus glow */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-focus-within:opacity-100">
          <div className="absolute inset-0 rounded-2xl bg-sky-400/5" />
        </div>
      </div>

      {hint ? (
        <p className="mt-2.5 text-xs leading-5 text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}