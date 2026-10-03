import { motion } from "framer-motion";

/**
 * The three-step setup flow.
 *
 * The animated laser beam that used to connect the numbers, and the per-step "preview chip",
 * have both been removed. Three parallel accents (beam + gradient badge + chip) all pointed at
 * the same thing, and on a plain white section they read as decoration competing with the
 * step titles. What is left is a single number, a title, one sentence, and the step's own
 * detail line — the sequence is already obvious from left to right.
 */
export function HowItWorksFlow({ steps }) {
  return (
    <motion.ol
      className="mt-14 grid gap-8 md:grid-cols-3 md:gap-6"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.22 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.12 } },
      }}
    >
      {steps.map((s) => (
        <motion.li
          key={s.n}
          variants={{
            hidden: { opacity: 0, y: 24 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.5, ease: "easeOut" },
            },
          }}
          className="group relative flex flex-col rounded-[1.4rem] border border-line bg-white p-6 shadow-card transition-all duration-300 hover:border-brand-300 hover:shadow-lift md:p-7"
        >
          {/* Large ghosted numeral: carries the sequence without a separate badge. */}
          <span className="pointer-events-none absolute right-5 top-2 text-[4.5rem] font-black leading-none text-blue-50 transition-colors duration-300 group-hover:text-blue-100">
            {s.n}
          </span>

          <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 text-base font-black text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)]">
            {s.n}
          </span>

          <h3 className="relative mt-5 text-xl font-extrabold tracking-tight text-ink transition-colors duration-200 group-hover:text-brand">
            {s.title}
          </h3>
          <p className="relative mt-2.5 text-sm leading-7 text-muted">{s.text}</p>
        </motion.li>
      ))}
    </motion.ol>
  );
}