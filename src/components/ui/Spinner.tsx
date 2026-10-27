import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-ink-2", className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-page">
      <Spinner label={label} />
    </div>
  );
}
