import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { t } from "@/lib/strings";
import { HomeRedirect, RedirectIfAuthenticated, RequireAuth, RequireRole } from "./guards";

const page = (title: string, phase: number) => <PlaceholderPage title={title} phase={phase} />;
const publicPage = (title: string) => (
  <RedirectIfAuthenticated>
    <AuthLayout>{page(title, 1)}</AuthLayout>
  </RedirectIfAuthenticated>
);

export const routes: RouteObject[] = [
  { path: "/", element: <HomeRedirect /> },
  {
    path: "/login",
    element: (
      <RedirectIfAuthenticated>
        <LoginPage />
      </RedirectIfAuthenticated>
    ),
  },
  // Emailed links point here: <APP_URL>/activate?token=… and <APP_URL>/reset-password?token=… (built in Phase 1).
  { path: "/forgot-password", element: publicPage("Reset your password") },
  { path: "/reset-password", element: publicPage("Choose a new password") },
  { path: "/activate", element: publicPage("Activate your account") },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/student",
            element: <RequireRole roles={["STUDENT"]} />,
            children: [
              { index: true, element: page(t.nav.schedule, 2) },
              { path: "courses", element: page(t.nav.myCourses, 2) },
              { path: "courses/:sectionId", element: page("Course attendance", 2) },
              { path: "disputes", element: page(t.nav.myDisputes, 2) },
              { path: "profile", element: page(t.nav.profile, 1) },
            ],
          },
          {
            path: "/instructor",
            element: <RequireRole roles={["INSTRUCTOR"]} />,
            children: [
              { index: true, element: page(t.nav.sections, 3) },
              { path: "sections/:sectionId", element: page("Section", 3) },
              { path: "lectures/:attendanceId", element: page("Lecture", 3) },
              { path: "disputes", element: page(t.nav.disputes, 3) },
              { path: "profile", element: page(t.nav.profile, 1) },
            ],
          },
          {
            path: "/admin",
            element: <RequireRole roles={["ADMIN"]} />,
            children: [
              { index: true, element: page(t.nav.dashboard, 4) },
              { path: "users", element: page(t.nav.users, 4) },
              { path: "courses", element: page(t.nav.courses, 4) },
              { path: "sections", element: page(t.nav.sectionsAdmin, 4) },
              { path: "enrollments", element: page(t.nav.enrollments, 4) },
              { path: "halls", element: page(t.nav.halls, 4) },
              { path: "cameras", element: page(t.nav.cameras, 4) },
              { path: "attendance", element: page(t.nav.attendance, 4) },
              { path: "disputes", element: page(t.nav.disputes, 4) },
              { path: "reports", element: page(t.nav.reports, 4) },
              { path: "university", element: page(t.nav.university, 4) },
              { path: "profile", element: page(t.nav.profile, 1) },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];

export const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const;

export const createAppRouter = () => createBrowserRouter(routes, { future: ROUTER_FUTURE });
