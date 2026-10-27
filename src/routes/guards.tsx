import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { t } from "@/lib/strings";
import type { UserType } from "@/types/enums";
import { homePathFor } from "./paths";

/** Only logged-in users get through; others go to /login and come back afterwards. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { user, isChecking } = useAuth();
  const location = useLocation();
  if (isChecking) return <FullPageSpinner label={t.auth.checking} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children ? <>{children}</> : <Outlet />;
}

/**
 * Only the listed roles get through. Others are sent to their own home page.
 * The server enforces this anyway (403); hiding it keeps the UI honest.
 */
export function RequireRole({ roles, children }: { roles: UserType[]; children?: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.type)) return <Navigate to={homePathFor(user.type)} replace />;
  return children ? <>{children}</> : <Outlet />;
}

/** For /login and the other public pages: a logged-in user goes straight to their home page. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, isChecking } = useAuth();
  if (isChecking) return <FullPageSpinner label={t.auth.checking} />;
  if (user) return <Navigate to={homePathFor(user.type)} replace />;
  return <>{children}</>;
}

/** "/" sends everyone to the right place. */
export function HomeRedirect() {
  const { user, isChecking } = useAuth();
  if (isChecking) return <FullPageSpinner label={t.auth.checking} />;
  return <Navigate to={homePathFor(user?.type)} replace />;
}
