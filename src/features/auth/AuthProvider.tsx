import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, setAuthFailureHandler } from "@/api/http";
import * as usersApi from "@/api/users";
import type { User } from "@/types/models";
import { AuthContext, CURRENT_USER_KEY, type AuthContextValue } from "./authContext";

async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await usersApi.getCurrentUser();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
    retry: false,
  });

  // When a refresh fails anywhere, forget the user: the route guards then send them to the login page.
  useEffect(() => {
    setAuthFailureHandler(() => {
      queryClient.setQueryData<User | null>(CURRENT_USER_KEY, null);
    });
    return () => setAuthFailureHandler(null);
  }, [queryClient]);

  const login = useCallback(
    async (input: usersApi.LoginInput) => {
      await usersApi.login(input);
      const user = await usersApi.getCurrentUser();
      queryClient.setQueryData<User | null>(CURRENT_USER_KEY, user);
      return user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await usersApi.logout();
    } finally {
      // Mark as logged out first, then drop every other cached response (they hold personal data).
      queryClient.setQueryData<User | null>(CURRENT_USER_KEY, null);
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== CURRENT_USER_KEY[0] || q.queryKey[1] !== CURRENT_USER_KEY[1],
      });
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user: query.data, isChecking: query.isPending, login, logout }),
    [query.data, query.isPending, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
