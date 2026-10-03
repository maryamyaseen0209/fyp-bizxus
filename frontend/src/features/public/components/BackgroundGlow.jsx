/**
 * Quiet ambient backdrop for the light landing sections.
 *
 * This used to carry three glow orbs, a tech grid and five floating particles. Behind body
 * copy those layers stacked up into visible banding and read as noise rather than depth, so
 * only the grid remains — enough to give the white sections a sense of surface, not enough to
 * compete with the text. The cinematic hero has its own photo treatment in styles.css
 * (`.landing-hero-bg`) and deliberately does not use this component.
 */
export function BackgroundGlow({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="ai-grid-light-bg absolute inset-0 opacity-45" />
      <div className="absolute -top-40 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-brand-100/40 blur-[130px]" />
    </div>
  );
}