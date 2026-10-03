import { useEffect, useState } from "react";
import { CheckCircle2, LayoutGrid, Plus, Tags } from "lucide-react";

import {
  createAdminBusinessCategory,
  deleteAdminBusinessCategory,
  getAdminBusinessCategories,
  updateAdminBusinessCategory,
} from "../../services/businessCategoryApi.js";
import { AdminHero, Field, Notice, Panel, Pill } from "./adminUi.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

const emptyCategory = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  isActive: true,
  suggestedModulesText: "",
  aiPromptFragmentsText: "",
  analyticsSuggestionsText: "",
  defaultCustomFieldsText: "[]",
  aiHintsText: "{}",
  websiteHintsText: "{}",
  fulfillmentHintsText: "{}",
};

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [formValues, setFormValues] = useState(emptyCategory);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    refreshCategories();
  }, []);

  async function refreshCategories() {
    setIsLoading(true);
    try {
      const data = await getAdminBusinessCategories();
      setCategories(data);
      setError("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load categories."));
    } finally {
      setIsLoading(false);
    }
  }

  function parseCsv(text) {
    return text
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function parseJson(text, label) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`${label} must be valid JSON.`);
    }
  }

  function buildPayload(values) {
    return {
      name: values.name,
      slug: values.slug || null,
      description: values.description,
      icon: values.icon,
      isActive: values.isActive,
      suggestedModules: parseCsv(values.suggestedModulesText),
      aiPromptFragments: parseCsv(values.aiPromptFragmentsText),
      analyticsSuggestions: parseCsv(values.analyticsSuggestionsText),
      defaultCustomFields: parseJson(values.defaultCustomFieldsText, "Default custom fields"),
      aiHints: parseJson(values.aiHintsText, "AI hints"),
      websiteHints: parseJson(values.websiteHintsText, "Website hints"),
      fulfillmentHints: parseJson(values.fulfillmentHintsText, "Fulfillment hints"),
    };
  }

  function loadForEdit(category) {
    setEditingId(category.id);
    setFormValues({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      icon: category.icon || "",
      isActive: Boolean(category.isActive),
      suggestedModulesText: (category.suggestedModules || []).join(", "),
      aiPromptFragmentsText: (category.aiPromptFragments || []).join(", "),
      analyticsSuggestionsText: (category.analyticsSuggestions || []).join(", "),
      defaultCustomFieldsText: JSON.stringify(category.defaultCustomFields || [], null, 2),
      aiHintsText: JSON.stringify(category.aiHints || {}, null, 2),
      websiteHintsText: JSON.stringify(category.websiteHints || {}, null, 2),
      fulfillmentHintsText: JSON.stringify(category.fulfillmentHints || {}, null, 2),
    });
  }

  function resetForm() {
    setEditingId("");
    setFormValues(emptyCategory);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = buildPayload(formValues);
      if (editingId) {
        await updateAdminBusinessCategory(editingId, payload);
        setMessage("Business category updated.");
      } else {
        await createAdminBusinessCategory(payload);
        setMessage("Business category created.");
      }
      resetForm();
      await refreshCategories();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save category."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisable(categoryId) {
    setError("");
    setMessage("");
    try {
      await deleteAdminBusinessCategory(categoryId);
      setMessage("Business category disabled.");
      await refreshCategories();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to disable category."));
    }
  }

  const activeCategories = categories.filter((c) => c.isActive).length;
  const categoriesWithModules = categories.filter((c) => (c.suggestedModules || []).length).length;

  return (
    <div className="space-y-6">
      <AdminHero
        skin="categories"
        eyebrow="Configuration"
        title="Business categories"
        icon={Tags}
        description="Categories drive onboarding defaults: they pick a website layout, suggest modules, and shape what the AI assistant knows about a business."
        stats={[
          { label: "Categories", value: categories.length, hint: "In the catalog", icon: Tags },
          { label: "Active", value: activeCategories, hint: "Offered at onboarding", icon: CheckCircle2, tone: "approve" },
          { label: "Inactive", value: categories.length - activeCategories, hint: "Hidden from new businesses", icon: Tags, tone: categories.length - activeCategories ? "pending" : "approve" },
          { label: "With modules", value: categoriesWithModules, hint: "Suggest a module set", icon: LayoutGrid },
        ]}
      />

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <div className="whitespace-pre-wrap"><Notice tone="error">{error}</Notice></div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Panel
          title={editingId ? "Edit category" : "Create category"}
          icon={editingId ? Tags : Plus}
          description={editingId ? "Change the fields below, then save." : "Only name is required. Everything else has a sensible default."}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Name" hint="Shown to businesses when they pick their type.">
            <input className="form-input" value={formValues.name} onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))} required />
          </Field>
          <Field label="Slug" hint="Leave blank to generate from the name.">
            <input className="form-input" value={formValues.slug} onChange={(event) => setFormValues((current) => ({ ...current, slug: event.target.value }))} />
          </Field>
          <Field label="Icon" hint="Optional identifier shown on category cards.">
            <input className="form-input" value={formValues.icon} onChange={(event) => setFormValues((current) => ({ ...current, icon: event.target.value }))} />
          </Field>
          <Field label="Description">
            <textarea className="form-input min-h-20" value={formValues.description} onChange={(event) => setFormValues((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <Field label="Suggested modules" hint="Comma separated. Pre-selected when a business picks this category.">
            <input className="form-input" placeholder="items, website_builder, analytics" value={formValues.suggestedModulesText} onChange={(event) => setFormValues((current) => ({ ...current, suggestedModulesText: event.target.value }))} />
          </Field>
          <Field label="AI prompt fragments" hint="Comma separated. Extra topics the assistant should be ready to answer.">
            <input className="form-input" placeholder="Ask about freshness, Ask about delivery" value={formValues.aiPromptFragmentsText} onChange={(event) => setFormValues((current) => ({ ...current, aiPromptFragmentsText: event.target.value }))} />
          </Field>
          <Field label="Analytics suggestions" hint="Comma separated. Reports this category should highlight.">
            <input className="form-input" placeholder="Track repeat buyers, Monitor quote conversion" value={formValues.analyticsSuggestionsText} onChange={(event) => setFormValues((current) => ({ ...current, analyticsSuggestionsText: event.target.value }))} />
          </Field>

          {/* The advanced block was previously four unlabelled JSON boxes in a row, which
              read as noise during ordinary category creation. Collapsed by default with a
              note about what each one is for. */}
          <details className="rounded-xl border border-line bg-surface p-3">
            <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-[0.1em] text-subtle [&::-webkit-details-marker]:hidden">
              Advanced JSON overrides
            </summary>
            <div className="mt-4 space-y-4">
              <Field label="Default custom fields" hint="JSON array of fields every business in this category gets.">
                <textarea className="form-input min-h-24 font-mono text-xs" value={formValues.defaultCustomFieldsText} onChange={(event) => setFormValues((current) => ({ ...current, defaultCustomFieldsText: event.target.value }))} />
              </Field>
              <Field label="AI hints" hint="JSON object of things the assistant should know about this trade.">
                <textarea className="form-input min-h-20 font-mono text-xs" value={formValues.aiHintsText} onChange={(event) => setFormValues((current) => ({ ...current, aiHintsText: event.target.value }))} />
              </Field>
              <Field label="Website hints" hint="JSON object steering generated website copy.">
                <textarea className="form-input min-h-20 font-mono text-xs" value={formValues.websiteHintsText} onChange={(event) => setFormValues((current) => ({ ...current, websiteHintsText: event.target.value }))} />
              </Field>
              <Field label="Fulfilment hints" hint="JSON object describing how these orders are usually delivered.">
                <textarea className="form-input min-h-20 font-mono text-xs" value={formValues.fulfillmentHintsText} onChange={(event) => setFormValues((current) => ({ ...current, fulfillmentHintsText: event.target.value }))} />
              </Field>
            </div>
          </details>

          <label className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-ink">
            <input type="checkbox" checked={formValues.isActive} onChange={(event) => setFormValues((current) => ({ ...current, isActive: event.target.checked }))} />
            Active — available for new businesses
          </label>
          <div className="flex gap-2">
            <button className="ui-btn-primary flex-1" disabled={isSaving} type="submit">
              {isSaving ? "Saving…" : editingId ? "Save changes" : "Create category"}
            </button>
            {editingId ? (
              <button className="ui-btn-secondary" onClick={resetForm} type="button">
                Cancel
              </button>
            ) : null}
          </div>
          </form>
        </Panel>

        <div className="space-y-3">
          {isLoading ? <div className="text-sm text-muted">Loading categories…</div> : null}
          {categories.map((category) => (
            <article key={category.id} className="rounded-xl border border-line bg-white p-5 shadow-card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-ink">{category.name}</h3>
                    <Pill tone={category.isActive ? "approve" : "neutral"}>{category.isActive ? "Active" : "Inactive"}</Pill>
                  </div>
                  <div className="mt-1 text-xs text-subtle">{category.slug}</div>
                  <p className="mt-2 text-sm leading-6 text-muted">{category.description || "No description."}</p>
                  <p className="mt-3 text-xs text-muted">
                    <span className="font-bold text-ink">Suggested modules:</span>{" "}
                    {(category.suggestedModules || []).join(", ") || "none"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="ui-btn-secondary !py-2 !text-sm" onClick={() => loadForEdit(category)} type="button">
                    Edit
                  </button>
                  {/* Only ever a disable: `handleDisable` calls the delete endpoint, and there
                      is no re-enable route on the API. Showing an "Enable" button here would
                      promise something the request cannot deliver. */}
                  {category.isActive ? (
                    <button className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50" onClick={() => handleDisable(category.id)} type="button">
                      Disable
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          {!categories.length && !isLoading ? (
            <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-10 text-center text-sm text-muted">
              No categories yet. Create your first one to unlock guided onboarding.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
