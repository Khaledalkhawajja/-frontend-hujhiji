import { t } from "@/lib/strings";

/** English is the only language for now; Arabic is shown so the place is reserved (layout is RTL-ready). */
export function LanguageSwitch() {
  return (
    <div
      className="hidden rounded-lg bg-slate-tint p-[3px] sm:flex"
      role="group"
      aria-label={t.shell.language}
    >
      <span className="rounded-md bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink shadow-sm">
        English
      </span>
      <span
        className="cursor-not-allowed px-3 py-1.5 text-[13px] font-medium text-ink-muted"
        lang="ar"
        dir="rtl"
        title={t.shell.arabicSoon}
        aria-disabled="true"
      >
        العربية
      </span>
    </div>
  );
}
