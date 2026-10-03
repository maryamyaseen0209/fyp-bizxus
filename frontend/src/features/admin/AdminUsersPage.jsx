import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, ShieldCheck, UserRound, Users } from "lucide-react";

import { getAdminUsers, updateAdminUser } from "../../services/adminApi.js";
import {
  AdminHero,
  Dialog,
  EmptyRow,
  Notice,
  Panel,
  ROLE_LABELS,
  StatusPill,
  Toolbar,
  ToggleChip,
  USER_STATUS_LABELS,
  humanize,
} from "./adminUi.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

/**
 * Users and roles.
 *
 * Three fixes over the previous version:
 *
 * 1. **`window.confirm` on every role change.** A browser dialog reading "This changes account
 *    access. Continue only if you have verified the user and reason." gave no context about
 *    *which* user or *what* they would become. It is now an in-page dialog naming the person
 *    and the exact change.
 * 2. **`<select>` dropdowns whose only options were `true` and `false`** for email and phone
 *    verification. Those are now labelled toggle chips that read as state.
 * 3. **No search or filter** across the full user list.
 *
 * Role and status badges are derived from a shared tone map, so "Suspended" is always red and
 * "Platform admin" always brand-coloured rather than each page deciding for itself.
 */

const FILTERS = [
  { value: "all", label: "All" },
  { value: "platform_admin", label: "Admins" },
  { value: "suspended", label: "Suspended" },
  { value: "unverified", label: "Unverified" },
];

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    refreshUsers();
  }, []);

  async function refreshUsers() {
    setIsLoading(true);
    try {
      setUsers(await getAdminUsers());
      setError("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load users."));
    } finally {
      setIsLoading(false);
    }
  }

  function replaceUser(updated) {
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  /** Low-risk edits apply immediately; access changes go through the dialog. */
  async function applyPatch(user, patch, { needsConfirm = false } = {}) {
    if (needsConfirm) {
      const nextRole = patch.globalRole;
      const nextStatus = patch.status;
      const changes = [];
      if (nextRole) changes.push(`role ${ROLE_LABELS[user.globalRole]} → ${ROLE_LABELS[nextRole]}`);
      if (nextStatus) changes.push(`status ${USER_STATUS_LABELS[user.status]} → ${USER_STATUS_LABELS[nextStatus]}`);
      setDialog({
        user,
        patch,
        title: `Change access for ${user.fullName || user.email}?`,
        description: `This takes effect immediately: ${changes.join(" and ")}.`,
        confirmLabel: "Apply change",
      });
      return;
    }
    setBusyKey(user.id);
    setError("");
    setMessage("");
    try {
      replaceUser(await updateAdminUser(user.id, patch));
      setMessage(`${user.fullName || user.email} updated.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update user."));
    } finally {
      setBusyKey("");
    }
  }

  async function confirmAccessChange() {
    if (!dialog) return;
    const { user, patch } = dialog;
    setBusyKey(user.id);
    setError("");
    setMessage("");
    try {
      replaceUser(await updateAdminUser(user.id, patch));
      setMessage(`${user.fullName || user.email} updated.`);
      setDialog(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update user."));
    } finally {
      setBusyKey("");
    }
  }

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      if (filter === "platform_admin" && user.globalRole !== "platform_admin") return false;
      if (filter === "suspended" && user.status !== "suspended") return false;
      if (filter === "unverified" && user.isEmailVerified && user.isPhoneVerified) return false;
      if (!term) return true;
      return [user.fullName, user.email, user.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [users, search, filter]);

  const admins = users.filter((u) => u.globalRole === "platform_admin").length;
  const suspended = users.filter((u) => u.status === "suspended").length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const unverified = users.filter((u) => !u.isEmailVerified || !u.isPhoneVerified).length;

  return (
    <div className="space-y-6">
      <AdminHero
        skin="users"
        eyebrow="Accounts"
        title="Users & roles"
        icon={Users}
        description="Check account health, tell customers apart from business owners, and grant admin access only when it is warranted."
        stats={[
          { label: "Total accounts", value: users.length, hint: `${activeUsers} active`, icon: UserRound },
          { label: "Platform admins", value: admins, hint: admins ? "Review periodically" : "None yet", icon: ShieldCheck, tone: "approve" },
          { label: "Unverified", value: unverified, hint: "Email or phone not confirmed", icon: ShieldAlert, tone: unverified ? "pending" : "approve" },
          { label: "Suspended", value: suspended, hint: suspended ? "Access blocked" : "None suspended", icon: ShieldAlert, tone: suspended ? "danger" : "approve" },
        ]}
      />

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Panel title="Directory" icon={Users} description="Search by name, email, or phone." lift>
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search users"
          filters={FILTERS}
          activeFilter={filter}
          onFilterChange={setFilter}
          resultLabel={`${visibleUsers.length} of ${users.length}`}
        />

        <div className="space-y-3">
          {visibleUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              busy={busyKey === user.id}
              onPatch={applyPatch}
            />
          ))}
          {!visibleUsers.length && !isLoading ? (
            <EmptyRow>{users.length ? "No users match that search." : "No users yet."}</EmptyRow>
          ) : null}
        </div>
      </Panel>

      <Dialog
        open={Boolean(dialog)}
        title={dialog?.title}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel}
        tone="danger"
        busy={busyKey === dialog?.user?.id}
        onCancel={() => setDialog(null)}
        onConfirm={confirmAccessChange}
      />
    </div>
  );
}

function UserRow({ user, busy, onPatch }) {
  const displayName = user.fullName || "Unnamed user";

  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">
            <UserRound size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-ink">{displayName}</h3>
              <StatusPill value={user.status} labels={USER_STATUS_LABELS} />
              {user.globalRole === "platform_admin" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand ring-1 ring-brand-200">
                  <ShieldCheck size={11} />
                  Platform admin
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
            <p className="mt-0.5 truncate text-[11px] text-subtle">
              {humanize(user.accountType, "User")}
              {user.ownedTenantCount ? ` · owns ${user.ownedTenantCount} ${user.ownedTenantCount === 1 ? "business" : "businesses"}` : ""}
              {" · "}last seen {formatDate(user.lastLoginAt, "never")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-line-soft pt-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle">Role</span>
          <select
            className="form-input"
            value={user.globalRole}
            disabled={busy}
            onChange={(event) => onPatch(user, { globalRole: event.target.value }, { needsConfirm: true })}
          >
            <option value="user">Standard user</option>
            <option value="platform_admin">Platform admin</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle">Status</span>
          <select
            className="form-input"
            value={user.status}
            disabled={busy}
            onChange={(event) => onPatch(user, { status: event.target.value }, { needsConfirm: true })}
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle">Email</span>
          <ToggleChip
            on={Boolean(user.isEmailVerified)}
            onLabel="Email verified"
            offLabel="Verify email"
            busy={busy}
            onToggle={() => onPatch(user, { isEmailVerified: !user.isEmailVerified })}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle">Phone</span>
          <ToggleChip
            on={Boolean(user.isPhoneVerified)}
            onLabel="Phone verified"
            offLabel="Verify phone"
            busy={busy}
            onToggle={() => onPatch(user, { isPhoneVerified: !user.isPhoneVerified })}
          />
        </div>
      </div>
    </article>
  );
}

function formatDate(value, fallback = "n/a") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}