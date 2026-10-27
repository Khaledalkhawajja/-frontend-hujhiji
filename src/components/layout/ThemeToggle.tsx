import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { t } from "@/lib/strings";

function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** Light/dark switch. The choice is a per-browser convenience, so localStorage is fine (nothing about auth). */
export function ThemeToggle() {
  const [dark, setDark] = useState(isDark);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private mode: the toggle still works for this visit.
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-10 place-items-center rounded-full bg-page text-ink-2 hover:text-ink"
      aria-label={dark ? t.shell.themeLight : t.shell.themeDark}
      title={dark ? t.shell.themeLight : t.shell.themeDark}
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
