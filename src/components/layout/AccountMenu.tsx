import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { apiAssetUrl } from "@/lib/env";
import { t } from "@/lib/strings";
import type { User } from "@/types/models";
import { homePathFor } from "@/routes/paths";

function initials(user: User): string {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}

export function Avatar({ user, size = 36 }: { user: User; size?: number }) {
  const [broken, setBroken] = useState(false);
  const src = apiAssetUrl(user.avatar);
  const style = { width: size, height: size };
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        style={style}
        className="rounded-full object-cover"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      style={style}
      className="grid place-items-center rounded-full bg-brand-tint text-xs font-semibold text-brand"
    >
      {initials(user)}
    </span>
  );
}

export function AccountMenu({ user }: { user: User }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-full py-1 pe-2 ps-1 hover:bg-page"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t.shell.accountMenu}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar user={user} />
        <span className="hidden text-start leading-tight md:block">
          <span className="block text-sm font-semibold">
            {user.firstName} {user.lastName}
          </span>
          <span className="block text-xs text-ink-2">{t.roles[user.type]}</span>
        </span>
        <ChevronDown className="size-4 text-ink-2" aria-hidden />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 top-[calc(100%+8px)] z-30 w-72 rounded-xl border border-border bg-surface py-1.5 shadow-pop"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-2">
            <Avatar user={user} size={42} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-ink-2">{user.email}</p>
            </div>
          </div>
          <Link
            role="menuitem"
            to={`${homePathFor(user.type)}/profile`}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-subtle"
            onClick={() => setOpen(false)}
          >
            <UserRound className="size-4 text-ink-2" aria-hidden />
            {t.nav.profile}
          </Link>
          <div className="my-1 h-px bg-border" />
          <button
            role="menuitem"
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-bad hover:bg-bad-tint"
            onClick={onLogout}
          >
            <LogOut className="size-4" aria-hidden />
            {t.shell.logout}
          </button>
        </div>
      )}
    </div>
  );
}
