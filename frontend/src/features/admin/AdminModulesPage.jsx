import { useEffect, useState } from "react";
import { Boxes, CheckCircle2, Plus, SquareStack } from "lucide-react";

import { createAdminModule, getAdminModules, updateAdminModule } from "../../services/moduleApi.js";
import { AdminHero, Field, Notice, Panel, Pill } from "./adminUi.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

const emptyModule = {
  code: "",
  name: "",
  description: "",
  category: "core",
  isActive: true,
  dependenciesText: "",
  permissionsText: "",
  frontendRoutesText: "",
  apiPrefix: "",
  aiToolsText: "",
  configSchemaText: "{}",
  availabilityText: "{\"includedPlans\": [\"starter\", \"growth\", \"scale\"]}",
  usageLimitsText: "{}",
};

function planLabel(planCode) {
  return { starter: "Basic", growth: "AI Ordering", scale: "Full Agent" }[planCode] || "Basic";
}

function planListLabel(planCodes = []) {
  return planCodes.map(planLabel).join(", ");
}

export function AdminModulesPage() {
  const [modules, setModules] = useState([]);
  const [formValues, setFormValues] = useState(emptyModule);
  const [editingCode, setEditingCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    refreshModules();
  }, []);

  async function refreshModules() {
    setIsLoading(true);
    try {
      const data = await getAdminModules();
      setModules(data);
      setError("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load modules."));
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

  function buildPayload(values, includeCode) {
    return {
      ...(includeCode ? { code: values.code } : {}),
      name: values.name,
      description: values.description,
      category: values.category,
      isActive: values.isActive,
      dependencies: parseCsv(values.dependenciesText),
      permissions: parseCsv(values.permissionsText),
      frontendRoutes: parseCsv(values.frontendRoutesText),
      apiPrefix: values.apiPrefix,
      aiTools: parseCsv(values.aiToolsText),
      configSchema: parseJson(values.configSchemaText, "Config schema"),
      availability: parseJson(values.availabilityText, "Availability"),
      usageLimits: parseJson(values.usageLimitsText, "Usage limits"),
    };
  }

  function loadForEdit(module) {
    setEditingCode(module.code);
    setFormValues({
      code: module.code || "",
      name: module.name || "",
      description: module.description || "",
      category: module.category || "core",
      isActive: Boolean(module.isActive),
      dependenciesText: (module.dependencies || []).join(", "),
      permissionsText: (module.permissions || []).join(", "),
      frontendRoutesText: (module.frontendRoutes || []).join(", "),
      apiPrefix: module.apiPrefix || "",
      aiToolsText: (module.aiTools || []).join(", "),
      configSchemaText: JSON.stringify(module.configSchema || {}, null, 2),
      availabilityText: JSON.stringify(module.availability || {}, null, 2),
      usageLimitsText: JSON.stringify(module.usageLimits || {}, null, 2),
    });
  }

  function resetForm() {
    setEditingCode("");
    setFormValues(emptyModule);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      if (editingCode) {
        await updateAdminModule(editingCode, buildPayload(formValues, false));
        setMessage("Module updated.");
      } else {
        await createAdminModule(buildPayload(formValues, true));
        setMessage("Module created.");
      }
      resetForm();
      await refreshModules();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save module."));
    } finally {
      setIsSaving(false);
    }
  }

  const activeModules = modules.filter((m) => m.isActive).length;
  const modulesInUse = modules.filter((m) => (m.enabledTenantCount || 0) > 0).length;

  return (
    <div className="space-y-6">
      <AdminHero
        skin="modules"
        eyebrow="Configuration"
        title="Modules"
        icon={SquareStack}
        description="Modules are the platform's capabilities. Each one declares which plans include it, what it depends on, and the limits that apply."
        stats={[
          { label: "Modules", value: modules.length, hint: "In the catalog", icon: SquareStack },
          { label: "Active", value: activeModules, hint: "Businesses can enable these", icon: CheckCircle2, tone: "approve" },
          { label: "Inactive", value: modules.length - activeModules, hint: "Switched off platform-wide", icon: SquareStack, tone: modules.length - activeModules ? "pending" : "approve" },
          { label: "In use", value: modulesInUse, hint: "Enabled by at least one business", icon: Boxes },
        ]}
      />

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <div className="whitespace-pre-wrap"><Notice tone="error">{error}</Notice></div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Panel
          title={editingCode ? "Edit module" : "Create module"}
          icon={editingCode ? SquareStack : Plus}
          description={editingCode ? "The code cannot change once created." : "Code, name, and category are all that is required."}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Code" hint="Stable identifier used by the API. Cannot be changed later.">
            <input className="form-input font-mono" disabled={Boolean(editingCode)} required value={formValues.code} onChange={(event) => setFormValues((current) => ({ ...current, code: event.target.value }))} />
          </Field>
          <Field label="Name">
            <input className="form-input" required value={formValues.name} onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Category" hint="Groups related modules together, e.g. Sales or Website.">
            <input className="form-input" value={formValues.category} onChange={(event) => setFormValues((current) => ({ ...current, category: event.target.value }))} />
          </Field>
          <Field label="Description">
            <textarea className="form-input min-h-20" value={formValues.description} onChange={(event) => setFormValues((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <Field label="Dependencies" hint="Comma separated module codes that must be enabled first.">
            <input className="form-input" placeholder="website_builder, items" value={formValues.dependenciesText} onChange={(event) => setFormValues((current) => ({ ...current, dependenciesText: event.target.value }))} />
          </Field>
          <Field label="Permissions" hint="Comma separated permission keys this module grants.">
            <input className="form-input" value={formValues.permissionsText} onChange={(event) => setFormValues((current) => ({ ...current, permissionsText: event.target.value }))} />
          </Field>
          <Field label="Frontend routes" hint="Comma separated routes this module adds.">
            <input className="form-input" value={formValues.frontendRoutesText} onChange={(event) => setFormValues((current) => ({ ...current, frontendRoutesText: event.target.value }))} />
          </Field>
          <Field label="API prefix">
            <input className="form-input font-mono" value={formValues.apiPrefix} onChange={(event) => setFormValues((current) => ({ ...current, apiPrefix: event.target.value }))} />
          </Field>
          <Field label="AI tools" hint="Comma separated tools this module exposes to the assistant.">
            <input className="form-input" value={formValues.aiToolsText} onChange={(event) => setFormValues((current) => ({ ...current, aiToolsText: event.target.value }))} />
          </Field>

          {/* Same treatment as the categories form: three raw JSON boxes buried the fields an
              administrator actually fills in day to day. */}
          <details className="rounded-xl border border-line bg-surface p-3">
            <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-[0.1em] text-subtle [&::-webkit-details-marker]:hidden">
              Advanced JSON definitions
            </summary>
            <div className="mt-4 space-y-4">
              <Field label="Config schema" hint="JSON shape of the settings this module stores.">
                <textarea className="form-input min-h-20 font-mono text-xs" value={formValues.configSchemaText} onChange={(event) => setFormValues((current) => ({ ...current, configSchemaText: event.target.value }))} />
              </Field>
              <Field label="Availability" hint='JSON naming the plans that include this module, e.g. { "includedPlans": ["growth"] }.'>
                <textarea className="form-input min-h-20 font-mono text-xs" value={formValues.availabilityText} onChange={(event) => setFormValues((current) => ({ ...current, availabilityText: event.target.value }))} />
              </Field>
              <Field label="Usage limits" hint='JSON of caps, e.g. { "ordersPerMonth": 100 }.'>
                <textarea className="form-input min-h-20 font-mono text-xs" value={formValues.usageLimitsText} onChange={(event) => setFormValues((current) => ({ ...current, usageLimitsText: event.target.value }))} />
              </Field>
            </div>
          </details>

          <label className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-ink">
            <input type="checkbox" checked={formValues.isActive} onChange={(event) => setFormValues((current) => ({ ...current, isActive: event.target.checked }))} />
            Active — businesses can switch this on
          </label>
          <div className="flex gap-2">
            <button className="ui-btn-primary flex-1" disabled={isSaving} type="submit">
              {isSaving ? "Saving…" : editingCode ? "Save changes" : "Create module"}
            </button>
            {editingCode ? (
              <button className="ui-btn-secondary" onClick={resetForm} type="button">
                Cancel
              </button>
            ) : null}
          </div>
          </form>
        </Panel>

        <div className="space-y-3">
          {isLoading ? <div className="text-sm text-muted">Loading modules…</div> : null}
          {modules.map((module) => (
            <article key={module.code} className="rounded-xl border border-line bg-white p-5 shadow-card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-ink">{module.name}</h3>
                    <Pill tone={module.isActive ? "approve" : "neutral"}>{module.isActive ? "Active" : "Inactive"}</Pill>
                  </div>
                  <div className="mt-1 text-xs text-subtle">{module.code}{module.category ? ` · ${module.category}` : ""}</div>
                  <p className="mt-2 text-sm leading-6 text-muted">{module.description || "No description."}</p>
                  <p className="mt-3 text-xs text-muted">
                    <span className="font-bold text-ink">In plans:</span>{" "}
                    {planListLabel(module.availability?.includedPlans || []) || "Basic, AI Ordering, Full Agent"}
                    {" · "}
                    <span className="font-bold text-ink">Used by</span> {module.enabledTenantCount || 0}{" "}
                    {module.enabledTenantCount === 1 ? "business" : "businesses"}
                  </p>
                </div>
                <button className="ui-btn-secondary shrink-0 !py-2 !text-sm" onClick={() => loadForEdit(module)} type="button">
                  Edit
                </button>
              </div>
            </article>
          ))}
          {!modules.length && !isLoading ? (
            <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-10 text-center text-sm text-muted">
              No modules in the catalog yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
