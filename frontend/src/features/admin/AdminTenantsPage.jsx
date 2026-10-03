import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import {
  decideAdminPackageRequest,
  decideAdminWebsiteRequest,
  getAdminTenants,
  updateAdminTenant,
} from "../../services/adminApi.js";
import { getAdminBusinessCategories } from "../../services/businessCategoryApi.js";
import {
  AdminHero,
  ApproveButton,
  Dialog,
  EmptyRow,
  Field,
  Notice,
  Panel,
  ProgressMeter,
  RejectButton,
  StatusPill,
  TENANT_STATUS_LABELS,
  Toolbar,
  WEBSITE_STATUS_LABELS,
  planLabel,
} from "./adminUi.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

/**
 * Business review, approvals, and per-business settings.
 *
 * The previous version of this page had three structural problems:
 *
 * 1. **Every decision was available twice.** The package-upgrade queue rendered Approve and
 *    Reject, and then each tenant's "request history" block rendered Approve and Reject again
 *    for the very same pending request. Two identical buttons for one action is a trap. All
 *    decisions now live in the queue at the top; the per-business history is read-only.
 * 2. **Five live dropdowns per business, always open.** A change to any of them wrote to the
 *    API on selection with no confirmation, so simply scrolling the page sat next to hundreds
 *    of controls that could fire a request. Editing is now behind an explicit "Edit" toggle,
 *    which leaves the default view a calm, scannable list.
 * 3. **No way to find anything.** The page showed a Filter icon beside the static words "All
 *    businesses", implying a filter that did not exist. There is now a real search box and
 *    status filter, with a live result count.
 *
 * `window.prompt` for the approval note is replaced by `Dialog`, which keeps the business
 * name and the decision on screen while asking, and cannot be dismissed by accident.
 */

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Awaiting review" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export function AdminTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    refreshPage();
  }, []);

  async function refreshPage() {
    setIsLoading(true);
    try {
      const [tenantRows, categoryRows] = await Promise.all([getAdminTenants(), getAdminBusinessCategories()]);
      setTenants(tenantRows);
      setCategories(categoryRows);
      setError("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load businesses."));
    } finally {
      setIsLoading(false);
    }
  }

  function replaceTenant(updated) {
    setTenants((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function saveTenant(tenant, patch) {
    setBusyKey(`tenant:${tenant.id}`);
    setError("");
    setMessage("");
    try {
      const updated = await updateAdminTenant(tenant.id, patch);
      replaceTenant(updated);
      setMessage(`${updated.name} updated.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update business."));
    } finally {
      setBusyKey("");
    }
  }

  async function confirmDialog(note) {
    if (!dialog) return;
    const { kind, tenant, request, status } = dialog;
    const key = kind === "website" ? `website:${tenant.id}` : `package:${tenant.id}:${request.planCode}`;
    setBusyKey(key);
    setError("");
    setMessage("");
    try {
      const updated =
        kind === "website"
          ? await decideAdminWebsiteRequest(tenant.id, { status, note })
          : await decideAdminPackageRequest(tenant.id, request.planCode, { status, note });
      replaceTenant(updated);
      setMessage(
        kind === "website"
          ? `${updated.name} ${status === "approved" ? "published" : "rejected"}.`
          : `${request.profileName || request.planName} ${status} for ${updated.name}.`,
      );
      setDialog(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "That decision could not be saved."));
    } finally {
      setBusyKey("");
    }
  }

  const pendingWebsiteRequests = useMemo(
    () => tenants.filter((t) => t.websiteApprovalStatus === "pending" || t.websiteStatus === "pending_review"),
    [tenants],
  );
  const pendingRequests = useMemo(
    () =>
      tenants.flatMap((tenant) =>
        (tenant.upgradeRequests || [])
          .filter((request) => request.status === "pending_approval")
          .map((request) => ({ tenant, request })),
      ),
    [tenants],
  );
  const publishedCount = tenants.filter((t) => t.websiteStatus === "published").length;
  const activeCount = tenants.filter((t) => t.status === "active").length;

  const visibleTenants = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      if (filter === "pending" && !(tenant.websiteApprovalStatus === "pending" || tenant.websiteStatus === "pending_review")) return false;
      if (filter === "published" && tenant.websiteStatus !== "published") return false;
      if (filter === "draft" && tenant.status !== "draft") return false;
      if (filter === "archived" && tenant.status !== "archived") return false;
      if (!term) return true;
      return [tenant.name, tenant.slug, tenant.owner?.fullName, tenant.owner?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [tenants, search, filter]);

  const queueCount = pendingWebsiteRequests.length + pendingRequests.length;

  return (
    <div className="space-y-6">
      <AdminHero
        skin="businesses"
        eyebrow="Review queue"
        title="Businesses"
        icon={Boxes}
        description={
          queueCount
            ? `${queueCount} ${queueCount === 1 ? "decision needs" : "decisions need"} you. Everything else can wait.`
            : "Nothing is waiting for your decision."
        }
        stats={[
          { label: "Businesses", value: tenants.length, hint: `${activeCount} active`, icon: Boxes },
          { label: "Awaiting review", value: pendingWebsiteRequests.length, hint: pendingWebsiteRequests.length ? "Needs your decision" : "Queue is clear", icon: ClipboardCheck, tone: pendingWebsiteRequests.length ? "pending" : "approve" },
          { label: "Published", value: publishedCount, hint: "Live storefronts", icon: ShieldCheck, tone: "approve" },
          { label: "Upgrades", value: pendingRequests.length, hint: pendingRequests.length ? "Paid plans to confirm" : "None waiting", icon: CreditCard, tone: pendingRequests.length ? "pending" : "approve" },
        ]}
      />

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* ---------------------------------------------------------- queue -- */}
<Panel
        lift
        title="Website approval"
        description="Approve only businesses that completed their profile, contact details, location, template, and have at least one public item."
        icon={ClipboardCheck}
        count={pendingWebsiteRequests.length}
      >
        <div className="space-y-3">
          {pendingWebsiteRequests.map((tenant) => {
            const criteria = tenant.websiteApprovalCriteria || {};
            const checks = criteria.checks || [];
            const passed = checks.filter((c) => c.passed).length;
            const total = criteria.total ?? checks.length;
            const busy = busyKey === `website:${tenant.id}`;
            return (
              <article key={`${tenant.id}-website`} className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
<div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-ink">{tenant.name}</h3>
                  </div>
                  <div className="mt-1 text-sm text-muted">
                    {tenant.owner?.fullName || "Unknown owner"}
                    {tenant.owner?.email ? ` · ${tenant.owner.email}` : ""}
                  </div>
                  <div className="mt-0.5 text-xs text-subtle">
                    Requested {formatDate(tenant.websiteApprovalRequestedAt)}
                  </div>

                  {/* The meter answers "how close is this to publishable?" before the reviewer
                      reads any checklist item, and turns red-to-green with the score. */}
                  {checks.length ? <ProgressMeter passed={passed} total={total} className="mt-4 max-w-md" /> : null}

                    {checks.length ? (
                      <ul className="mt-3 grid gap-2 md:grid-cols-2">
                        {checks.map((check) => (
                          <li
                            key={check.key}
                            className={`flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-xs ring-1 ${check.passed ? "text-approve-700 ring-approve-200" : "text-red-700 ring-red-200"}`}
                          >
                            {check.passed ? (
                              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                            ) : (
                              <span className="mt-0.5 shrink-0 font-black">!</span>
                            )}
                            <span>
                              <span className="font-bold">{check.passed ? "Pass" : "Missing"}:</span> {check.label}
                              {check.message ? <span className="mt-0.5 block opacity-75">{check.message}</span> : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {tenant.websiteApprovalNote ? (
                      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-muted ring-1 ring-line">
                        <span className="font-bold text-ink">Last note:</span> {tenant.websiteApprovalNote}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {tenant.slug ? (
                      <Link
                        to={`/businesses/${tenant.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-bold text-ink transition hover:bg-surface"
                      >
                        <ExternalLink size={15} />
                        Preview
                      </Link>
                    ) : null}
                    <ApproveButton
                      label="Approve & publish"
                      busy={busy}
                      onClick={() =>
                        setDialog({
                          kind: "website",
                          tenant,
                          status: "approved",
                          title: `Publish ${tenant.name}?`,
                          description: "Their storefront goes live immediately and customers can start ordering.",
                          confirmLabel: "Approve & publish",
                          noteLabel: "Note for the owner (optional)",
                          notePlaceholder: "Approved. Business details and website setup are complete.",
                        })
                      }
                    />
                    <RejectButton
                      busy={busy}
                      onClick={() =>
                        setDialog({
                          kind: "website",
                          tenant,
                          status: "rejected",
                          title: `Reject ${tenant.name}?`,
                          description: "The owner will see your reason and can fix the missing items and re-apply.",
                          confirmLabel: "Reject request",
                          noteLabel: "Reason (shown to the owner)",
                          notePlaceholder: "Add a contact number and at least one product, then re-apply.",
                          tone: "danger",
                        })
                      }
                    />
                  </div>
                </div>
              </article>
            );
          })}
          {!pendingWebsiteRequests.length ? (
            <EmptyRow>
              <CheckCircle2 size={18} className="mx-auto mb-2 text-approve-500" />
              No website requests are waiting.
            </EmptyRow>
          ) : null}
        </div>
      </Panel>

      <Panel
        title="Package upgrades"
        description="Approve a paid package only after payment is confirmed, or for an admin-granted demo."
        icon={CreditCard}
        count={pendingRequests.length}
        lift
      >
        <div className="space-y-3">
          {pendingRequests.map(({ tenant, request }) => {
            const busy = busyKey === `package:${tenant.id}:${request.planCode}`;
            return (
              <article key={`${tenant.id}-${request.planCode}`} className="flex flex-col gap-4 rounded-xl border border-line p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-ink">
                    {tenant.name} → {request.profileName || planLabel(request.planCode)}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {tenant.owner?.fullName || "Unknown owner"} · requested {formatDate(request.requestedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <ApproveButton
                    busy={busy}
                    onClick={() =>
                      setDialog({
                        kind: "package",
                        tenant,
                        request,
                        status: "approved",
                        title: `Approve ${request.profileName || planLabel(request.planCode)} for ${tenant.name}?`,
                        description: "Their plan changes immediately and the new modules become available.",
                        confirmLabel: "Approve upgrade",
                        noteLabel: "Internal note (optional)",
                        notePlaceholder: "Payment confirmed.",
                      })
                    }
                  />
                  <RejectButton
                    busy={busy}
                    onClick={() =>
                      setDialog({
                        kind: "package",
                        tenant,
                        request,
                        status: "rejected",
                        title: `Reject the upgrade for ${tenant.name}?`,
                        description: "The owner stays on their current plan.",
                        confirmLabel: "Reject upgrade",
                        noteLabel: "Reason (optional)",
                        notePlaceholder: "Payment not confirmed.",
                        tone: "danger",
                      })
                    }
                  />
                </div>
              </article>
            );
          })}
          {!pendingRequests.length ? <EmptyRow>No upgrade requests are waiting.</EmptyRow> : null}
        </div>
      </Panel>

      {/* ----------------------------------------------------- directory -- */}
      <Panel
        lift
        title="All businesses"
        description="Read-only by default. Open Edit to change status, plan, visibility, or category."
        icon={LayoutDashboard}
        actions={
          tenants.length ? (
            <Link to="/admin/reports" className="text-xs font-bold text-brand hover:underline">
              Platform reports
            </Link>
          ) : null
        }
      >
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search name, slug, or owner"
          filters={FILTERS}
          activeFilter={filter}
          onFilterChange={setFilter}
          resultLabel={`${visibleTenants.length} of ${tenants.length}`}
        />

        <div className="space-y-3">
          {visibleTenants.map((tenant) => (
            <TenantRow
              key={tenant.id}
              tenant={tenant}
              categories={categories}
              busy={busyKey === `tenant:${tenant.id}`}
              isEditing={editingId === tenant.id}
              onToggleEdit={() => setEditingId((current) => (current === tenant.id ? "" : tenant.id))}
              onSave={(patch) => saveTenant(tenant, patch)}
            />
          ))}
          {!visibleTenants.length && !isLoading ? (
            <EmptyRow>{tenants.length ? "No businesses match that search." : "No businesses yet."}</EmptyRow>
          ) : null}
        </div>
      </Panel>

      <Dialog
        open={Boolean(dialog)}
        title={dialog?.title}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel}
        noteLabel={dialog?.noteLabel}
        notePlaceholder={dialog?.notePlaceholder}
        withNote
        tone={dialog?.tone || "approve"}
        busy={busyKey.startsWith("website:") || busyKey.startsWith("package:")}
        onCancel={() => setDialog(null)}
        onConfirm={confirmDialog}
      />
    </div>
  );
}

/**
 * One business. Collapsed it shows what matters — name, owner, plan, status. The five
 * settings selects only exist while this row is being edited.
 */
function TenantRow({ tenant, categories, busy, isEditing, onToggleEdit, onSave }) {
  return (
    <article className={`rounded-xl border bg-white transition ${isEditing ? "border-brand-300 shadow-lift" : "border-line"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-ink">{tenant.name}</h3>
            <StatusPill value={tenant.status} labels={TENANT_STATUS_LABELS} />
            <StatusPill value={tenant.websiteStatus} labels={WEBSITE_STATUS_LABELS} />
            {tenant.pendingUpgradeCount ? (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700 ring-1 ring-orange-200">
                {tenant.pendingUpgradeCount} upgrade pending
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-muted">
            {tenant.owner?.fullName || "No owner"}
            {tenant.slug ? ` · /${tenant.slug}` : ""} · {planLabel(tenant.settings?.planCode)}
            {tenant.settings?.publicVisibility === false ? " · hidden" : " · public"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {tenant.slug ? (
            <Link
              to={`/businesses/${tenant.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-muted transition hover:bg-surface hover:text-brand"
            >
              <ExternalLink size={13} />
              View site
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onToggleEdit}
            aria-expanded={isEditing}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
              isEditing ? "bg-brand text-white" : "text-muted hover:bg-surface hover:text-brand"
            }`}
          >
            <Pencil size={13} />
            {isEditing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="grid gap-4 border-t border-line-soft bg-surface p-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Status" hint="Draft businesses are hidden from customers.">
            <select className="form-input" value={tenant.status || "draft"} disabled={busy} onChange={(e) => onSave({ status: e.target.value })}>
              {Object.entries(TENANT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="Website" hint="Set by the approval flow; change only to override.">
            <select className="form-input" value={tenant.websiteStatus || "not_generated"} disabled={busy} onChange={(e) => onSave({ websiteStatus: e.target.value })}>
              {Object.entries(WEBSITE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="Plan">
            <select
              className="form-input"
              value={tenant.settings?.planCode || "starter"}
              disabled={busy}
              onChange={(e) => onSave({ settings: { ...(tenant.settings || {}), planCode: e.target.value } })}
            >
              <option value="starter">Basic</option>
              <option value="growth">AI Ordering</option>
              <option value="scale">Full Agent</option>
            </select>
          </Field>

          <Field label="Public visibility" hint="Off keeps the storefront unlisted.">
            <select
              className="form-input"
              value={String(tenant.settings?.publicVisibility ?? true)}
              disabled={busy}
              onChange={(e) => onSave({ settings: { ...(tenant.settings || {}), publicVisibility: e.target.value === "true" } })}
            >
              <option value="true">Visible</option>
              <option value="false">Hidden</option>
            </select>
          </Field>

          <Field label="Category">
            <select className="form-input" value={tenant.businessCategoryId || ""} disabled={busy} onChange={(e) => onSave({ businessCategoryId: e.target.value || null })}>
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      {/* Read-only history: the approve/reject buttons that used to sit here now live once,
          in the upgrade queue above, so one request can no longer be actioned twice. */}
      {tenant.upgradeRequests?.length ? (
        <details className="group border-t border-line-soft">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-xs font-bold text-muted transition hover:text-brand [&::-webkit-details-marker]:hidden">
            <span>
              {tenant.upgradeRequests.length} package {tenant.upgradeRequests.length === 1 ? "request" : "requests"} on record
            </span>
            <span className="text-[11px] font-semibold text-subtle group-open:hidden">Show</span>
            <span className="hidden text-[11px] font-semibold text-subtle group-open:inline">Hide</span>
          </summary>
          <ul className="space-y-2 px-4 pb-4">
            {tenant.upgradeRequests.map((request) => (
              <li key={`${request.planCode}-${request.requestedAt || request.status}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs">
                <span className="min-w-0">
                  <span className="font-bold text-ink">{request.profileName || planLabel(request.planCode)}</span>
                  <span className="ml-2 text-muted">{formatDate(request.requestedAt)}</span>
                  {request.decisionNote ? <span className="mt-0.5 block text-[11px] text-subtle">{request.decisionNote}</span> : null}
                </span>
                <StatusPill value={request.status} labels={{ pending_approval: "Awaiting decision" }} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

/* ---------------------------------------------------------------- parts -- */

function formatDate(value) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}