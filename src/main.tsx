import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ApiError } from "@/api/http";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { createAppRouter } from "@/routes/router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry errors the user has to act on (bad input, no permission, not found).
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createAppRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
