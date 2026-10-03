import { ProductImage } from "../../components/common/ProductImage.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bot, MapPin, Package, Search, ShoppingCart, Store } from "lucide-react";

import { WhatsAppAgentCta, WhatsAppAgentInfo } from "../../components/whatsapp/WhatsAppAgentCta.jsx";
import { CardGrid, CardGridItem, SHOP_IMAGES, ShowMore, WarmEmptyState } from "./shopUi.jsx";
import { Toast } from "../../components/ui/motion.jsx";
import { addCartItem, addCustomerFavorite, getCustomerFavorites, getMarketplaceBusiness, getMarketplaceItems, removeCustomerFavorite, resolveUploadUrl } from "../../services/customerPortalApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";

// A busy business can list well over twenty products. Rendering the whole catalogue meant the
// footer, and the "ask the assistant" route out of here, sat several screens down.
const ITEM_FETCH_LIMIT = 24;
const ITEM_PAGE_SIZE = 3;

export function CustomerBusinessPage() {
  const { tenantSlug } = useParams();
  const [business, setBusiness] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // A boolean, not a count: one click reveals the whole catalogue rather than the next few.
  const [showAllItems, setShowAllItems] = useState(false);

  useEffect(() => {
    async function load() {
      setError("");
      try {
        const [businessData, itemData] = await Promise.all([
          getMarketplaceBusiness(tenantSlug),
          getMarketplaceItems(tenantSlug, { page: 1, limit: ITEM_FETCH_LIMIT }),
        ]);
        setBusiness(businessData);
        setItems(itemData.items);
        const favoriteData = await getCustomerFavorites();
        setFavorites(favoriteData);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load marketplace business."));
      }
    }
    load();
  }, [tenantSlug]);

  // A new result set starts collapsed. Otherwise a search that matched three items would show
  // them under an expander still reading "Show 6 more", implying there were more to come.
  async function searchItems(event) {
    event.preventDefault();
    setError("");
    setShowAllItems(false);
    try {
      const result = await getMarketplaceItems(tenantSlug, { search, page: 1, limit: ITEM_FETCH_LIMIT });
      setItems(result.items);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to search this business."));
    }
  }

  async function addToCart(itemId) {
    setMessage("");
    setError("");
    try {
      await addCartItem({ tenantId: business.id, itemId, quantity: 1 });
      setMessage("Item added to cart.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to add item to cart."));
    }
  }

  async function toggleFavorite(itemId) {
    if (!business) return;
    setError("");
    try {
      const exists = favorites.some((favorite) => favorite.item?.id === itemId && favorite.tenant?.id === business.id);
      const next = exists ? await removeCustomerFavorite(itemId, business.id) : await addCustomerFavorite({ tenantId: business.id, itemId });
      setFavorites(next);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update your favourites."));
    }
  }

  // Sliced here rather than inline in the JSX so the grid and the expander below it are guaranteed
  // to be describing the same slice. `business` is null during loading, hence the guard.
  const visibleItems = !business ? [] : showAllItems ? items : items.slice(0, ITEM_PAGE_SIZE);

  if (error && !business) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Business unavailable</h1>
        <p className="text-sm text-muted">{error}</p>
      </section>
    );
  }

  if (!business) {
    // A bare "Loading business..." line flashes for a moment and then the whole layout jumps
    // in underneath it. Reserving the shape up front reads as considered rather than broken.
    return (
      <section className="space-y-6">
        <div className="skeleton-shimmer h-40 w-full rounded-2xl" />
        <div className="space-y-3">
          <div className="skeleton-shimmer h-5 w-1/3 rounded" />
          <div className="skeleton-shimmer h-4 w-2/3 rounded" />
          <div className="skeleton-shimmer h-4 w-1/2 rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-xl border border-line bg-white p-4 shadow-card">
              <div className="skeleton-shimmer mb-4 h-40 w-full rounded-xl" />
              <div className="skeleton-shimmer h-4 w-3/4 rounded" />
              <div className="skeleton-shimmer mt-2 h-3 w-1/3 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Replaces the flat panel and its static "Browse items / Ask questions / Add to cart /
          Checkout" strip. Those four tiles were a progress indicator that never advanced and
          simply restated the page. Light and bright, to match the marketplace rather than the
          admin band. */}
      {/* Two columns on desktop: the identity and the way in on the left, real shopfront
          photography on the right. Previously the photograph was a separate full-width band
          below the header, so it read as a banner ad rather than as this business's storefront —
          and on a laptop the two were never on screen together. */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 sm:p-7">
          <div>
            <Link
              to="/customer/marketplace"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand transition hover:text-brand-hover"
            >
              <ArrowLeft size={13} />
              Back to marketplace
            </Link>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand shadow-sm ring-1 ring-brand-100">
                {business.address?.city ? (
                  <>
                    <MapPin size={12} />
                    {business.address.city}
                  </>
                ) : (
                  "Business"
                )}
              </span>
              {/* The catalogue size, so the shopper knows how much there is before scrolling. */}
              {items.length ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-[11px] font-bold text-ink shadow-sm ring-1 ring-line">
                  <Package size={12} className="text-brand" />
                  {items.length} {items.length === 1 ? "product" : "products"}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 max-w-2xl text-3xl font-black leading-[1.08] tracking-tight text-ink sm:text-4xl">
              {business.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
              {business.description || "Browse the available products and services below."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {business.enabledModuleCodes?.includes("ai_chat") ? (
                <Link
                  className="ui-btn-primary"
                  to={`/customer/businesses/${tenantSlug}/chat`}
                >
                  <Bot size={16} />
                  Ask about an order
                </Link>
              ) : null}
              <WhatsAppAgentCta agent={business.whatsappAgent} />
            </div>

            {business.whatsappAgent ? (
              <div className="mt-6 max-w-xl">
                <WhatsAppAgentInfo agent={business.whatsappAgent} />
              </div>
            ) : null}
          </div>

          {/* Drifts on its own slow cycle. Hidden below `lg` because a 3rem phone has no room for
              it, and a squeezed version of a photograph reads as a loading artefact. */}
          <div className="shop-float-slow hidden overflow-hidden rounded-2xl ring-1 ring-line lg:block">
            <img
              src={SHOP_IMAGES.business}
              alt=""
              className="aspect-[4/3] w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      {/* The search field moves up to sit directly under the header, because on this page it is
          the only control that narrows anything. It used to sit above a full-width photo with no
          label context, which made it read as a global site search. */}
      <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-card sm:grid-cols-[1fr_auto]" onSubmit={searchItems}>
        <label className="relative block">
          <span className="sr-only">Search this business</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            className="form-input !pl-10"
            placeholder={`Search ${business.name} — products, sizes, colours…`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="ui-btn-primary sm:px-6" type="submit">Search</button>
      </form>

      {/* Counts what the server returned, not what is currently on screen, so it stays true while the
          list is collapsed. The reassurance is static text rather than an animation — a repeating
          strip behind a product grid is a distraction when the reader is comparing prices. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-xs text-muted">
        <span className="font-semibold text-ink">
          {items.length} {items.length === 1 ? "product" : "products"}
        </span>
        {business.address?.city ? <span>Based in {business.address.city}</span> : null}
        <span>Paid and delivered directly by the business</span>
        <span>Pay by card, JazzCash, Easypaisa, bank or cash on delivery</span>
      </div>

      {/* Staggered so the grid assembles rather than appearing all at once. */}
      <CardGrid className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => (
          <CardGridItem key={item.id}>
            <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
              <Link className="relative block overflow-hidden" to={`/customer/businesses/${tenantSlug}/items/${item.id}`}>
                {/* One call now covers both cases: ProductImage renders the placeholder artwork
                    itself when there is no photo, so the empty grey box is gone. */}
                <ProductImage
                  alt=""
                  className="h-40 w-full object-cover transition duration-500 group-hover:scale-105"
                  src={item.images?.[0]?.url ? resolveUploadUrl(item.images[0].url) : undefined}
                />
                {item.variants?.length ? (
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm backdrop-blur">
                    {item.variants.length} options
                  </span>
                ) : null}
                {item.serviceDetails?.durationMinutes ? (
                  <span className="absolute right-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                    {item.serviceDetails.durationMinutes} min
                  </span>
                ) : null}
              </Link>

              <div className="flex flex-1 flex-col p-4">
                <Link to={`/customer/businesses/${tenantSlug}/items/${item.id}`}>
                  <h3 className="text-base font-bold text-ink transition group-hover:text-brand">{item.name}</h3>
                </Link>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{item.description || "No description added."}</p>
                {item.bundleComponents?.length ? (
                  <div className="mt-2 text-xs font-semibold text-muted">{item.bundleComponents.length} items in bundle</div>
                ) : null}

                <div className="mt-auto pt-4">
                  <div className="text-base font-black text-ink">
                    {item.currency} {item.price}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      className="ui-btn-secondary !py-2 !text-xs"
                      to={`/customer/businesses/${tenantSlug}/items/${item.id}`}
                    >
                      Details
                      <ArrowRight size={13} />
                    </Link>
                    <button
                      type="button"
                      className="ui-btn-secondary !py-2 !text-xs"
                      onClick={() => toggleFavorite(item.id)}
                    >
                      {favorites.some((favorite) => favorite.item?.id === item.id && favorite.tenant?.id === business.id) ? "Saved" : "Save"}
                    </button>
                    <button type="button" className="ui-btn-primary !py-2 !text-xs" onClick={() => addToCart(item.id)}>
                      <ShoppingCart size={13} />
                      Add to cart
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </CardGridItem>
        ))}
      </CardGrid>

      <ShowMore
        total={items.length}
        shown={visibleItems.length}
        expanded={showAllItems}
        noun="products"
        onToggle={() => setShowAllItems((current) => !current)}
      />

      {!items.length ? (
        <WarmEmptyState
          icon={Store}
          title={error ? "We could not load these items" : search ? "Nothing matched that search" : "No products here yet"}
          body={
            error
              ? "This is a problem reaching the server rather than an empty catalogue. Please try again."
              : search
                ? `Nothing in ${business.name} matches “${search}”. Try a shorter word, or ask the AI assistant what is available.`
                : "This business has not listed anything yet. Ask the AI assistant what they can help with."
          }
          reassurance={business.enabledModuleCodes?.includes("ai_chat") ? "You can ask about anything in this catalogue and the assistant will prepare an order for you to confirm." : null}
        />
      ) : null}

      {/* Adding to cart used to render a banner above the grid, pushing the whole catalogue
          down at the moment someone is comparing items. It now floats over the page. */}
      <Toast message={message} onDismiss={() => setMessage("")} />
    </section>
  );
}
