import {
  BookOpen,
  CalendarDays,
  Camera,
  ClipboardCheck,
  FileBarChart,
  Gauge,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  MessageSquareWarning,
  School,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/strings";
import type { UserType } from "@/types/enums";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match only the exact path (used for index pages). */
  end?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** Menu per role. Students get a top bar (no sidebar); instructors and admins get a sidebar. */
export const NAV_BY_ROLE: Record<UserType, NavGroup[]> = {
  STUDENT: [
    {
      items: [
        { to: "/student", label: t.nav.schedule, icon: CalendarDays, end: true },
        { to: "/student/courses", label: t.nav.myCourses, icon: BookOpen },
        { to: "/student/disputes", label: t.nav.myDisputes, icon: MessageSquareWarning },
      ],
    },
  ],
  INSTRUCTOR: [
    {
      label: t.nav.teaching,
      items: [
        { to: "/instructor", label: t.nav.sections, icon: LayoutGrid, end: true },
        { to: "/instructor/disputes", label: t.nav.disputes, icon: MessageSquareWarning },
      ],
    },
  ],
  ADMIN: [
    { items: [{ to: "/admin", label: t.nav.dashboard, icon: Gauge, end: true }] },
    {
      label: t.nav.people,
      items: [
        { to: "/admin/users", label: t.nav.users, icon: Users },
        { to: "/admin/courses", label: t.nav.courses, icon: BookOpen },
        { to: "/admin/sections", label: t.nav.sectionsAdmin, icon: GraduationCap },
        { to: "/admin/enrollments", label: t.nav.enrollments, icon: ListChecks },
      ],
    },
    {
      label: t.nav.campus,
      items: [
        { to: "/admin/halls", label: t.nav.halls, icon: School },
        { to: "/admin/cameras", label: t.nav.cameras, icon: Camera },
      ],
    },
    {
      label: t.nav.attendanceGroup,
      items: [
        { to: "/admin/attendance", label: t.nav.attendance, icon: ClipboardCheck },
        { to: "/admin/disputes", label: t.nav.disputes, icon: MessageSquareWarning },
        { to: "/admin/reports", label: t.nav.reports, icon: FileBarChart },
      ],
    },
    { label: t.nav.system, items: [{ to: "/admin/university", label: t.nav.university, icon: Settings }] },
  ],
};
