import { createContext } from "react";
import type { LoginInput } from "@/api/users";
import type { User } from "@/types/models";

export const CURRENT_USER_KEY = ["users", "current"] as const;

export interface AuthContextValue {
  /** null = not logged in; undefined = still checking. */
  user: User | null | undefined;
  isChecking: boolean;
  login: (input: LoginInput) => Promise<User>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
