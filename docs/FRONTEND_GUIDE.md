# AI Classroom: Frontend Guide

Read this first. It describes the backend exactly as it works today, so the website (a **PWA**) can be built against it.
Give this whole file to your AI assistant when building the frontend.

---

## 1. What the system is

A camera in each classroom takes photos during a lecture. The server recognises the students in them and records
**attendance** automatically. The website is how people use the results:

| Role | What they do in the website |
|---|---|
| **STUDENT** | See their schedule, their attendance per course (present / absent, percentage), and **file a dispute** when the camera missed them |
| **INSTRUCTOR** | See the sections they teach, attendance per lecture and per student, look at camera photos, correct attendance by hand, **resolve disputes** |
| **ADMIN** | Everything: manage users, courses, sections, halls, cameras, enrollments (CSV imports), view all attendance |

```
Camera -> classroom PC -> API -> queue -> face-recognition worker -> database -> THE WEBSITE (you)
```

The website only talks to the **API** (Node/Express). It never talks to the camera, queue or worker.

---

## 2. Quick start

- API base URL (dev): `http://localhost:4000/api/v1`
- Start the backend: `docker compose up -d` (database, fake email inbox, queue, worker), then `npm run dev`.
- First admin: `SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run seed`.
- **CORS:** the API only accepts the origins listed in `CORS_ORIGIN` in the backend `.env`
  (default `http://localhost:3000,http://localhost:5173`). If the frontend runs somewhere else, add it there.
  `*` does **not** work because the site sends cookies.
- Development emails (account activation) are not really sent; open the fake inbox at **http://localhost:8025**.
- The activation link in those emails points to `<APP_URL>/activate?token=...`. Set `APP_URL` in the backend `.env`
  to the frontend address, and **build an `/activate` page** (see section 6).

---

## 3. Authentication (important)

Login uses **HttpOnly cookies**. The website never sees or stores a token.

- Every `fetch` must use `credentials: "include"` (axios: `withCredentials: true`). Without it nothing works.
- `POST /users/login` `{ email, password }` sets two cookies and returns **no user data**.
  Call `GET /users/current-user` right after to get the user and their `type` (role).
- The access token lasts **1 day**. When any request returns **401**, call `POST /users/refresh-token` once
  (the browser sends the refresh cookie by itself), then **retry the original request**. If refresh also returns 401, send the user to the login page.
- Refresh tokens rotate. Do **not** send two refresh calls at the same time (the second one looks like token theft
  and logs the user out of every device). Use one shared "refresh in flight" promise in the HTTP client.
- `POST /users/logout` ends the session on this device.
- Login / refresh / activate / forgot-password / reset-password are rate limited: **20 requests per 15 minutes per IP** (then `429`).
- **There is no public sign-up.** Admins create accounts (one by one or CSV). Each person gets an email with an
  activation link and sets their own password. Login is rejected for accounts that are not activated yet
  (the error looks the same as a wrong password).
- **Forgot password:** `POST /users/forgot-password` `{ email }` always answers 200 with the same message (it never says whether the
  email has an account). If it does, an email with a link to `<APP_URL>/reset-password?token=...` arrives (valid 60 minutes). Build a
  **/forgot-password** page (email field) and a **/reset-password** page (new password + confirm, then `POST /users/reset-password`).
  Resetting signs the user out of every device. A user whose account was never activated gets the activation link again instead.
- In dev the frontend and API are both on `localhost`, so the cookies work across ports. In production the cookies are
  `Secure; SameSite=None`, so the site and API must both be on **HTTPS**.

### Roles and what the UI should show
`user.type` is `"STUDENT" | "INSTRUCTOR" | "ADMIN"`. Hide menu items the role can't use. The server enforces it anyway
and returns **403** otherwise. Everything is scoped to the user's own university automatically.

---

## 4. Conventions

**Success response (always this envelope):**
```json
{ "statusCode": 200, "data": { ... }, "message": "…", "success": true }
```

**Error response:**
```json
{ "success": false, "message": "Validation failed.", "errors": ["…", "…"] }
```
`errors` is only present sometimes (validation, CSV problems). In development the body also contains `stack`. Show `message` to the user.

| Status | Meaning |
|---|---|
| 400 | Bad input (read `message` / `errors`) |
| 401 | Not logged in / token expired (try refresh, see above) |
| 403 | Logged in but not allowed |
| 404 | Not found |
| 409 | Conflict (duplicate, already exists, time clash, still in use) |
| 429 | Too many requests |

**Lists** are paginated with `?page=1&limit=20` (limit max 100). The list `data` is an object with the array and a `pagination` block:
```json
{ "data": { "users": [ ... ], "pagination": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 } } }
```
(The array key is named after the thing: `users`, `lectureHalls`, `courses`, `sections`, `attendances`, `disputes`.)
A few small lists are plain arrays: `/sections/my`, `/devices`, `/universities`.

**IDs** are MongoDB ObjectId strings (`"6ace88c4dd68e180b758639a"`). Dates are ISO strings.

**Enums (use exactly these strings):**
- User type: `STUDENT`, `INSTRUCTOR`, `ADMIN`; user status: `INVITED`, `ACTIVE`
- Hall type: `LAB`, `HALL`
- Course type: `BLENDED`, `ONLINE`, `REGULAR`
- Days: `SUNDAY`, `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY` (no Friday/Saturday)
- Dispute status: `PENDING`, `APPROVED`, `REJECTED`
- Snapshot status: `PENDING`, `PROCESSING`, `DONE`, `FAILED`

**Times** are `"HH:mm"` 24-hour strings (`"08:30"`; `"8:30"` is accepted and stored as `"08:30"`). They are the university's **local time**.

**File uploads** use `multipart/form-data` (do not set `Content-Type` yourself, let the browser add the boundary).
Images: jpg / png / webp only. Avatars max 2 MB.

---

## 5. Data model cheat sheet

```
University   { _id, name, location, contactEmail, timezone, members* }          (*computed count)
User         { _id, firstName, lastName, fullName*, email, type, status, studentId?, instructorId?,
               universityId, avatar? }                                           (studentId for students, instructorId for instructors)
LectureHall  { _id, building, floor, number, type }
Course       { _id, courseName, courseType, courseNo }                           (courseNo is upper-case, e.g. "CS101")
Section      { _id, courseId, sectionCode, instructorId, courseTime:{days[],startTime,endTime},
               startDate, endDate, courseLocation? }                             (courseLocation absent for ONLINE courses)
StudentSchedule { userId, sections[] }                                           (which sections a student is enrolled in)
Attendance   { _id, sectionId, date "YYYY-MM-DD", users[] (present students), imageUrl?, createdAt }
             ONE per class meeting (a section on a day). Several camera photos feed one Attendance.
Dispute      { _id, attendanceId, userId, reason?, status, resolvedBy?, resolvedAt? }
Device       { _id, name, hallId, isActive, lastSeenAt }                         (a classroom camera)
```

Relations: a **Course** has many **Sections**; a Section has one instructor, one hall (unless online), a weekly time
(days + start/end) between `startDate` and `endDate`; students are enrolled in Sections (their **schedule**);
each lecture produces one **Attendance** listing who was present.

---

## 6. Endpoints

Base: `/api/v1`. **Auth** column: `public`, `any` (logged in), or the roles allowed (`A`=admin, `I`=instructor, `S`=student).

### Account / users
| Method & path | Auth | Body → Response |
|---|---|---|
| `POST /users/login` | public | `{ email, password }` → sets cookies, `data: {}` |
| `POST /users/refresh-token` | public (refresh cookie) | `{}` → new cookies |
| `POST /users/logout` | any | `{}` |
| `POST /users/activate` | public | `{ token, password }` (password ≥ 8 chars). `token` comes from the `?token=` of the emailed link. 400 if invalid/expired/used. |
| `POST /users/forgot-password` | public | `{ email }` → always `200` "If that email belongs to an account, we sent instructions to it." Rate limited (20 / 15 min). |
| `POST /users/reset-password` | public | `{ token, password }` (password ≥ 8). `token` comes from the `?token=` of the emailed link. 400 if invalid / expired / already used. Signs out all devices. |
| `GET /users/current-user` | any | → user object (see section 5) |
| `PATCH /users/update-account` | any | `{ firstName?, lastName?, email? }` → user |
| `POST /users/change-password` | any | `{ oldPassword, newPassword }` (≥ 8). Signs out the other devices. |
| `PATCH /users/avatar` | any | multipart field `avatar` (image, max 2 MB) → user. **The avatar is the face photo used for recognition**: ask for a clear, front-facing, single-face photo. See "Avatars" below for how to display `user.avatar`. |
| `GET /users/:id/avatar` | any | the photo itself (image bytes). A student may only open their own; instructors and admins can open anyone's in their university. 404 if the user has no avatar. |
| `GET /users` | A | `?type=STUDENT&search=ali&page=&limit=` → `{ users, pagination }` |
| `GET /users/:id` | A | → user |
| `POST /users` | A | JSON or multipart: `{ firstName, lastName, email, type, studentId (students), instructorId (instructors), avatar? }`. Creates an `INVITED` user and emails the link → `{ user, emailSent }` |
| `PATCH /users/:id` | A | `{ firstName?, lastName?, email?, type?, studentId?, instructorId? }` |
| `DELETE /users/:id` | A | 409 if an instructor still teaches sections |
| `POST /users/:id/resend-invite` | A | → `{ emailSent }` (409 if already activated) |
| `POST /users/import` | A | multipart field `file` (CSV, max 2 MB / 1000 rows), columns `firstName,lastName,email,type,studentId,instructorId` → `{ total, created, failed:[{row,email,error}], emailsFailed:[] }` |

### University
| Method & path | Auth | Details |
|---|---|---|
| `GET /universities` | public | → `[{ _id, name, location }]` |
| `GET /universities/:id` | any | → university + `members`, `timezone` |
| `POST /universities` · `PATCH /universities/:id` · `DELETE /universities/:id` | A | `{ name, location, contactEmail, timezone }` (`timezone` = IANA name like `Asia/Amman`). PATCH/DELETE only on the admin's own university. |

### Lecture halls · Courses
| Method & path | Auth | Details |
|---|---|---|
| `GET /lecture-halls` | any | `?type=&building=&floor=&page=&limit=` → `{ lectureHalls, pagination }` |
| `POST /lecture-halls` | A | `{ building, floor, number, type }` |
| `GET/PATCH/DELETE /lecture-halls/:id` | any / A / A | DELETE → 409 if a section uses it |
| `GET /courses` | any | `?courseType=&search=` (name or number) → `{ courses, pagination }` |
| `POST /courses` | A | `{ courseName, courseType, courseNo }` |
| `GET/PATCH/DELETE /courses/:id` | any / A / A | DELETE → 409 if it has sections |

### Sections
| Method & path | Auth | Details |
|---|---|---|
| `GET /sections` | any | `?courseId=&instructorId=&courseLocation=&day=SUNDAY` → `{ sections, pagination }` |
| `GET /sections/my` | any | Instructor: sections they teach. Student: sections in their schedule. → **array** |
| `GET /sections/:id` | any | → section |
| `POST /sections` | A | `{ courseId, sectionCode, instructorId, courseTime:{ days:["SUNDAY","TUESDAY"], startTime:"08:30", endTime:"10:00" }, startDate:"2026-09-01", endDate:"2027-01-15", courseLocation }`. **Omit `courseLocation` for ONLINE courses; it is required for the others.** 409 if the hall or instructor is already booked at that time. `sectionCode` is the university's own section number ("01"). |
| `PATCH /sections/:id` · `DELETE /sections/:id` | A | DELETE → 409 once it has attendance |

A section in responses is **populated**: `courseId: {courseName, courseNo, courseType}`,
`instructorId: {firstName, lastName, email, instructorId}`, `courseLocation: {building, floor, number, type}` (or missing).

### Student schedule (enrollment)
| Method & path | Auth | Details |
|---|---|---|
| `GET /schedules/me` | S | → `{ userId, universityId, sections:[populated section] }` (empty `sections` if none) |
| `GET /schedules/:userId` | A, I | same shape, for a student |
| `POST /schedules/:userId/sections` | A | `{ sectionIds:[…] }` → schedule. 409 if a section overlaps another. |
| `DELETE /schedules/:userId/sections/:sectionId` | A | → schedule |
| `POST /schedules/import` | A | multipart `file` CSV `studentId,courseNo,sectionCode[,startDate]`, optional `?removeMissing=true` → `{ total, enrolled, alreadyEnrolled, removed, failed:[{row,studentId,error}] }` |

### Attendance
| Method & path | Auth | Details |
|---|---|---|
| `GET /attendance` | any | `?sectionId=&from=&to=&page=&limit=` → `{ attendances, pagination }` (newest first). **Shape depends on role, see below.** |
| `GET /attendance/:id` | any | one record (role-dependent shape) |
| `GET /attendance/section/:sectionId/summary` | any | Percentages, see below |
| `PATCH /attendance/:id` | A, I | `{ add:[userId], remove:[userId] }` manual correction. The server remembers manual changes; later camera photos never undo them. |
| `DELETE /attendance/:id` | A | also deletes its photos and disputes |
| `POST /attendance` | A, I | **manual fallback** (camera down): multipart `image`, `sectionId`, `users` (JSON array or comma list). 409 if that section already has attendance today. |

**Student sees only their own flag** (never photos or other students):
```json
{ "_id": "…", "sectionId": "…", "createdAt": "…", "present": true }
```
**Instructor / admin see the full record:**
```json
{ "_id": "…", "sectionId": "…", "date": "2026-10-13", "imageUrl": "/api/v1/snapshots/<id>/image",
  "users": [ { "_id": "…", "firstName": "…", "lastName": "…", "studentId": "…" } ],
  "autoUsers": ["…"], "manualAdd": ["…"], "manualRemove": ["…"],
  "snapshots": [ { "_id": "…", "capturedAt": "…", "status": "DONE", "faceCount": 12 } ] }
```
(`snapshots` only in `GET /attendance/:id`.) `users` is who counts as present. `manualAdd/Remove` are the instructor's corrections.
You can show a badge "added manually" for ids in `manualAdd`.

**Summary** `GET /attendance/section/:sectionId/summary`
- Student → `{ sectionId, totalSessions, attended, percentage, sessions:[{ attendanceId, date, present }] }`
- Instructor/admin → `{ sectionId, totalSessions, students:[{ user:{_id,firstName,lastName,studentId}, attended, absent, percentage }] }`

**Camera photos:** `GET /snapshots/:id/image` (A, I of that section; students get 403) returns the image itself.
Use it as `<img src="http://localhost:4000/api/v1/snapshots/…">` (cookies are sent) or fetch it as a blob. It needs the login cookie, so it is not a public URL.
A photo is deleted automatically after the **retention period** (30 days by default; attendance results stay). After that the
route answers **410 Gone** with `"This photo was deleted after the retention period"`: show "photo no longer available", not an error page.

### Reports (CSV downloads)
CSV files open in Excel (UTF-8 with BOM, so Arabic names are fine). Download with a normal link / `window.open` (the cookie is sent), or
`fetch(..., { credentials: "include" })` → `blob()` → save. The file name comes from the `Content-Disposition` header.

| Method & path | Auth | Details |
|---|---|---|
| `GET /reports/sections/:sectionId/attendance.csv` | A, I (of that section) | one row per student, one column per lecture date (`P` / `A`), then attended, absent, percentage |
| `GET /reports/sections/:sectionId/at-risk?below=75` | A, I (of that section) | **JSON** (not CSV): `{ sectionId, below, totalSessions, students:[{ user:{_id,firstName,lastName,studentId}, attended, absent, percentage }] }`: students under the percentage (default 75). Good for a warning list. |
| `GET /reports/me/attendance.csv` | S | the student's own attendance: course, section, date, Present/Absent |
| `GET /reports/summary.csv` | A | one row per section: lectures, enrolled students, average attendance |

### Avatars (how to display `user.avatar`)
`user.avatar` is either
- a **path** that starts with `/`, e.g. `/api/v1/users/6ace…/avatar?v=1792…`: prefix it with the **API origin** (`http://localhost:4000`, not the `/api/v1` base URL again) and
  show it with `<img src>` (the login cookie is sent; it is private), or
- a **full `https://…` link** (Cloudinary): use it as it is.
Do not assume either form. The `?v=` part changes whenever the photo is replaced, so the browser cache refreshes by itself.

### Health check
`GET /health` (no login, `/api/v1/health`) → `{ status: "ok" | "degraded" | "down", mongo, redis, uptimeSeconds }`. Useful for a "service is down" banner:
`503` means the database is unreachable.

### Disputes (student says "I was there, the camera missed me")
| Method & path | Auth | Details |
|---|---|---|
| `POST /disputes` | S | `{ attendanceId, reason? (≤ 500 chars) }`. 400 if they are already marked present, 409 if they already disputed it. |
| `GET /disputes` | any | `?status=PENDING&attendanceId=&page=&limit=` → `{ disputes, pagination }`. Student: own. Instructor: for their sections. Admin: all. Each item has `userId:{firstName,lastName,studentId}` and `attendanceId:{sectionId,createdAt}` populated. |
| `GET /disputes/:id` | any | one dispute |
| `PATCH /disputes/:id/resolve` | A, I | `{ status: "APPROVED" \| "REJECTED" }`. APPROVED marks the student present. 409 if already resolved. |
| `DELETE /disputes/:id` | S | withdraw (only while `PENDING`) |

### Cameras (admin screen)
| Method & path | Auth | Details |
|---|---|---|
| `POST /devices` | A | `{ name, hallId }` → `{ device, apiKey }`. **`apiKey` is shown only once**: show it in a "copy this now" dialog. |
| `GET /devices` | A | list (hall populated). Never contains keys. |
| `PATCH /devices/:id` | A | `{ name?, isActive? }` (disable a camera) |
| `POST /devices/:id/rotate-key` | A | new `apiKey` (the old one stops working) |
| `DELETE /devices/:id` | A | |

**Not for the website:** `POST /snapshots` (the camera computer uses it) and `/internal/*` (the worker uses it).

---

## 7. Suggested screens

**Everyone:** Login · Forgot password (`/forgot-password`) · Reset password (`/reset-password?token=…`: new password + confirm → `POST /users/reset-password`, then go to login) · Activate account (`/activate?token=…`: password + confirm → `POST /users/activate`, then go to login) ·
Profile (edit name/email, change password, **upload avatar** with a hint about a clear face photo).

**Student**
1. *Dashboard / schedule*: weekly timetable from `GET /schedules/me` (days × times), today's classes highlighted.
2. *My attendance*: per course card with percentage (`/attendance/section/:id/summary`), list of lectures with present/absent.
3. *Dispute*: from an absent lecture, a "The camera missed me" button → reason → `POST /disputes`. A *My disputes* list with status.
   Plus a **Download my attendance (CSV)** button (`/reports/me/attendance.csv`).
4. Banner if the student has **no avatar** (the camera can't recognise them without one).

**Instructor**
1. *My sections* (`/sections/my`) → section page.
2. *Section page*: lectures list (`GET /attendance?sectionId=`), per-student percentages (summary), open a lecture.
   Add **Download CSV** (`/reports/sections/:id/attendance.csv`) and a **students at risk** panel (`/reports/sections/:id/at-risk`).
3. *Lecture page*: present list, **photos** (`imageUrl`), a way to add/remove students (`PATCH /attendance/:id`), processing status of each photo.
4. *Disputes inbox* (`GET /disputes?status=PENDING`): approve / reject.

**Admin**
Users (table, search, filter, create, CSV import with the failure report) · Courses · Lecture halls · Sections (form with days/time/hall/instructor,
hide the hall field when the course is ONLINE) · Enrollments (CSV import + manual add/remove per student) · Cameras (register, show key once, disable, rotate) ·
University settings (**timezone**) · all attendance and disputes.
Reports: **Download university summary (CSV)** (`/reports/summary.csv`).

---

## 8. PWA notes

- Installable app: manifest, icons, service worker for the app shell.
- **Do not cache API responses that contain personal data**, and never cache `/users/*` or `/snapshots/*` in the service worker. Safe to cache: the static shell. Cache GETs only, and prefer network-first for attendance.
- Authentication is cookie based. Don't put anything in `localStorage` for auth.
- Handle the 401 → refresh → retry flow in **one** place (an HTTP client wrapper).
- Right-to-left (Arabic) is a good idea if the university uses it; the backend sends no localised text, only English `message`s, so map them or show your own text per status code.
- Push notifications and offline writes are **not** supported by the backend.

---

## 9. Gotchas

- Attendance is **per lecture** (one record per section per day), not per photo.
- A student is "present" only if the camera saw them in several photos (default 2), unless an instructor edited it.
  A very new lecture can show few or no present students until its photos are processed (`snapshots[].status`).
- `GET /attendance` for students has **no** `users` or `imageUrl`. Don't try to render them.
- ONLINE courses have no hall and no camera, so they have no automatic attendance.
- Section times are local time of the university's `timezone`.
- `fullName` is computed by the server; it is in user objects but isn't stored.
- Deleting things is often refused with **409** because other data depends on them; show the `message`.
- Passwords: minimum 8 characters.

---

## 10. What may still change

- **Image hosting** (camera photos and avatars) can be a local folder, an S3 server or Cloudinary. The website does not need to care: it always
  uses the API routes above (`/snapshots/:id/image`, `/users/:id/avatar`). Only handle both avatar forms (path or full link).
- **Real face recognition** may not be switched on yet in your environment; during development attendance results can be simulated.
- Not built: push notifications, PDF exports (use CSV, or print from the browser), email notifications about attendance.