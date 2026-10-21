import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  Building2,
  ClipboardCheck,
  CreditCard,
  Crown,
  ExternalLink,
  FileText,
  FileUp,
  Globe,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageCircle,
  MessageSquare,
  Receipt,
  Rocket,
  SendHorizonal,
  Settings2,
  Sparkles,
  SquareStack,
  Store,
  Users,
} from "lucide-react";
import { Shell } from "./Shell.jsx";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";
import { useModules } from "../../context/ModuleContext.jsx";
import { useTenant } from "../../context/TenantContext.jsx";
import { logoutBusiness } from "../../services/authApi.js";

const navItems = [
  // --- Core Business Operations ---
  { to: "/dashboard", label: "Dashboard", end: true, icon: LayoutDashboard, section: "Main" },
  { to: "/dashboard/transactions", label: "Orders & Sales", icon: Receipt, section: "Main" },
  { to: "/dashboard/items", label: "Products & Stock", moduleCode: "items", icon: Boxes, section: "Main" },
  { to: "/dashboard/customers", label: "Customers", moduleCode: "customers", icon: Users, section: "Main" },

  // --- Sales Channels & Storefront ---
  { to: "/dashboard/public-website", label: "Website & Storefront", moduleCode: "website_builder", icon: Globe, section: "Sales Channels" },
  { to: "/dashboard/cashiers", label: "Cashier & POS", moduleCode: "cashier", icon: Store, section: "Sales Channels" },
  { to: "/dashboard/payments", label: "Payments", moduleCode: "payments", icon: CreditCard, section: "Sales Channels" },

  // --- AI & Smart Automation ---
  { to: "/dashboard/whatsapp-agent", label: "WhatsApp Assistant", moduleCode: "whatsapp_agent", icon: MessageCircle, section: "AI & Automation" },
  { to: "/dashboard/ai-conversations", label: "AI Customer Chat", moduleCode: "ai_chat", icon: MessageSquare, section: "AI & Automation" },
  { to: "/dashboard/knowledge-base", label: "Knowledge Base", moduleCode: "ai_chat", icon: FileText, section: "AI & Automation" },
  { to: "/dashboard/owner-agent", label: "Owner Assistant", moduleCode: "owner_agent", icon: Bot, section: "AI & Automation" },
  { to: "/dashboard/agent-tools", label: "Agent Tools", moduleCode: "ai_chat", icon: Sparkles, section: "AI & Automation" },

  // --- Insights & Reports ---
  { to: "/dashboard/analytics", label: "Analytics & Trends", moduleCode: "analytics", icon: BarChart3, section: "Reports & Insights" },
  { to: "/dashboard/reports", label: "Daily Reports", moduleCode: "reports", icon: ClipboardCheck, section: "Reports & Insights" },
  { to: "/dashboard/notifications", label: "Notifications", moduleCode: "notifications", icon: Bell, section: "Reports & Insights" },

  // --- Business Settings & Configuration ---
  { to: "/dashboard/business", label: "Business Profile", icon: Building2, section: "Settings" },
  { to: "/dashboard/modules", label: "Add-on Features", icon: SquareStack, section: "Settings" },
  { to: "/dashboard/custom-fields", label: "Custom Fields", icon: Settings2, section: "Settings" },
  { to: "/dashboard/launch-wizard", label: "Launch Guide", icon: Rocket, section: "Settings" },

  // --- System Audit & Verification (Dedicated for testing, health, and release submission) ---
  { to: "/dashboard/deployment-readiness", label: "System Health", icon: Activity, section: "System & Tools" },
  { to: "/dashboard/final-qa", label: "QA Checklist", icon: ListChecks, section: "System & Tools" },
  { to: "/dashboard/submission-center", label: "Submission Package", icon: SendHorizonal, section: "System & Tools" },
];

const NAV_SECTION_ORDER = ["Main", "Sales Channels", "AI & Automation", "Reports & Insights", "Settings", "System & Tools"];

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  /* Pages that open with their own band and their own heading. The shell's page header and step
     strip only duplicate them. Every route below already renders its own <h1> or hero, so nothing loses its title. */
  const SELF_HEADED_ROUTES = [
    "/dashboard",
    "/dashboard/business",
    "/dashboard/public-website",
    "/dashboard/items",
    "/dashboard/transactions",
    "/dashboard/cashiers",
    "/dashboard/orders/import",
    "/dashboard/customers",
    "/dashboard/payments",
    "/dashboard/whatsapp-agent",
    "/dashboard/ai-conversations",
    "/dashboard/knowledge-base",
    "/dashboard/owner-agent",
    "/dashboard/agent-tools",
    "/dashboard/analytics",
    "/dashboard/reports",
    "/dashboard/notifications",
    "/dashboard/modules",
    "/dashboard/launch-wizard",
    "/dashboard/custom-fields",
    "/dashboard/deployment-readiness",
    "/dashboard/final-qa",
    "/dashboard/submission-center",
  ];
  const pageBringsOwnHeading = SELF_HEADED_ROUTES.includes(location.pathname);
  const { clearSession, refreshSession, user } = useAuth();
  const { tenants, selectedTenant, selectTenant, refreshTenants } = useTenant();
  const { enabledModules, tenantModules, tenantPlan, refreshTenantModules } = useModules();

  useEffect(() => {
    refreshTenants().catch(() => {});
  }, [refreshTenants]);

  useEffect(() => {
    async function syncWorkspace() {
      const currentUser = await refreshSession().catch(() => null);
      if (!currentUser) {
        return;
      }
      await refreshTenants().catch(() => {});
    }

    syncWorkspace().catch(() => {});

    function handleFocus() {
      syncWorkspace().catch(() => {});
    }

    window.addEventListener("focus", handleFocus);
    const intervalId = window.setInterval(() => {
      syncWorkspace().catch(() => {});
    }, 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(intervalId);
    };
  }, [refreshSession, refreshTenants]);

  useEffect(() => {
    refreshTenantModules(selectedTenant?.id).catch(() => {});
  }, [selectedTenant?.id, selectedTenant?.updatedAt, refreshTenantModules]);

  const accessibleModules = tenantModules.length
    ? tenantModules
        .filter((module) => module.tenantStatus === "enabled" && module.planAccess?.isIncluded !== false)
        .map((module) => module.code)
    : enabledModules;
  const websiteIsPublished = selectedTenant?.websiteStatus === "published";
  const visibleNav = navItems.filter((item) => {
    if (websiteIsPublished && item.hideWhenPublished) return false;
    return !item.moduleCode || accessibleModules.includes(item.moduleCode);
  });
  const navSections = NAV_SECTION_ORDER.map((title) => {
    const items = visibleNav.filter((item) => item.section === title);
    const hasActiveItem = items.some((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    );
    return {
      title,
      // Keep section open if it contains the active page OR is 'Main', otherwise collapse to prevent tall scroll overflow
      collapsedByDefault: !hasActiveItem && title !== "Main",
      items,
    };
  }).filter((section) => section.items.length);
  const websiteUrl = selectedTenant?.slug ? `/businesses/${selectedTenant.slug}` : "";

  // Rendered inside the dark rail, clean, compact and easy to switch businesses
  const asideExtra = (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs shadow-inner backdrop-blur-md space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Store &amp; Workspace
        </span>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black ${
          websiteIsPublished ? "text-emerald-400" : "text-amber-400"
        }`}>
          <span className="relative flex h-1.5 w-1.5">
            {websiteIsPublished ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
            )}
          </span>
          {websiteIsPublished ? "LIVE" : "DRAFT"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {tenants.length > 1 ? (
          <select
            className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white outline-none transition focus:border-sky-400 [color-scheme:dark] [&>option]:bg-slate-900 [&>option]:text-white truncate"
            value={selectedTenant?.id || ""}
            onChange={(event) => selectTenant(tenants.find((tenant) => tenant.id === event.target.value) || null)}
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id} className="bg-slate-900 text-white">
                {tenant.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-extrabold text-white truncate max-w-[150px] text-sm">
            {selectedTenant?.name || "My Store"}
          </span>
        )}

        {selectedTenant ? (
          <span className="shrink-0 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-xs">
            {tenantPlan?.displayName || "Free"}
          </span>
        ) : null}
      </div>

      {websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-center text-[11px] font-bold text-white transition hover:bg-white/20 active:scale-95"
        >
          <ExternalLink size={12} className="text-sky-300" />
          <span>{websiteIsPublished ? "View Public Store" : "Preview Store"}</span>
        </a>
      ) : null}
    </div>
  );

  async function handleLogout() {
    try {
      await logoutBusiness();
    } catch {
      // Clear local auth state even if the backend logout request fails.
    }
    clearSession();
    navigate("/login", { replace: true });
  }

  const asideFooter = (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 shadow-sm backdrop-blur-sm">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-xs font-black text-white shadow-xs">
          {(user?.fullName || "U").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-extrabold text-white">{user?.fullName || "Signed in"}</div>
          <div className="truncate text-[10px] font-medium text-slate-400">{user?.email}</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );

  // Determine current active navigation item for the topbar breadcrumb pill
  const activeNavItem = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  ) || navItems[0];
  const ActiveIcon = activeNavItem?.icon || LayoutDashboard;
  const activeSection = activeNavItem?.section || "Main";
  const activeLabel = activeNavItem?.label || "Dashboard";

  const headerCenter = (
    <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
      <div className="group flex items-center gap-2.5 rounded-full border border-blue-200/70 bg-gradient-to-r from-blue-50/80 via-sky-50/60 to-white/90 px-3.5 py-1.5 shadow-xs backdrop-blur-md transition hover:border-brand/40 hover:shadow-sm">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white shadow-xs">
          <ActiveIcon size={13} strokeWidth={2.4} />
        </span>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="hidden font-extrabold uppercase tracking-wider text-muted sm:inline">{activeSection}</span>
          <span className="hidden text-subtle/60 sm:inline font-bold">/</span>
          <span className="font-extrabold text-ink">{activeLabel}</span>
        </div>
      </div>
      {selectedTenant ? (
        <div className="hidden items-center gap-2 rounded-full border border-line/80 bg-white/80 px-3 py-1 text-xs font-bold text-ink shadow-xs backdrop-blur-md lg:inline-flex">
          <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_6px_rgba(37,99,235,0.6)]" />
          <span className="truncate max-w-[150px]">{selectedTenant.name}</span>
        </div>
      ) : null}
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2 sm:gap-3">
      {websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-2 rounded-full border border-line/80 bg-white/90 px-3.5 py-1.5 text-xs font-extrabold text-ink shadow-xs backdrop-blur transition hover:border-brand/40 hover:bg-brand-50 hover:text-brand sm:inline-flex active:scale-95"
          title={websiteIsPublished ? "Open live public storefront in new tab" : "Preview draft storefront"}
        >
          <span className="relative flex h-2.5 w-2.5">
            {websiteIsPublished ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            )}
          </span>
          <span>{websiteIsPublished ? "Live Store" : "Preview Store"}</span>
          <ExternalLink size={13} className="text-muted" />
        </a>
      ) : null}

      <Link
        to="/dashboard/notifications"
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line/80 bg-white/90 text-muted shadow-xs backdrop-blur transition hover:border-brand/40 hover:bg-brand-50 hover:text-brand active:scale-95"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={16} />
        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-white shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
      </Link>

      {selectedTenant ? (
        <span className="hidden items-center gap-1.5 rounded-full border border-blue-200/80 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 px-3 py-1 text-xs font-black text-brand shadow-xs xl:inline-flex">
          <Crown size={13} className="text-amber-500 fill-amber-400" />
          {tenantPlan?.displayName || "Basic Free"}
        </span>
      ) : null}

      <span className="hidden h-7 w-px bg-line/80 sm:block" />

      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-brand to-sky-400 text-sm font-black text-white shadow-sm ring-2 ring-brand/25">
          {(user?.fullName || "U").charAt(0).toUpperCase()}
        </span>
        <div className="hidden min-w-0 leading-tight sm:block">
          <div className="truncate text-sm font-extrabold text-ink">{user?.fullName || "Signed in"}</div>
          <div className="truncate text-[11px] font-semibold text-muted">Business Owner</div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        title="Log out"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line/80 bg-white/90 text-muted shadow-xs backdrop-blur transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-95"
        aria-label="Log out"
      >
        <LogOut size={16} />
      </button>
    </div>
  );

  return (
    <Shell
      theme="owner"
      title="Business Dashboard"
      subtitle={selectedTenant ? selectedTenant.name : "Create your first business"}
      navItems={visibleNav}
      navSections={navSections}
      asideExtra={asideExtra}
      asideFooter={asideFooter}
      headerCenter={headerCenter}
      headerActions={headerActions}
      showSearch={false}
      hidePageHeader={pageBringsOwnHeading}
      flowSteps={
        websiteIsPublished
          ? [
              { label: "View Site", icon: Globe },
              { label: "Catalog", icon: Boxes },
              { label: "Orders", icon: Receipt },
              { label: "Customers", icon: Users },
              { label: "Reports", icon: ClipboardCheck },
            ]
          : [
              { label: "Profile", icon: Building2 },
              { label: "Catalog", icon: Boxes },
              { label: "Website", icon: Globe },
              { label: "Publish", icon: Rocket },
              { label: "Orders", icon: Receipt },
            ]
      }
    />
  );
}
