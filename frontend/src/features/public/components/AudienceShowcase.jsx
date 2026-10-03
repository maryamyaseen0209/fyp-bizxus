import { motion } from "framer-motion";
import { ArrowRight, Check, ShoppingBag, Store } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * The two-sided pitch: what a business owner gets, what a customer gets.
 *
 * Both columns previously contained a hand-built mini-dashboard (an order row with a JazzCash
 * badge, a search bar, a progress tracker). Those were the messiest thing on the page — three
 * nested mockups restating catalogue, AI and payment claims that the perk lists below them
 * already made in plain language, using figures (PKR 4,800, order #BX-9042) that appeared in
 * three separate places across the page. The perk list is the stronger argument on its own, so
 * the columns are now text-first with one large numeral and one strong CTA each.
 */

const COLUMNS = [
  {
    kicker: "For business owners",
    title: "Run the whole shop from one screen",
    blurb:
      "Your storefront, your assistant and your books stay in sync, because they are the same system.",
    perksKey: "businessPerks",
    icon: ShoppingBag,
    accent: "from-blue-700 to-sky-500",
    primary: { to: "/register", label: "Create your business" },
    secondary: { to: "/login", label: "I already have an account" },
  },
  {
    kicker: "For customers",
    title: "Find a shop and order in seconds",
    blurb:
      "Browse every business in one marketplace, ask a question, pay the way you already pay, and track it home.",
    perksKey: "customerPerks",
    icon: Store,
    accent: "from-sky-500 to-cyan-400",
    primary: { to: "/customer/register", label: "Create a customer account" },
    secondary: { to: "/customer/marketplace", label: "Browse the marketplace" },
  },
];

const REVEAL = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

export function AudienceShowcase({ businessPerks, customerPerks }) {
  const perksByColumn = { businessPerks, customerPerks };

  return (
    <motion.div
      className="grid gap-6 lg:grid-cols-2"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.16 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1 } },
      }}
    >
      {COLUMNS.map((col) => {
        const Icon = col.icon;

        return (
          <motion.article
            key={col.kicker}
            variants={REVEAL}
            className={`group relative flex flex-col overflow-hidden rounded-[1.6rem] border border-line bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift hover:border-brand-300`}
          >
            {/* One accent edge instead of the previous corner glow plus full-width bar. */}
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${col.accent}`}
            />

            <div className="p-7 md:p-9">
              <div className="flex items-center gap-4">
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr ${col.accent} text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.55)]`}
                >
                  <Icon size={24} strokeWidth={2} />
                </span>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  {col.kicker}
                </div>
              </div>

              <h3 className="mt-6 text-2xl font-black tracking-tight text-ink md:text-3xl">
                {col.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted">{col.blurb}</p>

              <ul className="mt-7 grid gap-3">
                {perksByColumn[col.perksKey].map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm leading-6 text-muted">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-50 text-brand">
                      <Check size={12} strokeWidth={3.5} />
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={col.primary.to} className="ui-btn-primary ai-btn-shimmer !py-3 !text-sm">
                  {col.primary.label}
                  <ArrowRight size={16} />
                </Link>
                <Link to={col.secondary.to} className="ui-btn-secondary !py-3 !text-sm">
                  {col.secondary.label}
                </Link>
              </div>
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
}