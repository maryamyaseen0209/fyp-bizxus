import { joiResolver } from "@hookform/resolvers/joi";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, Globe, Pencil, Puzzle, Rocket, Sparkles,
} from "lucide-react";
import Joi from "joi";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { getPublicBusinessCategories } from "../../services/businessCategoryApi.js";
import { createTenant, publishTenant, unpublishTenant, updateTenant } from "../../services/tenantApi.js";
import { languageModeOptions, pakistanProvinces } from "../../utils/localization.js";
import { getApiErrorMessage } from "../../services/apiError.js";
import { EASE } from "../../components/ui/motion.jsx";
import { OWNER_IMAGES, OwnerHero } from "../dashboard/ownerUi.jsx";

const schema = Joi.object({
  name: Joi.string().min(2).required().label("Business name"),
  businessCategoryId: Joi.string().required().label("Business type"),
  description: Joi.string().allow("").optional(),
  phone: Joi.string().allow("").optional(),
  whatsapp: Joi.string().allow("").optional(),
  email: Joi.string().email({ tlds: false }).allow("").optional(),
  line1: Joi.string().allow("").optional(),
  city: Joi.string().allow("").optional(),
  province: Joi.string().allow("").optional(),
  languageMode: Joi.string().valid("mixed", "roman_urdu", "english").required(),
});

const steps = [
  { id: 1, short: "About" },
  { id: 2, short: "Contact" },
  { id: 3, short: "Finish" },
];

const stepFields = {
  1: ["name", "businessCategoryId", "description"],
  2: ["phone", "whatsapp", "email", "line1", "city", "province", "languageMode"],
};

const emptyValues = {
  name: "", businessCategoryId: "", description: "", phone: "", whatsapp: "",
  email: "", line1: "", city: "", province: "", languageMode: "mixed",
};

export function BusinessProfile() {
  const { user } = useAuth();
  const { selectedTenant, refreshTenants, selectTenant } = useTenant();
  const [categories, setCategories] = useState([]);
  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [justFinished, setJustFinished] = useState(false);
  const reduce = useReducedMotion();

  const form = useForm({ resolver: joiResolver(schema), defaultValues: emptyValues });

  const stepStorageKey = useMemo(
    () => `bizxus_phase3_step_${selectedTenant?.id || user?.id || "new"}`,
    [selectedTenant?.id, user?.id],
  );

  useEffect(() => {
    getPublicBusinessCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      form.reset({
        name: selectedTenant.name || "",
        businessCategoryId: selectedTenant.businessCategoryId || "",
        description: selectedTenant.description || "",
        phone: selectedTenant.contact?.phone || "",
        whatsapp: selectedTenant.contact?.whatsapp || "",
        email: selectedTenant.contact?.email || "",
        line1: selectedTenant.address?.line1 || "",
        city: selectedTenant.address?.city || "",
        province: selectedTenant.address?.province || "",
        languageMode: selectedTenant.settings?.languageMode || "mixed",
      });
      const savedStep = Number(
        selectedTenant.settings?.onboarding?.phase3?.currentStep || localStorage.getItem(stepStorageKey) || 1,
      );
      setCurrentStep(Math.min(3, Math.max(1, savedStep)));
      return;
    }
    form.reset({ ...emptyValues, phone: user?.phone || "", email: user?.email || "" });
    setCurrentStep(Math.min(3, Math.max(1, Number(localStorage.getItem(stepStorageKey) || 1))));
    // Keyed on the tenant id, not the object: background refreshes return a new reference
    // and re-running the reset would wipe what the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id, stepStorageKey, user?.email, user?.phone]);

  useEffect(() => {
    localStorage.setItem(stepStorageKey, String(currentStep));
  }, [currentStep, stepStorageKey]);

  const watchedValues = form.watch();

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === watchedValues.businessCategoryId),
    [categories, watchedValues.businessCategoryId],
  );

  const checks = useMemo(
    () => [
      { label: "Business name", done: Boolean(watchedValues.name?.trim()) },
      { label: "Business type", done: Boolean(watchedValues.businessCategoryId) },
      { label: "Phone or email", done: Boolean(watchedValues.phone?.trim() || watchedValues.email?.trim()) },
      { label: "City and province", done: Boolean(watchedValues.city?.trim() && watchedValues.province?.trim()) },
      { label: "Short description", done: Boolean(watchedValues.description?.trim()) },
      { label: "Language", done: Boolean(watchedValues.languageMode?.trim()) },
    ],
    [watchedValues],
  );
  const completedChecks = checks.filter((c) => c.done).length;
  const percent = Math.round((completedChecks / checks.length) * 100);
  const isComplete = completedChecks === checks.length;
  const pending = checks.filter((c) => !c.done);

  function buildOnboardingSettings(stepOverride = currentStep) {
    const previous = selectedTenant?.settings?.onboarding?.phase3 || {};
    return {
      ...(selectedTenant?.settings || {}),
      onboarding: {
        ...(selectedTenant?.settings?.onboarding || {}),
        phase3: {
          ...previous,
          currentStep: stepOverride,
          completedSteps: completedChecks,
          totalSteps: checks.length,
          isComplete,
          completedAt: isComplete ? previous.completedAt || new Date().toISOString() : null,
        },
      },
    };
  }

  async function saveBusiness(values, stepOverride = currentStep) {
    const payload = {
      name: values.name,
      businessCategoryId: values.businessCategoryId || null,
      description: values.description || "",
      contact: { phone: values.phone || "", email: values.email || "", whatsapp: values.whatsapp || "" },
      address: { line1: values.line1 || "", city: values.city || "", province: values.province || "", country: "Pakistan" },
      settings: { ...buildOnboardingSettings(stepOverride), languageMode: values.languageMode || "mixed" },
    };
    const saved = selectedTenant ? await updateTenant(selectedTenant.id, payload) : await createTenant(payload);
    await refreshTenants();
    selectTenant(saved);
    return saved;
  }

  async function submit(values) {
    setServerError("");
    setServerMessage("");
    try {
      await saveBusiness(values, 3);
      localStorage.removeItem(stepStorageKey);
      setCurrentStep(3);
      setJustFinished(true);
    } catch (error) {
      setServerError(getApiErrorMessage(error, "We could not save your business. Please try again."));
    }
  }

  async function handleNextStep() {
    setServerError("");
    setServerMessage("");
    const valid = await form.trigger(stepFields[currentStep] || []);
    if (!valid) return;
    if (selectedTenant || currentStep === 1) {
      try {
        await saveBusiness(form.getValues(), Math.min(3, currentStep + 1));
        setServerMessage("Saved. You can come back and continue any time.");
      } catch (error) {
        setServerError(getApiErrorMessage(error, "We could not save your progress. Please try again."));
        return;
      }
    }
    setCurrentStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setServerError("");
    setServerMessage("");
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  async function togglePublish() {
    if (!selectedTenant) return;
    setServerError("");
    setServerMessage("");
    try {
      const saved =
        selectedTenant.websiteStatus === "published"
          ? await unpublishTenant(selectedTenant.id)
          : await publishTenant(selectedTenant.id);
      await refreshTenants();
      selectTenant(saved);
      setServerMessage(
        saved.websiteStatus === "pending_review"
          ? "Your website was sent to our team for review."
          : "Website status updated.",
      );
    } catch (error) {
      setServerError(getApiErrorMessage(error, "We could not send your website for review."));
    }
  }

  const languageLabel = languageModeOptions.find((o) => o.value === watchedValues.languageMode)?.label || "Mixed";
  const isLive = selectedTenant?.websiteStatus === "published";

  const heroDescription = selectedTenant
    ? "Update your details any time. Changes are saved as you go."
    : "Three short steps, about three minutes. We save your progress as you go.";

  /* ---------- Finished screen ---------- */
  if (justFinished && selectedTenant) {
    return (
      <section className="space-y-6">
        <OwnerHero
          eyebrow="All set"
          title={`${selectedTenant.name} is ready`}
          description="Your business details are saved. Choose what to use next, then add what you sell."
          image={OWNER_IMAGES.profile}
          actions={
            <OwnerFinishActions />
          }
        />
        <motion.section
          className="mx-auto grid max-w-3xl gap-4 pb-8 sm:grid-cols-2"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <NextCard to="/dashboard/modules" icon={Puzzle} title="Choose features" text="Turn on only what your business needs." featured />
          <NextCard to="/dashboard/items" icon={Rocket} title="Add products or services" text="Prices, photos and stock." />
        </motion.section>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Cinematic band */}
      <OwnerHero
        eyebrow={selectedTenant ? "Business Identity & Settings" : "Welcome"}
        title={selectedTenant ? selectedTenant.name : "Let's set up your business"}
        description={heroDescription}
        image={OWNER_IMAGES.profile}
        stats={[
          { label: "Profile", value: `${percent}%` },
          { label: "Category", value: selectedCategory?.name || "Business" },
          { label: "Website", value: isLive ? "Live" : "Draft" },
        ]}
        actions={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {selectedTenant?.slug ? (
              <a
                href={`/businesses/${selectedTenant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-hero-work shadow-[0_14px_30px_-12px_rgba(3,10,26,0.7)] transition hover:bg-sky-50 active:scale-95"
              >
                <Globe size={14} className="text-brand" />
                Preview Storefront
              </a>
            ) : null}
            <div className="w-full min-w-44 max-w-xs">
              <div className="mb-1.5 flex justify-between text-[11px] font-black uppercase tracking-[0.12em] text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                <span>{selectedTenant ? "Completeness" : "Progress"}</span>
                <span className="text-sky-300">{percent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-900/60 ring-1 ring-white/20 backdrop-blur-md">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                  initial={false}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.6, ease: EASE }}
                />
              </div>
            </div>
          </div>
        }
      />

      {serverMessage ? <Notice tone="success">{serverMessage}</Notice> : null}
      {serverError ? <Notice tone="error">{serverError}</Notice> : null}

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Ambient glow behind the form card */}
        <div aria-hidden="true" className="pointer-events-none absolute -inset-x-6 top-10 -z-10 hidden h-72 rounded-full bg-sky-200/30 blur-3xl xl:block" />

        <motion.form
          className="rounded-3xl border border-blue-100 bg-white/85 p-5 shadow-[0_30px_80px_-30px_rgba(16,22,51,0.25)] backdrop-blur-xl sm:p-8"
          onSubmit={form.handleSubmit(submit)}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {/* Stepper */}
          <ol className="flex items-center gap-2 border-b border-line pb-6">
            {steps.map((step, i) => {
              const active = currentStep === step.id;
              const done = currentStep > step.id;
              return (
                <li key={step.id} className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    disabled={!selectedTenant && step.id > currentStep}
                    onClick={() => setCurrentStep(step.id)}
                    className="flex items-center gap-2 text-left disabled:cursor-default"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black transition ${
                        done
                          ? "bg-emerald-500 text-white shadow-[0_6px_16px_-4px_rgba(16,185,129,0.6)]"
                          : active
                            ? "bg-brand text-white shadow-[0_6px_20px_-4px_rgba(29,78,216,0.6)]"
                            : "bg-blue-50 text-muted hover:bg-blue-100"
                      }`}
                    >
                      {done ? <CheckCircle2 size={16} /> : step.id}
                    </span>
                    <span className={`hidden text-sm font-bold sm:block ${active ? "text-ink" : "text-muted"}`}>{step.short}</span>
                  </button>
                  {i < steps.length - 1 ? (
                    <span className="relative h-px flex-1 bg-line">
                      <span
                        className="absolute inset-y-0 left-0 bg-emerald-400 transition-all duration-500"
                        style={{ width: step.id < currentStep ? "100%" : "0%" }}
                      />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {/* Animated step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              className="mt-6 space-y-5"
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {currentStep === 1 ? (
                <>
                  <StepTitle
                    badge="Step 1"
                    title="Tell us about your business"
                    text="This is what customers will see first."
                  />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Business name" required error={form.formState.errors.name?.message}>
                      <input className="form-input" {...form.register("name")} placeholder="e.g. Burger House" />
                    </Field>
                    <Field label="Business type" required error={form.formState.errors.businessCategoryId?.message}>
                      <select className="form-input" {...form.register("businessCategoryId")}>
                        <option value="">Choose one</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </Field>
                    <div className="lg:col-span-2">
                      <Field label="Short description" hint="One or two sentences about what you sell or offer.">
                        <textarea className="form-input min-h-28" {...form.register("description")} placeholder="e.g. Fresh burgers and fries, made to order." />
                      </Field>
                    </div>
                  </div>
                  {selectedCategory?.suggestedModules?.length ? (
                    <motion.div
                      className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4"
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                    >
                      <div className="flex items-center gap-2 text-sm font-bold text-ink">
                        <Sparkles size={15} className="text-brand" /> Good to know
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        For this type of business we will suggest these features later. You do not have to decide now.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedCategory.suggestedModules.map((m) => (
                          <span key={m} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-brand ring-1 ring-sky-200">
                            {String(m).replaceAll("_", " ")}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </>
              ) : null}

              {currentStep === 2 ? (
                <>
                  <StepTitle
                    badge="Step 2"
                    title="How can customers reach you?"
                    text="Add at least a phone number or an email. Everything else is optional."
                  />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Phone number">
                      <input className="form-input" inputMode="tel" {...form.register("phone")} placeholder="03001234567" />
                    </Field>
                    <Field label="WhatsApp number" hint="Leave empty if it is the same as your phone.">
                      <input className="form-input" inputMode="tel" {...form.register("whatsapp")} placeholder="03001234567" />
                    </Field>
                    <Field label="Email" error={form.formState.errors.email?.message}>
                      <input className="form-input" type="email" {...form.register("email")} placeholder="business@company.pk" />
                    </Field>
                    <Field label="Street address">
                      <input className="form-input" {...form.register("line1")} placeholder="Main Bazaar Road, G-10 Markaz" />
                    </Field>
                    <Field label="City">
                      <input className="form-input" {...form.register("city")} placeholder="Islamabad" />
                    </Field>
                    <Field label="Province">
                      <select className="form-input" {...form.register("province")}>
                        <option value="">Choose one</option>
                        {pakistanProvinces.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </Field>
                    <div className="lg:col-span-2">
                      <Field label="Language for your customers" error={form.formState.errors.languageMode?.message}>
                        <select className="form-input" {...form.register("languageMode")}>
                          {languageModeOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                </>
              ) : null}

              {currentStep === 3 ? (
                <>
                  <StepTitle
                    badge="Step 3"
                    title="Check your details"
                    text="Everything look right? You can edit any part."
                  />
                  <div className="divide-y divide-line-soft rounded-2xl border border-line bg-white/70">
                    <ReviewRow label="Business name" value={watchedValues.name} onEdit={() => setCurrentStep(1)} />
                    <ReviewRow label="Business type" value={selectedCategory?.name} onEdit={() => setCurrentStep(1)} />
                    <ReviewRow label="Description" value={watchedValues.description} onEdit={() => setCurrentStep(1)} />
                    <ReviewRow label="Phone / email" value={[watchedValues.phone, watchedValues.email].filter(Boolean).join(" · ")} onEdit={() => setCurrentStep(2)} />
                    <ReviewRow label="Location" value={[watchedValues.city, watchedValues.province].filter(Boolean).join(", ")} onEdit={() => setCurrentStep(2)} />
                    <ReviewRow label="Language" value={languageLabel} onEdit={() => setCurrentStep(2)} />
                  </div>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {/* Buttons */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
            <button
              type="button"
              onClick={goBack}
              disabled={currentStep === 1}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface disabled:invisible"
            >
              <ArrowLeft size={15} /> Back
            </button>
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_-10px_rgba(29,78,216,0.6)] transition hover:brightness-110 active:scale-[0.98]"
              >
                Save and continue <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_-10px_rgba(29,78,216,0.6)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                {form.formState.isSubmitting ? "Saving..." : selectedTenant ? "Save and finish" : "Create my business"}
                <CheckCircle2 size={15} />
              </button>
            )}
          </div>
        </motion.form>

        {/* Sidebar */}
        <aside className="space-y-4">
          <motion.div
            className="rounded-2xl border border-line bg-white p-5 shadow-card"
            initial={reduce ? false : { opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          >
            <h2 className="text-sm font-extrabold text-ink">{pending.length ? "Still to do" : "All details added"}</h2>
            {pending.length ? (
              <ul className="mt-3 space-y-2">
                {pending.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-sm text-muted">
                    <Circle size={14} className="shrink-0 text-line" /> {item.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 size={16} /> Nice work. Review and finish.
              </p>
            )}
          </motion.div>

          {selectedTenant ? (
            <motion.div
              className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-card"
              initial={reduce ? false : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            >
              {/* A quiet blue header strip instead of another plain card */}
              <div className="bg-gradient-to-r from-blue-700 to-sky-500 px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <Globe size={16} /> Your website
                </h2>
              </div>
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Status</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isLive
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : selectedTenant.websiteApprovalStatus === "pending"
                          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    {isLive ? "● Published" : selectedTenant.websiteApprovalStatus === "pending" ? "● In Review" : "● Offline Draft"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  {isLive
                    ? "Your customer-facing digital storefront is live and taking orders."
                    : selectedTenant.websiteApprovalStatus === "pending"
                      ? "Submitted and waiting for administrative approval."
                      : "When you have added your products and contact info, submit your site for review."}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {selectedTenant.slug ? (
                    <a
                      href={`/businesses/${selectedTenant.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-center text-xs font-bold text-ink transition hover:bg-slate-100"
                    >
                      <Globe size={13} className="text-brand" />
                      View Customer Storefront ↗
                    </a>
                  ) : null}
                  <Link to="/dashboard/public-website" className="rounded-xl border border-line px-4 py-2 text-center text-xs font-semibold text-ink hover:bg-surface">
                    Customize Website
                  </Link>
                  <button
                    type="button"
                    onClick={togglePublish}
                    className="rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110 active:scale-98"
                  >
                    {isLive ? "Take website offline" : selectedTenant.websiteApprovalStatus === "pending" ? "Send for review again" : "Send website for review"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

/* ---------- Small pieces ---------- */

function OwnerFinishActions() {
  return (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
    >
      Go to dashboard <ArrowRight size={16} />
    </Link>
  );
}

function StepTitle({ badge, title, text }) {
  return (
    <div>
      <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
        {badge}
      </p>
      <h2 className="mt-2 text-lg font-extrabold text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}

function Field({ label, hint, error, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function ReviewRow({ label, value, onEdit }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</div>
        <div className={`mt-0.5 break-words text-sm ${value ? "font-semibold text-ink" : "text-muted"}`}>
          {value || "Not added yet"}
        </div>
      </div>
      <button type="button" onClick={onEdit} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-brand transition hover:bg-blue-50">
        <Pencil size={12} /> Edit
      </button>
    </div>
  );
}

function Notice({ tone, children }) {
  const styles =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-red-200 bg-red-50 text-red-700";
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      className={`rounded-xl border px-4 py-2.5 text-sm ${styles}`}
    >
      {children}
    </motion.div>
  );
}

function NextCard({ to, icon: Icon, title, text, featured = false }) {
  return (
    <Link
      to={to}
      className={`group relative flex flex-col overflow-hidden rounded-2xl p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift ${
        featured
          ? "bg-gradient-to-br from-blue-700 to-sky-500 text-white"
          : "border border-blue-100 bg-white"
      }`}
    >
      {featured ? (
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
      ) : null}
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${featured ? "bg-white/20 text-white" : "bg-blue-50 text-brand"}`}>
        <Icon size={20} />
      </span>
      <div className={`mt-3 text-sm font-extrabold ${featured ? "text-white" : "text-ink"}`}>{title}</div>
      <p className={`mt-1 text-xs ${featured ? "text-sky-100" : "text-muted"}`}>{text}</p>
      <span className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${featured ? "text-white" : "text-brand"}`}>
        Open <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
