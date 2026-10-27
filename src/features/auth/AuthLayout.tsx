import type { ReactNode } from "react";
import { Camera, ClipboardCheck, Images } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const POINTS = [
  { icon: Camera, text: "Cameras record attendance during every lecture" },
  { icon: ClipboardCheck, text: "Students check their record and dispute absences" },
  { icon: Images, text: "Instructors review disputes with session photos" },
];

/** Split layout for login, activation and password pages: maroon panel on the left, form on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-page">
      <aside className="relative hidden w-[42%] max-w-[600px] flex-col justify-between overflow-hidden bg-brand p-16 text-white dark:bg-[#5a1218] lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-white text-xs font-semibold text-[#8B1E26]">
            AUM
          </span>
          <span className="text-2xl font-semibold tracking-[0.2em]">AI CLASSROOM</span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/75">
            Smart classroom attendance
          </p>
          <h2 className="mt-4 text-[40px] font-bold leading-[48px]">
            Attendance, recorded by the classroom.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-white/80">
            Cameras in each lecture hall check who is in the room, so nobody has to call the roll.
          </p>
          <ul className="mt-6 space-y-3.5">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5">
                <span className="grid size-9 place-items-center rounded-lg bg-black/20">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[13px] text-white/75">Faculty of Information Technology · AUM</p>
        <span
          className="pointer-events-none absolute -bottom-40 -end-40 size-[520px] rounded-full border-2 border-white/10"
          aria-hidden
        />
      </aside>
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-12 sm:py-8">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>
        <main className="flex flex-1 items-center justify-center py-8">{children}</main>
        <p className="text-center text-[13px] text-ink-muted">
          © 2026 AUM · Need help logging in? Contact IT support.
        </p>
      </div>
    </div>
  );
}
