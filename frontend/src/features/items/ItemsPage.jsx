import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  Filter,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  List,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { BusinessSetupRequired, OWNER_IMAGES } from "../dashboard/ownerUi.jsx";

import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { getCustomFields } from "../../services/customFieldApi.js";
import {
  createItem,
  createItemCategory,
  deleteItem,
  deleteItemCategory,
  getItem,
  getItemCategories,
  getItems,
  resolveUploadUrl,
  updateItem,
  uploadItemImage,
} from "../../services/itemApi.js";
import { formatApiError } from "../../utils/apiErrors.js";
import { getApiErrorMessage } from "../../services/apiError.js";

const emptyItemForm = {
  itemType: "product",
  name: "",
  description: "",
  categoryId: "",
  sku: "",
  price: "0",
  costPrice: "0",
  currency: "PKR",
  unit: "piece",
  status: "active",
  isSellable: true,
  isBookable: false,
  isStockTracked: true,
  quantity: "0",
  lowStockThreshold: "0",
  tagsText: "",
  serviceDurationMinutes: "0",
  serviceBufferMinutes: "0",
  serviceDeliveryMode: "onsite",
};

const emptyVariant = {
  name: "",
  sku: "",
  price: "0",
  compareAtPrice: "",
  stockQuantity: "0",
  lowStockThreshold: "0",
  isDefault: false,
  isActive: true,
  optionValuesText: "",
};

export function ItemsPage() {
  const { selectedTenant } = useTenant();
  const { hasModule, isLoadingModules } = useModules();
  const itemsModuleEnabled = hasModule("items");

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [meta, setMeta] = useState({});
  const [form, setForm] = useState(emptyItemForm);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [variants, setVariants] = useState([{ ...emptyVariant, isDefault: true }]);
  const [customValues, setCustomValues] = useState({});
  const [customErrors, setCustomErrors] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [formTab, setFormTab] = useState("basic"); // 'basic' | 'inventory' | 'advanced'

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("all"); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedTenant?.id && itemsModuleEnabled) {
      refreshItems();
      refreshCategories();
      getCustomFields(selectedTenant.id, { moduleCode: "items", entityType: "item" })
        .then((data) => setFields(data.filter((field) => field.isActive)))
        .catch(() => setFields([]));
    }
  }, [selectedTenant?.id, itemsModuleEnabled, statusFilter, typeFilter, categoryFilter]);

  async function refreshItems(nextSearch = search) {
    if (!selectedTenant?.id) return;
    setIsLoading(true);
    try {
      const result = await getItems(selectedTenant.id, {
        search: nextSearch,
        status: statusFilter || undefined,
        itemType: typeFilter || undefined,
        categoryId: categoryFilter || undefined,
        page: 1,
        limit: 50,
      });
      setItems(result.items || []);
      setMeta(result.meta || {});
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshCategories() {
    if (!selectedTenant?.id) return;
    try {
      const data = await getItemCategories(selectedTenant.id);
      setCategories(data || []);
    } catch {
      setCategories([]);
    }
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyItemForm);
    setVariants([{ ...emptyVariant, isDefault: true }]);
    setCustomValues({});
    setCustomErrors([]);
    setEditingItem(null);
    setImageFile(null);
    setImagePreview(null);
    setItemModalOpen(false);
    setFormTab("basic");
  }

  async function handleEditItem(item) {
    try {
      const fullItem = await getItem(selectedTenant.id, item.id);
      setEditingItem(fullItem);
      setFormTab("basic");
      setForm({
        itemType: fullItem.itemType || "product",
        name: fullItem.name || "",
        description: fullItem.description || "",
        categoryId: fullItem.categoryId || "",
        sku: fullItem.sku || "",
        price: String(fullItem.price ?? 0),
        costPrice: String(fullItem.costPrice ?? 0),
        currency: fullItem.currency || "PKR",
        unit: fullItem.unit || "piece",
        status: fullItem.status || "active",
        isSellable: Boolean(fullItem.isSellable),
        isBookable: Boolean(fullItem.isBookable),
        isStockTracked: Boolean(fullItem.isStockTracked),
        quantity: String(fullItem.stock?.quantity ?? 0),
        lowStockThreshold: String(fullItem.stock?.lowStockThreshold ?? 0),
        tagsText: (fullItem.tags || []).join(", "),
        serviceDurationMinutes: String(fullItem.serviceDetails?.durationMinutes ?? 0),
        serviceBufferMinutes: String(fullItem.serviceDetails?.bufferMinutes ?? 0),
        serviceDeliveryMode: fullItem.serviceDetails?.deliveryMode || "onsite",
      });
      setVariants(
        fullItem.variants?.length
          ? fullItem.variants.map((v) => ({
              name: v.name || "",
              sku: v.sku || "",
              price: String(v.price ?? 0),
              compareAtPrice: v.compareAtPrice ?? "",
              stockQuantity: String(v.stockQuantity ?? 0),
              lowStockThreshold: String(v.lowStockThreshold ?? 0),
              isDefault: Boolean(v.isDefault),
              isActive: Boolean(v.isActive ?? true),
              optionValuesText: Object.entries(v.optionValues || {}).map(([k, val]) => `${k}:${val}`).join(", "),
            }))
          : [{ ...emptyVariant, isDefault: true }]
      );
      setCustomValues(fullItem.customFields || {});
      setImageFile(null);
      setImagePreview(fullItem.images?.[0]?.url ? resolveUploadUrl(fullItem.images[0].url) : null);
      setItemModalOpen(true);
    } catch (err) {
      setServerError("Failed to load item details.");
    }
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function parseOptionValues(text) {
    return text
      .split(",")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .reduce((acc, chunk) => {
        const [key, ...rest] = chunk.split(":");
        if (key && rest.length) acc[key.trim()] = rest.join(":").trim();
        return acc;
      }, {});
  }

  async function submitItem(event) {
    event.preventDefault();
    setServerError("");
    setServerMessage("");
    setCustomErrors([]);
    setIsSaving(true);

    const payload = {
      itemType: form.itemType,
      name: form.name,
      description: form.description,
      categoryId: form.categoryId || null,
      sku: form.sku,
      price: Number(form.price || 0),
      costPrice: Number(form.costPrice || 0),
      currency: form.currency,
      unit: form.unit,
      status: form.status,
      isSellable: form.isSellable,
      isBookable: form.isBookable,
      isStockTracked: form.isStockTracked,
      stock: {
        quantity: Number(form.quantity || 0),
        lowStockThreshold: Number(form.lowStockThreshold || 0),
      },
      serviceDetails: {
        durationMinutes: Number(form.serviceDurationMinutes || 0),
        bufferMinutes: Number(form.serviceBufferMinutes || 0),
        deliveryMode: form.serviceDeliveryMode,
      },
      variants: variants
        .filter((v) => v.name.trim())
        .map((v) => ({
          name: v.name.trim(),
          sku: v.sku.trim(),
          price: Number(v.price || 0),
          compareAtPrice: v.compareAtPrice === "" ? null : Number(v.compareAtPrice),
          stockQuantity: Number(v.stockQuantity || 0),
          lowStockThreshold: Number(v.lowStockThreshold || 0),
          isDefault: Boolean(v.isDefault),
          isActive: Boolean(v.isActive),
          optionValues: parseOptionValues(v.optionValuesText),
        })),
      tags: form.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      customFields: customValues,
    };

    try {
      const saved = editingItem
        ? await updateItem(selectedTenant.id, editingItem.id, payload)
        : await createItem(selectedTenant.id, payload);
      if (imageFile) {
        await uploadItemImage(selectedTenant.id, saved.id, imageFile);
      }
      setServerMessage(editingItem ? "Product updated successfully." : "Product created successfully.");
      setTimeout(() => setServerMessage(""), 3500);
      resetForm();
      await refreshItems();
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        setCustomErrors(detail);
        setServerError("Please fix validation errors.");
      } else {
        setServerError(formatApiError(detail, "Unable to save product."));
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function submitCategory(event) {
    event.preventDefault();
    setServerError("");
    setServerMessage("");
    try {
      await createItemCategory(selectedTenant.id, categoryForm);
      setCategoryForm({ name: "", description: "" });
      setServerMessage("Category created.");
      setTimeout(() => setServerMessage(""), 3000);
      setCategoryModalOpen(false);
      await refreshCategories();
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Unable to save category."));
    }
  }

  async function archiveItem(itemId, itemName) {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"?`)) return;
    try {
      await deleteItem(selectedTenant.id, itemId);
      setServerMessage("Item deleted.");
      setTimeout(() => setServerMessage(""), 3000);
      await refreshItems();
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Failed to delete item."));
    }
  }

  async function disableCategory(categoryId) {
    await deleteItemCategory(selectedTenant.id, categoryId);
    await refreshCategories();
  }

  // Stock filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const qty = item.stock?.quantity ?? 0;
      const lowThresh = item.stock?.lowStockThreshold ?? 0;
      if (stockStatusFilter === "in_stock") {
        return qty > lowThresh;
      }
      if (stockStatusFilter === "low_stock") {
        return qty <= lowThresh && qty > 0;
      }
      if (stockStatusFilter === "out_of_stock") {
        return qty <= 0;
      }
      return true;
    });
  }, [items, stockStatusFilter]);

  const stockCounts = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    items.forEach((item) => {
      const qty = item.stock?.quantity ?? 0;
      const lowThresh = item.stock?.lowStockThreshold ?? 0;
      if (qty <= 0) outOfStock++;
      else if (qty <= lowThresh) lowStock++;
      else inStock++;
    });
    return { inStock, lowStock, outOfStock };
  }, [items]);

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Products & Catalog"
        description="Add inventory items, manage stock levels, set product variations, and showcase products on your AI storefront."
        icon={Boxes}
        image={OWNER_IMAGES.trade}
        previewTitle="Catalog & Inventory Superpowers"
        previewItems={[
          { title: "Multi-Variant Products", desc: "Manage colors, sizes, and bundles with individual per-variant stock tracking." },
          { title: "AI-Powered Descriptions", desc: "Generate professional product descriptions and catalog tags with one click." },
          { title: "Low Stock & Out-of-Stock Alerts", desc: "Automated alerts when inventory reaches reorder thresholds." },
        ]}
      />
    );
  }

  if (isLoadingModules) {
    return <div className="text-sm text-muted">Loading catalog settings...</div>;
  }

  if (!itemsModuleEnabled) {
    return (
      <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-card">
        <Boxes className="mx-auto h-12 w-12 text-muted" />
        <h2 className="mt-4 text-xl font-extrabold text-ink">Products Module Disabled</h2>
        <p className="mt-1 text-sm text-muted">Enable the Products & Catalog module in feature settings.</p>
        <Link to="/dashboard/modules" className="mt-4 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white">
          Enable Feature
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. CINEMATIC CATALOG HERO - Luminous Sapphire & Indigo Aurora Atmosphere (Not Pitch Black) */}
      <motion.section
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 shadow-2xl text-white border border-white/10"
      >
        {/* Background Photograph - Vividly visible without heavy wash */}
        <img
          src={OWNER_IMAGES.trade}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-center filter brightness-[0.72] contrast-[1.08] saturate-[1.15]"
          loading="eager"
        />

        {/* Directional cinematic vignette: high contrast on text side, clear photo visibility on right */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/30"
        />

        {/* Subtle atmospheric ambient glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />

        {/* Glowing sky horizon light line */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent shadow-[0_0_12px_rgba(56,189,248,0.7)]"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-200 border border-white/20 backdrop-blur">
                <Boxes size={13} className="text-sky-300" />
                Catalog & Inventory Desk
              </span>
              {stockCounts.lowStock > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-400/40 backdrop-blur">
                  <AlertTriangle size={12} /> {stockCounts.lowStock} Low Stock Alert
                </span>
              ) : null}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
              Products, Services & Stock
            </h1>

            <p className="text-xs sm:text-sm text-sky-100/85 leading-relaxed max-w-xl">
              Add products, configure prices, and track real-time stock availability across your online storefront and cashier point of sale.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => {
                resetForm();
                setItemModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-900 shadow-lg hover:bg-slate-100 transition"
            >
              <Plus size={16} /> Add Product / Service
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-xs sm:text-sm font-bold text-white backdrop-blur hover:bg-white/20 transition"
            >
              <FolderPlus size={15} />
              Categories ({categories.length})
            </motion.button>

            <Link
              to="/dashboard/items/import"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-xs sm:text-sm font-bold text-white backdrop-blur hover:bg-white/20 transition"
            >
              <FileUp size={15} />
              Import CSV
            </Link>
          </div>
        </div>

        {/* 2. CINEMATIC GLASSMORPHIC INVENTORY STATS */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Total Items</span>
              <Boxes size={17} className="text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{meta.total || items.length}</div>
            <div className="text-[11px] text-slate-300 font-medium">In your catalog</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">In Stock</span>
              <CheckCircle2 size={17} className="text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{stockCounts.inStock}</div>
            <div className="text-[11px] text-emerald-300 font-medium">Ready to sell</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className={`rounded-2xl border p-4 backdrop-blur-md shadow-lg flex flex-col justify-between min-h-[105px] transition ${
              stockCounts.lowStock > 0
                ? "border-amber-400/50 bg-amber-500/25 text-white"
                : "border-white/20 bg-slate-900/65 text-white hover:bg-slate-900/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-black uppercase tracking-wider ${stockCounts.lowStock > 0 ? "text-amber-300" : "text-slate-200"}`}>
                Low Stock
              </span>
              <AlertTriangle size={17} className={stockCounts.lowStock > 0 ? "text-amber-300" : "text-amber-400"} />
            </div>
            <div className={`mt-2 text-2xl font-black ${stockCounts.lowStock > 0 ? "text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]" : "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"}`}>{stockCounts.lowStock}</div>
            <div className={`text-[11px] font-medium ${stockCounts.lowStock > 0 ? "text-amber-200" : "text-slate-300"}`}>
              Need reordering soon
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, scale: 1.015 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/20 bg-slate-900/65 p-4 backdrop-blur-md text-white shadow-lg flex flex-col justify-between min-h-[105px] transition hover:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Out of Stock</span>
              <Package size={17} className="text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{stockCounts.outOfStock}</div>
            <div className="text-[11px] text-slate-300 font-medium">Currently unavailable</div>
          </motion.div>
        </div>
      </motion.section>

      {serverMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {serverMessage}
        </div>
      ) : null}
      {serverError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {serverError}
        </div>
      ) : null}

      {/* 3. CATEGORY PILLS BAR (Quick 1-click filter) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("")}
          className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            categoryFilter === ""
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-surface text-muted hover:bg-white hover:text-ink border border-line"
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryFilter(cat.id)}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              categoryFilter === cat.id
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:bg-white hover:text-ink border border-line"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 4. SEARCH & STOCK STATUS BAR */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form
            className="flex-1 max-w-md relative"
            onSubmit={(e) => {
              e.preventDefault();
              refreshItems(search);
            }}
          >
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by product name, SKU, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 text-xs font-medium text-ink placeholder:text-muted outline-none focus:border-brand focus:bg-white"
            />
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 lg:border-t-0 lg:pt-0">
            {/* Stock Filter Tabs */}
            <div className="flex items-center gap-1">
              {[
                { id: "all", label: "All Items" },
                { id: "in_stock", label: "In Stock" },
                { id: "low_stock", label: "Low Stock" },
                { id: "out_of_stock", label: "Out of Stock" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStockStatusFilter(st.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    stockStatusFilter === st.id
                      ? "bg-brand/10 text-brand font-black"
                      : "text-muted hover:text-ink hover:bg-surface"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle (Grid vs. Table) */}
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === "grid" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
                title="Grid view"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === "table" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
                title="Table view"
              >
                <List size={14} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. PRODUCT LIST / CARDS */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-brand" />
          Loading products...
        </div>
      ) : !filteredItems.length ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <Boxes size={36} className="mx-auto text-muted mb-2" />
          <h3 className="text-base font-extrabold text-ink">No items found</h3>
          <p className="mt-1 text-xs text-muted">
            {search || categoryFilter || stockStatusFilter !== "all"
              ? "No items match your active filters."
              : "Get started by adding your first product or service!"}
          </p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setItemModalOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <Plus size={15} /> Add Product Now
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW: Clean, mathematically consistent rows */
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface/80 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="py-3 px-4">Product / Service</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-xs font-medium text-ink">
                {filteredItems.map((item) => {
                  const qty = item.stock?.quantity ?? 0;
                  const lowThresh = item.stock?.lowStockThreshold ?? 0;
                  const categoryName = categories.find((c) => c.id === item.categoryId)?.name || "Uncategorized";
                  const rawImg = item.images?.[0];
                  const imageUrl = typeof rawImg === "string" ? resolveUploadUrl(rawImg) : rawImg?.url ? resolveUploadUrl(rawImg.url) : null;
                  const isLow = qty <= lowThresh && qty > 0;
                  const isOut = qty <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/20 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line bg-surface flex items-center justify-center">
                            {imageUrl ? (
                              <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon size={16} className="text-muted/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-ink truncate">{item.name}</div>
                            {item.sku ? <div className="text-[11px] text-muted">SKU: {item.sku}</div> : null}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-bold text-muted border border-line">
                          {categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-ink whitespace-nowrap">
                        {item.currency || "PKR"} {Number(item.price ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                            ● Out of stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                            ● Low stock ({qty})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            ● In stock ({qty})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditItem(item)}
                            className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-bold text-ink transition hover:bg-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => archiveItem(item.id, item.name)}
                            className="rounded-lg p-1 text-muted transition hover:bg-red-50 hover:text-red-600"
                            title="Delete product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW: Uniform animated cards with fixed-height slots */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, index) => {
            const qty = item.stock?.quantity ?? 0;
            const lowThresh = item.stock?.lowStockThreshold ?? 0;
            const categoryName = categories.find((c) => c.id === item.categoryId)?.name || "Uncategorized";
            const rawImg = item.images?.[0];
            const imageUrl = typeof rawImg === "string" ? resolveUploadUrl(rawImg) : rawImg?.url ? resolveUploadUrl(rawImg.url) : null;

            const isLow = qty <= lowThresh && qty > 0;
            const isOut = qty <= 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.35), ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group flex h-full min-h-[210px] flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-brand/50 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    {/* Thumbnail Image */}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-surface flex items-center justify-center">
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon size={20} className="text-muted/60" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-ink" title={item.name}>{item.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold text-muted border border-line truncate max-w-[120px]">
                          {categoryName}
                        </span>
                        {item.sku ? <span className="text-[10px] text-muted truncate">SKU: {item.sku}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 min-h-[36px]">
                    {item.description ? (
                      <p className="line-clamp-2 text-xs text-muted leading-relaxed">
                        {item.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted/40 italic">No description provided</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-ink">
                      {item.currency || "PKR"} {Number(item.price ?? 0).toLocaleString()}
                    </div>
                    {/* Stock status pill */}
                    <div className="mt-0.5">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                          ● Out of stock
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          ● Low stock ({qty})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          ● In stock ({qty})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditItem(item)}
                      className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-ink transition hover:bg-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveItem(item.id, item.name)}
                      className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
                      title="Delete product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 6. ADD / EDIT PRODUCT MODAL (Clean, Non-Technical, Tabbed) */}
      <AnimatePresence>
        {itemModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface">
                <div>
                  <h3 className="text-base font-extrabold text-ink">
                    {editingItem ? `Edit: ${editingItem.name}` : "Add New Product or Service"}
                  </h3>
                  <p className="text-xs text-muted">Fill in basic info to list this item in your store.</p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl p-2 text-muted hover:bg-line transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Navigation Tabs */}
              <div className="flex items-center border-b border-line px-6 pt-2 gap-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFormTab("basic")}
                  className={`pb-2.5 border-b-2 transition ${
                    formTab === "basic" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  1. Essential Info
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab("inventory")}
                  className={`pb-2.5 border-b-2 transition ${
                    formTab === "inventory" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  2. Stock & Pricing
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab("advanced")}
                  className={`pb-2.5 border-b-2 transition ${
                    formTab === "advanced" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  3. Details & Variants
                </button>
              </div>

              <form onSubmit={submitItem} className="flex-1 overflow-y-auto p-6 space-y-4">
                {formTab === "basic" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-ink">Product / Service Name *</label>
                      <input
                        required
                        placeholder="e.g. Traditional Karahi, Haircut, Espresso"
                        value={form.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none focus:border-brand"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold text-ink">Category</label>
                        <select
                          value={form.categoryId}
                          onChange={(e) => updateForm("categoryId", e.target.value)}
                          className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-semibold text-ink outline-none"
                        >
                          <option value="">No Category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-ink">Selling Price (PKR) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={form.price}
                          onChange={(e) => updateForm("price", e.target.value)}
                          className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-semibold text-ink outline-none focus:border-brand"
                        />
                      </div>
                    </div>

                    {/* Image Upload Box */}
                    <div>
                      <label className="text-xs font-bold text-ink">Product Photo</label>
                      <div className="mt-1 flex items-center gap-4">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface flex items-center justify-center">
                          {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon size={24} className="text-muted" />
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-white transition">
                            <ImageIcon size={14} />
                            Choose Image
                            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                          </label>
                          <p className="mt-1 text-[11px] text-muted">Upload JPG, PNG or WEBP up to 5MB.</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ink">Short Description</label>
                      <textarea
                        rows={3}
                        placeholder="Tell your customers about this item..."
                        value={form.description}
                        onChange={(e) => updateForm("description", e.target.value)}
                        className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                )}

                {formTab === "inventory" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold text-ink">Current In-Stock Quantity *</label>
                        <input
                          type="number"
                          min="0"
                          value={form.quantity}
                          onChange={(e) => updateForm("quantity", e.target.value)}
                          className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-semibold text-ink outline-none focus:border-brand"
                        />
                        <p className="mt-1 text-[11px] text-muted">How many units you currently have.</p>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-ink">Low Stock Alert Threshold</label>
                        <input
                          type="number"
                          min="0"
                          value={form.lowStockThreshold}
                          onChange={(e) => updateForm("lowStockThreshold", e.target.value)}
                          className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-semibold text-ink outline-none focus:border-brand"
                        />
                        <p className="mt-1 text-[11px] text-muted">Warn when stock falls to or below this number.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold text-ink">SKU / Barcode (Optional)</label>
                        <input
                          placeholder="e.g. PROD-001"
                          value={form.sku}
                          onChange={(e) => updateForm("sku", e.target.value)}
                          className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-ink">Cost Price (Optional - for profit tracking)</label>
                        <input
                          type="number"
                          min="0"
                          value={form.costPrice}
                          onChange={(e) => updateForm("costPrice", e.target.value)}
                          className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-line bg-surface p-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-ink">Sellable Online</div>
                        <div className="text-[11px] text-muted">Customers can purchase this item on your website.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.isSellable}
                        onChange={(e) => updateForm("isSellable", e.target.checked)}
                        className="h-5 w-5 rounded border-line text-brand"
                      />
                    </div>
                  </div>
                )}

                {formTab === "advanced" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold text-ink">Item Type</label>
                        <select
                          value={form.itemType}
                          onChange={(e) => updateForm("itemType", e.target.value)}
                          className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-semibold text-ink outline-none"
                        >
                          <option value="product">Physical Product</option>
                          <option value="service">Service (e.g. Appointment, Booking)</option>
                          <option value="package">Package / Combo</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-ink">Status</label>
                        <select
                          value={form.status}
                          onChange={(e) => updateForm("status", e.target.value)}
                          className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-semibold text-ink outline-none"
                        >
                          <option value="active">Active (Visible)</option>
                          <option value="inactive">Inactive (Hidden)</option>
                        </select>
                      </div>
                    </div>

                    {form.itemType === "service" && (
                      <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                        <div className="text-xs font-bold text-ink">Service Appointment Settings</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-[11px] text-muted font-bold">Duration (Minutes)</label>
                            <input
                              type="number"
                              value={form.serviceDurationMinutes}
                              onChange={(e) => updateForm("serviceDurationMinutes", e.target.value)}
                              className="mt-1 w-full rounded-xl border border-line bg-white p-2 text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted font-bold">Delivery Mode</label>
                            <select
                              value={form.serviceDeliveryMode}
                              onChange={(e) => updateForm("serviceDeliveryMode", e.target.value)}
                              className="mt-1 w-full rounded-xl border border-line bg-white p-2 text-xs font-semibold"
                            >
                              <option value="onsite">Onsite / In-store</option>
                              <option value="home_visit">Home Visit</option>
                              <option value="remote">Remote / Online</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-ink">Search Tags (comma-separated)</label>
                      <input
                        placeholder="e.g. popular, spicy, summer collection"
                        value={form.tagsText}
                        onChange={(e) => updateForm("tagsText", e.target.value)}
                        className="mt-1 w-full rounded-xl border border-line p-2.5 text-xs font-medium text-ink outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2">
                    {formTab === "basic" ? (
                      <button
                        type="button"
                        onClick={() => setFormTab("inventory")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-black"
                      >
                        Next: Stock & Pricing <ArrowRight size={13} />
                      </button>
                    ) : formTab === "inventory" ? (
                      <button
                        type="button"
                        onClick={() => setFormTab("advanced")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-black"
                      >
                        More Options <ArrowRight size={13} />
                      </button>
                    ) : null}

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-hover disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : editingItem ? "Update Product" : "Save & List Product"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* 7. QUICK CATEGORY MANAGER MODAL */}
      <AnimatePresence>
        {categoryModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderPlus size={18} className="text-purple-600" />
                  <h3 className="text-base font-extrabold text-ink">Manage Categories</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="rounded-xl p-1.5 text-muted hover:bg-surface"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={submitCategory} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-ink">Category Name *</label>
                  <input
                    required
                    placeholder="e.g. Appetizers, Beverages, Clothing"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm((c) => ({ ...c, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-line p-2 text-xs font-medium text-ink outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink">Description (Optional)</label>
                  <input
                    placeholder="Short summary for this section..."
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm((c) => ({ ...c, description: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-line p-2 text-xs font-medium text-ink outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700"
                >
                  Add Category
                </button>
              </form>

              <div className="border-t border-line pt-3 max-h-48 overflow-y-auto space-y-1.5">
                <span className="text-[11px] font-bold text-muted uppercase">Existing Categories:</span>
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-xs">
                    <span className="font-bold text-ink">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => disableCategory(c.id)}
                      className="text-red-500 hover:text-red-700 text-[11px] font-bold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
