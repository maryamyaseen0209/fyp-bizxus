import { ArrowRight, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

import { CountUp, EASE, Reveal, Stagger, StaggerItem } from "../../components/ui/motion.jsx";

/**
 * Shared pieces for the customer-facing surfaces: the marketplace, a single business's
 * catalogue, and the cart.
 *
 * The customer side gets its own file rather than reusing the admin primitives because the two
 * are tuned differently and it matters which is which. The admin band is dark, dense and
 * subordinate to the work; this one is meant to make browsing feel inviting, so the photograph
 * stays visible, the copy leads, and motion is used to reward attention rather than to signal
 * that something is happening.
 */

/**
 * Every customer-side image, in one place, with the transform applied.
 *
 * The crops and exclusions are deliberate and worth not undoing:
 *
 * - `business`: the source had a baked-in title band ("THE DAILY CRUMB") and a photographic
 *   caption strip along the bottom edge. Both are generator artefacts rather than part of the
 *   picture, so the transform crops them away with `x-0,y-78,w-1328,h-660` — the clean market
 *   scene survives intact.
 * - `empty`: a neutral line-art bag. Chosen over the "cart empty" artwork that was supplied,
 *   which was a full mockup carrying its own headline and an orange button — it would have
 *   duplicated the real heading and CTA, in a colour that is not in the palette.
 *
 * Assets considered and left unused, because using them would have cost quality:
 * `f_prodfallback` and `images (4)` both carry a red crossed-circle, which reads as an error
 * rather than as an empty state; `3d-rendering-cartoon-shopping-cart` is amber, a long way from
 * this product's blue.
 */
export const SHOP_IMAGES = {
  // A shopkeeper handing an order across a counter. Warm, human, and unmistakably a real
  // local business — which is the entire pitch of the marketplace.
  hero: "https://ik.imagekit.io/fac14ggkmb/magnific__18001100-or-wider-landscapewarm-and-human-a-shopfr__50800.png?tr=w-1200,h-900,c-main,q-80",
  // On-palette 3D figure stepping out of a phone with parcels. Used as a floating accent.
  heroAccent: "https://ik.imagekit.io/fac14ggkmb/3d-character-emerging-from-smartphone.jpg?tr=w-560,h-420,c-main,q-80",
  // Market stall handover, cropped clean of its title band and caption strip.
  business: "https://ik.imagekit.io/fac14ggkmb/image_9df7c110.jpg?tr=x-0,y-78,w-1328,h-660,c-main,q-80",
  // Neutral line-art, sits quietly on white.
  empty: "https://ik.imagekit.io/fac14ggkmb/images.png?tr=w-420,h-315,c-main,q-80",
  // Full-bleed backdrops for the account pages. These fill the whole banner rather than sitting
  // in a corner, so they are requested as wide crops — a squarish crop stretched across a band
  // is a blurry crop. `q-70` is enough because a heavy scrim sits on top of them.
  //
  // One scene per page, matched to what that page is about: a cart for the cart, a market stall
  // for orders, a phone for notifications, a shop counter for the profile.
  cart: "https://ik.imagekit.io/fac14ggkmb/shopping-cart-with-bubbles-geometric-shapes-3d-style.jpg?tr=w-1400,h-560,c-main,q-70",
  orders: "https://ik.imagekit.io/fac14ggkmb/image_9df7c110.jpg?tr=x-0,y-78,w-1328,h-520,c-main,q-70",
  notifications: "https://ik.imagekit.io/fac14ggkmb/images%20(2).jpg?updatedAt=1790834145777",
  account: "https://ik.imagekit.io/fac14ggkmb/magnific__18001100-or-wider-landscapewarm-and-human-a-shopfr__50800.png?tr=w-1400,h-560,c-main,q-70",
};

/**
 * The page itself: a full-section photographic background, with the content sitting on top.
 *
 * The banner above already shows the scene sharply; this is the same photograph carried down the
 * whole page as a texture, so the screen does not read as a photo strip with a white page bolted
 * underneath it.
 *
 * The scrim is deliberately heavy — around ninety percent white. Two reasons. The content is
 * cards of real text, which have to stay legible over anything; and because `object-cover` on a
 * page several screens tall crops the source hard, a heavy scrim means nobody can tell the
 * photograph has been zoomed. What you get is a whisper of the scene in the gutters and around
 * the edges, which is depth rather than decoration.
 *
 * A tint at the top ties the surface to the banner above it. Decorative, so `aria-hidden`.
 */
export function PageSurface({ image, className = "", children }) {
  return (
    <div className={`relative isolate ${className}`.trim()}>
      {image ? (
        <>
          <img
            src={image}
            alt=""
            aria-hidden="true"
            /* Slightly punchier than the raw upload. A photograph behind a flat wash reads as
               mud; a little saturation and contrast keeps it a photograph. */
            className="absolute inset-0 -z-20 h-full w-full object-cover saturate-110 contrast-[1.03]"
            loading="lazy"
            decoding="async"
          />
          {/* One even wash across the whole page. The previous version ran a directional
              white gradient, which left the photograph visible on one side and invisible on the
              other — a banner photo stranded in a corner, which is what this was meant to fix.
              Flat and much lighter, so the scene reads everywhere. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-white/62" />
          {/* A brand tint rather than more white, so the pale wash shifts the photograph towards
              the product's blue instead of draining it. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-100/45 via-brand-50/30 to-brand-100/45" />
        </>
      ) : null}

      {/* Above the surface, not inside it, so the content is never a child of a positioned
          backdrop and cannot accidentally inherit its stacking. */}
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * The banner at the top of the account pages — cart, orders, notifications, profile.
 *
 * These four each grew their own header, which meant four slightly different boxes saying the
 * same three things. This is one of them.
 *
 * The photograph fills the entire band. A corner image reads as a stock decoration pasted onto
 * the page; a full-bleed one reads as a place, which is what the header of a marketplace should
 * suggest.
 *
 * Two scrims sit over it. The white one runs almost solid on the left, where all the copy is,
 * and thins towards the right so the picture is visible without ever competing with the words —
 * the text stays dark on light, because these are light pages and the contrast has to stay that
 * way round. The second is a sky-to-brand tint that keeps the far side from going grey.
 *
 * The image settles once and stops. An earlier version drifted up and down on a six-second
 * infinite loop behind body copy on four screens, which is precisely the perpetual motion that
 * makes a product feel unprofessional; the band now settles and is still.
 *
 * Decorative, so `aria-hidden` with empty alt — a screen-reader user should not hear a filename
 * once per page.
 */
export function PageBanner({ eyebrow, title, description, meta = [], image, children }) {
  const reduce = useReducedMotion();

  return (
    <header className="relative isolate min-h-[10rem] overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card sm:min-h-[13rem] sm:p-6">
      {image ? (
        <motion.img
          src={image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover saturate-110"
          initial={reduce ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-br from-white via-sky-50 to-brand-50"
        />
      )}

      {/* Two even washes, no directional gradient. The copy used to sit on a wash that was solid
          on the left and thinned to nothing on the right, which meant the photograph was only
          ever half present — the left-alignment complaint. Flat washes put the image under the
          whole band at equal strength.

          Contrast is held by the text colour rather than by burying the photo: the title is
          `text-ink` and the description is darkened to `text-ink/75`, which both stay legible
          over a 58% white wash without needing the image hidden behind a heavier one. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-white/58" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-100/45 via-transparent to-brand-100/50" />

      <motion.div
        className="relative max-w-2xl"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
        ) : null}

        <h1 className={`${eyebrow ? "mt-1.5" : ""} text-xl font-extrabold tracking-tight text-ink sm:text-2xl`}>
          {title}
        </h1>

        {description ? (
          <p className="mt-1.5 max-w-xl text-sm font-medium leading-6 text-ink/75">{description}</p>
        ) : null}

        {/* Facts, not decoration: the numbers a reader actually came for. */}
        {meta.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            {meta.map((entry) => (
              <div key={entry.label} className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold leading-none text-ink">{entry.value}</span>
                <span className="text-xs font-semibold text-ink/70">{entry.label}</span>
              </div>
            ))}
          </div>
        ) : null}

        {children}
      </motion.div>
    </header>
  );
}

/**
 * The band at the top of the marketplace.
 *
 * Deliberately the opposite of the admin hero. The admin band is a dark navy photograph under
 * a heavy scrim: serious, dense, subordinate to the numbers a manager is reading at a glance.
 * This one is light and bright instead — a soft gradient, a large colourful photograph shown
 * rather than hidden, dark type. Two dark hero bands in the same product made the customer side
 * feel like an internal tool, which is the opposite of what a browsing experience should do.
 *
 * Guidance is part of the design, not an afterthought: one primary action, and the figures say
 * how much is actually on offer rather than claiming it.
 */
export function ShopHero({ eyebrow, title, description, stats = [], actions = null, image, accentImage }) {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate mb-6 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-white via-sky-50/80 to-brand-100/70 p-6 shadow-lift sm:p-9">
      {/* Soft colour wash. Three overlapping blobs rather than one flat tint, so the surface
          has depth without a photograph competing with the copy. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-brand-300/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute right-1/3 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-emerald-200/25 blur-3xl" />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            {eyebrow ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand shadow-sm ring-1 ring-brand-100 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {eyebrow}
              </p>
            ) : null}

            <h1 className="mt-5 max-w-2xl text-3xl font-black leading-[1.08] tracking-tight text-ink sm:text-4xl lg:text-[2.9rem]">
              {title}
            </h1>

            {description ? (
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">{description}</p>
            ) : null}

            {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}

            {stats.length ? (
              <div className="mt-8 flex flex-wrap gap-2.5">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm ring-1 ring-brand-100 backdrop-blur"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black leading-none tracking-tight text-ink">
                        <CountUp value={stat.value} />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand">
                        {stat.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </motion.div>
        </div>

        {/* The photograph is shown, not scrimmed. Every asset here is bright and colourful, and
            putting it under a dark overlay was flattening it into something lifeless. */}
        {image ? (
          <motion.div
            className="relative hidden lg:block"
            initial={reduce ? false : { opacity: 0, x: 28, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.12, ease: EASE }}
          >
            <div className="shop-float-slow overflow-hidden rounded-[1.75rem] bg-white shadow-lift ring-1 ring-brand-100">
              <img
                src={image}
                alt=""
                className="aspect-[4/3] w-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>

            {/* The accent figure drifts on its own slower cycle so the two pieces of artwork
                never move in lockstep — synchronised motion looks mechanical. */}
            {accentImage ? (
              <motion.div
                className="absolute -bottom-7 -left-8 w-40 overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-brand-100"
                initial={reduce ? false : { opacity: 0, y: 20, rotate: -6 }}
                animate={{ opacity: 1, y: 0, rotate: -4 }}
                transition={{ duration: 0.7, delay: 0.42, ease: EASE }}
              >
                <div className="shop-float">
                  <img
                    src={accentImage}
                    alt=""
                    className="aspect-[4/3] w-full bg-sky-50 object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-subtle">Pay how you like</div>
                  <div className="mt-0.5 text-[11px] font-extrabold leading-snug text-ink">Cash · Card · JazzCash · Easypaisa</div>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        ) : null}
      </div>

      {/* The twinkles that used to sit here were three dots fading and scaling forever. Decorative
          motion on the one band a shopper sees first trains the eye to ignore movement on this
          product. Left in the CSS for the loading skeleton, which does need it. */}
    </section>
  );
}

/**
 * "How it works", built as guidance rather than as a decoration.
 *
 * The marketplace used to open with the filters and nothing else, so a first-time shopper was
 * given three dropdowns before being told what the site was for. These three cards answer that
 * first, in order, in plain language.
 */
export function GuidedSteps({ steps, className = "" }) {
  const tones = [
    "bg-brand-50 text-brand ring-brand-100",
    "bg-sky-50 text-sky-700 ring-sky-100",
    "bg-emerald-50 text-emerald-700 ring-emerald-100",
  ];

  return (
    <div className={`grid gap-3 sm:grid-cols-3 ${className}`.trim()}>
      {steps.map((step, index) => (
        <div
          key={step.title}
          className="group rounded-2xl border border-line bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift"
        >
          <div className="flex items-center gap-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ring-1 ${tones[index % tones.length]}`}>
              {index + 1}
            </span>
            <h3 className="text-sm font-extrabold text-ink">{step.title}</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{step.body}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * A grid that fades its cards in one after another.
 *
 * The delay is capped inside `Stagger` so a long catalogue does not take ten seconds to finish
 * arriving — the point is to give the eye an entry point, not to make anyone wait.
 */
export function CardGrid({ children, className = "" }) {
  return (
    <Stagger className={className}>
      {children}
    </Stagger>
  );
}

export function CardGridItem({ children, className = "" }) {
  return <StaggerItem className={className}>{children}</StaggerItem>;
}

export function RevealBlock({ children, delay = 0, className = "" }) {
  return (
    <Reveal delay={delay} className={className}>
      {children}
    </Reveal>
  );
}

/**
 * Progressive disclosure for every list on the customer side.
 *
 * The lists here were asked for a generous window from the server and then rendered all of it at
 * once — twenty orders, thirty notifications, a full product catalogue — which meant a shopper
 * landed on a wall of near-identical rows before reaching anything else, on a phone, over a
 * connection that may not be fast. The first few are shown; the rest is one deliberate click away.
 *
 * One click reveals *everything* remaining rather than another small step. A stepper was tried
 * first and it was wrong: with a page size of three, getting to the twentieth order took six
 * clicks, and every one of them was a promise of more clicking. Somebody who has decided they
 * want the whole list should get the whole list in the single action they took to ask for it.
 *
 * The count of what is held back is always stated, because the whole failure mode of a collapsed
 * list is looking like the list simply ends.
 */
export function ShowMore({
  total,
  shown,
  expanded,
  onToggle,
  noun = "results",
  nounSingular,
  moreText,
  lessText,
  loading = false,
  loadingText = "Loading...",
}) {
  const canExpand = shown < total;
  const canCollapse = expanded && shown > 0;

  // Deliberately not `total <= shown -> null`: once everything is expanded the shopper still needs
  // a way back down, otherwise the control disappears at exactly the moment it becomes useful.
  if (!canExpand && !canCollapse) return null;

  const hidden = Math.max(0, total - shown);
  const singular = nounSingular || (noun.endsWith("s") ? noun.slice(0, -1) : noun);
  const label = hidden === 1 ? singular : noun;

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        aria-expanded={expanded}
        className="ui-btn-secondary !px-5 !py-2.5 !text-sm"
      >
        {loading
          ? loadingText
          : canExpand
            ? moreText || `Show all ${hidden} more ${label}`
            : lessText || `Show fewer ${label}`}
        {loading ? null : canExpand ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>
      <p className="text-xs font-semibold text-muted">
        Showing {canCollapse ? total : shown} of {total} {noun}
        {canExpand && hidden > 0 ? ` · ${hidden} still to see` : ""}
      </p>
    </div>
  );
}

/**
 * The order's progress, drawn as a rail.
 *
 * This is the one piece of real new capability on the customer side. The status was previously
 * only ever a pill in a table cell, which answers "what is this order's status" but not "what is
 * happening next, and do I have to do anything". A shopper who cannot see the shape of the
 * journey either keeps opening the order to check, or assumes it has stalled.
 *
 * The rail fills on mount and then stops. An earlier version swept a highlight along it and
 * pulsed the current marker forever; both were removed. This sits directly above a payment form,
 * where movement behind the pointer reads as the page being busy rather than as the order being
 * in progress — and the progress is already legible from the fill.
 *
 * Steps the order has not reached are shown rather than hidden, because a rail that only grows as
 * far as the current status makes a delivered order look like the last thing that ever happened.
 */
const JOURNEY_STEPS = [
  { status: "placed", label: "Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "preparing", label: "Being prepared" },
  { status: "ready", label: "Ready" },
  { status: "done", label: "Done" },
];

/**
 * Maps a backend status onto a position on the rail.
 *
 * Deliberately conservative: an unrecognised status lands on step 0 rather than the end. A rail
 * that silently jumps to "Done" because it met a code it has never seen would be a lie told to
 * someone waiting for a delivery.
 */
export function journeyStage(status) {
  const value = String(status || "").toLowerCase();

  if (["cancelled", "rejected", "refunded", "declined"].includes(value)) return "stopped";
  if (["delivered", "completed"].includes(value)) return 4;
  if (["ready", "ready_for_pickup"].includes(value)) return 3;
  if (["preparing", "confirmed", "accepted", "dispatched", "out_for_delivery"].includes(value)) return 2;
  // Submitted, pending, awaiting payment and draft all mean the same thing to a shopper: it is
  // with the business and nothing has happened yet.
  return 1;
}

export function OrderJourney({ status, paymentStatus, className = "" }) {
  const stage = journeyStage(status);
  const stopped = stage === "stopped";
  const needsPayment = needsAttention(paymentStatus);

  if (stopped) {
    return (
      <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 ${className}`.trim()}>
        <div className="text-sm font-bold text-red-800">{orderStatusLabel(status)}</div>
        <p className="mt-1 text-xs leading-6 text-red-700">
          This order will not progress any further. If you were charged, a refund is arranged and
          you will see it on your payment method.
        </p>
      </div>
    );
  }

  // The rail fills to the centre of the current step, not to its left edge, so the marker sits
  // on the filled part rather than hanging off the end of it.
  const percent = (stage / (JOURNEY_STEPS.length - 1)) * 100;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Progress</p>
        {needsPayment ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 ring-1 ring-orange-200">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Waiting on you
          </span>
        ) : null}
      </div>

      <div className="relative mt-4">
        {/* Track. Behind everything, so the fill and the markers sit on top of it. */}
        <div className="absolute left-0 right-0 top-3.5 h-1 rounded-full bg-line" aria-hidden="true">
          <div
            className="h-full overflow-hidden rounded-full"
            style={{ width: `${percent}%` }}
            title={`${percent}% of the way through`}
          >
            {/* The rail draws itself in on mount, so arriving on a long-running order shows the
                journey completing rather than appearing fully formed. */}
            <div className="shop-rail-fill h-full w-full rounded-full bg-gradient-to-r from-blue-700 to-sky-400" />
          </div>
        </div>

        <ol className="relative flex justify-between">
          {JOURNEY_STEPS.map((step, index) => {
            const done = index < stage;
            const current = index === stage;
            return (
              <li key={step.status} className="flex flex-col items-center gap-2 text-center" style={{ flex: "1 1 0" }}>
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black ring-2 transition-colors duration-500 ${
                    done
                      ? "bg-blue-700 text-white ring-blue-700"
                      : current
                        ? "bg-white text-blue-700 ring-blue-600"
                        : "bg-white text-subtle ring-line"
                  }`}
                >
                  {done ? <Check size={13} strokeWidth={3.2} /> : index + 1}
                </span>
                <span
                  className={`text-[10px] font-bold leading-4 sm:text-[11px] ${
                    done ? "text-ink" : current ? "text-brand" : "text-subtle"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/**
 * The page header used by every customer screen except the two that open with `ShopHero`.
 *
 * Cart, Orders, Notifications and Profile all previously grew their own header, which meant the
 * customer side had no consistent identity — and some of them ended up looking like the admin
 * band. This is one light, warm signature across the whole portal, with an optional slot for a
 * figure worth knowing and an optional slot for an action.
 *
 * Deliberately not a hero: it should read as the top of a page, not as a second band competing
 * with the marketplace hero.
 */
export function ShopPageHeader({ eyebrow, title, description, highlights = [], actions = null, children }) {
  return (
    <header className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand shadow-sm ring-1 ring-brand-100">
              {eyebrow}
            </p>
          ) : null}
          <h1 className={`${eyebrow ? "mt-3" : ""} text-2xl font-black tracking-tight text-ink`}>{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">{description}</p>
          ) : null}

          {highlights.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {highlights.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-ink shadow-sm ring-1 ring-brand-100"
                >
                  {item.tone === "pending" ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  ) : null}
                  {item.value ? <span className="text-brand">{item.value}</span> : null}
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {children}
    </header>
  );
}

/**
 * Loading placeholders shaped like a real product card.
 *
 * The marketplace previously showed the words "Loading products..." and then swapped them for a
 * grid, which moved everything down the page twice. These reserve the same space instead.
 */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="skeleton-shimmer h-40 w-full" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton-shimmer h-4 w-16 rounded-full" />
        <div className="skeleton-shimmer h-4 w-4/5 rounded" />
        <div className="skeleton-shimmer h-5 w-24 rounded" />
        <div className="skeleton-shimmer mt-3 h-9 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Loading placeholders shaped like a real product card.
 *
 * Matches the marketplace grid exactly — three columns, three placeholders. A skeleton wider
 * than the grid it stands in for makes the page jump sideways on load, which is worse than the
 * jump the skeleton exists to prevent.
 */
export function ProductCardSkeletonGrid({ count = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Plain rows, for list-shaped pages (orders, notifications, profile).
 *
 * Every one of these pages previously showed its "nothing here yet" message during the very
 * first render, because the collection starts empty and fills in afterwards. A brand-new
 * customer who opens Orders for the first time was told they had no orders — a claim about
 * their history, made before the page had asked the server — and then watched it correct
 * itself. This reserves the space so that never happens.
 */
export function ListSkeleton({ rows = 3, lines = 2 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="skeleton-shimmer h-4 w-1/3 rounded" />
          {Array.from({ length: lines }, (_, j) => (
            <div key={j} className="skeleton-shimmer mt-2.5 h-3 rounded" style={{ width: `${85 - i * 12 - j * 20}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- copy layer -- */

/**
 * Turning internal codes into language a shopper would actually use.
 *
 * This is the single biggest thing separating "polished product" from "tooling". The tables
 * were rendering raw values straight from the API — `awaiting_payment`, `order_status`,
 * `pending_approval` — with `capitalize`, which produces `Awaiting payment`: correct English,
 * but unmistakably a database column. A customer should be told "Waiting for payment", not
 * what the backend calls it.
 *
 * Presentation only: no request, state or route changes here.
 */

const ORDER_STATUS_LABELS = {
  draft: "Not submitted",
  pending: "Submitted",
  submitted: "Sent to the business",
  pending_approval: "Waiting for the business",
  pending_payment: "Waiting for payment",
  awaiting_payment: "Waiting for payment",
  confirmed: "Confirmed",
  accepted: "Accepted",
  preparing: "Being prepared",
  ready: "Ready for pickup",
  dispatched: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Declined",
  refunded: "Refunded",
  quoted: "Quote sent",
  booked: "Booked",
};

const NOTIFICATION_TYPE_LABELS = {
  order_status: "Order update",
  order_created: "New order",
  payment: "Payment",
  payment_received: "Payment received",
  payment_confirmed: "Payment confirmed",
  message: "Message",
  chat: "Message",
  review: "Review",
  product: "Product",
  offer: "Offer",
  promotion: "Offer",
  booking: "Booking",
  booking_request: "Booking request",
  quote_request: "Quote request",
  inquiry: "Enquiry",
  system: "Update",
  announcement: "News",
};

function humanise(value, map, fallbackToSentence = true) {
  const key = String(value ?? "").trim();
  if (!key) return "";
  if (map[key]) return map[key];
  if (!fallbackToSentence) return "";
  const text = key.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function orderStatusLabel(value) {
  return humanise(value, ORDER_STATUS_LABELS) || "Unknown";
}

export function notificationTypeLabel(value) {
  return humanise(value, NOTIFICATION_TYPE_LABELS) || "Update";
}

/** True when a status means the customer still has something to do about it. */
export function needsAttention(status) {
  return ["unpaid", "rejected", "pending_verification", "awaiting_payment", "pending_payment"].includes(
    String(status || ""),
  );
}

/**
 * Status as a colour-coded pill rather than a run of plain text.
 *
 * Uses the `approve` ramp deliberately. The app aliases `green` to blue, so `text-green-700`
 * would come out the same colour as every other link and "Delivered" would be
 * indistinguishable from "Confirmed". Approval meaning has to be literal.
 */
const PILL_TONES = {
  approve: "bg-approve-50 text-approve-700 ring-approve-200",
  pending: "bg-orange-50 text-orange-700 ring-orange-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  brand: "bg-brand-100 text-brand ring-brand-200",
  neutral: "bg-surface text-muted ring-line",
};

export function ShopStatusPill({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
        PILL_TONES[tone] || PILL_TONES.neutral
      } ${className}`.trim()}
    >
      {children}
    </span>
  );
}

const ORDER_STATUS_TONES = {
  delivered: "approve",
  completed: "approve",
  confirmed: "approve",
  accepted: "approve",
  booked: "approve",
  quoted: "approve",
  paid: "approve",
  pending: "pending",
  submitted: "pending",
  pending_approval: "pending",
  pending_payment: "pending",
  awaiting_payment: "pending",
  preparing: "pending",
  ready: "pending",
  dispatched: "pending",
  out_for_delivery: "pending",
  cancelled: "danger",
  rejected: "danger",
  refunded: "danger",
  declined: "danger",
  draft: "neutral",
};

export function orderStatusTone(status) {
  return ORDER_STATUS_TONES[String(status || "")] || "brand";
}

export function OrderStatusPill({ status }) {
  return (
    <ShopStatusPill tone={orderStatusTone(status)}>
      {orderStatusLabel(status)}
    </ShopStatusPill>
  );
}

/**
 * An empty state written for someone who has just signed up.
 *
 * The rule: never state a conclusion the page has not earned. An empty list is not a failure,
 * so the tone is an invitation with a clear next step and a reason the space will fill up —
 * never an apology, and never "0 found", which reads as a failed search.
 */
export function WarmEmptyState({ icon: Icon, title, body, reassurance, actionTo, actionLabel, image, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-dashed border-line bg-white">
      <div className="px-6 py-10 text-center sm:px-10 sm:py-12">
        {/* Illustration when one fits the moment, icon otherwise. The artwork floats gently so
            an empty page still feels like it is waiting for you rather than broken. */}
        {image ? (
          <div className="shop-float mx-auto w-40">
            <img src={image} alt="" className="w-full" loading="lazy" decoding="async" />
          </div>
        ) : Icon ? (
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand">
            <Icon size={26} strokeWidth={1.9} />
          </span>
        ) : null}

        <h3 className="mt-5 text-lg font-extrabold text-ink">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">{body}</p>
        {actionTo && actionLabel ? (
          <Link className="ui-btn-primary mt-6" to={actionTo}>
            {actionLabel}
            <ArrowRight size={16} />
          </Link>
        ) : null}

        {/* An empty state is the one place a next step has nowhere else to live, so it is a
            slot: the cart offers the marketplace, an empty catalogue offers the assistant. */}
        {children ? <div className="mt-7 border-t border-line-soft pt-6">{children}</div> : null}
      </div>

      {reassurance ? (
        <p className="border-t border-line-soft bg-surface px-6 py-3.5 text-center text-xs leading-6 text-muted">
          {reassurance}
        </p>
      ) : null}
    </div>
  );
}