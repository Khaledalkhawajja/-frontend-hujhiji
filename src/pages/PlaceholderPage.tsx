import { Construction } from "lucide-react";
import { t } from "@/lib/strings";

/** Stand-in for pages that later phases build, so the router and menus can be tried now. */
export function PlaceholderPage({ title, phase }: { title: string; phase: number }) {
  return (
    <section>
      <h1 className="text-[28px] font-bold leading-9">{title}</h1>
      <div className="mt-6 flex items-center gap-3 rounded-card border border-dashed border-border-strong bg-surface p-6 text-ink-2">
        <Construction className="size-5 shrink-0 text-warn" aria-hidden />
        <p>{t.placeholder.comingIn(phase)}</p>
      </div>
    </section>
  );
}
