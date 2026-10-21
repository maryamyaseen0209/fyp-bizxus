import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3, Check, ClipboardList, Copy, Eye, EyeOff, HelpCircle, Images, MapPin,
  MessageSquareQuote, PencilRuler, Plus, Rocket, ShoppingBag, Sparkles, Trash2,
  ChevronDown, ChevronUp, Globe, Wand2, Layout, Type, Layers, ExternalLink,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useTenant } from "../../context/TenantContext.jsx";
import { EASE } from "../../components/ui/motion.jsx";
import {
  BusinessSetupRequired, OWNER_IMAGES, OwnerGhostAction, OwnerHero, OwnerPanel, OwnerPrimaryAction,
} from "../dashboard/ownerUi.jsx";
import { getPublicBusinessCategories } from "../../services/businessCategoryApi.js";
import { publishTenant, unpublishTenant, updateTenant } from "../../services/tenantApi.js";
import {
  buildCategoryDrivenWebsiteSettings,
  buildDefaultSections,
  getSectionLibraryItems,
  getTemplatePresetOptions,
  normalizeSections,
  WEBSITE_TEMPLATE_OPTIONS,
} from "./websiteBuilderConfig.js";
import { getApiErrorMessage } from "../../services/apiError.js";

const PRESET_BRAND_COLORS = [
  { label: "Royal Blue", hex: "#2563EB" },
  { label: "Deep Indigo", hex: "#4F46E5" },
  { label: "Emerald Green", hex: "#059669" },
  { label: "Ruby Crimson", hex: "#E11D48" },
  { label: "Amber Gold", hex: "#D97706" },
  { label: "Midnight Slate", hex: "#0F172A" },
  { label: "Violet Purple", hex: "#7C3AED" },
  { label: "Teal Turquoise", hex: "#0D9488" },
];

/* ─── Friendly labels for each block ─── */
const SECTION_FACING = {
  hero: { name: "Welcome message", Icon: Sparkles, plain: "The first thing visitors see" },
  metrics: { name: "Quick highlights", Icon: BarChart3, plain: "Numbers that build trust" },
  catalog: { name: "Your products", Icon: ShoppingBag, plain: "Everything you sell" },
  services: { name: "Your services", Icon: PencilRuler, plain: "What you offer" },
  transaction_form: { name: "Order or booking form", Icon: ClipboardList, plain: "Lets people order or book" },
  testimonials: { name: "Customer reviews", Icon: MessageSquareQuote, plain: "What people say about you" },
  faq: { name: "Common questions", Icon: HelpCircle, plain: "Answers people usually ask" },
  contact: { name: "How to reach you", Icon: MapPin, plain: "Phone, WhatsApp, email & address" },
};

function sectionFacing(type) {
  return SECTION_FACING[type] || { name: type, Icon: Images, plain: "A block on your page" };
}

function buildEditorState(tenant) {
  const settings = buildCategoryDrivenWebsiteSettings(null, tenant?.websiteSettings || {}, tenant?.name || "");
  return {
    templateCode: settings.templateCode || "default",
    visualPreset: settings.visualPreset || getTemplatePresetOptions(settings.templateCode || "default")[0]?.value || "aurora",
    primaryColor: settings.primaryColor || "#2563EB",
    seoTitle: settings.seo?.title || "",
    seoDescription: settings.seo?.description || "",
    heroHeadline: settings.hero?.headline || "",
    heroSubheadline: settings.hero?.subheadline || "",
    heroCtaLabel: settings.hero?.ctaLabel || "Start now",
    heroSecondaryCtaLabel: settings.hero?.secondaryCtaLabel || "Browse offers",
    sections: normalizeSections(settings.sections, settings.templateCode || "default"),
    testimonials: settings.testimonials?.length ? settings.testimonials : [{ quote: "", name: "", role: "" }],
    faq: settings.faq?.length ? settings.faq : [{ question: "", answer: "" }],
  };
}

export function PublicWebsiteSettings() {
  const { selectedTenant, refreshTenants, selectTenant } = useTenant();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(buildEditorState(null));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [showAllSections, setShowAllSections] = useState(false);
  const [savedSignature, setSavedSignature] = useState("");
  const reduce = useReducedMotion();

  useEffect(() => {
    getPublicBusinessCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!selectedTenant) return;
    const next = buildEditorState(selectedTenant);
    setForm(next);
    setSavedSignature(JSON.stringify(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id]);

  const isDirty = useMemo(() => JSON.stringify(form) !== savedSignature, [form, savedSignature]);
  const selectedCategory = categories.find((c) => c.id === selectedTenant?.businessCategoryId);
  const presetOptions = useMemo(() => getTemplatePresetOptions(form.templateCode), [form.templateCode]);
  const sectionLibrary = useMemo(() => getSectionLibraryItems(), []);
  const reduceMotion = reduce;

  const visibleSectionCount = form.sections.filter((s) => s.visible).length;
  const usedTypes = useMemo(() => new Set(form.sections.map((s) => s.type)), [form.sections]);
  const addableSections = sectionLibrary.filter((item) => !usedTypes.has(item.type));

  const visibleSectionsWithIndex = useMemo(() => {
    return form.sections.map((s, idx) => ({ ...s, originalIndex: idx }));
  }, [form.sections]);

  const displayedSections =
    showAllSections || form.sections.length <= 4
      ? visibleSectionsWithIndex
      : visibleSectionsWithIndex.slice(0, 4);

  function setField(key, value) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  function setTemplateCode(value) {
    setForm((c) => ({
      ...c,
      templateCode: value,
      visualPreset: getTemplatePresetOptions(value)[0]?.value || c.visualPreset,
      sections: buildDefaultSections(value),
    }));
  }

  function moveSection(index, direction) {
    setForm((c) => {
      const next = [...c.sections];
      const target = index + direction;
      if (target < 0 || target >= next.length) return c;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...c, sections: next.map((s, i) => ({ ...s, order: i + 1 })) };
    });
  }

  function updateSection(index, patch) {
    setForm((c) => ({
      ...c,
      sections: c.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function addSection(type) {
    setForm((c) => ({
      ...c,
      sections: [
        ...c.sections,
        {
          type,
          label: sectionLibrary.find((i) => i.type === type)?.label || type,
          visible: true,
          order: c.sections.length + 1,
          content: {},
        },
      ],
    }));
  }

  function removeSection(index) {
    setForm((c) => ({
      ...c,
      sections: c.sections
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 })),
    }));
  }

  function updateCollection(key, index, field, value) {
    setForm((c) => ({
      ...c,
      [key]: c[key].map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  }

  function addCollectionRow(key, row) {
    setForm((c) => ({ ...c, [key]: [...c[key], row] }));
  }

  function removeCollectionRow(key, index) {
    setForm((c) => ({
      ...c,
      [key]: c[key].filter((_, i) => i !== index),
    }));
  }

  function applyCategoryWebsiteHints() {
    const next = buildCategoryDrivenWebsiteSettings(
      selectedCategory,
      selectedTenant?.websiteSettings || {},
      selectedTenant?.name || ""
    );
    setForm({
      templateCode: next.templateCode,
      visualPreset: next.visualPreset,
      primaryColor: next.primaryColor,
      seoTitle: next.seo?.title || "",
      seoDescription: next.seo?.description || "",
      heroHeadline: next.hero?.headline || "",
      heroSubheadline: next.hero?.subheadline || "",
      heroCtaLabel: next.hero?.ctaLabel || "Start now",
      heroSecondaryCtaLabel: next.hero?.secondaryCtaLabel || "Browse offers",
      sections: normalizeSections(next.sections, next.templateCode),
      testimonials: next.testimonials?.length ? next.testimonials : [{ quote: "", name: "", role: "" }],
      faq: next.faq?.length ? next.faq : [{ question: "", answer: "" }],
    });
  }

  async function save(e) {
    e.preventDefault();
    if (!selectedTenant || isSaving) return;
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      const saved = await updateTenant(selectedTenant.id, {
        websiteSettings: {
          ...(selectedTenant.websiteSettings || {}),
          templateCode: form.templateCode,
          visualPreset: form.visualPreset,
          primaryColor: form.primaryColor,
          hero: {
            headline: form.heroHeadline,
            subheadline: form.heroSubheadline,
            ctaLabel: form.heroCtaLabel,
            secondaryCtaLabel: form.heroSecondaryCtaLabel,
          },
          sections: form.sections.map((s, i) => ({ ...s, order: i + 1 })),
          testimonials: form.testimonials.filter((t) => t.quote?.trim() || t.name?.trim()),
          faq: form.faq.filter((f) => f.question?.trim() || f.answer?.trim()),
          seo: { title: form.seoTitle, description: form.seoDescription },
        },
      });
      await refreshTenants();
      selectTenant(saved);
      setSavedSignature(JSON.stringify(form));
      setMessage("Saved. Your website is up to date.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to save website settings."));
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePublish() {
    if (!selectedTenant) return;
    setError("");
    setMessage("");
    try {
      const saved =
        selectedTenant.websiteStatus === "published"
          ? await unpublishTenant(selectedTenant.id)
          : await publishTenant(selectedTenant.id);
      await refreshTenants();
      selectTenant(saved);
      setMessage(
        saved.websiteStatus === "published"
          ? "Website is now live."
          : saved.websiteStatus === "pending_review"
            ? "Sent for review. We’ll notify you soon."
            : "Website taken offline."
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to change publish status."));
    }
  }

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Public Online Storefront"
        description="Design and publish a modern, high-converting website for your brand with customizable templates, products, and direct ordering."
        icon={Globe}
        image={OWNER_IMAGES.website}
        previewTitle="Online Storefront Capabilities"
        previewItems={[
          { title: "Visual Website Designer", desc: "Select color themes, upload custom hero banners, and organize content sections." },
          { title: "Direct Checkout & Cart", desc: "Customers can add items to bag and order with instant WhatsApp or online checkout." },
          { title: "Instant Subdomain & Share Link", desc: "Get an instant shareable link (bizxus.pk/your-shop) ready for Instagram and TikTok." },
        ]}
      />
    );
  }

  const previewUrl = `/businesses/${selectedTenant.slug}`;
  const approvalStatus =
    selectedTenant.websiteApprovalStatus ||
    (selectedTenant.websiteStatus === "published" ? "approved" : "not_requested");
  const approvalChecks = selectedTenant.websiteApprovalCriteria?.checks || [];
  const websiteIsPublished = selectedTenant.websiteStatus === "published";
  const pendingChecks = approvalChecks.filter((c) => !c.passed);

  const publishLabel = websiteIsPublished
    ? "Take offline"
    : approvalStatus === "pending"
      ? "Send again"
      : "Send for review";

  const steps = [
    { num: 1, label: "Look", done: !!form.templateCode, Icon: Layout },
    { num: 2, label: "Message", done: !!form.heroHeadline?.trim(), Icon: Type },
    { num: 3, label: "Sections", done: visibleSectionCount > 0, Icon: Layers },
  ];

  return (
    <section className="space-y-8 pb-28">
      {/* 1. CINEMATIC STOREFRONT HERO - Vivid Photograph with Directional Vignette */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph - Vividly visible without heavy wash */}
        <img
          src={OWNER_IMAGES.website}
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
                <Globe size={13} className="text-sky-300" />
                Online Storefront & Website Builder
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold backdrop-blur ${
                websiteIsPublished 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" 
                  : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
              }`}>
                ● {websiteIsPublished ? "Live Online" : "Draft / Private"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              {websiteIsPublished ? "Your Online Storefront is Live" : "Design Your Customer Storefront"}
            </h1>

            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-xl">
              Customize how customers see your products, prices, services, and brand. Works seamlessly on all phones and computers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={previewUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-900 shadow-lg hover:bg-slate-100 transition"
            >
              <Globe size={16} /> {websiteIsPublished ? "View Storefront" : "Preview Storefront"}
            </Link>
            <button
              type="button"
              onClick={togglePublish}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-xs sm:text-sm font-bold text-white border border-white/20 backdrop-blur hover:bg-white/20 transition"
            >
              <Rocket size={16} /> {publishLabel}
            </button>
          </div>
        </div>

        {/* 3 Steps progress strip */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {steps.map(({ num, label, done, Icon }) => (
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              key={num}
              className="flex items-center gap-3 rounded-2xl bg-white/10 p-3.5 border border-white/20 backdrop-blur-md text-white shadow-sm transition"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black transition ${
                  done
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/40"
                    : "bg-white/20 text-sky-200"
                }`}
              >
                {done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
              </span>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-200/90">
                  Step {num}
                </span>
                <span className="text-xs font-bold text-white">{label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Notices */}
      <AnimatePresence>
        {message && (
          <Notice key="msg" tone="success">
            {message}
          </Notice>
        )}
        {error && (
          <Notice key="err" tone="error">
            {error}
          </Notice>
        )}
      </AnimatePresence>

      {/* ─── Main grid ─── */}
      <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
        <form className="space-y-6" onSubmit={save}>
          {/* ─── 1. Look ─── */}
          <OwnerPanel
            title="1. Pick a look"
            description="Choose a starting style. You can change colours later."
          >
            {/* Templates */}
            <div className="grid gap-3 sm:grid-cols-3">
              {WEBSITE_TEMPLATE_OPTIONS.map((opt) => {
                const active = form.templateCode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTemplateCode(opt.value)}
                    aria-pressed={active}
                    className={`group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                      active
                        ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-600/10"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                    }`}
                  >
                    {active && (
                      <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-white shadow-sm">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    <div className="text-sm font-bold text-slate-900">{opt.label}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{opt.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Colour presets */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-900">Colour mood</p>
              <p className="mt-0.5 text-xs text-slate-500">Preview of the background customers will see.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {presetOptions.map((opt) => {
                  const active = form.visualPreset === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField("visualPreset", opt.value)}
                      aria-pressed={active}
                      className={`overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ${
                        active
                          ? "border-blue-600 shadow-md shadow-blue-600/10"
                          : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <span className="block h-12 w-full" style={{ background: opt.background }} />
                      <span className="flex items-center gap-2 px-3.5 py-2.5">
                        <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                        {active && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                            Active
                          </span>
                        )}
                        <span className="ml-auto flex gap-1">
                          <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: opt.accent }} />
                          <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: opt.secondary }} />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary colour */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <input
                    type="color"
                    aria-label="Main colour"
                    value={form.primaryColor}
                    onChange={(e) => setField("primaryColor", e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span className="h-7 w-7 rounded-lg shadow-inner" style={{ background: form.primaryColor }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">Brand accent color</p>
                  <p className="text-xs text-slate-500">Pick a custom color or tap a preset below</p>
                </div>
                <code className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {form.primaryColor}
                </code>
              </div>

              {/* Quick Preset Swatches for Non-Technical Users */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                {PRESET_BRAND_COLORS.map((preset) => {
                  const isSelected = form.primaryColor?.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setField("primaryColor", preset.hex)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-sm ring-2 ring-blue-600"
                          : "bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </OwnerPanel>

          {/* ─── 2. Message ─── */}
          <OwnerPanel
            title="2. Write your welcome"
            description="This is the first thing people read. Keep it friendly and clear."
          >
            <Field label="Headline" hint="e.g. Fresh food, made to order">
              <input
                className="form-input"
                value={form.heroHeadline}
                onChange={(e) => setField("heroHeadline", e.target.value)}
                placeholder="Your main message"
              />
            </Field>
            <Field label="Supporting line" hint="A short sentence about what you do">
              <textarea
                className="form-input min-h-[88px]"
                value={form.heroSubheadline}
                onChange={(e) => setField("heroSubheadline", e.target.value)}
                placeholder="Tell people why they should choose you"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Main button" hint="e.g. See our menu">
                <input
                  className="form-input"
                  value={form.heroCtaLabel}
                  onChange={(e) => setField("heroCtaLabel", e.target.value)}
                />
              </Field>
              <Field label="Second button" hint="Optional, e.g. Call us">
                <input
                  className="form-input"
                  value={form.heroSecondaryCtaLabel}
                  onChange={(e) => setField("heroSecondaryCtaLabel", e.target.value)}
                />
              </Field>
            </div>
          </OwnerPanel>

          {/* ─── 3. Sections ─── */}
          <OwnerPanel
            title="3. Choose what people see"
            description="Order of your page from top to bottom. Hide or remove anything you don’t need."
            action={
              addableSections.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {addableSections.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addSection(item.type)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Plus size={12} />
                      {sectionFacing(item.type).name}
                    </button>
                  ))}
                </div>
              ) : null
            }
          >
            {form.sections.length > 0 ? (
              <div className="space-y-3">
                <ul className="space-y-2">
                  {displayedSections.map((section) => {
                    const facing = sectionFacing(section.type);
                    const index = section.originalIndex;
                    return (
                      <li
                        key={`${section.type}-${index}`}
                        className={`flex flex-col gap-3 rounded-2xl border p-3.5 transition sm:flex-row sm:items-center ${
                          section.visible
                            ? "border-slate-200 bg-white shadow-sm"
                            : "border-dashed border-slate-200 bg-slate-50/60 opacity-70"
                        }`}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                            <facing.Icon size={18} />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="text-[11px] font-bold tabular-nums text-slate-400">
                                {index + 1}
                              </span>
                              <span className="truncate text-sm font-bold text-slate-900">
                                {facing.name}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {section.visible ? facing.plain : "Hidden — visitors won’t see this"}
                            </span>
                          </span>
                        </span>

                        <span className="flex shrink-0 items-center gap-1">
                          <IconButton
                            label="Move up"
                            disabled={index === 0}
                            onClick={() => moveSection(index, -1)}
                            icon={ChevronUp}
                          />
                          <IconButton
                            label="Move down"
                            disabled={index === form.sections.length - 1}
                            onClick={() => moveSection(index, 1)}
                            icon={ChevronDown}
                          />
                          <IconButton
                            label={section.visible ? "Hide" : "Show"}
                            onClick={() => updateSection(index, { visible: !section.visible })}
                            icon={section.visible ? Eye : EyeOff}
                          />
                          <IconButton
                            label="Remove"
                            tone="danger"
                            onClick={() => removeSection(index)}
                            icon={Trash2}
                          />
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {form.sections.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSections((curr) => !curr)}
                    className="w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/70 py-2.5 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition flex items-center justify-center gap-1.5"
                  >
                    {showAllSections ? (
                      <>
                        <span>Show Fewer Sections (Show first 4)</span>
                        <ChevronUp size={14} />
                      </>
                    ) : (
                      <>
                        <span>Show All Page Sections ({form.sections.length - 4} more)</span>
                        <ChevronDown size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-900">Your page is empty</p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                  Add a block above to give your page something to show. Start with the welcome message.
                </p>
              </div>
            )}
          </OwnerPanel>

          {/* ─── Optional extras ─── */}
          <OwnerPanel
            title="Optional extras"
            description="Reviews, FAQ and Google search. Skip if you’re not ready — your page works without them."
            action={
              <button
                type="button"
                onClick={() => setShowExtras((o) => !o)}
                aria-expanded={showExtras}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {showExtras ? "Hide" : "Show"}
                {showExtras ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            }
          >
            <AnimatePresence initial={false}>
              {showExtras && (
                <motion.div
                  key="extras"
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="space-y-8 pt-2">
                    {/* Reviews */}
                    <div>
                      <p className="text-sm font-bold text-slate-900">Customer reviews</p>
                      <p className="mt-0.5 text-xs text-slate-500">Short quotes from happy customers</p>
                      <div className="mt-3 space-y-3">
                        {form.testimonials.map((row, i) => (
                          <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                            <textarea
                              className="form-input min-h-[72px]"
                              placeholder="What did they say?"
                              value={row.quote}
                              onChange={(e) => updateCollection("testimonials", i, "quote", e.target.value)}
                            />
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <input
                                className="form-input"
                                placeholder="Their name"
                                value={row.name}
                                onChange={(e) => updateCollection("testimonials", i, "name", e.target.value)}
                              />
                              <input
                                className="form-input"
                                placeholder="e.g. Regular customer"
                                value={row.role}
                                onChange={(e) => updateCollection("testimonials", i, "role", e.target.value)}
                              />
                            </div>
                            <SmallButton onClick={() => removeCollectionRow("testimonials", i)}>
                              Remove
                            </SmallButton>
                          </div>
                        ))}
                      </div>
                      <SmallButton onClick={() => addCollectionRow("testimonials", { quote: "", name: "", role: "" })}>
                        + Add a review
                      </SmallButton>
                    </div>

                    {/* FAQ */}
                    <div>
                      <p className="text-sm font-bold text-slate-900">Common questions</p>
                      <p className="mt-0.5 text-xs text-slate-500">Answer what customers ask most</p>
                      <div className="mt-3 space-y-3">
                        {form.faq.map((row, i) => (
                          <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                            <input
                              className="form-input"
                              placeholder="The question"
                              value={row.question}
                              onChange={(e) => updateCollection("faq", i, "question", e.target.value)}
                            />
                            <textarea
                              className="form-input mt-3 min-h-[72px]"
                              placeholder="Your answer"
                              value={row.answer}
                              onChange={(e) => updateCollection("faq", i, "answer", e.target.value)}
                            />
                            <SmallButton onClick={() => removeCollectionRow("faq", i)}>Remove</SmallButton>
                          </div>
                        ))}
                      </div>
                      <SmallButton onClick={() => addCollectionRow("faq", { question: "", answer: "" })}>
                        + Add a question
                      </SmallButton>
                    </div>

                    {/* SEO */}
                    <div>
                      <p className="text-sm font-bold text-slate-900">How you appear in Google</p>
                      <p className="mt-0.5 text-xs text-slate-500">The title and short text in search results</p>
                      <div className="mt-3 space-y-3">
                        <input
                          className="form-input"
                          placeholder="Search title"
                          value={form.seoTitle}
                          onChange={(e) => setField("seoTitle", e.target.value)}
                        />
                        <textarea
                          className="form-input min-h-[72px]"
                          placeholder="Short description"
                          value={form.seoDescription}
                          onChange={(e) => setField("seoDescription", e.target.value)}
                        />
                      </div>
                      {(form.seoTitle || form.seoDescription) && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                            Preview
                          </p>
                          <p className="mt-1 truncate text-base font-medium text-[#1a0dab]">
                            {form.seoTitle || "Your business name"}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {form.seoDescription || "Add a short description to control this line."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </OwnerPanel>

          {/* Sticky save bar */}
          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:static sm:rounded-2xl sm:border sm:shadow-lg sm:shadow-blue-900/5">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500">
                {isDirty ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Unsaved changes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600">
                    <Check size={12} strokeWidth={3} />
                    All saved
                  </span>
                )}
              </span>
              <button
                type="submit"
                disabled={isSaving || !isDirty}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>

        {/* ─── Sidebar ─── */}
        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          {/* URL card */}
          <OwnerPanel title="Your storefront link" description="Share this address with your customers">
            <div className="flex items-center gap-2">
              <Link
                to={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 truncate"
              >
                <Globe size={15} className="shrink-0" />
                <span className="truncate">{previewUrl}</span>
                <ExternalLink size={13} className="shrink-0 ml-auto text-slate-400" />
              </Link>
              <CopyButton text={previewUrl} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill published={websiteIsPublished} pending={approvalStatus === "pending"} />
              <span className="text-xs capitalize text-slate-500">
                {approvalStatus.replaceAll("_", " ")}
              </span>
            </div>
          </OwnerPanel>

          {/* Approval note */}
          {selectedTenant.websiteApprovalNote && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              <span className="font-bold">Note from our team: </span>
              {selectedTenant.websiteApprovalNote}
            </div>
          )}

          {/* Pending checks */}
          {pendingChecks.length > 0 && (
            <OwnerPanel title="Almost ready" description="Finish these to go live">
              <ul className="space-y-2">
                {pendingChecks.map((check) => (
                  <li
                    key={check.key}
                    className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <span>
                      <span className="block text-sm font-semibold text-amber-900">{check.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-amber-800">
                        {check.message}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </OwnerPanel>
          )}

          {/* Category shortcut */}
          {selectedCategory && (
            <OwnerPanel
              title={`Suggested for ${selectedCategory.name}`}
              description="One-click setup based on your business type"
              action={
                <button
                  type="button"
                  onClick={applyCategoryWebsiteHints}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Wand2 size={13} />
                  Apply
                </button>
              }
            >
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-600">
                We recommend the{" "}
                <span className="font-semibold text-slate-900">
                  {selectedCategory.websiteHints?.recommendedTemplate || "Showcase"}
                </span>{" "}
                look
                {selectedCategory.templateRules?.sectionPriority?.length
                  ? `, starting with ${selectedCategory.templateRules.sectionPriority
                      .slice(0, 3)
                      .map((t) => sectionFacing(t).name.toLowerCase())
                      .join(", ")
                      .replace(/, ([^,]*)$/, " and $1")}`
                  : ""}
                .
              </p>
            </OwnerPanel>
          )}
        </aside>
      </div>
    </section>
  );
}

/* ─── Small helpers ─── */

function Field({ label, hint, children }) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-900">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function IconButton({ label, icon: Icon, onClick, disabled = false, tone = "plain" }) {
  const tones =
    tone === "danger"
      ? "text-red-500 hover:bg-red-50 hover:border-red-200"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white transition disabled:cursor-not-allowed disabled:opacity-30 ${tones}`}
    >
      <Icon size={15} />
    </button>
  );
}

function SmallButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function StatusPill({ published, pending }) {
  if (published) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
        <Check size={11} strokeWidth={3} /> Live
      </span>
    );
  }
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
        In review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
      Not published
    </span>
  );
}

function Notice({ tone, children }) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`rounded-2xl border px-4 py-3 text-sm font-medium ${styles}`}
    >
      {children}
    </motion.div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const fullUrl = window.location.origin + text;
    navigator.clipboard?.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
      title="Copy storefront link"
    >
      {copied ? <Check size={13} className="text-blue-600" /> : <Copy size={13} />}
      <span>{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}