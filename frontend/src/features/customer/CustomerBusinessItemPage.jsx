import { ProductImage } from "../../components/common/ProductImage.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Heart,
  Layers,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";

import { WhatsAppAgentCta, WhatsAppAgentInfo } from "../../components/whatsapp/WhatsAppAgentCta.jsx";
import { addCartItem, addCustomerFavorite, getCustomerFavorites, getMarketplaceBusiness, getMarketplaceItem, removeCustomerFavorite, resolveUploadUrl } from "../../services/customerPortalApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";

// Characters, not words. A description that is dense product specs packs far more meaning per
// word than prose does, so a word-based limit truncates a spec sheet early and leaves an essay
// running for a page.
const DESCRIPTION_LIMIT = 320;

export function CustomerBusinessItemPage() {
  const { tenantSlug, itemId } = useParams();
  const [business, setBusiness] = useState(null);
  const [item, setItem] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  // Null means the item has no variants, or none has been picked yet.
  const [variantIndex, setVariantIndex] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setError("");
      try {
        const [businessData, itemData] = await Promise.all([
          getMarketplaceBusiness(tenantSlug),
          getMarketplaceItem(tenantSlug, itemId),
        ]);
        setBusiness(businessData);
        setItem(itemData);
        const variants = itemData?.variants || [];
        if (variants.length) {
          const defaultIndex = variants.findIndex((variant) => variant.isDefault);
          setVariantIndex(defaultIndex >= 0 ? defaultIndex : 0);
        }
        const favoriteData = await getCustomerFavorites();
        setFavorites(favoriteData);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load item."));
      }
    }
    load();
  }, [tenantSlug, itemId]);

  async function handleAdd() {
    setMessage("");
    setError("");
    try {
      await addCartItem({
        tenantId: business.id,
        itemId,
        // Clamped like the cart page. A free-text number field can send 0, a negative
        // or a decimal, all of which the API rejects with a 422 the customer never sees
        // explained.
        quantity: Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1))),
        // Without this the choice was lost: the cart stored only the item, and checkout
        // fell back to whatever variant resolution considered the default.
        selectedVariantIndex: variantIndex,
      });
      setMessage(selectedVariant ? `Added ${selectedVariant.name} to cart.` : "Item added to cart.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to add item to cart."));
    }
  }

  async function toggleFavorite() {
    setError("");
    try {
      const exists = favorites.some((favorite) => favorite.item?.id === itemId && favorite.tenant?.id === business.id);
      const next = exists ? await removeCustomerFavorite(itemId, business.id) : await addCustomerFavorite({ tenantId: business.id, itemId });
      setFavorites(next);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update your favourites."));
    }
  }

  const variants = item?.variants || [];
  const selectedVariant = variantIndex !== null && variants[variantIndex] ? variants[variantIndex] : null;
  const displayPrice = selectedVariant?.price ?? item?.price;

  // Long descriptions are the one place on this page that can run long enough to push the buy
  // panel off-screen on a phone. Collapsed by default, with the button stating the real length so
  // a truncated description is never mistaken for the whole of it.
  const description = item?.description || "This business has not added a description for this product yet.";
  const isLongDescription = description.length > DESCRIPTION_LIMIT;
  const shownDescription =
    isLongDescription && !descriptionExpanded
      ? `${description.slice(0, DESCRIPTION_LIMIT).trimEnd()}…`
      : description;
  // Hoisted out of the handler below, which previously re-derived this from the favourites array
  // on every render of the button and read it twice.
  const isFavorite = favorites.some((favorite) => favorite.item?.id === itemId && favorite.tenant?.id === business.id);

  if (error && !item) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Item unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{error}</p>
        <Link className="ui-btn-secondary mt-5" to={`/customer/businesses/${tenantSlug}`}>
          Back to this business
        </Link>
      </section>
    );
  }

  // Reserves the shape of the page below — image left, sticky buy panel right — so arriving here
  // from a product card does not show three words and then drop the whole layout in underneath.
  if (!item || !business) {
    return (
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true">
        <div>
          <div className="skeleton-shimmer h-4 w-40 rounded" />
          <div className="skeleton-shimmer mt-5 aspect-[4/3] w-full rounded-3xl sm:aspect-[16/10]" />
          <div className="skeleton-shimmer mt-7 h-3 w-28 rounded" />
          <div className="skeleton-shimmer mt-3 h-9 w-3/4 rounded" />
          <div className="skeleton-shimmer mt-4 h-4 w-full rounded" />
          <div className="skeleton-shimmer mt-2 h-4 w-5/6 rounded" />
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((card) => (
              <div key={card} className="rounded-2xl border border-line bg-white p-4">
                <div className="skeleton-shimmer h-9 w-9 rounded-xl" />
                <div className="skeleton-shimmer mt-3 h-4 w-24 rounded" />
                <div className="skeleton-shimmer mt-2 h-3 w-full rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-white p-5">
          <div className="skeleton-shimmer h-3 w-16 rounded" />
          <div className="skeleton-shimmer mt-2 h-9 w-32 rounded" />
          <div className="skeleton-shimmer mt-5 h-10 w-full rounded-xl" />
          <div className="skeleton-shimmer mt-3 h-10 w-full rounded-xl" />
          <div className="skeleton-shimmer mt-5 h-12 w-full rounded-xl" />
          <div className="skeleton-shimmer mt-3 h-10 w-full rounded-xl" />
        </div>
        <p className="sr-only" role="status">Loading this product…</p>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brand-hover"
          to={`/customer/businesses/${tenantSlug}`}
        >
          <ArrowLeft size={14} />
          Back to {business.name}
        </Link>

        {/* The photograph is treated as a gallery piece rather than a thumbnail: it drifts, and it
            slowly zooms on hover so the frame never reads as a flat screenshot. */}
        <div className="group relative mt-5 overflow-hidden rounded-3xl border border-line bg-white shadow-lift">
          <div className="shop-float-slow overflow-hidden">
            <ProductImage
              alt={item.name}
              className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105 sm:aspect-[16/10]"
              src={item.images?.[0]?.url ? resolveUploadUrl(item.images[0].url) : undefined}
            />
          </div>

          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {variants.length ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm backdrop-blur">
                <Layers size={12} className="text-brand" />
                {variants.length} {variants.length === 1 ? "option" : "options"}
              </span>
            ) : null}
            {item.serviceDetails?.durationMinutes ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/85 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
                <Clock size={12} />
                {item.serviceDetails.durationMinutes} min
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
            {business.address?.city || business.name}
          </p>
          <h1 className="mt-2 text-3xl font-black leading-[1.1] tracking-tight text-ink md:text-4xl">
            {item.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{shownDescription}</p>
          {isLongDescription ? (
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-brand transition hover:text-brand-hover"
              aria-expanded={descriptionExpanded}
              onClick={() => setDescriptionExpanded((current) => !current)}
            >
              {descriptionExpanded ? "Show less" : `Show the rest of the description (${description.length} characters)`}
            </button>
          ) : null}
        </div>

      {/* Three facts that answer the questions a shopper has at this point, rather than a
          "Check details / Choose quantity / Add to cart" strip that never advanced. */}
      <dl className="mt-7 grid gap-3 border-t border-line-soft pt-5 sm:grid-cols-3">
        {[
          { icon: Package, term: "Sold direct", detail: `Bought from ${business.name} itself, not a reseller.` },
          { icon: CreditCard, term: "Pay your own way", detail: "Card, JazzCash, Easypaisa, bank or cash on delivery." },
          { icon: ShieldCheck, term: "Nothing shared yet", detail: "The business only sees your details after you order." },
        ].map((fact) => {
          const Icon = fact.icon;
          return (
            <div key={fact.term} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand">
                <Icon size={15} strokeWidth={2} />
              </span>
              <div>
                <dt className="text-sm font-bold text-ink">{fact.term}</dt>
                <dd className="mt-0.5 text-xs leading-5 text-muted">{fact.detail}</dd>
              </div>
            </div>
          );
        })}
      </dl>
      </div>

      {/* Sticky, so the price and the add-to-cart control stay reachable while someone reads a
          long description on a laptop. `top` matches the Shell's scroll padding. */}
      <div className="lg:sticky lg:top-6">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            {message ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-approve-200 bg-approve-50 px-3 py-2.5 text-sm font-semibold text-approve-800">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                {message}
                <Link className="ml-auto shrink-0 underline" to="/customer/cart">View cart</Link>
              </div>
            ) : null}
            {error ? (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Price</div>
            <div className="mt-1 text-3xl font-black tracking-tight text-ink">
              {item.currency} {displayPrice}
            </div>
            {selectedVariant?.name ? (
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand ring-1 ring-brand-100">
                <Check size={12} strokeWidth={3} />
                {selectedVariant.name}
              </div>
            ) : null}

            {variants.length ? (
              <div className="mt-5">
                <label className="mb-2 block text-sm font-bold text-ink" htmlFor="variant">
                  Choose an option
                </label>
                {/* Radio-style buttons rather than a `<select>`: on a phone a native dropdown
                    covers the price you are choosing between, and the price per option is the
                    reason to be choosing at all. */}
                <div className="grid gap-2" role="radiogroup" aria-labelledby="variant">
                  {variants.map((variant, index) => {
                    const outOfStock = variant.stockStatus === "out_of_stock";
                    const selected = variantIndex === index;
                    return (
                      <button
                        key={variant.sku || variant.name || index}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={outOfStock}
                        onClick={() => setVariantIndex(index)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          selected
                            ? "border-brand bg-brand-50 font-bold text-brand ring-1 ring-brand-200"
                            : "border-line bg-white text-ink hover:border-brand-200 hover:bg-surface"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ring-1 ${
                              selected ? "bg-brand ring-brand" : "bg-white ring-line"
                            }`}
                          >
                            {selected ? <Check size={10} strokeWidth={4} className="text-white" /> : null}
                          </span>
                          <span className="truncate">{variant.name || `Option ${index + 1}`}</span>
                        </span>
                        <span className="shrink-0 text-xs font-bold">
                          {outOfStock ? "Out of stock" : variant.price ? `${item.currency} ${variant.price}` : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <span id="variant" className="sr-only">
                  Choose an option
                </span>
              </div>
            ) : null}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-ink" htmlFor="quantity">
                Quantity
              </label>
              {/* Stepper rather than a free-text number box. A number input invites typing 0 or a
                  decimal, which the API rejects with a 422 the shopper never sees explained. */}
              <div className="inline-flex items-center overflow-hidden rounded-xl border border-line bg-white">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="px-3.5 py-2.5 text-ink transition hover:bg-surface disabled:opacity-40"
                  onClick={() => setQuantity((current) => Math.max(1, Number(current) - 1))}
                  disabled={Number(quantity) <= 1}
                >
                  <Minus size={15} />
                </button>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max="99"
                  className="w-16 border-x border-line py-2.5 text-center text-sm font-bold text-ink focus:outline-none"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="px-3.5 py-2.5 text-ink transition hover:bg-surface disabled:opacity-40"
                  onClick={() => setQuantity((current) => Math.min(99, Number(current) + 1))}
                  disabled={Number(quantity) >= 99}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            <button type="button" className="ui-btn-primary mt-5 w-full !py-3.5" onClick={handleAdd}>
              <ShoppingCart size={16} />
              Add to cart
            </button>

            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <button type="button" className="ui-btn-secondary !py-2.5 !text-xs" onClick={toggleFavorite}>
                <Heart size={14} className={isFavorite ? "fill-brand text-brand" : ""} />
                {isFavorite ? "Saved" : "Save"}
              </button>
              <Link className="ui-btn-secondary !py-2.5 !text-xs" to="/customer/cart">
                Go to cart
                <ArrowRight size={14} />
              </Link>
            </div>

            {business.enabledModuleCodes?.includes("ai_chat") ? (
              <Link
                className="ui-btn-secondary mt-2.5 w-full !py-2.5 !text-xs"
                to={`/customer/businesses/${tenantSlug}/chat`}
              >
                <MessageCircle size={14} />
                Ask AI about this item
              </Link>
            ) : null}

            {(business.whatsappAgent || business.whatsappAgent?.isEnabled) ? (
              <>
                <div className="mt-4">
                  <WhatsAppAgentCta
                    agent={business.whatsappAgent}
                    className="w-full"
                    message={`Hello, I found your business on BizXusAI and I want to ask about ${item.name}.`}
                  />
                </div>
                <div className="mt-3">
                  <WhatsAppAgentInfo agent={business.whatsappAgent} />
                </div>
              </>
            ) : null}
        </div>
      </div>
    </section>
  );
}
