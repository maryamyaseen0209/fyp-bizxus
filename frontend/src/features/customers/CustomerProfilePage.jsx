import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Crown,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Receipt,
  ShoppingBag,
  Sparkles,
  Tag,
  UserCheck,
  Users,
} from "lucide-react";

import { DynamicTable } from "../../components/dynamic/DynamicTable.jsx";
import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { getCustomFields } from "../../services/customFieldApi.js";
import { getCustomer } from "../../services/customerApi.js";
import { getApiErrorMessage } from "../../services/apiError.js";

export function CustomerProfilePage() {
  const { customerId } = useParams();
  const { selectedTenant } = useTenant();
  const { hasModule, isLoadingModules } = useModules();
  const customersModuleEnabled = hasModule("customers");
  const [customer, setCustomer] = useState(null);
  const [fields, setFields] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!selectedTenant?.id || !customerId || !customersModuleEnabled) return;
      setIsLoading(true);
      setError("");
      try {
        const [customerData, fieldData] = await Promise.all([
          getCustomer(selectedTenant.id, customerId),
          getCustomFields(selectedTenant.id, { moduleCode: "customers", entityType: "customer" }),
        ]);
        setCustomer(customerData);
        setFields(fieldData.filter((field) => field.isActive));
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load customer profile."));
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [selectedTenant?.id, customerId, customersModuleEnabled]);

  if (!selectedTenant) {
    return (
      <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-card">
        <Users className="mx-auto h-12 w-12 text-muted" />
        <h2 className="mt-4 text-xl font-extrabold text-ink">Customer Profile</h2>
        <p className="mt-1 text-sm text-muted">Create or select a business before viewing customer profiles.</p>
        <Link to="/dashboard/business" className="mt-4 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white">
          Manage Business
        </Link>
      </div>
    );
  }

  if (isLoadingModules) {
    return <div className="text-sm text-muted">Loading customer CRM...</div>;
  }

  if (!customersModuleEnabled) {
    return (
      <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-card">
        <Users className="mx-auto h-12 w-12 text-muted" />
        <h2 className="mt-4 text-xl font-extrabold text-ink">Customers Module Disabled</h2>
        <p className="mt-1 text-sm text-muted">Enable the Customers feature module to access customer profiles.</p>
        <Link to="/dashboard/modules" className="mt-4 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white">
          Enable Feature
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-muted">Loading customer profile...</div>;
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/customers" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline">
          <ArrowLeft size={14} /> Back to customers
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error || "Customer record not found."}
        </div>
      </div>
    );
  }

  const initials = (customer.name || "C")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const phoneDigits = (customer.phone || "").replace(/[^0-9]/g, "");
  const isVip = (customer.segments || []).includes("high_value") || (customer.tags || []).includes("vip");
  const isRepeat = (customer.segments || []).includes("repeat") || (customer.stats?.totalTransactions > 1);

  return (
    <div className="space-y-6">
      {/* 1. BACK NAVIGATION */}
      <div>
        <Link
          to="/dashboard/customers"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-sm transition hover:bg-surface"
        >
          <ArrowLeft size={14} />
          <span>Back to Customers Directory</span>
        </Link>
      </div>

      {/* 2. CINEMATIC PROFILE HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <span className="grid h-16 w-16 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-tr from-brand to-indigo-500 text-xl sm:text-2xl font-black text-white shadow-md">
              {initials}
            </span>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Customer Profile</span>
                {isVip ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-extrabold text-purple-700">
                    <Crown size={11} className="text-amber-500" /> VIP Spender
                  </span>
                ) : isRepeat ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                    <UserCheck size={11} /> Repeat Client
                  </span>
                ) : (
                  <span className="rounded-full bg-surface border border-line px-2 py-0.5 text-[10px] font-bold text-muted">
                    New Customer
                  </span>
                )}
                <span className="rounded-full bg-surface border border-line px-2 py-0.5 text-[10px] font-semibold text-muted capitalize">
                  {customer.status || "active"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">{customer.name}</h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                {customer.phone ? (
                  <span className="font-semibold text-ink">{customer.phone}</span>
                ) : null}
                {customer.email ? (
                  <span className="text-muted">● {customer.email}</span>
                ) : null}
                {customer.address?.city ? (
                  <span className="text-muted">● {customer.address.city}</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Quick Contact Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {phoneDigits ? (
              <a
                href={`https://wa.me/${phoneDigits}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
              >
                <MessageCircle size={15} />
                <span>Chat WhatsApp</span>
              </a>
            ) : null}

            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-ink transition hover:bg-white"
              >
                <Phone size={15} />
                <span>Call Client</span>
              </a>
            ) : null}
          </div>
        </div>

        {/* 3. LIFETIME METRIC STRIP */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 pt-6 border-t border-line">
          <div className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Orders</span>
              <Receipt size={16} className="text-brand" />
            </div>
            <div className="mt-2 text-2xl font-black text-ink">{customer.stats?.totalTransactions || 0}</div>
            <div className="text-[11px] text-muted">Completed transactions</div>
          </div>

          <div className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">Lifetime Spend</span>
              <ShoppingBag size={16} className="text-brand" />
            </div>
            <div className="mt-2 text-2xl font-black text-ink">
              PKR {Number(customer.stats?.totalSpent || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted">Total amount purchased</div>
          </div>

          <div className="col-span-2 sm:col-span-1 flex min-h-[96px] flex-col justify-between rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">Last Activity</span>
              <Calendar size={16} className="text-purple-600" />
            </div>
            <div className="mt-2 text-sm font-bold text-ink truncate">
              {customer.stats?.lastActivityAt
                ? new Date(customer.stats.lastActivityAt).toLocaleDateString()
                : "No recent activity"}
            </div>
            <div className="text-[11px] text-muted">Latest order or interaction</div>
          </div>
        </div>
      </section>

      {/* 4. DETAIL CARDS GRID */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <ProfileCard title="Contact Information" icon={Phone}>
            <InfoRow label="Mobile / WhatsApp" value={customer.phone || "—"} />
            <InfoRow label="Email Address" value={customer.email || "—"} />
            <InfoRow label="Portal User ID" value={customer.customerUserId || "Not linked"} />
          </ProfileCard>

          <ProfileCard title="Delivery & Address" icon={MapPin}>
            <InfoRow label="Address Line" value={customer.address?.line1 || "—"} />
            <InfoRow label="City" value={customer.address?.city || "—"} />
            <InfoRow label="State / Province" value={customer.address?.state || "—"} />
            <InfoRow label="Postal Code" value={customer.address?.postalCode || "—"} />
          </ProfileCard>

          <ProfileCard title="Tags & Loyalty Segments" icon={Tag}>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-muted block mb-1.5">Segments:</span>
                {customer.segments?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {customer.segments.map((segment) => (
                      <span key={segment} className="rounded-lg bg-brand-50 border border-brand-200 px-2 py-0.5 text-xs font-bold text-brand-700 capitalize">
                        {segment.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted/60 italic">No segment assigned</p>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-muted block mb-1.5">Customer Tags:</span>
                {customer.tags?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {customer.tags.map((tag) => (
                      <span key={tag} className="rounded-lg bg-surface border border-line px-2 py-0.5 text-xs font-semibold text-ink">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted/60 italic">No tags assigned</p>
                )}
              </div>
            </div>
          </ProfileCard>
        </div>

        <div>
          <ProfileCard title="Custom CRM Fields" icon={Sparkles}>
            {fields.length ? (
              <DynamicTable fields={fields} rows={[customer.customFields || {}]} />
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-surface p-6 text-center text-xs text-muted">
                No custom CRM fields configured. You can define custom fields in Settings &gt; Custom Fields.
              </div>
            )}
          </ProfileCard>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 border-b border-line pb-3 mb-4">
        {Icon ? <Icon size={16} className="text-brand" /> : null}
        <h3 className="text-sm font-extrabold text-ink">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 pb-2.5 last:border-b-0 last:pb-0">
      <span className="text-xs text-muted font-medium">{label}</span>
      <span className="text-right text-xs font-bold text-ink">{value}</span>
    </div>
  );
}
