# Backend changes needed to match the frontend

For: Mahmoud (backend). From: the frontend (Khaled).
Backend checked: `mahmoud-12-svg/ai-classroom` `main`, with `docs/FRONTEND_GUIDE.md`.

The frontend never edits backend code. Everything below is either a **problem found while testing** (part A) or a
**feature the agreed screen designs need** that the API doesn't have yet (part B). Until an item exists, the website
shows that part with clearly marked sample data or hides it.

---

## A. Problems found (please fix first)

### A1. `GET /health` can't be read by the website

- **Called:** `fetch("http://localhost:4000/api/v1/health")` from the site on `http://localhost:5173`.
- **Expected:** `{ status: "ok", … }`, for the "service is down" banner (FRONTEND_GUIDE.md §6, Health check).
- **Got:** the browser blocks it (`TypeError: Failed to fetch`): the response has no `Access-Control-Allow-Origin`. All other routes have it.
- **Cause:** `src/app.js` registers the health route (line 53) before `app.use(cors(...))` (line 89).
- **Fix:** move the health route below `cors()`.

### A2. One shared login rate limit per IP

- `authLimiter` (20 requests / 15 min / IP) is shared by login, **refresh-token**, activate, forgot-password and reset-password.
- On campus, hundreds of students share one public IP, so after 20 logins or session refreshes in 15 minutes everyone gets `429`.
  Every page load by a logged-out visitor also uses one refresh call.
- **Fix:** separate limiters; a much higher limit for `refresh-token`; count login attempts per IP + email; set `TRUST_PROXY` behind the university proxy.

---

## B. Features the designs need

Ordered by priority. Endpoint names are suggestions; any shape is fine as long as FRONTEND_GUIDE.md documents it.

### High: needed for screens in Phases 2 and 3

**B1. Photo counts per student, for instructors and admins only**

- Screens: instructor lecture page ("seen in 6 of 12 photos" per student), dispute review, admin attendance.
- Need: in `GET /attendance/:id` (instructor/admin shape) add `totalSnapshots` and `sightings: { "<userId>": <number> }`.
- Hint: `recomputeAttendance()` in `src/utils/attendanceUsers.js` already builds these counts; saving them on the Attendance is enough.
- **Students must never receive this** (agreed: students see only present/absent and their percentage).

**B2. Absence limit and course standing**

- Screens: student course cards and course page ("5 / 6 absences", "1 left", standing badge), instructor class list (at risk / approaching), admin rules.
- Today the API has percentages only (and at-risk "below 75%").
- Need: an `absenceLimit` per course type (`REGULAR`, `BLENDED`, `ONLINE`) as a university setting, optionally overridden per section.
  In both summary shapes of `GET /attendance/section/:id/summary` add `absenceLimit`, and per student `absences` and `remaining`.

**B3. Reason for manual corrections**

- Screens: instructor "Change attendance" dialog (reason required + note), admin "Changes by instructors" list.
- Need: `PATCH /attendance/:id` accepts `reason` (`MEDICAL`, `CAMERA_ERROR`, `UNIVERSITY_ACTIVITY`, `LATE_APPROVED`, `OTHER`) and `note`.
  Store each change as `{ userId, action: "add"|"remove", reason, note, by, at }` and return it to instructors/admins.
  The student's own record gets `changedByInstructor: true`.
- Plus `GET /attendance/corrections?sectionId=&from=&to=` (admin: all; instructor: own sections).

**B4. Lectures that weren't recorded ("Not counted")**

- Screens: student session list and instructor sessions tab show a lecture where the cameras were down as "Not counted".
- Today a lecture with no photos simply has no Attendance record, so the site can't tell "no class that day" from "camera down".
- Need: in the summary, a list of scheduled meeting dates in the past with no attendance (`notCounted: ["2026-04-14", …]`),
  or an Attendance record created with `status: "NOT_COUNTED"`.

**B5. Dispute rules and decision message**

- Screens: student dispute form ("this uses your last dispute", "dispute until 28 Apr"), course page "1 of 2 left", admin rules, admin disputes (overdue).
- Need, as university settings: `maxDisputesPerSection`, `disputeWindowDays` (days after the lecture), `instructorDecisionDays`.
  - `POST /disputes` refuses (409) when the limit or the window is passed.
  - `PATCH /disputes/:id/resolve` accepts an optional `comment` that the student sees.
  - `GET /disputes?overdue=true` lists disputes older than `instructorDecisionDays` (for the admin).
  - The student summary returns `disputesLeft` and, per absent lecture, `disputeUntil`.

### Medium: needed for admin screens in Phase 4

**B6. Admin dashboard numbers**

- Screen: admin dashboard.
- Need: `GET /stats/overview?facultyId=` returning:
  - the attendance rate this semester and per week
  - the attendance rate per faculty
  - the number of students at risk
  - open disputes, and how many are overdue
  - cameras offline, and how many have dark photos
- Faculties don't exist yet, so this also needs a `faculty` field (or a Faculty model) on courses and users.

**B7. Users: last sign-in and disable**

- Screens: admin users table ("Last sign-in" column, status filter), edit user ("Disable account").
- Need: `lastLoginAt` on the user, set on login. A `DISABLED` status that blocks login but keeps the records
  (`PATCH /users/:id { status }`). A `?status=` filter on `GET /users`.

**B8. Camera details**

- Screen: Rooms & cameras, which shows the last photo per camera and the status (online / offline / too dark).
- Need: in `GET /devices`, per camera:
  - `lastSnapshotId` and `lastSnapshotAt`, so the site can show the image with `GET /snapshots/:id/image`
  - a `warning` (e.g. `"DARK"`) when recent photos are too dark to recognise faces

**B9. Notifications**

- Screens: the bell icon menu for students and instructors.
- Need: `GET /notifications` (paginated, newest first), `PATCH /notifications/:id/read`, `POST /notifications/read-all`. Created for:
  - a student marked absent
  - a dispute approved or rejected
  - one absence left / limit reached
  - a new dispute for an instructor
  - a camera going offline (admins)

**B10. Activity log**

- Screen: admin activity log.
- Need: `GET /audit-log?from=&to=&userId=&action=` (admin, read-only). It should record:
  - attendance changes
  - dispute decisions
  - **who opened which photos** (lecture and exam)
  - rule and setting changes
  - users created, disabled or deleted
  - cameras added, disabled or with a rotated key

**B11. More reports**

- Screen: admin reports.
- Need:
  - `GET /reports/students/:userId/attendance.csv` (admin): one student, all courses
  - `GET /reports/at-risk.csv?facultyId=&courseType=` (admin): the whole university, not one section
  - `GET /reports/corrections.csv` and `GET /reports/disputes.csv` (admin)
  - Optional: a weekly email of the at-risk report to faculty deans.

### Lower: later phases

**B12. Exams with hall cameras**

- Screens: instructor Exams list and live exam page; admin exam schedule.
- Need:
  - **Exam schedule:** an Exam model `{ title, sectionIds[], hallIds[], date, startTime, endTime }` with `GET/POST/PATCH/DELETE /exams` (admin) and `GET /exams/my` (instructor).
  - **Photos during the exam:** camera photos taken in that hall during the exam window are attached to the exam (not to a lecture), and listed by `GET /exams/:id/snapshots` (instructor of those sections, admin).
  - **Who was seen:** `GET /exams/:id/seen` lists the registered students who were recognised and those who weren't.

**B13. Semesters**

- Screens: admin semesters, the semester switcher in every menu.
- Need: a Semester model `{ name, startDate, endDate }`, a "current" flag, and filtering attendance, sections and reports by semester.
  `POST /semesters/:id/close` locks attendance and dispute decisions and deletes that semester's photos.

**B14. Settings and editable text**

- Screen: admin Settings & text, and the Attendance rules page.
- Need: `GET/PUT /settings` for:
  - **Feature switches:** disputes on/off, instructors can change attendance without a dispute, exam cameras, show "seen in" counts to instructors, email notifications, Arabic.
  - **The attendance rule:** `minSightings`, the photo interval and the "don't count lectures when cameras fail" switch, which are env variables today.
  - **Admin-edited text:** English and Arabic text overrides, and the menu items.

**B15. Sections without an instructor (optional)**

- Screen: admin courses list ("No instructor" warning).
- Today `instructorId` is required. Allowing a section to exist before an instructor is assigned would match how timetables are prepared.

---

## C. Agreed with the team (no backend change needed)

- Students see **Present / Absent per lecture and their overall percentage** only, never photo counts or photos.
- **Instructors and admins** see both the percentage and the photo counts (needs B1).
- One role per account: a person who is both a student and an instructor has two accounts (two emails).
- The product name is **AI Classroom**.
