import { useState } from "react";
import { ImageOff } from "lucide-react";

/**
 * A product photo, or a friendly stand-in.
 *
 * The placeholder is artwork rather than a grey box with a crossed-out camera, because this
 * shows on every product whose business never uploaded a photo — which is most of them early
 * on. A flat grey plate read as a broken image rather than as a deliberate placeholder.
 *
 * Chosen between the two supplied assets deliberately: `no-product.jpg` is used, and
 * `no-image.jpg` is not. The latter has "COMING SOON" baked into the pixels, which would tell
 * a customer that a product they can buy right now is not yet available. It also sits
 * landscape with text across the bottom, so fitting it to the card's wide image slot would mean
 * either cropping the words off or letterboxing them. `no-product.jpg` carries no claim at all
 * and is portrait, which letterboxes cleanly inside a wide box.
 *
 * Two levels of fallback: if this artwork ever fails to load, the styled plate below it takes
 * over, so the component can never end up blank.
 */
const PLACEHOLDER =
  "https://ik.imagekit.io/fac14ggkmb/no-product.jpg?tr=w-240,q-80";

export function ProductImage({ src, alt = "", className = "", ...props }) {
  const [failedSource, setFailedSource] = useState(null);
  const [placeholderFailed, setPlaceholderFailed] = useState(false);

  const missing = !src || failedSource === src;

  if (missing) {
    if (placeholderFailed) {
      return (
        <div
          className={`media-placeholder flex items-center justify-center ${className}`.trim()}
          role="img"
          aria-label={alt || "No photo for this product yet"}
        >
          <ImageOff size={30} strokeWidth={1.6} aria-hidden="true" />
        </div>
      );
    }

    // The caller's className sizes and colours the box (often `object-cover`, sized for a real
    // photo). The artwork is letterboxed inside it rather than stretched to fill, so a portrait
    // placeholder in a wide slot stays undistorted.
    return (
      <div
        className={`media-placeholder flex items-center justify-center overflow-hidden ${className}`.trim()}
        role="img"
        aria-label={alt || "No photo for this product yet"}
      >
        <img
          src={PLACEHOLDER}
          alt=""
          aria-hidden="true"
          className="max-h-[58%] max-w-[58%] object-contain"
          loading="lazy"
          decoding="async"
          onError={() => setPlaceholderFailed(true)}
        />
      </div>
    );
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailedSource(src)}
    />
  );
}
