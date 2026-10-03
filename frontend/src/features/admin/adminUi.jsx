import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { IconTile } from "../../components/ui/index.jsx";
import { EASE, CountUp, Reveal } from "../../components/ui/motion.jsx";

// Reveal and CountUp now live in the shared motion module with the customer portal's copy.
// Re-exported here so the admin pages keep importing one module, and so nobody ends up with
// two slightly different counting animations in the same app.
export { CountUp, Reveal };

/**
 * Shared primitives for the admin panel.
 *
 * All eight admin pages used to hand-roll the same three things, slightly differently each
 * time: a `bg-surface-purple` intro card with an eyebrow, a heading and a row of decorative
 * chips; a `Field` label wrapper; and status pills with raw enum values like
 * `not_generated` or `platform_admin` shown verbatim. That is why the panel read as eight
 * unrelated screens.
 *
 * This file holds one version of each. The chips are gone entirely â€” they were static text
 * that restated the section headings below them, so they carried no information.
 */

/* --------------------------------------------------------------- labels -- */

/** Turns any enum into a sentence: `pending_review` -> `Pending review`. */
export function humanize(value, fallback = "Unknown") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const text = raw.replaceAll("_", " ").replaceAll("-", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const PLAN_LABELS = {
  starter: "Basic",
  growth: "AI Ordering",
  scale: "Full Agent",
};

export const TENANT_STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export const WEBSITE_STATUS_LABELS = {
  not_generated: "Not created",
  pending_review: "Awaiting review",
  published: "Published",
  unpublished: "Unpublished",
  rejected: "Rejected",
};

export const USER_STATUS_LABELS = {
  active: "Active",
  suspended: "Suspended",
};

export const ROLE_LABELS = {
  platform_admin: "Platform admin",
  user: "Standard user",
};

export function planLabel(planCode) {
  return PLAN_LABELS[planCode] || humanize(planCode, "Basic");
}

/* --------------------------------------------------------------- header -- */

/**
 * The single header for every admin page. Deliberately thin: eyebrow, title, one sentence,
 * and an action slot. The old version was a filled panel that pushed the page's real content
 * a screen down and repeated itself eight times.
 */
export function AdminHeader({ eyebrow, title, description, icon, actions = null, children = null }) {
  return (
    <header className="mb-6 border-b border-line-soft pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {icon ? <IconTile icon={icon} size={48} /> : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
            ) : null}
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

/* ----------------------------------------------------------------- hero -- */

/**
 * One visual identity per admin screen.
 *
 * Seven pages sharing a single hero treatment were indistinguishable â€” the same photograph,
 * the same blue cast, the same layout, so nothing told you where you were. Each entry below
 * changes three things at once: the source image (optionally re-cropped through ImageKit
 * transforms, so two entries sharing a source still do not look alike), the colour cast laid
 * over it, and the glow behind the figures.
 *
 * `mono` and `soft` are treatments rather than assets. Reports is deliberately desaturated â€”
 * it is the analytical screen, and that also neutralises the one stock photo whose palette
 * fights the rest of the app. Categories is blurred to near-abstraction so it reads as
 * texture while the surrounding pages read as photographs.
 *
 * If you add an admin page, add it here rather than inventing a hero inline: that keeps the
 * panel's identities in one list.
 */
const SKINS = {
  overview: {
    photo: "https://ik.imagekit.io/fac14ggkmb/business-blur-background-photo.jpeg?tr=w-1600,h-900,c-main,q-80",
    tint: "rgba(11, 27, 54, 0.58)",
    glow: "rgba(37, 99, 235, 0.42)",
  },
  businesses: {
    photo: "https://ik.imagekit.io/fac14ggkmb/images%20(1).jpg?tr=w-1600,h-900,c-main,q-80",
    tint: "rgba(30, 27, 75, 0.55)",
    glow: "rgba(99, 102, 241, 0.44)",
  },
  users: {
    photo: "https://ik.imagekit.io/fac14ggkmb/images.jpg?tr=w-1600,h-900,c-main,q-80",
    tint: "rgba(8, 47, 73, 0.52)",
    glow: "rgba(14, 165, 233, 0.44)",
  },
  payments: {
    photo: "https://ik.imagekit.io/fac14ggkmb/images%20(3).jpg?tr=w-1600,h-900,c-main,q-80",
    tint: "rgba(6, 46, 36, 0.5)",
    glow: "rgba(16, 185, 129, 0.4)",
  },
  reports: {
    photo: "https://ik.imagekit.io/fac14ggkmb/images%20(2).jpg?tr=w-1600,h-900,c-main,q-80",
    tint: "rgba(15, 23, 42, 0.62)",
    glow: "rgba(148, 163, 184, 0.3)",
    mono: true,
  },
  categories: {
    photo: "https://ik.imagekit.io/fac14ggkmb/business-blur-background-photo.jpeg?tr=w-1400,h-1400,cm-mid,q-75,bl-8",
    tint: "rgba(6, 46, 44, 0.5)",
    glow: "rgba(13, 148, 136, 0.42)",
    soft: true,
  },
  modules: {
    photo: "https://ik.imagekit.io/fac14ggkmb/images%20(3).jpg?tr=w-1200,h-1000,c-main,q-78,bl-6",
    tint: "rgba(24, 24, 62, 0.55)",
    glow: "rgba(79, 70, 229, 0.42)",
    soft: true,
  },
};

/**
 * The cinematic header used by every admin page.
 *
 * `skin` picks the page's identity from `SKINS`. The photo treatment itself lives in
 * `.admin-hero-bg` in styles.css; the variables below are what let one CSS rule serve seven
 * different-looking pages.
 */
export function AdminHero({ skin = "overview", eyebrow, title, description, icon: Icon, stats = [], children }) {
  const reduce = useReducedMotion();
  const look = SKINS[skin] || SKINS.overview;

  return (
    <section className="relative isolate mb-6 overflow-hidden rounded-2xl bg-hero-night px-6 py-8 shadow-cinematic sm:px-8">
      <div
        className={`admin-hero-bg ${look.mono ? "admin-hero-bg-mono" : ""} ${look.soft ? "admin-hero-bg-soft" : ""}`.trim()}
        style={{ "--admin-photo": `url(${look.photo})`, "--admin-tint": look.tint, "--admin-glow": look.glow }}
        aria-hidden="true"
      />
      <div className="admin-grid-bg pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      {/* The sweeping light beam and the breathing glow that used to sit here have both been
          removed. Crossing a photo with a moving highlight draws the eye to the image rather
          than to the figures, and it made the photographs read as lit video rather than as
          pictures. Depth now comes from the scrim gradients baked into `.admin-hero-bg`, which
          are static, so the only movement left on this band is the figures arriving. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/40 to-transparent"
        aria-hidden="true"
      />

      <motion.div
        className="relative"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-start gap-4">
          {Icon ? (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md">
              <Icon size={22} strokeWidth={2} />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">{eyebrow}</p>
            ) : null}
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-hero-ink sm:text-3xl">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-hero-muted">{description}</p> : null}
          </div>
        </div>

        {stats.length ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <Reveal key={stat.label} delay={0.12 + index * 0.08}>
                <HeroStat {...stat} />
              </Reveal>
            ))}
          </div>
        ) : null}

        {children}
      </motion.div>
    </section>
  );
}

function HeroStat({ label, value, hint, icon: Icon, tone = "brand", format }) {
  const tones = {
    brand: "text-sky-300",
    approve: "text-emerald-300",
    pending: "text-amber-300",
    danger: "text-red-300",
  };

  // No sheen here on purpose. A light sweep repeatedly crossing four figures inside a hero
  // that already has a drifting photo, a sweeping beam and a pulsing glow was too much
  // motion in one place, and it made the numbers harder to read while animating.
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 backdrop-blur-md">
      <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-hero-faint ${tones[tone] || tones.brand}`}>
        {Icon ? <Icon size={13} /> : null}
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-black leading-none tracking-tight text-hero-ink">
        {typeof value === "number" ? <CountUp value={value} format={format} /> : format ? format(value) : value}
      </div>
      {hint ? <div className="mt-1 text-[11px] text-hero-faint">{hint}</div> : null}
    </div>
  );
}

/**
 * The readiness meter for a website approval request.
 *
 * This replaces a plain "3/5 checks passed" line. The bar answers the question the reviewer
 * actually has â€” how close is this business to being publishable â€” before they read a single
 * checklist item, and the colour shifts with the score so a weak request is visible at a glance.
 */
export function ProgressMeter({ passed, total, className = "" }) {
  const reduce = useReducedMotion();
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const complete = passed === total && total > 0;
  const weak = pct < 60;

  const bar = complete
    ? "from-emerald-400 to-emerald-300"
    : weak
      ? "from-red-500 to-orange-400"
      : "from-blue-500 to-sky-300";

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold text-ink">
          {passed} of {total} checks passed
        </span>
        <span className={`text-xs font-black ${complete ? "text-emerald-600" : weak ? "text-orange-600" : "text-brand"}`}>
          {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${bar}`}
          initial={reduce ? { width: `${pct}%` } : { width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {complete
          ? "Everything required is in place. This one is ready to publish."
          : weak
            ? "Several requirements are missing. Reject with a reason, or wait for the fixes."
            : "Nearly ready â€” check what is still missing before approving."}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- card -- */

export function Panel({ title, description, icon, count = null, tone = "", actions = null, children, className = "", lift = false }) {
  return (
    <section
      className={`admin-panel rounded-xl border border-line bg-white p-5 shadow-card ${lift ? "transition duration-300 hover:-translate-y-0.5 hover:shadow-lift" : ""} ${className}`.trim()}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? <span className={`mt-0.5 shrink-0 ${tone || "text-brand"}`}><IconTile icon={icon} size={36} tone="slate" /></span> : null}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">{title}</h2>
            {description ? <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">{description}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count !== null ? <CountPill value={count} tone={count > 0 ? "pending" : "clear"} /> : null}
          {actions}
        </div>
      </div>
      {children}
    </section>
  );
}

export function CountPill({ value, tone = "pending" }) {
  const toneClass =
    tone === "clear"
      ? "bg-approve-50 text-approve-700 ring-approve-200"
      : "bg-orange-50 text-orange-700 ring-orange-200";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClass}`}>
      {/* Only a live count pulses. A static figure should not blink at the reader. */}
      {tone !== "clear" && value > 0 ? <span className="admin-live-dot h-1.5 w-1.5 rounded-full bg-orange-500" /> : null}
      {value} {value === 1 ? "item" : "items"}
    </span>
  );
}

/* ---------------------------------------------------------------- pills -- */

const TONE_CLASS = {
  approve: "bg-approve-50 text-approve-700 ring-approve-200",
  pending: "bg-orange-50 text-orange-700 ring-orange-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  neutral: "bg-surface text-muted ring-line",
  brand: "bg-brand-100 text-brand ring-brand-200",
};

export function Pill({ tone = "neutral", icon: Icon, children }) {
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ring-1 ${TONE_CLASS[tone] || TONE_CLASS.neutral}`}>
      {Icon ? <Icon size={11} strokeWidth={2.6} /> : null}
      {children}
    </span>
  );
}

/** Maps a tenant/website status onto an approval tone, so colour always matches meaning. */
export function statusTone(value) {
  const key = String(value || "");
  if (["active", "published", "approved", "processed"].includes(key)) return "approve";
  if (["pending", "pending_review", "pending_approval", "draft"].includes(key)) return "pending";
  if (["archived", "rejected", "suspended", "failed"].includes(key)) return "danger";
  return "neutral";
}

export function StatusPill({ value, labels }) {
  return <Pill tone={statusTone(value)}>{labels?.[value] || humanize(value)}</Pill>;
}

/* -------------------------------------------------------------- toolbar -- */

/**
 * Search plus optional filter chips, with a live result count. The tenant list previously
 * rendered one card per business â€” five live dropdowns each â€” with no way to narrow it down
 * and a Filter icon that implied filtering that did not exist.
 */
export function Toolbar({ search, onSearchChange, placeholder = "Search", filters = [], activeFilter = "all", onFilterChange, resultLabel }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-brand-bright focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-subtle" />
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => onFilterChange(f.value)}
                aria-pressed={activeFilter === f.value}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  activeFilter === f.value
                    ? "bg-brand text-white shadow-nav-active"
                    : "bg-surface text-muted hover:bg-brand-50 hover:text-brand"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}
        {resultLabel ? <span className="text-xs font-semibold text-muted">{resultLabel}</span> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- dialog -- */

/**
 * Replaces `window.prompt` / `window.confirm`.
 *
 * The approval queue used browser-native dialogs, which cannot show the business name or the
 * checklist an admin is about to act on, and on some platforms a prompt can silently return
 * null. This keeps the context visible while asking for the decision.
 */
export function Dialog({ open, title, description, confirmLabel, cancelLabel = "Cancel", tone = "approve", withNote = false, noteLabel = "Note for the owner", notePlaceholder = "", busy = false, onConfirm, onCancel }) {
  const noteRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = tone === "danger";
  const confirmClass = isDanger
    ? "bg-red-600 text-white hover:bg-red-700"
    : "bg-approve-600 text-white hover:bg-approve-700";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={busy ? undefined : onCancel}
        role="presentation"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-t-2xl border border-line bg-white p-6 shadow-lift sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isDanger ? "bg-red-50 text-red-600" : "bg-approve-50 text-approve-600"}`}>
              {isDanger ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-ink">{title}</h2>
              {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink" aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>

        {withNote ? (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-bold text-ink">{noteLabel}</span>
            <textarea
              ref={noteRef}
              rows={3}
              defaultValue=""
              placeholder={notePlaceholder}
              className="form-input resize-y"
            />
          </label>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="ui-btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${confirmClass}`}
            onClick={() => {
              const note = withNote && noteRef.current ? noteRef.current.value.trim() : "";
              onConfirm(note);
            }}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ decisions -- */

export function ApproveButton({ label = "Approve", busy = false, onClick }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl bg-approve-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-approve-700 disabled:opacity-50"
    >
      <CheckCircle2 size={15} />
      {label}
    </button>
  );
}

export function RejectButton({ label = "Reject", busy = false, onClick }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
    >
      <XCircle size={15} />
      {label}
    </button>
  );
}

/* --------------------------------------------------------------- misc -- */

export function Notice({ tone = "info", children }) {
  if (!children) return null;
  const tones = {
    success: "border-approve-200 bg-approve-50 text-approve-800",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-line bg-surface text-muted",
  };
  return <div className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${tones[tone] || tones.info}`}>{children}</div>;
}

export function EmptyRow({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-subtle">{hint}</span> : null}
    </label>
  );
}

/** A boolean control that reads as a switch rather than a `true` / `false` dropdown. */
export function ToggleChip({ on, onLabel = "Verified", offLabel = "Not verified", busy = false, onToggle }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onToggle}
      aria-pressed={on}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
        on ? "bg-approve-50 text-approve-700 ring-1 ring-approve-200" : "bg-surface text-muted ring-1 ring-line hover:bg-white"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? "bg-approve-500" : "bg-subtle"}`} />
      {on ? onLabel : offLabel}
    </button>
  );
}