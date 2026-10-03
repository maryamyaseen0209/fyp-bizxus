import { Check, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { BrandLogo } from "../../components/common/BrandLogo.jsx";

/**
 * The single shell for every authentication screen.
 *
 * Login, register, forced reset and phone reset each used to carry their own split-screen
 * markup and their own copy of `Field`, which is why they drifted apart visually. They all
 * render through this now, so a change lands on all of them at once.
 *
 * What the story panel no longer does, deliberately:
 *
 * - It told you to "Sign in, choose business, manage orders" — a step list that told someone
 *   already sitting on the login page what they had come to do, while the register flow ships
 *   its own real `AuthStepper`. Removed.
 * - It rendered a mock dashboard with invented figures ("Revenue PKR 58K", "12 orders") and
 *   then a perk grid restating the very same claims one block below. A real photograph of the
 *   product's actual audience does that job honestly and with far less on screen.
 * - It carried a strip of three more photographs under the form. They repeated the panel's
 *   own message at a size small enough to read as an ad banner, and the fourth image pulled
 *   the eye away from the fields. One photograph, used once, does more work.
 *
 * Copy is keyed on audience *and* mode, because a returning owner and a first-time owner
 * reading the same words is the difference between a page that addresses you and a page you
 * have to interpret. Signup talks about getting set up; login talks about picking up where
 * you left off.
 *
 * The panel is `hidden` below `lg`: on a phone it pushed the form itself below the fold, so
 * the first thing a user saw was marketing copy instead of the input they came for.
 */

const IMAGES = {
  business: "https://ik.imagekit.io/fac14ggkmb/images%20(1).jpg",
  customer: "https://ik.imagekit.io/fac14ggkmb/images%20(3).jpg",
};

const COPY = {
  business: {
    login: {
      eyebrow: "Business owner & cashier access",
      headline: "Your shop is waiting for you.",
      blurb:
        "Sign in and pick up where you left off — today's orders, stock levels and customer messages, all in one place.",
      perks: [
        "Every order and payment already matched up",
        "Stock that updates the moment an order lands",
        "Your AI assistant kept answering overnight",
        "Cashiers and owners share one login",
      ],
      footnote: "Free plan available. No card required.",
    },
    register: {
      eyebrow: "Free to start, about a minute",
      headline: "Put your business online tonight.",
      blurb:
        "Create your account, add what you sell, publish your link. The AI assistant starts answering customer questions straight away.",
      perks: [
        "A storefront you can publish today",
        "An AI assistant trained on your own catalog",
        "WhatsApp replies handled for you",
        "Cash on delivery, JazzCash, Easypaisa and card",
      ],
      footnote: "No card required to publish your storefront.",
    },
  },
  customer: {
    login: {
      eyebrow: "Your customer account",
      headline: "Your orders are already on their way.",
      blurb:
        "Sign in to message a shop, reorder what you bought before, and follow each delivery to your door.",
      perks: [
        "Every past order, saved and reorderable",
        "Message any shop you have ordered from",
        "Live status from confirmed to delivered",
        "Saved details, so checkout takes seconds",
      ],
      footnote: "You can browse the marketplace without paying anything.",
    },
    register: {
      eyebrow: "Join the marketplace",
      headline: "Shop every local business in one place.",
      blurb:
        "Create an account to order from shops near you, pay the way you already pay, and track delivery without a single phone call.",
      perks: [
        "Every registered business, in one search",
        "Ask a shop a question and get a real answer",
        "Pay with JazzCash, Easypaisa, card or cash",
        "Track every order until it arrives",
      ],
      footnote: "Free to join. Takes about a minute.",
    },
  },
};

export function AuthLayout({
  audience = "business",
  mode = "login",
  title,
  subtitle,
  children,
  footer = null,
}) {
  const group = COPY[audience] || COPY.business;
  const copy = group[mode] || group.login;

  return (
    <div
      className="auth-shell relative min-h-screen overflow-hidden"
      style={{ "--auth-photo": `url(${IMAGES[audience] || IMAGES.business})` }}
    >
      <div aria-hidden="true" className="auth-grid pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <BrandLogo tone="light" showWordmark={false} imageClassName="h-10 w-10" />
            <span className="text-lg font-extrabold tracking-tight text-ink">BizXusAI</span>
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700"
          >
            Back to home
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] lg:gap-12 lg:py-10">
          <StoryPanel copy={copy} />

          <section className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-[2rem] border border-line bg-white p-6 shadow-[0_24px_60px_-24px_rgba(37,99,235,0.35)] sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">{title}</h2>
              {subtitle ? <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p> : null}

              <div className="mt-7">{children}</div>
            </div>

            {footer ? <div className="mt-5">{footer}</div> : null}
          </section>
        </main>
      </div>
    </div>
  );
}

/**
 * The photograph, the pitch, and the four promises — and nothing else.
 *
 * The vignette and the hairline are what sell the "shot through a lens" feel without adding
 * any markup the reader has to process: the vignette pushes the frame's corners down so the
 * panel reads as depth rather than a rectangle, and the hairline catches light along the top
 * edge the way a backlit screen would.
 */
function StoryPanel({ copy }) {
  return (
    <>
      {/* Desktop: the full-height cinematic panel. */}
      <section className="relative isolate hidden overflow-hidden rounded-[2rem] bg-hero-night p-10 shadow-cinematic lg:flex lg:flex-col lg:justify-center">
        <div className="auth-story-photo" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_62%_at_30%_45%,transparent_0%,rgba(7,19,41,0.62)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent"
        />

        <div className="relative">
          <span className="landing-eyebrow landing-eyebrow-dark inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
            {copy.eyebrow}
          </span>
          <h1 className="mt-5 max-w-xl text-[2.75rem] font-black leading-[1.06] tracking-tight text-hero-ink">
            {copy.headline}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-8 text-hero-muted">{copy.blurb}</p>

          <ul className="mt-8 grid max-w-lg gap-3 sm:grid-cols-2">
            {copy.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-hero-ink">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-sky-300">
                  <Check size={12} strokeWidth={3.5} />
                </span>
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex items-center gap-2 text-sm font-semibold text-hero-faint">
            <ShieldCheck size={16} className="text-sky-300" />
            {copy.footnote}
          </div>
        </div>
      </section>

      {/* Mobile: a short banner, not a panel. Same image, lighter scrim, headline only —
          enough to signal what the product is without making the user scroll past it. */}
      <section className="relative isolate overflow-hidden rounded-[1.5rem] bg-hero-night lg:hidden">
        <div className="auth-story-photo auth-story-photo-light absolute inset-0" aria-hidden="true" />
        <div className="relative p-6">
          <h1 className="text-2xl font-black leading-[1.12] tracking-tight text-hero-ink">
            {copy.headline}
          </h1>
        </div>
      </section>
    </>
  );
}

/* --------------------------------------------------------------- field -- */

export function AuthField({ icon, label, error, htmlFor, children, hint = "" }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-ink">
        {label}
      </label>
      <div
        className={`auth-field flex items-center gap-2.5 rounded-2xl border bg-white px-3.5 transition focus-within:ring-4 ${
          error
            ? "border-red-300 focus-within:border-red-400 focus-within:ring-red-500/10"
            : "border-blue-100 focus-within:border-blue-400 focus-within:ring-blue-500/10"
        }`}
      >
        {icon ? <span className={error ? "text-red-400" : "text-subtle"}>{icon}</span> : null}
        {children}
      </div>
      {error ? (
        <span className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-subtle">{hint}</span>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- alerts -- */

export function AuthAlert({ tone = "red", children, actionTo = "", actionLabel = "" }) {
  if (!children) return null;
  const tones = {
    red: "border-red-200 bg-red-50 text-red-700",
    green: "border-blue-200 bg-blue-50 text-blue-700",
    brand: "border-blue-200 bg-blue-50 text-blue-700",
    orange: "border-orange-200 bg-orange-100 text-orange-700",
  };
  return (
    <div
      role={tone === "red" ? "alert" : "status"}
      className={`mb-4 rounded-xl border px-3.5 py-2.5 text-sm font-semibold leading-6 ${tones[tone] || tones.red}`}
    >
      {children}
      {actionTo && actionLabel ? (
        <Link className="ml-1 underline underline-offset-2" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- button -- */

export function AuthSubmit({ children, isSubmitting = false, ...rest }) {
  return (
    <button type="submit" disabled={isSubmitting} className="auth-primary-btn ui-btn-primary w-full !py-3.5" {...rest}>
      {isSubmitting ? "Please wait..." : children}
    </button>
  );
}

/* ------------------------------------------------------------- stepper -- */

export function AuthStepper({ steps, activeIndex }) {
  return (
    <ol className="mb-6 flex items-center">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        return (
          <li key={step.code} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black transition ${
                  done
                    ? "bg-blue-600 text-white"
                    : current
                      ? "bg-cta text-white shadow-nav-active"
                      : "bg-surface text-subtle"
                }`}
              >
                {done ? <Check size={13} strokeWidth={3.5} /> : index + 1}
              </span>
              <span
                className={`hidden text-xs font-bold sm:block ${
                  current ? "text-ink" : done ? "text-blue-600" : "text-subtle"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span className={`mx-2 h-px flex-1 ${done ? "bg-blue-400" : "bg-line"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------- cross links -- */

export function AuthFooterLinks({ audience = "business" }) {
  // One prompt, one destination. This used to offer both a customer login and a customer
  // register link separated by a pipe, so someone who had not decided yet had to choose
  // between two doors on a page whose whole job was to remove decisions.
  return (
    <div className="rounded-2xl border border-line bg-white/80 px-5 py-3.5 text-center text-sm text-muted">
      {audience === "customer" ? (
        <>
          Business owner or admin?{" "}
          <Link className="font-bold text-brand hover:text-brand-hover" to="/login">
            Business login
          </Link>
        </>
      ) : (
        <>
          Looking to shop instead?{" "}
          <Link className="font-bold text-brand hover:text-brand-hover" to="/customer/login">
            Customer login
          </Link>
        </>
      )}
    </div>
  );
}
