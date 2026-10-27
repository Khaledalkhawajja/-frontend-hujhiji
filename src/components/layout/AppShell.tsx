import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { t } from "@/lib/strings";
import { NAV_BY_ROLE, type NavGroup } from "@/routes/nav";
import { AccountMenu } from "./AccountMenu";
import { LanguageSwitch } from "./LanguageSwitch";
import { ThemeToggle } from "./ThemeToggle";

function SideNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {groups.map((group, i) => (
        <div key={group.label ?? i} className="mb-2">
          {group.label && (
            <p className="px-3 pb-1.5 pt-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14.5px] font-medium text-ink-2 hover:bg-subtle hover:text-ink",
                  isActive && "bg-brand-tint font-semibold text-brand hover:bg-brand-tint hover:text-brand",
                )
              }
            >
              <item.icon className="size-[18px] shrink-0" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function TopNav({ groups }: { groups: NavGroup[] }) {
  const items = groups.flatMap((g) => g.items);
  return (
    <nav aria-label="Main" className="hidden h-full items-stretch gap-7 md:flex">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex items-center border-b-[3px] border-transparent pt-[3px] text-sm font-semibold text-ink-2 hover:text-ink",
              isActive && "border-brand text-brand hover:text-brand",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Students on phones: bottom tab bar, like an app. */
function BottomTabs({ groups }: { groups: NavGroup[] }) {
  const items = groups.flatMap((g) => g.items);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11.5px] font-semibold text-ink-2",
              isActive && "text-brand",
            )
          }
        >
          <item.icon className="size-5" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * The signed-in layout. Students: top navigation (no sidebar), bottom tabs on phones.
 * Instructors and admins: a sidebar, which becomes a slide-in drawer on small screens.
 */
export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  if (!user) return null;
  const groups = NAV_BY_ROLE[user.type];
  const hasSidebar = user.type !== "STUDENT";

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        {t.shell.skipToContent}
      </a>
      <header className="sticky top-0 z-20 h-16 border-b border-border bg-surface before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brand md:h-[72px]">
        <div className="flex h-full items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex h-full items-center gap-3 md:gap-12">
            {hasSidebar && (
              <button
                type="button"
                className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-subtle lg:hidden"
                aria-label={t.shell.openMenu}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                <Menu className="size-5" aria-hidden />
              </button>
            )}
            <Logo />
            {!hasSidebar && <TopNav groups={groups} />}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <LanguageSwitch />
            <ThemeToggle />
            <span className="hidden h-7 w-px bg-border sm:block" aria-hidden />
            <AccountMenu user={user} />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {hasSidebar && (
          <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] w-64 shrink-0 overflow-y-auto border-e border-border bg-surface px-4 py-5 lg:block">
            <SideNav groups={groups} />
          </aside>
        )}
        {hasSidebar && drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-slate-deep/50"
              aria-label={t.shell.closeMenu}
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute inset-y-0 start-0 w-72 overflow-y-auto bg-surface px-4 py-4 shadow-pop">
              <div className="mb-4 flex items-center justify-between">
                <Logo />
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-subtle"
                  aria-label={t.shell.closeMenu}
                  onClick={() => setDrawerOpen(false)}
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <SideNav groups={groups} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}
        <main
          id="main"
          className={cn(
            "min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8",
            !hasSidebar && "mx-auto w-full max-w-6xl pb-24 md:pb-10",
          )}
        >
          <Outlet />
        </main>
      </div>
      {!hasSidebar && <BottomTabs groups={groups} />}
    </div>
  );
}
