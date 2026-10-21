import bizxusLogo from "../../assets/bizxus-logo.png";

// `tone` picks the plate behind the mark. Overriding the light plate through
// `imageClassName` would be a Tailwind conflict (bg-white/92 vs bg-white/10 resolve by
// stylesheet order, not attribute order), so the dark rail selects it explicitly.
const TONES = {
  light: "border border-line bg-white/92 shadow-soft",
  dark: "border border-white/20 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md shadow-[0_0_15px_rgba(56,189,248,0.25)]",
};

export function BrandLogo({ className = "", imageClassName = "", labelClassName = "", showWordmark = true, tone = "light" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <img
        src={bizxusLogo}
        alt="BizxusAI logo"
        className={`h-11 w-11 rounded-xl p-1.5 object-contain ${TONES[tone] || TONES.light} ${imageClassName}`.trim()}
      />
      {showWordmark ? (
        <div
          className={`text-lg font-semibold tracking-tight ${tone === "dark" ? "text-white" : "text-ink"} ${labelClassName}`.trim()}
        >
          BizxusAI
        </div>
      ) : null}
    </div>
  );
}
