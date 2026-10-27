// Data model, matching docs/FRONTEND_GUIDE.md section 5 and the shapes in section 6.
// IDs are MongoDB ObjectId strings; dates are ISO strings; times are "HH:mm" in the university's timezone.
import type { CourseType, Day, DisputeStatus, HallType, SnapshotStatus, UserStatus, UserType } from "./enums";

export type Id = string;

export interface University {
  _id: Id;
  name: string;
  location: string;
  contactEmail?: string;
  /** IANA timezone, e.g. "Asia/Amman". */
  timezone?: string;
  /** Computed member count (only on GET /universities/:id). */
  members?: number;
}

/** Public list item from GET /universities. */
export type UniversitySummary = Pick<University, "_id" | "name" | "location">;

export interface User {
  _id: Id;
  firstName: string;
  lastName: string;
  /** Computed by the server, not stored. */
  fullName?: string;
  email: string;
  type: UserType;
  status: UserStatus;
  /** Students only. */
  studentId?: string;
  /** Instructors only. */
  instructorId?: string;
  universityId: Id;
  /** Either an API path starting with "/" or a full https link. Use apiAssetUrl(). */
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Short user shape embedded in attendance, summaries and disputes. */
export interface UserRef {
  _id: Id;
  firstName: string;
  lastName: string;
  studentId?: string;
}

export interface LectureHall {
  _id: Id;
  building: string;
  floor: number;
  /** Room number as text, so "A12" and "101" both work. */
  number: string;
  type: HallType;
}

export interface Course {
  _id: Id;
  courseName: string;
  courseType: CourseType;
  /** Upper-case course number, e.g. "CS101". */
  courseNo: string;
}

export interface CourseTime {
  days: Day[];
  startTime: string;
  endTime: string;
}

/** Section as written (POST/PATCH body): references are ids. */
export interface SectionInput {
  courseId: Id;
  sectionCode: string;
  instructorId: Id;
  courseTime: CourseTime;
  startDate: string;
  endDate: string;
  /** Hall id. Omit for ONLINE courses; required otherwise. */
  courseLocation?: Id;
}

/** Section as read: the API populates course, instructor and hall. */
export interface Section {
  _id: Id;
  sectionCode: string;
  courseId: Pick<Course, "courseName" | "courseNo" | "courseType"> & { _id?: Id };
  instructorId: { _id?: Id; firstName: string; lastName: string; email: string; instructorId?: string };
  courseTime: CourseTime;
  startDate: string;
  endDate: string;
  /** Missing for ONLINE courses. */
  courseLocation?: Pick<LectureHall, "building" | "floor" | "number" | "type"> & { _id?: Id };
}

export interface StudentSchedule {
  userId: Id;
  universityId?: Id;
  sections: Section[];
}

export interface SnapshotInfo {
  _id: Id;
  capturedAt: string;
  status: SnapshotStatus;
  faceCount?: number;
}

/** What a student receives for an attendance record: only their own flag, never photos or other students. */
export interface StudentAttendance {
  _id: Id;
  sectionId: Id;
  createdAt: string;
  present: boolean;
}

/** What instructors and admins receive: the full record. `snapshots` only on GET /attendance/:id. */
export interface Attendance {
  _id: Id;
  sectionId: Id;
  /** "YYYY-MM-DD" */
  date: string;
  /** API path to the latest camera photo, e.g. "/api/v1/snapshots/<id>/image". */
  imageUrl?: string;
  /** Who counts as present. */
  users: UserRef[];
  autoUsers?: Id[];
  manualAdd?: Id[];
  manualRemove?: Id[];
  snapshots?: SnapshotInfo[];
  createdAt?: string;
}

export interface StudentAttendanceSummary {
  sectionId: Id;
  totalSessions: number;
  attended: number;
  percentage: number;
  sessions: { attendanceId: Id; date: string; present: boolean }[];
}

export interface StudentAttendanceStats {
  user: UserRef;
  attended: number;
  absent: number;
  percentage: number;
}

export interface SectionAttendanceSummary {
  sectionId: Id;
  totalSessions: number;
  students: StudentAttendanceStats[];
}

export interface AtRiskReport extends SectionAttendanceSummary {
  below: number;
}

export interface Dispute {
  _id: Id;
  attendanceId: { _id?: Id; sectionId: Id; createdAt: string } | Id;
  userId: (UserRef & { _id?: Id }) | Id;
  reason?: string;
  status: DisputeStatus;
  resolvedBy?: Id;
  resolvedAt?: string;
  createdAt?: string;
}

/** A classroom camera. The API key is never part of this object. */
export interface Device {
  _id: Id;
  name: string;
  hallId: Id | (LectureHall & { _id: Id });
  isActive: boolean;
  lastSeenAt?: string;
}

export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  mongo: boolean;
  redis: boolean;
  uptimeSeconds: number;
}

export interface UserImportResult {
  total: number;
  created: number;
  failed: { row: number; email?: string; error: string }[];
  emailsFailed: string[];
}

export interface ScheduleImportResult {
  total: number;
  enrolled: number;
  alreadyEnrolled: number;
  removed: number;
  failed: { row: number; studentId?: string; error: string }[];
}
