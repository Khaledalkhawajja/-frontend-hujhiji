# Requests for the backend (for Mahmoud)

The frontend does not change backend code. This file lists (A) problems found while testing against the real API, and
(B) features from the approved screen designs that the API does not have yet. The frontend builds (B) screens with
clearly marked sample data until the endpoints exist.

---

## A. Problems found

### A1. `GET /health` can't be read by the website (no CORS headers)

- **Called:** `fetch("http://localhost:4000/api/v1/health", { credentials: "include" })` from `http://localhost:5173`.
- **Expected:** `{ status: "ok", … }`, so the site can show a "service is down" banner (FRONTEND_GUIDE.md §6, "Health check").
- **Got:** the browser blocks the response: `TypeError: Failed to fetch`. The response has no `Access-Control-Allow-Origin`
  header. Every other route has it.
- **Cause:** in `src/app.js` the health route (line 53) is registered **before** `app.use(cors(...))` (line 89).
- **Fix idea:** move the health route below the `cors()` middleware.

### A2. One shared auth rate limit, per IP (risk on campus)

- `authLimiter` (20 requests / 15 min / IP) is used by login, **refresh-token**, activate, forgot-password and reset-password,
  and they share one counter.
- On campus many students share one public IP (NAT), so 20 logins or session refreshes in 15 minutes would lock
  everyone out with 429. Every page load by a logged-out visitor also costs one refresh call.
- **Fix idea:** separate limiters; a much higher limit for `refresh-token`; key login attempts by IP + email; set
  `TRUST_PROXY` correctly behind the university proxy.

---

## B. Features in the approved designs that the API doesn't have

Priority: **high** = needed for screens already designed and agreed with the team.

| #   | Feature                                                | What the website needs                                                                                                                                                                                                                              | Priority |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| B1  | **Photo counts per student** (instructor + admin only) | For each lecture, how many photos each student was seen in, and how many photos were taken. E.g. `GET /attendance/:id` → `sightings: { <userId>: number }`, `totalSnapshots`. **Students must not get this.**                                       | high     |
| B2  | **Absence limit per course type**                      | The designs show "5 / 6 absences" with a limit that depends on the course type (e.g. regular 6, blended 4, online 3). The API only has percentages. Need `absenceLimit` per course type (university setting) or per section, editable by the admin. | high     |
| B3  | **Reason for manual corrections**                      | `PATCH /attendance/:id` with `reason` (medical excuse, camera error, university activity, other) and an optional `note`, stored and returned, so the record shows "changed by instructor".                                                          | high     |
| B4  | **Dispute rules**                                      | Max disputes per student per course per semester; deadline to send (days after the lecture); deadline for the instructor to decide, after which the dispute goes to the admins; optional message to the student when resolving.                     | medium   |
| B5  | **Notifications**                                      | `GET /notifications` (marked absent, dispute approved/rejected, approaching the limit), mark as read.                                                                                                                                               | medium   |
| B6  | **Activity log**                                       | `GET /audit-log`: who changed attendance, resolved disputes, viewed photos, changed settings, created/deleted users. Read-only for admins.                                                                                                          | medium   |
| B7  | **Admin dashboard stats**                              | Attendance rate overall, by week and by faculty; number of at-risk students; open disputes (and how many are older than N days); cameras offline. One `GET /stats/overview` would do. Needs a `faculty` field on courses/users.                     | medium   |
| B8  | **Exams**                                              | Exam schedule (exam, sections, hall, date/time) and, during the exam, the latest photos from that hall's cameras for the instructor; which registered students were seen.                                                                           | medium   |
| B9  | **Semesters**                                          | Semester model (name, start/end dates, current); closing a semester locks attendance and deletes its photos.                                                                                                                                        | low      |
| B10 | **Camera status details**                              | In `GET /devices`: last photo id/time per camera and a "photos too dark" warning, for the Rooms & cameras screen. `lastSeenAt` already exists.                                                                                                      | low      |
| B11 | **Disable instead of delete**                          | A `DISABLED` user status (can't log in, records kept). Today there is only delete.                                                                                                                                                                  | low      |
| B12 | **Settings and text**                                  | Store feature switches and admin-edited UI text/menus: `GET/PUT /settings`. Also expose the attendance rule (`ATTENDANCE_MIN_SIGHTINGS`) so the admin can see it (and ideally change it).                                                           | low      |

Decisions already made with the team (no backend change needed):

- Students see **Present / Absent per lecture and their overall percentage** only, never photo counts.
- One role per account (a person who is both a student and an instructor has two accounts).
