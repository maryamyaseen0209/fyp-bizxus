import {
  ArrowRight,
  Bot,
  Check,
  CreditCard,
  Globe,
  Lock,
  Package,
  ShieldCheck,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { BackgroundGlow } from "./components/BackgroundGlow.jsx";
import { HeroAiShowcase } from "./components/HeroAiShowcase.jsx";
import { FeatureCard } from "./components/FeatureCard.jsx";
import { HowItWorksFlow } from "./components/HowItWorksFlow.jsx";
import { AudienceShowcase } from "./components/AudienceShowcase.jsx";
import { FaqAccordion } from "./components/FaqAccordion.jsx";

/**
 * BizXusAI landing page.
 *
 * Theme: "Midnight Storefront" — a dark, photographic hero that dissolves into clean light
 * product sections. The rule throughout is one idea per band: the hero sells the outcome, the
 * showcase proves it, and the sections below explain it. Anything that repeated a claim made
 * elsewhere on the page was cut (see the notes on `AudienceShowcase` and `HowItWorksFlow`).
 *
 * All product claims and copy remain accurate to the platform; only the presentation and
 * framing were tightened.
 */

const HERO_IMAGE =
  "https://ik.imagekit.io/fac14ggkmb/business-blur-background-photo.jpeg";

// Four pillars rather than six. The previous six split "an AI assistant that knows your
// catalog" and "WhatsApp that answers itself" into two cards describing the same subsystem,
// which made the page read as a feature dump instead of a short argument.
const PILLARS = [
  {
    icon: Globe,
    tone: "violet",
    title: "A storefront that goes live today",
    text: "Pick a template, add what you sell, publish. Customers get a link they can order from the same day — no designer, no developer, no hosting bill.",
  },
  {
    icon: Bot,
    tone: "blue",
    title: "An AI assistant that knows your stock",
    text: "It answers price and availability questions from your live catalogue, on your site and on WhatsApp — so customers get a right answer at midnight without you replying.",
  },
  {
    icon: Package,
    tone: "green",
    title: "Stock and orders that stay honest",
    text: "Inventory reserves the moment an order is placed, so two customers can never buy the last item. Every order lands in one place with its payment already matched.",
  },
  {
    icon: CreditCard,
    tone: "orange",
    title: "Get paid the way Pakistan pays",
    text: "Cash on delivery, bank transfer, JazzCash, Easypaisa and card — each payment recorded against the right order automatically, plus a daily summary on your WhatsApp.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Create your business",
    text: "Tell us your business name and category. We suggest the modules and layout that fit how you actually work.",
  },
  {
    n: "2",
    title: "Add what you sell",
    text: "Products or services, with prices, photos and variants. Already have a spreadsheet? Import it and keep your prices as they are.",
  },
  {
    n: "3",
    title: "Go live",
    text: "Publish your storefront, switch on the AI assistant, and start taking orders from your website and WhatsApp.",
  },
];

const TRUST = ["No developer needed", "No card required", "Live in one day"];

// Framed as commitment and ownership rather than "trusted by N businesses" — the platform
// has no customer numbers to quote, and inventing social proof is worse than omitting it.
const COMMITMENTS = [
  {
    icon: Lock,
    title: "Your storefront link is yours",
    text: "Republish it, rename it, or move on. You are never locked into a plan to keep what you built.",
  },
  {
    icon: ShieldCheck,
    title: "We never hold your money",
    text: "Payments go straight from your customer to your JazzCash, Easypaisa or bank account. Card details never touch our servers.",
  },
  {
    icon: Wallet,
    title: "Paid the way Pakistan pays",
    text: "Cash on delivery, bank transfer, JazzCash, Easypaisa and card — all recorded against the right order.",
  },
];

const PAIN_POINTS = [
  "A website nobody ordered from",
  "A spreadsheet that is always one edit behind",
  "The same WhatsApp questions, forty times a day",
  "Stock figures you only trust after closing",
];

const BUSINESS_PERKS = [
  "Your own public storefront with a shareable link",
  "AI assistant trained on your own catalogue and FAQs",
  "WhatsApp replies handled automatically",
  "Orders, stock and payments in one place",
  "Daily business summary on WhatsApp",
  "Customer records and repeat-order history",
];

const CUSTOMER_PERKS = [
  "Browse every business in one marketplace",
  "Ask the shop a question and get an instant answer",
  "Order without phone calls or back-and-forth",
  "Pay with JazzCash, Easypaisa, card or cash",
  "Track order status from your account",
  "Reorder your favourites in one tap",
];

const FAQ = [
  {
    q: "Do I need technical skills?",
    a: "No. If you can fill in a form and upload a photo, you can run your storefront. There is nothing to install and nothing to host.",
  },
  {
    q: "What does it cost to start?",
    a: "You can create your business and publish a storefront on the free plan. Paid plans add the AI assistant, WhatsApp automation and advanced reporting.",
  },
  {
    q: "Does it work for services, not just products?",
    a: "Yes. Alongside products you can list services and take booking or quote requests instead of direct orders.",
  },
  {
    q: "Can I use my own WhatsApp number?",
    a: "Yes. You link your existing business number, and the assistant replies from it. You can take over any conversation at any time.",
  },
];

export function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* ------------------------------------------------------------ HERO --
          Dark, photographic, full-bleed. The image treatment (photo + scrim + drift)
          lives in `.landing-hero-bg` in styles.css. Text sits on the photo, nothing
          else does, so the headline is the only thing competing for attention. */}
      <section className="relative isolate flex min-h-[620px] items-start overflow-hidden bg-hero-night pb-20 pt-28 lg:min-h-hero lg:items-center lg:pb-32 lg:pt-32">
        <div className="landing-hero-bg" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* One eyebrow. Previously this band also carried a 5-step pipeline strip
                  that duplicated the "How it works" section further down the page. */}
              <div className="landing-eyebrow landing-eyebrow-dark inline-flex items-center gap-2">
                Built for Pakistani businesses
              </div>

              {/* Outcome, not product tour. The old line ("helps your shop publish,
                  answer, sell") described the features; this one describes the result
                  the buyer actually wants. */}
              <h1 className="mt-7 text-4xl font-extrabold leading-[1.05] tracking-tight text-hero-ink sm:text-5xl lg:text-[4.25rem]">
                Your shop,
                <br />
                online by tonight.
              </h1>

              <p className="mt-7 max-w-xl leading-7 text-hero-muted md:text-lg md:leading-8">
                A storefront that sells, an assistant that answers on WhatsApp at 2am, and one
                place that tracks orders, stock and payments. No developer, no monthly hosting,
                no fifth tool to keep in sync.
              </p>

              <div className="mt-9 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                <Link
                  to="/register"
                  className="ui-btn-primary ai-btn-shimmer !bg-white !px-7 !py-4 !text-base !font-extrabold !text-hero-night shadow-[0_14px_40px_-8px_rgba(37,99,235,0.6)] hover:!bg-slate-100"
                >
                  Start free
                  <ArrowRight size={18} className="text-hero-night" />
                </Link>
                <Link
                  to="/customer/marketplace"
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/25 bg-white/10 px-7 py-4 text-base font-bold text-hero-ink backdrop-blur-md transition-all duration-200 hover:border-white/40 hover:bg-white/20"
                >
                  <Store size={18} className="text-sky-300" />
                  Browse the marketplace
                </Link>
              </div>

              <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3">
                {TRUST.map((t) => (
                  <li
                    key={t}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white"
                  >
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-white/30 text-blue-500 ring-1 ring-white/25">
                      <Check size={11} strokeWidth={3.5} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- SHOWCASE --
          Moved out of the hero onto a light background. Inside the dark hero it
          fought the photo for attention; here it reads as a product screenshot
          with the copy around it. */}
      <section className="relative border-t border-line bg-page py-20 lg:py-24">
        <BackgroundGlow />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="landing-eyebrow landing-eyebrow-light">See it work</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">
              A real question, answered in two seconds
            </h2>
            <p className="mt-4 text-base leading-8 text-muted md:text-lg">
              This is the assistant on your storefront. It reads your live catalogue, answers
              without guessing, and creates the order so nothing has to be retyped.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-14 max-w-4xl"
          >
            <HeroAiShowcase />
          </motion.div>
        </div>
      </section>

      {/* --------------------------------------------------------- PILLARS --
          The old "before" list. Added because it earns the offer: the four bullets
          name the exact frustrations the product removes, so the features that
          follow read as relief rather than as a spec sheet. */}
      <section id="features" className="relative scroll-mt-20 border-t border-line bg-page py-20 lg:py-28">
        <BackgroundGlow />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative"
            >
              <span className="landing-eyebrow landing-eyebrow-light">Why it matters</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">
                You are already paying for all of this
              </h2>
              <p className="mt-4 text-base leading-8 text-muted">
                Most businesses run a website, a spreadsheet, a WhatsApp inbox and a receipt book
                that have never agreed with each other. Here they are one system.
              </p>
            </motion.div>

            {/* The frustrations, struck through. Crossing them out is what makes the
                next section land — it turns "here are features" into "these are gone". */}
            <motion.ul
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="grid gap-3"
            >
              {PAIN_POINTS.map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-white/80 px-5 py-4 shadow-card backdrop-blur-sm"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100">
                    <X size={14} strokeWidth={3} />
                  </span>
                  <span className="text-sm font-semibold text-subtle line-through decoration-red-300 decoration-2">
                    {p}
                  </span>
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.div
            className="mt-16"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h3 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
              What replaces them
            </h3>
          </motion.div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {PILLARS.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                tone={f.tone}
                title={f.title}
                text={f.text}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- COMMITMENTS --
          The objection-handling band. Sits after the pillars because by this point the
          visitor already understands the product; what is left to answer is "is this safe
          to commit to", which a features grid cannot address. */}
      <section className="relative border-t border-line bg-white py-20 lg:py-28">
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div>
              <motion.div
                initial={{ opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <span className="landing-eyebrow landing-eyebrow-light">No fine print</span>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">
                  Your business stays yours
                </h2>
              </motion.div>

              <ul className="mt-9 grid gap-7">
                {COMMITMENTS.map((c, i) => {
                  const Icon = c.icon;
                  return (
                    <motion.li
                      key={c.title}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
                      className="flex gap-4"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.55)]">
                        <Icon size={20} strokeWidth={2} />
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold tracking-tight text-ink">
                          {c.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-7 text-muted">{c.text}</p>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- HOW IT WORKS -- */}
      <section
        id="how-it-works"
        className="relative scroll-mt-20 border-t border-line bg-white py-20 lg:py-28"
      >
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="landing-eyebrow landing-eyebrow-light">How it works</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl lg:text-5xl">
              Online in three steps
            </h2>
            <p className="mt-4 text-base leading-8 text-muted md:text-lg">
              No migration project, no onboarding fee, no engineer. Most shops finish this
              before the day is over.
            </p>
          </motion.div>

          <HowItWorksFlow steps={STEPS} />
        </div>
      </section>

      {/* --------------------------------------------------------- AUDIENCE -- */}
      <section
        id="audience"
        className="relative scroll-mt-20 border-t border-line bg-page py-20 lg:py-28"
      >
        <BackgroundGlow />

        <motion.div
          className="relative mx-auto max-w-7xl px-5 lg:px-8"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.16 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="mx-auto max-w-2xl text-center">
            <span className="landing-eyebrow landing-eyebrow-light">Two sides, one platform</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">
              Built for the shop and the person buying from it
            </h2>
          </div>

          <div className="mt-14">
            <AudienceShowcase
              businessPerks={BUSINESS_PERKS}
              customerPerks={CUSTOMER_PERKS}
            />
          </div>
        </motion.div>
      </section>

      {/* -------------------------------------------------------------- FAQ -- */}
      <section id="faq" className="relative scroll-mt-20 border-t border-line bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="landing-eyebrow landing-eyebrow-light">Questions</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">
              Before you start
            </h2>
          </motion.div>

          <div className="mt-12">
            <FaqAccordion items={FAQ} />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- FINAL CTA --
          The photo returns here as a darkened, cropped backdrop. Reusing the one
          asset this way gives the page a visual bookend — the page opens and closes
          on the same image, which ties the sections between them together. */}
      <section className="relative px-5 pb-24 pt-4 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl px-7 py-16 text-center text-white shadow-cinematic lg:px-20 lg:py-24">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-hero-night/95 via-hero-deep/90 to-brand-900/85"
            aria-hidden="true"
          />
          <div className="ai-grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />

          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl lg:text-5xl">
              Put your business online today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-hero-muted md:text-lg">
              Create your storefront on the free plan and see how it feels before you pay
              anything.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3.5 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className="ui-btn-primary ai-btn-shimmer !bg-white !px-8 !py-4 !text-base !font-extrabold !text-hero-night shadow-xl hover:!bg-slate-100"
              >
                Start free
                <ArrowRight size={18} className="text-hero-night" />
              </Link>
              <Link
                to="/customer/marketplace"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-xl transition-all hover:bg-white/20"
              >
                See a live storefront
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
