import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Building2, CheckCircle2, ChevronRight, Globe, Lock, Rocket, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { CountUp, EASE, Stagger, StaggerItem } from "../../components/ui/motion.jsx";

/**
 * The business owner's design system.
 *
 * A separate file rather than a flag on `adminUi` or `shopUi` because the owner is neither
 * audience — but it is emphatically the same product, and it keeps the site's blue.
 *
 *   admin    `hero-night` #071329, near-black. Cold, dense, institutional.
 *   customer white. Light, browse-and-buy, friendly.
 *   owner    `hero-work` #123061, mid-tone. Working surface, in progress, trading today.
 *
 * So the three domains are told apart by *value* rather than by hue: admin is the darkest blue
 * in the product, customer the lightest, and the owner sits deliberately between them. A fourth
 * hue was tried and reverted — it read as a different product rather than as a different room
 * in the same one, and the site's identity is blue.
 *
 * What actually separates them is weight and composition. The admin band is dense and packs
 * figures into the band itself. The customer header is a light wash with a soft even scrim. This
 * one is a mid-tone photographic band where the copy holds the left third and the trading
 * figures sit inside the band, because an owner arriving here is reading state, not browsing.
 */

/**
 * Photographs for the owner bands, cropped wide.
 *
 * Wide because these fill a band rather than sitting in a corner. Compressed hard because a
 * scrim sits on top of them. The transforms are load-bearing — an untransformed URL here ships
 * the original upload.
 */
export const OWNER_IMAGES = {
  // A shopkeeper handing an order across a counter to a real customer. Warm and mid-tone, with
  // detail through the middle of the frame, which is what survives a scrim at this weight.
  home: "https://ik.imagekit.io/fac14ggkmb/bg.avif?tr=w-1400,h-520,c-main,q-75",
  store: "https://ik.imagekit.io/fac14ggkmb/bg.avif?tr=w-1400,h-520,c-main,q-75",
  // Orders & sales transactions, fulfillment desk
  orders: "https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1400&q=80",
  // A market stall, for the trading pages.
  trade: "https://ik.imagekit.io/fac14ggkmb/image_9df7c110.jpg?tr=x-0,y-78,w-1328,h-480,c-main,q-75",
  // Cashier counter & retail POS terminal (Verified 200 OK)
  cashier: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1400&q=80",
  // Payments, credit cards, bank transfers & checkout settlement (Verified 200 OK)
  payments: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1400&q=80",
  // A handshake, for the setup and launch pages.
  setup: "https://ik.imagekit.io/fac14ggkmb/global.avif?tr=w-1400,h-520,c-main,q-75",
  // For the website builder.
  website: "https://ik.imagekit.io/fac14ggkmb/crystal.jpg?tr=w-1400,h-520,c-main,q-75",
  // Customer directory, CRM & loyalty
  customers: "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=1400&q=80",
  // WhatsApp assistant & customer messaging
  whatsapp: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=1400&q=80",
  // AI conversations & smart chatbot
  ai: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80",
  // AI Agent tools, integrations & webhooks
  tools: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80",
  // Data import, spreadsheets & catalog migration
  importOrders: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1400&q=80",
  // Knowledge base, documents & RAG
  knowledge: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1400&q=80",
  // Owner assistant & business co-pilot
  bot: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80",
  // Analytics & revenue performance
  analytics: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
  // Reports & daily executive briefing
  reports: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80",
  // Notifications & real-time alerts
  notifications: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=1400&q=80",
  // Business profile & identity
  profile: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80",
  // Add-on modules & marketplace
  modules: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80",
  // Custom fields & workflow schema
  fields: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1400&q=80",
  // System health & deployment readiness
  system: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=80",
  // QA checklist & verification testing
  qa: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
  // Submission package & release center
  submission: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80",
};

/**
 * The band at the top of an owner page.
 *
 * The inverse of the customer banner, and deliberately so: that one is a light wash with an even
 * scrim because a shopper is browsing and the words should feel light. This is a mid-blue
 * photographic band because an owner is arriving to read state, and a band that reads as
 * operational is doing useful work before a single figure is parsed.
 *
 * The scrim is directional rather than even — solid under the copy on the left, thinning to the
 * right so the photograph carries the far half. That is the one structural difference from the
 * customer header, and it is what makes the two read as different rooms rather than as the same
 * component with different copy.
 *
 * Decorative, so `aria-hidden`.
 */
export function OwnerHero({ eyebrow, title, description, stats = [], actions = null, image = OWNER_IMAGES.home, children }) {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate mb-6 overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-2xl sm:p-8 border border-white/10">
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover filter brightness-[0.72] contrast-[1.08] saturate-[1.15]"
        loading="eager"
        decoding="async"
      />

      {/* Directional cinematic vignette: high contrast on text side, clear photo visibility on right */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/30"
      />

      {/* Atmospheric ambient glows */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />

      {/* Luminous horizon accent line */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent shadow-[0_0_12px_rgba(56,189,248,0.7)]"
      />

      <motion.div
        className="relative max-w-2xl"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        {eyebrow ? (
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-100 backdrop-blur shadow-xs">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="mt-4 text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-4xl [text-shadow:0_2px_18px_rgba(3,9,22,0.6)]">
          {title}
        </h1>

        {description ? (
          <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-indigo-100/90 [text-shadow:0_1px_12px_rgba(3,9,22,0.65)]">
            {description}
          </p>
        ) : null}

        {/* Figures a trader actually opens the page for. These animate once, on scroll into view. */}
        {stats.length ? (
          <div className="mt-7 flex flex-wrap gap-2.5">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/20 bg-slate-900/65 px-4 py-2.5 shadow-lg backdrop-blur-md transition hover:bg-slate-900/80">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                    <CountUp value={stat.value} />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300">
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}

        {children}
      </motion.div>
    </section>
  );
}

/**
 * The primary control for an owner band.
 *
 * The one place a bright button appears. On a mid-blue band the shared pale `ui-btn-secondary`
 * disappears, and a white button reads as the loudest thing on the page, which is right for the
 * single next action.
 */
export function OwnerPrimaryAction({ to, children, icon: Icon = ArrowRight, onClick }) {
  const className =
    "inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-hero-work shadow-[0_14px_30px_-12px_rgba(3,10,26,0.7)] transition hover:bg-sky-50";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
        <Icon size={16} />
      </button>
    );
  }
  return (
    <Link to={to} className={className}>
      {children}
      <Icon size={16} />
    </Link>
  );
}

/**
 * The secondary control on an owner band.
 *
 * `OwnerPrimaryAction` is white and singular. This one is the other half of a pair that still
 * reads as two buttons rather than one shouting over the other — a white plate on the dark band,
 * with the ring doing the separation instead of brightness.
 */
export function OwnerGhostAction({ to, children, icon: Icon = null, onClick }) {
  const className =
    "inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20";

  const content = (
    <>
      {children}
      {Icon ? <Icon size={16} /> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return (
    <Link to={to} className={className}>
      {content}
    </Link>
  );
}

/**
 * A figure with its label.
 *
 * `tone` stays inside the product's blue, because that is the site's identity. `lead` is the one
 * worth noticing on the day; the rest recede, and `idle` is for a figure that is not being
 * tracked yet.
 */
export function OwnerStat({ label, value, hint, icon: Icon, tone = "calm" }) {
  const tones = {
    lead: "border-sky-300/80 bg-gradient-to-br from-white to-sky-50/70 shadow-card",
    calm: "border-blue-100/90 bg-gradient-to-br from-white to-blue-50/40 shadow-card",
    idle: "border-line bg-white shadow-card",
  };

  return (
    <div className={`flex h-full min-h-[105px] flex-col justify-between rounded-2xl border p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift ${tones[tone] || tones.calm}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">{label}</div>
          <div className="mt-1.5 text-2xl font-black leading-none tracking-tight text-ink">{value}</div>
        </div>
        {Icon ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-blue-100 bg-white text-brand shadow-xs">
            <Icon size={18} />
          </span>
        ) : null}
      </div>
      {hint ? <div className="mt-2 text-xs leading-4 text-muted">{hint}</div> : null}
    </div>
  );
}

/** A titled block in the owner's voice. */
export function OwnerPanel({ title, description, action = null, className = "", children }) {
  return (
    <section className={`rounded-card border border-line bg-white p-5 shadow-card ${className}`.trim()}>
      {title || action ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-extrabold text-ink">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Cinematic empty/onboarding state displayed when an owner visits a feature
 * before their business profile has been created.
 */
export function BusinessSetupRequired({
  feature = "This Feature",
  description = "Set up your business profile first to activate and configure this section.",
  icon: Icon = Building2,
  image = OWNER_IMAGES.setup,
  previewTitle = "What you can do once configured",
  previewItems = [
    { title: "Storefront Integration", desc: "Instantly link this feature to your online store and customer checkout." },
    { title: "Automated Workflows", desc: "Let your AI assistant handle inquiries and transactions 24/7." },
    { title: "Real-time Sync", desc: "Sync live records between your mobile till and online sales channels." },
  ],
}) {
  return (
    <div className="space-y-6">
      {/* Cinematic Hero */}
      <OwnerHero
        eyebrow="Initial Setup Required"
        title={`Set Up Your Business to Unlock ${feature}`}
        description={description}
        image={image || OWNER_IMAGES.setup}
        stats={[
          { label: "Step", value: "1 of 3" },
          { label: "Status", value: "Profile Needed" },
          { label: "Setup Time", value: "Under 1 Min" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard/business"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 px-5 py-3 text-sm font-black text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition hover:-translate-y-0.5 hover:shadow-sky-500/50"
            >
              <Rocket size={17} />
              <span>Create Business Profile</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/dashboard/launch-wizard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              <Sparkles size={16} className="text-sky-300" />
              <span>Launch Wizard</span>
            </Link>
          </div>
        }
      />

      {/* 3-Step Guided Roadmap */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border-2 border-blue-500/40 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/40 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold shadow-sm">
              1
            </span>
            <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700">
              Active Step
            </span>
          </div>
          <h3 className="mt-3.5 text-base font-extrabold text-ink">Create Business</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Add store name, category, WhatsApp number, and address to initialize your workspace.
          </p>
          <Link
            to="/dashboard/business"
            className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-hover hover:underline"
          >
            <span>Start setup</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-white/80 p-5 opacity-90 transition hover:opacity-100">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-extrabold">
              2
            </span>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Locked
            </span>
          </div>
          <h3 className="mt-3.5 text-base font-extrabold text-ink">Configure {feature}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Customize options, upload products, assign cashiers, or connect integrations.
          </p>
          <span className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Lock size={12} />
            <span>Unlocks after step 1</span>
          </span>
        </div>

        <div className="rounded-2xl border border-line bg-white/80 p-5 opacity-90 transition hover:opacity-100">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-extrabold">
              3
            </span>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Locked
            </span>
          </div>
          <h3 className="mt-3.5 text-base font-extrabold text-ink">Publish & Automate</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Publish your AI storefront, take WhatsApp orders, and print counter receipts.
          </p>
          <span className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Globe size={12} />
            <span>Go live to customers</span>
          </span>
        </div>
      </div>

      {/* Feature Capabilities Preview Card */}
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-sky-500/20 text-brand shadow-inner">
              <Icon size={22} />
            </span>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">{previewTitle}</h2>
              <p className="text-xs text-muted">A quick look at the features ready for your business</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Ready upon setup</span>
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {previewItems.map((item, idx) => (
            <div
              key={idx}
              className="group relative rounded-2xl border border-slate-100 bg-surface/60 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-brand text-xs font-black">
                  ✓
                </span>
                <h4 className="text-sm font-bold text-ink">{item.title}</h4>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0e274c] p-5 text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-300">
              <Zap size={20} />
            </span>
            <div>
              <div className="text-sm font-bold">Takes less than 60 seconds</div>
              <div className="text-xs text-slate-300">No credit card or payment required to configure your store.</div>
            </div>
          </div>
          <Link
            to="/dashboard/business"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-extrabold text-slate-900 hover:bg-slate-100 transition shadow-sm"
          >
            <span>Complete Setup Now</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}

export { Stagger, StaggerItem };