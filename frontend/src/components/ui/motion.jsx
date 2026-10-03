import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Motion primitives shared by the public marketing site, the admin panel and the customer
 * portal.
 *
 * These live here rather than beside either feature because they are the same three ideas in
 * all three places, and a `CountUp` that exists twice is a `CountUp` that will eventually be
 * fixed in one copy only. Everything degrades to plain markup when the visitor has asked for
 * reduced motion.
 */

export const EASE = [0.16, 1, 0.3, 1];

/** Fade-and-rise on scroll into view. Renders a bare div when motion is reduced. */
export function Reveal({ children, delay = 0, className = "" }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Reveals direct children one after another.
 *
 * The stagger used to live on this parent, as a `staggerChildren` variant triggered by
 * `whileInView`. That broke the expandable lists: `viewport={{ once: true }}` meant the parent
 * animated exactly once and could never fire again, so when the shopper pressed "show all" the
 * cards that mounted afterwards inherited the `hidden` variant (`opacity: 0`) with nothing left
 * to animate them out of it. The grid grew to its new height and stayed blank.
 *
 * So the timing is computed here and handed to each child, and every child animates itself on its
 * own mount. A card added to the list at any point in the page's life now arrives correctly,
 * whether it was there on first paint or appeared a minute later.
 *
 * The cap matters and is unchanged: past a handful of children the last card takes so long to
 * arrive that the page feels broken, so the delay stops growing after the eighth.
 */
/**
 * How long child `index` of a stagger waits before it starts.
 *
 * Exported so the timing can be asserted directly. It used to be implicit in a
 * `staggerChildren` variant, which meant the one behaviour that had a real failure mode — the
 * delay cap, without which a long catalogue takes ten seconds to finish arriving — had no test.
 */
export function staggerDelay(index, step = 0.045, cap = 8) {
  return Math.min(index, cap) * Math.min(step, 0.5 / cap);
}

export function Stagger({ children, step = 0.045, cap = 8, className = "" }) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) =>
        isValidElement(child)
          ? cloneElement(child, { __staggerDelay: staggerDelay(index, step, cap) })
          : child,
      )}
    </div>
  );
}

/**
 * One child of a `Stagger`.
 *
 * Animates on mount rather than inheriting a variant, which is what makes it safe inside a list
 * that grows while the page is open.
 */
export function StaggerItem({ children, className = "", y = 16, __staggerDelay = 0 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: __staggerDelay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts a number up the first time it scrolls into view.
 *
 * Only for figures nobody acts on — a total, a count in a summary band. Never for a count a
 * reader is deciding something from, because a number still animating is a number you cannot
 * trust yet.
 */
export function CountUp({ value, duration = 950, format }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const nodeRef = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return undefined;
    if (reduce) {
      setDisplay(value);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || started.current) continue;
          started.current = true;
          const from = 0;
          const start = performance.now();
          function tick(now) {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - progress) ** 3;
            setDisplay(Math.round(from + (value - from) * eased));
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration, reduce]);

  return <span ref={nodeRef}>{format ? format(display) : display}</span>;
}

/**
 * A transient confirmation that does not move the page.
 *
 * The pattern this replaces pushed a banner into the top of the document, so confirming an
 * action shoved the grid the visitor was reading down the screen. Anything that confirms
 * something should appear over the content, not displace it.
 */
export function Toast({ message, tone = "success", onDismiss, duration = 3200 }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => {
      if (onDismiss) onDismiss();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  const tones = {
    success: "border-approve-200 bg-white text-approve-800",
    error: "border-red-200 bg-white text-red-700",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4"
    >
      {/* Keyed on the message so a second confirmation re-plays the entrance instead of
          silently swapping text on an already-settled element. */}
      <motion.div
        key={message}
        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: EASE }}
        className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lift ${tones[tone] || tones.success}`}
      >
        {message}
      </motion.div>
    </div>
  );
}