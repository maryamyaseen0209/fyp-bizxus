import { ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { BrandLogo } from "../common/BrandLogo.jsx";

// On the dark rail the active item is the brand gradient with its glow; everything else
// sits at --sidebar-text and lifts to white on hover. Inactive rows drift a couple of pixels
// right on hover, which gives the rail a little physicality without moving anything on load.
function navClass({ isActive }, collapsed = false) {
  return [
    "group relative flex items-center rounded-rail text-sm transition-all duration-200",
    collapsed ? "justify-center px-2.5 py-2.5" : "gap-3 px-3.5 py-2.5",
    isActive
      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 font-bold text-white shadow-[0_4px_18px_rgba(37,99,235,0.4)] ring-1 ring-white/15"
      : "font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white",
    collapsed ? "" : "hover:translate-x-0.5",
  ].join(" ");
}

function buildSections(navItems) {
  const grouped = [];
  for (const item of navItems) {
    const title = item.section || "Workspace";
    let section = grouped.find((candidate) => candidate.title === title);
    if (!section) {
      section = { title, items: [] };
      grouped.push(section);
    }
    section.items.push(item);
  }
  return grouped;
}

function NavList({ navItems, navSections, onNavigate, collapsed = false }) {
  const sections = navSections?.length ? navSections : buildSections(navItems);
  return (
    <nav className={collapsed ? "flex flex-col gap-1.5" : "flex flex-col gap-3"}>
      {sections.map((section) => (
        <details
          key={section.title}
          className="group/section"
          open={collapsed || !section.collapsedByDefault}
        >
          <summary
            className={`mb-1 flex cursor-pointer list-none items-center justify-between rounded-rail px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 transition hover:bg-white/[0.06] hover:text-white [&::-webkit-details-marker]:hidden ${
              collapsed ? "sr-only" : ""
            }`}
          >
            <span className="truncate">{section.title}</span>
            <ChevronDown
              size={13}
              className="shrink-0 transition-transform duration-200 group-open/section:rotate-180"
            />
          </summary>
          <div className="flex flex-col gap-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={(state) => navClass(state, collapsed)}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Render-prop children so the active marker can be keyed off real state
                      rather than guessed from a class name. */}
                  {({ isActive }) => (
                    <>
                      {isActive && !collapsed ? (
                        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                      ) : null}
                      <Icon
                        size={18}
                        className={`shrink-0 transition-transform duration-200 ${
                          isActive ? "text-white" : "group-hover:scale-110"
                        }`}
                        strokeWidth={2}
                      />
                      {collapsed ? null : <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </details>
      ))}
    </nav>
  );
}

export function Shell({
  title,
  subtitle,
  navItems,
  navSections = null,
  asideExtra = null,
  asideFooter = null,
  headerCenter = null,
  headerActions = null,
  outletContext = null,
  flowSteps = [],
  theme = "default",
  backgroundImage = null,
  showSearch = true,
  hidePageHeader = false,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Collapsing is driven from the top bar only. The rail used to carry its own "Collapse
  // sidebar" button and, once collapsed, an "Expand sidebar" button of its own — two controls
  // for one piece of state, neither of them visible at the same time, and in a long nav the
  // rail's copy sat below the fold. The top bar is always visible, so it is the only control.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("bizxus_sidebar_collapsed") === "true");
  // Focus mode has no control any more, so it must never start switched on. The saved value is
  // deliberately ignored rather than read and cleared: a user who had enabled it before would
  // otherwise find their sidebar gone for good, with no button left to bring it back. That was a
  // real trap — this state used to be persisted, so simply deleting the button would have
  // stranded anyone who had used it.
  const [focusMode] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  function toggleCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem("bizxus_sidebar_collapsed", String(next));
      return next;
    });
  }

  const themeClass =
    theme === "owner"
      ? "owner-dashboard-theme"
      : theme === "customer"
        ? "customer-portal-theme"
        : theme === "admin"
          ? "admin-portal-theme"
          : "";

  const railContent = (
    <>
      {sidebarCollapsed ? (
        <div className="flex flex-col items-center gap-2 pb-4 pt-1 border-b border-white/[0.08] mb-3">
          <BrandLogo tone="dark" showWordmark={false} imageClassName="h-8 w-8" />
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.12] hover:border-sky-400/40 shadow-xs transition active:scale-95"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-4 pt-1 px-1 border-b border-white/[0.08] mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo tone="dark" showWordmark={false} imageClassName="h-8 w-8 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[1.05rem] font-extrabold tracking-tight text-white truncate">BizXus</span>
                <span className="rounded bg-sky-500/20 border border-sky-400/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-300">
                  AI SaaS
                </span>
              </div>
              <div className="truncate text-[11px] font-medium text-slate-400">Automate & Scale</div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition active:scale-95"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      )}

      <div className="rail-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        <NavList navItems={navItems} navSections={navSections} onNavigate={closeMobileNav} collapsed={sidebarCollapsed} />
      </div>

      {!sidebarCollapsed ? (
        <div className="mt-auto shrink-0 space-y-3 pt-3">
          {asideExtra ? <div className="border-t border-white/[0.08] pt-3">{asideExtra}</div> : null}
          {asideFooter ? <div className="border-t border-white/[0.08] pt-3">{asideFooter}</div> : null}
        </div>
      ) : null}
    </>
  );

  return (
    <div className={`min-h-screen bg-page lg:flex ${themeClass}`}>
      {backgroundImage && (
        <div 
          aria-hidden="true" 
          className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.03]"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      {/* Fixed dark rail on large screens. */}
      {!focusMode ? (
      <aside className={`relative sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#071322] via-[#0b1c30] to-[#050e1a] p-4 shadow-[0_0_40px_rgba(0,0,0,0.45)] border-r border-white/5 transition-all lg:flex ${sidebarCollapsed ? "w-[88px]" : "w-[260px]"}`}>
        {/* Depth for a flat navy panel: a soft glow behind the wordmark and a hairline along the
            top edge. Both are static, so the rail stays calm while the nav itself moves. */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 left-1/2 h-56 w-64 -translate-x-1/2 rounded-full bg-gradient-to-b from-brand/25 to-sky-500/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
        {railContent}
      </aside>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line/80 bg-white/80 backdrop-blur-xl shadow-[0_4px_20px_-4px_rgba(16,22,51,0.06)] transition-all">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent shadow-[0_1px_6px_rgba(37,99,235,0.2)]" />
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-rail border border-line/80 bg-white/90 text-ink shadow-xs backdrop-blur transition hover:bg-surface active:scale-95 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu size={19} />
            </button>


            {/* Search field, custom headerCenter breadcrumb, or spacer */}
            {showSearch ? (
              <div className="relative hidden min-w-0 flex-1 md:block">
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  placeholder="Search anything... (customers, items, transactions, etc.)"
                  aria-label="Search the workspace"
                  className="w-full rounded-full border border-line bg-surface py-2.5 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-slate-400 focus:bg-white focus:shadow-xs"
                />
              </div>
            ) : headerCenter ? (
              <div className="min-w-0 flex-1">{headerCenter}</div>
            ) : (
              <div className="hidden flex-1 md:block" />
            )}

            <div className="min-w-0 flex-1 md:hidden">
              {headerCenter ? null : hidePageHeader ? null : (
                <>
                  <div className="truncate text-base font-bold leading-tight text-ink">{title}</div>
                  <div className="truncate text-xs text-muted">{subtitle}</div>
                </>
              )}
            </div>

            {headerActions ? <div className="flex shrink-0 items-center">{headerActions}</div> : null}
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {/* Pages that open with their own cinematic band carry their own heading, so this block
              is pure duplication there — "Business Dashboard" printed directly above a hero that
              already says what the page is. The step strip is worse than redundant on those pages:
              it advertises View Site / Catalog / Orders regardless of what you are actually doing,
              which on the website builder is simply wrong.

              Scoped by prop rather than removed outright because several owner pages (Analytics,
              the module marketplace) have no heading of their own and would be left titleless. */}
          {hidePageHeader ? null : (
            <>
              <div className="mb-6 hidden md:block">
                <h1 className="text-2xl font-extrabold tracking-tight text-ink lg:text-[1.75rem]">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
              </div>
              {flowSteps.length ? (
                <div className="mb-5 overflow-x-auto rounded-card border border-line bg-white px-3 py-3 shadow-card sm:px-4">
                  <ol className="workflow-strip flex min-w-max items-center gap-5">
                    {flowSteps.map((step, index) => {
                      const Icon = step.icon;
                      return (
                        <li key={step.label} className="workflow-step flex items-center gap-2 pr-1">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-black text-brand">
                            {Icon ? <Icon size={15} strokeWidth={2.4} /> : index + 1}
                          </span>
                          <span className="whitespace-nowrap text-xs font-bold text-muted">
                            <span className="text-ink">{index + 1}.</span> {step.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : null}
            </>
          )}
          {/* Most pages render straight into this panel rather than bringing their own
              card, so the workspace surface stays here rather than in each feature. */}
          <div className="ui-card p-5 sm:p-7">
            <Outlet context={outletContext} />
          </div>
        </main>

        <footer className="border-t border-line bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium">© 2026 BizXusAI. Built as a modern SaaS business platform.</div>
            <div className="flex flex-wrap gap-4 font-semibold uppercase tracking-[0.16em]">
              <span>Automation First</span>
              <span>Pakistan Ready</span>
              <span>Multi-Role Workspace</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile drawer: the same rail, slid in over the content. */}
      <div className={`fixed inset-0 z-40 transition lg:hidden ${mobileNavOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-ink/60 backdrop-blur-md transition-opacity duration-300 ${mobileNavOpen ? "opacity-100" : "opacity-0"}`}
          onClick={closeMobileNav}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-[86vw] max-w-[300px] flex-col bg-gradient-to-b from-[#091a32] via-[#0d2238] to-[#071423] p-4 shadow-rail transition-transform duration-300 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <button
            type="button"
            onClick={closeMobileNav}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-rail text-sidebar-muted transition hover:bg-white/[0.08] hover:text-white active:scale-95"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
          {/* Scrollable, matching the desktop rail. Without this the drawer is a plain
              flex column, so on a short screen (landscape phone, or the business shell with
              its extra cart panel plus footer) the items below the fold became unreachable. */}
          <div className="rail-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <NavList navItems={navItems} navSections={navSections} onNavigate={closeMobileNav} />
            {asideExtra ? <div className="mt-6 border-t border-white/[0.08] pt-5">{asideExtra}</div> : null}
            {asideFooter ? <div className="mt-4 border-t border-white/[0.08] pt-4">{asideFooter}</div> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
