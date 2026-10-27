import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { homePathFor } from "@/routes/paths";
import { t } from "@/lib/strings";

export function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="grid min-h-dvh place-items-center bg-page px-4">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand">404</p>
        <h1 className="mt-2 text-3xl font-bold">{t.notFound.title}</h1>
        <p className="mt-2 text-ink-2">{t.notFound.body}</p>
        <Link
          to={homePathFor(user?.type)}
          className="mt-6 inline-flex h-11 items-center rounded-control bg-brand px-5 text-sm font-semibold text-brand-ink hover:bg-brand-dark"
        >
          {t.notFound.home}
        </Link>
      </div>
    </div>
  );
}
