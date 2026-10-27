import type { UserType } from "@/types/enums";

/** Where each role lands after login. */
export const HOME_BY_ROLE: Record<UserType, string> = {
  STUDENT: "/student",
  INSTRUCTOR: "/instructor",
  ADMIN: "/admin",
};

export function homePathFor(type: UserType | undefined): string {
  return type ? HOME_BY_ROLE[type] : "/login";
}
