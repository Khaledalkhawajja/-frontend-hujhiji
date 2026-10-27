import { ScanFace } from "lucide-react";
import { t } from "@/lib/strings";
import { cn } from "@/lib/cn";

/** App mark + wordmark. The university seal will replace the mark when we have the file. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="grid size-9 place-items-center rounded-[10px] bg-brand text-brand-ink" aria-hidden>
        <ScanFace className="size-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-wide text-brand">{t.appName}</span>
          <span className="block text-xs text-ink-2">{t.appTagline}</span>
        </span>
      )}
    </span>
  );
}
