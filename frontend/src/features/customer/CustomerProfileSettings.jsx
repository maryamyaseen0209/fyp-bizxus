import { useEffect, useState } from "react";
import { Building2, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

import { PageBanner, SHOP_IMAGES } from "./shopUi.jsx";
import { Toast } from "../../components/ui/motion.jsx";
import { useCustomer } from "../../context/CustomerContext.jsx";
import { updateCustomerProfile } from "../../services/customerAuthApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";

export function CustomerProfileSettings() {
  const { customer, customerProfile, refreshCustomerMe } = useCustomer();
  const [form, setForm] = useState({ phone: "", line1: "", city: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    }
  }

  const displayName = customer?.fullName?.trim();

  return (
    <section className="space-y-6">
      {/* The person, not a form. This is the one page whose subject is the customer, so the banner
          carries the identity and the one thing worth knowing about it — that filling the rest
          in makes checkout faster. The progress meter that used to live here was a percentage
          with no consequence attached; the sentence says the same thing and means something. */}
      <PageBanner
        eyebrow="Your account"
        title={displayName || "Your details"}
        description={
          displayName
            ? "Keep these up to date and checkout gets quicker every time. Businesses only see your delivery details once you order."
            : "Fill these in once and every future order takes seconds. Nothing is shared with a business until you order."
        }
        image={SHOP_IMAGES.account}
      >
        {customer?.email ? (
          <p className="mt-4 truncate border-t border-brand-100 pt-4 text-sm text-muted">{customer.email}</p>
        ) : null}
      </PageBanner>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <form className="grid gap-5 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6 md:grid-cols-2" onSubmit={submit}>
        <Field
          label="Phone number"
          value={form.phone}
          placeholder="03001234567"
          hint="Businesses use this to confirm orders with you, not for anything else."
          icon={Phone}
          onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
        />

        <Field
          label="Email"
          value={customer?.email || ""}
          disabled
          hint="Where your receipts and order updates are sent."
          icon={Mail}
          onChange={() => {}}
        />

        <Field
          label="Default delivery address"
          value={form.line1}
          placeholder="House number, street, block or area"
          hint="Pre-fills delivery on every order, so you are not typing it each time."
          icon={MapPin}
          className="md:col-span-2"
          onChange={(value) => setForm((current) => ({ ...current, line1: value }))}
        />

        <Field
          label="City"
          value={form.city}
          placeholder="Lahore"
          hint="Paired with your address above to complete a delivery."
          icon={Building2}
          onChange={(value) => setForm((current) => ({ ...current, city: value }))}
        />

        <div className="flex flex-col justify-end gap-3">
          <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3 text-xs leading-5 text-muted">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand" />
            You can change any of this at any time, and nothing is shared with businesses until you
            order.
          </div>
          <button className="ui-btn-primary sm:self-start">Save changes</button>
        </div>
      </form>

      <p className="px-1 text-xs leading-6 text-muted">
        We never sell or share your details. Businesses see your delivery address only after you
        order, and your phone number only to confirm it.
      </p>

      <Toast message={message} onDismiss={() => setMessage("")} />
    </section>
  );
}

/**
 * One labelled field with its explanation attached.
 *
 * The explanations existed before but were loose `<span>`s inside the `<label>`, which meant
 * clicking the helper text moved focus to the input in a way that looked like a bug. Separating
 * the label from the control also makes the reason-for-asking visually part of the field, rather
 * than an afterthought underneath it.
 */
function Field({ label, value, onChange, hint, icon: Icon, placeholder, disabled = false, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
        {Icon ? (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand">
            <Icon size={14} strokeWidth={2} />
          </span>
        ) : null}
        {label}
      </label>
      <input
        className="form-input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p className="mt-2 text-xs leading-5 text-muted">{hint}</p> : null}
    </div>
  );
}
