// Enums exactly as the backend sends them (docs/FRONTEND_GUIDE.md, section 4).

export const USER_TYPES = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;
export type UserType = (typeof USER_TYPES)[number];

export const USER_STATUSES = ["INVITED", "ACTIVE"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const HALL_TYPES = ["LAB", "HALL"] as const;
export type HallType = (typeof HALL_TYPES)[number];

export const COURSE_TYPES = ["BLENDED", "ONLINE", "REGULAR"] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

/** Teaching days. The university week is Sunday to Thursday (no Friday or Saturday). */
export const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"] as const;
export type Day = (typeof DAYS)[number];

export const DISPUTE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const SNAPSHOT_STATUSES = ["PENDING", "PROCESSING", "DONE", "FAILED"] as const;
export type SnapshotStatus = (typeof SNAPSHOT_STATUSES)[number];
