import { motion } from "framer-motion";

const TONE_STYLES = {
  violet: "from-blue-700 to-sky-500 shadow-[0_10px_24px_-10px_rgba(37,99,235,0.6)]",
  blue: "from-sky-500 to-cyan-400 shadow-[0_10px_24px_-10px_rgba(14,165,233,0.6)]",
  green: "from-blue-600 to-sky-400 shadow-[0_10px_24px_-10px_rgba(37,99,235,0.55)]",
  orange: "from-indigo-600 to-sky-500 shadow-[0_10px_24px_-10px_rgba(79,70,229,0.55)]",
};

/**
 * One pillar on the landing page.
 *
 * Simplified from the previous card: the per-tone border/glow/spotlight/shadow maps made four
 * near-identical icon treatments that were impossible to tell apart on screen, and the hover
 * corner spotlight plus specular line stacked two extra effects onto an already-lifting card.
 * Now every card is the same gradient plate, so the four pillars read as one set.
 */
export function FeatureCard({ icon: Icon, tone, title, text, index = 0 }) {
  const toneClass = TONE_STYLES[tone] || TONE_STYLES.violet;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25, margin: "-30px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-[1.4rem] border border-line bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift md:p-8"
    >
      <span
        className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-tr text-white transition-transform duration-300 group-hover:scale-105 ${toneClass}`}
      >
        <Icon size={23} strokeWidth={2} />
      </span>

      <h3 className="mt-6 text-xl font-extrabold tracking-tight text-ink transition-colors duration-200 group-hover:text-brand">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
    </motion.article>
  );
}
