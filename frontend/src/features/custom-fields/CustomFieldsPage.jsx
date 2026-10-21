import { joiResolver } from "@hookform/resolvers/joi";
import Joi from "joi";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { DynamicForm } from "../../components/dynamic/DynamicForm.jsx";
import { DynamicTable } from "../../components/dynamic/DynamicTable.jsx";
import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { createCustomField, deleteCustomField, getCustomFields, updateCustomField, validateCustomValues } from "../../services/customFieldApi.js";
import { SectionTitle } from "../../components/ui/SectionTitle.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";
import { Eye, Layers, Plus, Sparkles } from "lucide-react";
import { BusinessSetupRequired, OWNER_IMAGES, OwnerHero } from "../dashboard/ownerUi.jsx";

const BASIC_FIELD_LIMIT = 3;

const moduleEntityMap = {
  customers: "customer",
  items: "item",
  transactions: "transaction",
};

const targetOptions = [
  { moduleCode: "customers", entityType: "customer", label: "Customer", description: "Save extra customer details like type, preference, or notes." },
  { moduleCode: "items", entityType: "item", label: "Product / Service", description: "Add details like size, color, brand, dosage, or service location." },
  { moduleCode: "transactions", entityType: "transaction", label: "Order / Booking", description: "Collect order-specific details like delivery time or instructions." },
];

const fieldTypes = [
  { value: "text", label: "Text", help: "For short answers like notes, color, table number, or instructions." },
  { value: "number", label: "Number", help: "For quantity, age, price, weight, or any numeric value." },
  { value: "select", label: "Dropdown", help: "Let the user select one option." },
  { value: "multi_select", label: "Multi-select", help: "Let the user select multiple options." },
  { value: "date", label: "Date", help: "Let the user select a date." },
  { value: "boolean", label: "Checkbox", help: "A simple yes/no field." },
  { value: "file", label: "File", help: "Advanced: store a file reference or upload path." },
  { value: "reference", label: "Reference", help: "Advanced: store a reference code or related record." },
];

const templateGroups = [
  {
    code: "restaurant",
    label: "Restaurant",
    hint: "Great for food orders and delivery notes.",
    fields: [
      { moduleCode: "transactions", label: "Spice Level", type: "select", options: ["Mild", "Medium", "Hot"], required: true },
      { moduleCode: "transactions", label: "Extra Instructions", type: "text" },
      { moduleCode: "transactions", label: "Delivery Time", type: "text" },
      { moduleCode: "transactions", label: "Table Number", type: "text" },
    ],
  },
  {
    code: "fashion",
    label: "Fashion",
    hint: "Useful for clothing, boutique, and tailor catalogs.",
    fields: [
      { moduleCode: "items", label: "Size", type: "select", options: ["Small", "Medium", "Large", "XL"], required: true },
      { moduleCode: "items", label: "Color", type: "text" },
      { moduleCode: "items", label: "Material", type: "text" },
      { moduleCode: "items", label: "Brand", type: "text" },
    ],
  },
  {
    code: "pharmacy",
    label: "Pharmacy",
    hint: "Adds safe medicine and prescription details.",
    fields: [
      { moduleCode: "items", label: "Prescription Required", type: "boolean" },
      { moduleCode: "items", label: "Medicine Type", type: "select", options: ["Tablet", "Syrup", "Injection", "Cream"] },
      { moduleCode: "transactions", label: "Dosage Note", type: "text" },
    ],
  },
  {
    code: "service",
    label: "Service",
    hint: "For appointments, service calls, and local visits.",
    fields: [
      { moduleCode: "transactions", label: "Preferred Date", type: "date", required: true },
      { moduleCode: "transactions", label: "Preferred Time", type: "text" },
      { moduleCode: "transactions", label: "Service Location", type: "text" },
      { moduleCode: "transactions", label: "Urgency Level", type: "select", options: ["Normal", "Urgent", "Emergency"] },
    ],
  },
  {
    code: "grocery",
    label: "Grocery",
    hint: "For weight, brand, and expiry-sensitive items.",
    fields: [
      { moduleCode: "items", label: "Weight", type: "text" },
      { moduleCode: "items", label: "Brand", type: "text" },
      { moduleCode: "items", label: "Expiry Date", type: "date" },
    ],
  },
  {
    code: "general",
    label: "General",
    hint: "Safe starter fields for most businesses.",
    fields: [
      { moduleCode: "transactions", label: "Notes", type: "text" },
      { moduleCode: "transactions", label: "Priority", type: "select", options: ["Low", "Normal", "High"] },
      { moduleCode: "customers", label: "Customer Type", type: "select", options: ["New", "Regular", "VIP"] },
    ],
  },
];

const schema = Joi.object({
  moduleCode: Joi.string().valid("customers", "items", "transactions").required().messages({
    "any.required": "Please choose where the field should appear.",
  }),
  entityType: Joi.string().valid("customer", "item", "transaction").required(),
  key: Joi.string().pattern(/^[A-Za-z_][A-Za-z0-9_]*$/).required().label("System name").messages({
    "string.empty": "System name is required.",
    "string.pattern.base": "System name must use letters, numbers, and underscores, and cannot start with a number.",
  }),
  label: Joi.string().min(2).required().label("Field label").messages({
    "string.empty": "Field label is required.",
    "string.min": "Field label is required.",
  }),
  type: Joi.string().valid("text", "number", "date", "boolean", "select", "multi_select", "file", "reference").required(),
  required: Joi.boolean(),
  optionsText: Joi.string().allow(""),
  defaultValueText: Joi.string().allow(""),
  minLength: Joi.number().allow(null),
  maxLength: Joi.number().allow(null),
  minValue: Joi.number().allow(null),
  maxValue: Joi.number().allow(null),
  order: Joi.number().integer().min(1).required(),
  showInTable: Joi.boolean(),
  showInForm: Joi.boolean(),
});

function slugifyKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^([0-9])/, "_$1");
}

function titleForTarget(moduleCode) {
  return targetOptions.find((option) => option.moduleCode === moduleCode)?.label || "Customer";
}

function sampleValueForField(field) {
  if (field.defaultValue !== null && field.defaultValue !== undefined && field.defaultValue !== "") return field.defaultValue;
  if (field.type === "number") return 1;
  if (field.type === "date") return "2026-07-02";
  if (field.type === "boolean") return true;
  if (field.type === "select") return field.options?.[0] || "";
  if (field.type === "multi_select") return (field.options || []).slice(0, 2);
  return field.options?.[0] || field.label;
}

function categorySuggestionCode(selectedTenant) {
  const text = [
    selectedTenant?.categoryConfig?.slug,
    selectedTenant?.categoryConfig?.name,
    selectedTenant?.settings?.categoryHints?.categorySlug,
    selectedTenant?.settings?.categoryHints?.categoryName,
  ].filter(Boolean).join(" ").toLowerCase();
  if (/(restaurant|bakery|food|cafe)/.test(text)) return "restaurant";
  if (/(fashion|clothing|tailor|boutique)/.test(text)) return "fashion";
  if (/pharmacy/.test(text)) return "pharmacy";
  if (/(salon|service|clinic|repair|gym|education)/.test(text)) return "service";
  if (/grocery/.test(text)) return "grocery";
  return "general";
}

export function CustomFieldsPage() {
  const { selectedTenant } = useTenant();
  const { tenantPlan } = useModules();
  const [fields, setFields] = useState([]);
  const [allFields, setAllFields] = useState([]);
  const [filters, setFilters] = useState({ moduleCode: "customers", entityType: "customer" });
  const [previewValues, setPreviewValues] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [mode, setMode] = useState("simple");
  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const [isApplyingTemplate, setIsApplyingTemplate] = useState("");
  const [activeTab, setActiveTab] = useState("fields");

  const planCode = tenantPlan?.code || selectedTenant?.settings?.planCode || "starter";
  const isBasicPlan = planCode === "starter";
  const activeFieldCount = allFields.filter((field) => field.isActive).length;
  const basicLimitReached = isBasicPlan && activeFieldCount >= BASIC_FIELD_LIMIT;

  const form = useForm({
    resolver: joiResolver(schema),
    defaultValues: {
      moduleCode: "customers",
      entityType: "customer",
      key: "",
      label: "",
      type: "text",
      required: false,
      optionsText: "",
      defaultValueText: "",
      minLength: null,
      maxLength: null,
      minValue: null,
      maxValue: null,
      order: 1,
      showInTable: true,
      showInForm: true,
    },
  });

  const watchedModule = form.watch("moduleCode");
  const watchedType = form.watch("type");
  const watchedLabel = form.watch("label");
  const watchedKey = form.watch("key");

  useEffect(() => {
    form.setValue("entityType", moduleEntityMap[watchedModule]);
  }, [form, watchedModule]);

  useEffect(() => {
    if (!editingField && watchedLabel && (!watchedKey || watchedKey === slugifyKey(watchedKey))) {
      form.setValue("key", slugifyKey(watchedLabel), { shouldValidate: true });
    }
  }, [editingField, form, watchedLabel]);

  useEffect(() => {
    if (selectedTenant?.id) {
      refreshFields().catch(() => {});
      refreshAllFields().catch(() => {});
    }
  }, [selectedTenant?.id, filters.moduleCode, filters.entityType]);

  async function refreshFields() {
    const data = await getCustomFields(selectedTenant.id, filters);
    setFields(data);
  }

  async function refreshAllFields() {
    const data = await getCustomFields(selectedTenant.id);
    setAllFields(data);
  }

  function resetBuilder(moduleCode = filters.moduleCode, entityType = filters.entityType) {
    setEditingField(null);
    form.reset({
      moduleCode,
      entityType,
      key: "",
      label: "",
      type: "text",
      required: false,
      optionsText: "",
      defaultValueText: "",
      minLength: null,
      maxLength: null,
      minValue: null,
      maxValue: null,
      order: Math.max(fields.length + 1, 1),
      showInTable: true,
      showInForm: true,
    });
  }

  function parseDefaultValue(type, rawValue) {
    if (rawValue === "") return null;
    if (type === "number") return Number(rawValue);
    if (type === "boolean") return String(rawValue).toLowerCase() === "true";
    if (type === "multi_select") {
      return rawValue.split(",").map((option) => option.trim()).filter(Boolean);
    }
    return rawValue;
  }

  function buildValidation(type, values) {
    const validation = {};
    if (type === "text") {
      if (values.minLength !== null && values.minLength !== "" && !Number.isNaN(values.minLength)) validation.minLength = Number(values.minLength);
      if (values.maxLength !== null && values.maxLength !== "" && !Number.isNaN(values.maxLength)) validation.maxLength = Number(values.maxLength);
    }
    if (type === "number") {
      if (values.minValue !== null && values.minValue !== "" && !Number.isNaN(values.minValue)) validation.min = Number(values.minValue);
      if (values.maxValue !== null && values.maxValue !== "" && !Number.isNaN(values.maxValue)) validation.max = Number(values.maxValue);
    }
    return validation;
  }

  function buildPayload(values) {
    const options = values.optionsText
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);
    if (["select", "multi_select"].includes(values.type) && !options.length) {
      throw new Error("Options are required for dropdown or multi-select fields.");
    }
    return {
      moduleCode: values.moduleCode,
      entityType: values.entityType,
      key: values.key || slugifyKey(values.label),
      label: values.label,
      type: values.type,
      required: values.required,
      options,
      defaultValue: parseDefaultValue(values.type, values.defaultValueText),
      validation: buildValidation(values.type, values),
      order: values.order,
      showInTable: values.showInTable,
      showInForm: values.showInForm,
      isActive: true,
    };
  }

  async function submit(values) {
    if (!selectedTenant) return;
    setServerError("");
    setServerMessage("");
    if (!editingField && basicLimitReached) {
      setServerError(`Basic plan allows up to ${BASIC_FIELD_LIMIT} custom fields. Upgrade to AI Ordering or Full Agent for unlimited custom fields.`);
      return;
    }

    let payload;
    try {
      payload = buildPayload(values);
    } catch (error) {
      setServerError(error.message);
      return;
    }

    try {
      if (editingField) {
        await updateCustomField(selectedTenant.id, editingField.id, {
          label: payload.label,
          required: payload.required,
          options: payload.options,
          defaultValue: payload.defaultValue,
          validation: payload.validation,
          order: payload.order,
          showInTable: payload.showInTable,
          showInForm: payload.showInForm,
          isActive: true,
        });
      } else {
        await createCustomField(selectedTenant.id, payload);
      }
      resetBuilder(values.moduleCode, values.entityType);
      setFilters({ moduleCode: values.moduleCode, entityType: values.entityType });
      await refreshFields();
      await refreshAllFields();
      setServerMessage(editingField ? "Custom field updated." : "Custom field created.");
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Unable to save custom field."));
    }
  }

  function editField(field) {
    setEditingField(field);
    setMode("advanced");
    form.reset({
      moduleCode: field.moduleCode,
      entityType: field.entityType,
      key: field.key,
      label: field.label,
      type: field.type,
      required: Boolean(field.required),
      optionsText: (field.options || []).join(", "),
      defaultValueText: Array.isArray(field.defaultValue) ? field.defaultValue.join(", ") : field.defaultValue ?? "",
      minLength: field.validation?.minLength ?? null,
      maxLength: field.validation?.maxLength ?? null,
      minValue: field.validation?.min ?? null,
      maxValue: field.validation?.max ?? null,
      order: field.order || 1,
      showInTable: Boolean(field.showInTable),
      showInForm: Boolean(field.showInForm),
    });
  }

  async function disableField(fieldId) {
    await deleteCustomField(selectedTenant.id, fieldId);
    await refreshFields();
    await refreshAllFields();
    setServerMessage("Custom field disabled.");
  }

  async function validatePreview() {
    const result = await validateCustomValues(selectedTenant.id, {
      moduleCode: filters.moduleCode,
      entityType: filters.entityType,
      values: previewValues,
    });
    setValidationResult(result);
  }

  async function applyTemplate(template) {
    if (!selectedTenant) return;
    setServerError("");
    setServerMessage("");
    if (isBasicPlan && activeFieldCount + template.fields.length > BASIC_FIELD_LIMIT) {
      setServerError(`Basic plan allows ${BASIC_FIELD_LIMIT} custom fields. Apply smaller templates or upgrade to AI Ordering / Full Agent.`);
      return;
    }

    setIsApplyingTemplate(template.code);
    try {
      let created = 0;
      for (const templateField of template.fields) {
        const moduleCode = templateField.moduleCode;
        const entityType = moduleEntityMap[moduleCode];
        const key = slugifyKey(templateField.label);
        const alreadyExists = allFields.some((field) => field.moduleCode === moduleCode && field.entityType === entityType && field.key === key);
        if (alreadyExists) continue;
        await createCustomField(selectedTenant.id, {
          moduleCode,
          entityType,
          key,
          label: templateField.label,
          type: templateField.type,
          required: Boolean(templateField.required),
          options: templateField.options || [],
          defaultValue: null,
          validation: {},
          showInTable: true,
          showInForm: true,
          order: activeFieldCount + created + 1,
          isActive: true,
        });
        created += 1;
      }
      await refreshFields();
      await refreshAllFields();
      setServerMessage(created ? `${template.label} template applied. ${created} field(s) created.` : `${template.label} fields already exist.`);
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Unable to apply template."));
    } finally {
      setIsApplyingTemplate("");
    }
  }

  const activeFields = useMemo(() => fields.filter((field) => field.isActive), [fields]);
  const previewFields = useMemo(() => {
    if (activeFields.length) return activeFields;
    const values = form.getValues();
    if (!values.label) return [];
    try {
      return [{ id: "draft", ...buildPayload(values), isActive: true }];
    } catch {
      return [{ id: "draft", ...values, key: values.key || "preview_field", options: [], isActive: true }];
    }
  }, [activeFields, watchedLabel, watchedType, watchedModule]);
  const sampleRows = useMemo(() => [validationResult?.values || Object.fromEntries(previewFields.map((field) => [field.key, previewValues[field.key] ?? sampleValueForField(field)]))], [validationResult, previewFields, previewValues]);
  const suggestedTemplate = templateGroups.find((template) => template.code === categorySuggestionCode(selectedTenant)) || templateGroups.at(-1);
  const selectedTypeHelp = fieldTypes.find((type) => type.value === watchedType)?.help;

  if (!selectedTenant) {
    return (
      <BusinessSetupRequired
        feature="Custom Fields"
        description="Collect custom details on storefront checkouts, item listings, and customer profiles — such as sizes, spice levels, table numbers, or prescription requirements."
        icon={Layers}
        image={OWNER_IMAGES.fields}
        previewTitle="Custom Field Capabilities For Your Shop"
        previewItems={[
          { title: "Storefront Checkout Fields", desc: "Collect delivery time slots, gift messages, or table numbers from customers." },
          { title: "Catalog Item Attributes", desc: "Attach clothing sizes, shoe numbers, or spice preferences to menu items." },
          { title: "Cashier POS Till Integration", desc: "Cashiers see and capture required custom fields directly at the checkout till." },
        ]}
      />
    );
  }

  return (
    <section className="space-y-6">
      {/* Cinematic Hero */}
      <OwnerHero
        eyebrow="Workflow & Schema"
        title="Custom Business Fields"
        description="Collect custom details on storefront checkouts, item listings, and customer profiles — such as sizes, spice levels, table numbers, or prescription requirements."
        image={OWNER_IMAGES.fields}
        stats={[
          { label: "Active Fields", value: activeFieldCount },
          { label: "Active Scope", value: titleForTarget(filters.moduleCode) },
          { label: "Field Limit", value: isBasicPlan ? `${activeFieldCount}/${BASIC_FIELD_LIMIT}` : "Unlimited" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetBuilder();
                setActiveTab("builder");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-hero-work shadow-[0_14px_30px_-12px_rgba(3,10,26,0.7)] transition hover:bg-sky-50 active:scale-95"
            >
              <Plus size={14} className="text-brand" />
              <span>Create New Field</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 active:scale-95"
            >
              <Sparkles size={13} />
              <span>Industry Packs</span>
            </button>
          </div>
        }
      />

      {isBasicPlan ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Basic plan includes up to {BASIC_FIELD_LIMIT} active custom fields. You are using {activeFieldCount}. Upgrade to AI Ordering or Full Agent for unlimited templates and fields.
        </div>
      ) : null}
      {serverMessage ? <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700 shadow-sm">{serverMessage}</div> : null}
      {serverError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 shadow-sm">{serverError}</div> : null}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "fields" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <Layers size={13} />
            <span>Existing Fields</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "fields" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {allFields.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!editingField) resetBuilder();
              setActiveTab("builder");
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "builder" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <Plus size={13} />
            <span>{editingField ? `Edit "${editingField.label}"` : "Field Builder"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "templates" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <Sparkles size={13} />
            <span>Templates</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "templates" ? "bg-white/20 text-white" : "bg-blue-100 text-brand"}`}>
              {templateGroups.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "preview" ? "bg-brand text-white shadow-sm" : "bg-surface text-ink hover:bg-slate-100"
            }`}
          >
            <Eye size={13} />
            <span>Live Previews</span>
          </button>
        </div>

        <div className="text-xs text-muted">
          <span>Active in: </span>
          <strong className="text-ink">{titleForTarget(filters.moduleCode)}</strong>
        </div>
      </div>

      {/* Tab 1: Existing Fields */}
      {activeTab === "fields" ? (
        <div className="space-y-6">
          <ExistingFields
            fields={fields}
            filters={filters}
            setFilters={setFilters}
            editField={(field) => {
              editField(field);
              setActiveTab("builder");
            }}
            disableField={disableField}
            resetBuilder={() => {
              resetBuilder();
              setActiveTab("builder");
            }}
            applyTemplate={() => applyTemplate(suggestedTemplate)}
          />
        </div>
      ) : null}

      {/* Tab 2: Field Builder Form */}
      {activeTab === "builder" ? (
        <form className="space-y-6 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" onSubmit={form.handleSubmit(submit)}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <SectionTitle>{editingField ? `Edit Custom Field: ${editingField.label}` : "Create Custom Field"}</SectionTitle>
              <p className="mt-1 text-xs text-muted">Simple mode configures label and type. Advanced mode exposes custom validation rules.</p>
            </div>
            <div className="flex w-fit rounded-xl bg-surface p-1 text-xs">
              <button type="button" className={mode === "simple" ? "rounded-lg bg-white px-3 py-1 font-bold text-ink shadow-sm" : "px-3 py-1 text-muted"} onClick={() => setMode("simple")}>Simple</button>
              <button type="button" className={mode === "advanced" ? "rounded-lg bg-white px-3 py-1 font-bold text-ink shadow-sm" : "px-3 py-1 text-muted"} onClick={() => setMode("advanced")}>Advanced</button>
            </div>
          </div>

          <Field label="Where do you want to add this field?" error={form.formState.errors.moduleCode?.message}>
            <div className="grid gap-3 lg:grid-cols-3">
              {targetOptions.map((target) => (
                <button
                  key={target.moduleCode}
                  type="button"
                  disabled={Boolean(editingField)}
                  onClick={() => {
                    form.setValue("moduleCode", target.moduleCode, { shouldValidate: true });
                    form.setValue("entityType", target.entityType, { shouldValidate: true });
                  }}
                  className={watchedModule === target.moduleCode ? "rounded-xl border-2 border-brand bg-blue-50/50 p-4 text-left shadow-xs" : "rounded-xl border border-line bg-surface p-4 text-left hover:border-brand/50"}
                >
                  <div className="font-bold text-ink text-sm">{target.label}</div>
                  <div className="mt-1.5 text-xs leading-relaxed text-muted">{target.description}</div>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Field label" error={form.formState.errors.label?.message}>
              <input className="form-input text-xs" placeholder="e.g. Spice Level" {...form.register("label")} />
            </Field>
            <Field label="Field type">
              <select className="form-input text-xs" disabled={Boolean(editingField)} {...form.register("type")}>
                {fieldTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {selectedTypeHelp ? <span className="mt-1 block text-xs text-muted">{selectedTypeHelp}</span> : null}
            </Field>
          </div>

          {watchedType === "select" || watchedType === "multi_select" ? (
            <Field label="Options" error={serverError.includes("Options are required") ? serverError : ""}>
              <input className="form-input text-xs" placeholder="Mild, Medium, Hot" {...form.register("optionsText")} />
              <span className="mt-1 block text-xs text-muted">Separate options with commas.</span>
            </Field>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <Check label="Required field" register={form.register("required")} />
            <Check label="Show this field in forms" register={form.register("showInForm")} />
            <Check label="Show this field in tables" register={form.register("showInTable")} />
          </div>

          {mode === "advanced" ? (
            <div className="rounded-xl border border-line bg-surface p-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted">Advanced settings</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Field label="System name" error={form.formState.errors.key?.message}>
                  <input className="form-input text-xs" disabled={Boolean(editingField)} placeholder="spice_level" {...form.register("key")} />
                  <span className="mt-1 block text-xs text-muted">Auto-generated from the label. Used internally by forms and tables.</span>
                </Field>
                <Field label="Where will this field appear?">
                  <input className="form-input bg-white text-xs" readOnly value={moduleEntityMap[watchedModule]} />
                </Field>
                <Field label="Default value">
                  <input className="form-input text-xs" placeholder={watchedType === "boolean" ? "true or false" : watchedType === "multi_select" ? "Mild, Hot" : "Optional default"} {...form.register("defaultValueText")} />
                </Field>
                <Field label="Display order">
                  <input className="form-input text-xs" type="number" min="1" {...form.register("order", { valueAsNumber: true })} />
                </Field>
              </div>
              {watchedType === "text" ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Minimum length">
                    <input className="form-input bg-white text-xs" type="number" min="0" {...form.register("minLength", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Maximum length">
                    <input className="form-input bg-white text-xs" type="number" min="0" {...form.register("maxLength", { valueAsNumber: true })} />
                  </Field>
                </div>
              ) : null}
              {watchedType === "number" ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Minimum value">
                    <input className="form-input bg-white text-xs" type="number" step="0.01" {...form.register("minValue", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Maximum value">
                    <input className="form-input bg-white text-xs" type="number" step="0.01" {...form.register("maxValue", { valueAsNumber: true })} />
                  </Field>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <button className="flex-1 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-95 disabled:opacity-50" disabled={form.formState.isSubmitting || (!editingField && basicLimitReached)}>
              {form.formState.isSubmitting ? "Saving..." : editingField ? "Update Field" : "Create Field"}
            </button>
            <button type="button" className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface" onClick={() => { resetBuilder(); setActiveTab("fields"); }}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {/* Tab 3: Template Groups */}
      {activeTab === "templates" ? (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <SectionTitle>Industry Preset Templates</SectionTitle>
              <p className="mt-1 text-xs text-muted">Apply ready-made fields for your business type. Suggested for your store: <strong className="text-ink">{suggestedTemplate.label}</strong>.</p>
            </div>
            <button type="button" className="rounded-xl border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface" onClick={() => { resetBuilder(); setActiveTab("builder"); }}>
              Create Custom Instead
            </button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {templateGroups.map((template) => (
              <article key={template.code} className={template.code === suggestedTemplate.code ? "flex min-h-[220px] flex-col rounded-2xl border-2 border-brand-200 bg-blue-50/40 p-5 shadow-xs" : "flex min-h-[220px] flex-col rounded-2xl border border-line bg-surface p-5"}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink">{template.label}</h3>
                    <p className="mt-1 text-xs text-muted">{template.hint}</p>
                  </div>
                  {template.code === suggestedTemplate.code ? <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">Suggested</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {template.fields.map((field) => (
                    <span key={field.label} className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-ink ring-1 ring-line">{field.label}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-auto w-full rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
                  disabled={Boolean(isApplyingTemplate)}
                  onClick={async () => {
                    await applyTemplate(template);
                    setActiveTab("fields");
                  }}
                >
                  {isApplyingTemplate === template.code ? "Applying..." : "Use This Template"}
                </button>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {/* Tab 4: Live Previews */}
      {activeTab === "preview" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <SectionTitle>Live Form Preview</SectionTitle>
                <p className="mt-1 text-xs text-muted">How this field appears in the {titleForTarget(filters.moduleCode).toLowerCase()} form.</p>
              </div>
              <button type="button" className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white" onClick={validatePreview}>
                Validate
              </button>
            </div>
            <DynamicForm fields={previewFields} values={previewValues} onChange={setPreviewValues} errors={validationResult?.errors || []} columns="single" />
            {validationResult ? (
              <div className={validationResult.valid ? "mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-700" : "mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"}>
                {validationResult.valid ? "Preview values are valid." : "Preview has validation errors."}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
            <SectionTitle className="mb-2">Table Preview</SectionTitle>
            <p className="mb-4 text-xs text-muted">How selected fields appear in list/table views.</p>
            <DynamicTable fields={previewFields} rows={sampleRows} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ExistingFields({ fields, filters, setFilters, editField, disableField, resetBuilder, applyTemplate }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionTitle>Existing Fields</SectionTitle>
          <p className="mt-1 text-sm text-muted">Active and disabled fields for the selected area.</p>
        </div>
        <select className="form-input sm:w-56" value={filters.moduleCode} onChange={(event) => setFilters({ moduleCode: event.target.value, entityType: moduleEntityMap[event.target.value] })}>
          <option value="customers">Customer fields</option>
          <option value="items">Product / service fields</option>
          <option value="transactions">Order / booking fields</option>
        </select>
      </div>

      {!fields.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-surface p-5">
          <h3 className="font-semibold text-ink">No custom fields yet.</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Add fields like size, color, delivery time, spice level, or prescription required to customize your business workflow.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white" onClick={() => resetBuilder()}>
              Add field manually
            </button>
            <button type="button" className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink" onClick={applyTemplate}>
              Use template
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
            {fields.map((field) => (
              <article key={field.id} className="rounded-xl border border-line bg-white p-4 shadow-card">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">
                        {field.label}{field.required ? <span className="text-red-500"> *</span> : null}
                      </h3>
                      <span className={field.isActive ? "rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"}>
                        {field.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <div className="mt-1 break-all text-xs text-muted">{field.key}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                      <span className="rounded-full bg-surface px-3 py-1">Appears in: {titleForTarget(field.moduleCode)}</span>
                      <span className="rounded-full bg-surface px-3 py-1">Type: {fieldTypes.find((type) => type.value === field.type)?.label || field.type}</span>
                      <span className="rounded-full bg-surface px-3 py-1">{field.showInForm ? "Shown in forms" : "Hidden from forms"}</span>
                      <span className="rounded-full bg-surface px-3 py-1">{field.showInTable ? "Shown in tables" : "Hidden from tables"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {field.isActive ? (
                      <button type="button" className="rounded-xl border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface" onClick={() => editField(field)}>
                        Edit
                      </button>
                    ) : null}
                    {field.isActive ? (
                      <button type="button" className="rounded-xl border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface" onClick={() => disableField(field.id)}>
                        Disable
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-xl border border-red-100 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm("Delete this custom field from active use? Existing saved data will not be removed.")) {
                          disableField(field.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      )}
    </div>
  );
}

function ExampleCard({ title, text }) {
  return (
    <div className="min-h-[118px] rounded-xl border border-line bg-surface p-4">
      <div className="font-semibold text-ink">{title}</div>
      <div className="mt-2 text-sm leading-5 text-muted">{text}</div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function Check({ label, register }) {
  return (
    <label className="flex min-h-[56px] items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm leading-5 text-muted">
      <input type="checkbox" {...register} />
      {label}
    </label>
  );
}
