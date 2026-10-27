# Prompt for the frontend AI

Copy everything below the line into your AI assistant (Claude Code, Cursor, etc.). Put `FRONTEND_GUIDE.md` in the frontend project
(for example in `docs/`) so the AI can read it. Change the values in `[brackets]` if you prefer another stack.

---

You are building the website for **AI Classroom**, a university attendance system. A camera in each classroom takes photos, a server
recognises the students and records attendance automatically, and this website is where students, instructors and admins see the results.
It must be a **PWA** (installable, fast, works well on phones).

## Source of truth
The file `docs/FRONTEND_GUIDE.md` describes the backend API completely: authentication, response format, every endpoint with its
request and response, roles, enums and gotchas. **Read it fully before writing any code, and follow it exactly.**
Rules:
- Do **not** invent endpoints, fields or enum values. If something you need is not in the guide, stop and ask me; do not guess.
- If the guide and the running API disagree, tell me which one is wrong.
- Never put authentication tokens in `localStorage`. Auth is HttpOnly cookies: every request uses `credentials: "include"`.
- `user.avatar` can be an API path (starts with `/`: prefix the API origin, the login cookie is sent) or a full link: handle both. A camera photo can answer `410 Gone` after the retention period: show "photo no longer available".

## Stack (change if you want)
- [React 18 + TypeScript + Vite]
- [React Router] for pages, [TanStack Query] for server data (caching, loading and error states), [react-hook-form + zod] for forms
- [Tailwind CSS + shadcn/ui] for the design system, [lucide-react] for icons
- [vite-plugin-pwa] for the manifest and service worker
- [Vitest + React Testing Library] for tests, [MSW] to mock the API in tests

## Architecture
```
src/
  api/            one typed function per endpoint (users.ts, sections.ts, attendance.ts, ...) + http client
  api/http.ts     the ONLY place that calls fetch: base URL from env, credentials:"include",
                  parses the { statusCode, data, message, success } envelope, throws ApiError(message, status, errors),
                  and handles 401 -> single shared refresh -> retry once -> else redirect to /login
  types/          TypeScript types for every model and enum in the guide
  features/       auth/, student/, instructor/, admin/  (pages + components + query hooks per area)
  components/     shared UI (DataTable, Pagination, FormField, StatusBadge, FileDropzone, ConfirmDialog, EmptyState, ErrorState)
  routes/         router with <RequireAuth> and <RequireRole roles={[...]}> guards
  lib/            helpers (date/time formatting, enums -> labels)
```
- Base URL from `VITE_API_URL` (default `http://localhost:4000/api/v1`).
- Auth state: after login call `GET /users/current-user`, keep the user in a React context/query. Route guards use `user.type`.
- Every list page: loading skeleton, empty state, error state with retry, and server pagination (`page`, `limit`).
- Every form: client validation that mirrors the server rules in the guide, and show the server `message` / `errors` when the API rejects it.
- Destructive actions (delete, resolve, rotate key) need a confirm dialog. Show 409 messages to the user as they are.
- Responsive and mobile-first (students will mostly use phones). Accessible: labels, focus states, keyboard, contrast. Support light and dark mode.
- Text: put all user-visible strings in one place so they can be translated; make layout RTL-ready (Arabic is likely).

## Build plan: do it in this order, and stop after each phase for me to review
**Phase 0, Setup.** Project scaffold, tooling (lint, format, tests), env handling, the typed `http` client with refresh-and-retry, types for all models,
router skeleton with guards, app shell (sidebar/top bar, role-based menu), PWA manifest + icons placeholder.
*Done when:* I can run it and see the shell, and unit tests prove the 401 -> refresh -> retry logic (including that concurrent 401s trigger only ONE refresh).

**Phase 1, Authentication.** Login page, `/forgot-password` and `/reset-password?token=…` pages (always show the generic success message; handle expired/used links), `/activate?token=…` page (set password + confirm, strong-password hint, handle expired/used link),
logout, profile page (edit name/email, change password, upload avatar with a hint: "clear, front-facing photo, one face").
*Done when:* an admin created in the backend can log in; an invited user can activate from the email link (open the fake inbox at http://localhost:8025) and log in.

**Phase 2, Student area.**
1. Weekly schedule from `GET /schedules/me` (timetable grid, today highlighted).
2. My courses with attendance percentage (`/attendance/section/:id/summary`) and the list of lectures present/absent.
3. Dispute flow: from an absent lecture "The camera missed me" -> reason -> `POST /disputes`; "My disputes" list with status; withdraw while pending.
4. A banner when the student has no avatar.
5. A **Download my attendance (CSV)** button (`/reports/me/attendance.csv`).
Remember: a student never gets photos or other students' data.

**Phase 3, Instructor area.**
1. My sections (`/sections/my`) and a section page with the per-student attendance table.
   Add **Download CSV** and a **students at risk** panel (`/reports/sections/:id/at-risk`).
2. Lecture page: present list, camera photos (`imageUrl`, needs the cookie), per-photo processing status, manual add/remove (`PATCH /attendance/:id`), badge for "added manually".
3. Disputes inbox filtered by `PENDING`: approve / reject.

**Phase 4, Admin area.**
1. Users: table with search/filter/pagination, create user, edit, delete, resend invite, **CSV import** with a result report (created / failed rows with reasons).
2. Courses, Lecture halls, Sections (form with days, times, hall, instructor; hide the hall for ONLINE courses; show the 409 clash message).
3. Enrollments: per-student schedule editor and **CSV import** (with the `removeMissing` option explained in the UI) with the failure report.
4. Cameras: register (show the key ONCE in a copy-now dialog), enable/disable, rotate key.
5. University settings (name, location, contact email, **timezone**).
6. All attendance and all disputes.
7. **Download university summary (CSV)** (`/reports/summary.csv`).

**Phase 5, PWA and polish.** Installable, offline app shell, update prompt, never cache personal-data API responses, error boundary, 404 page,
empty/error states reviewed, Lighthouse PWA + accessibility check, README with run/build instructions.

## How to work
- Before each phase, list the files you will create/change and the endpoints you will use. After it, tell me what to test by hand.
- Small commits per feature. Write tests for the API client, auth guards and forms.
- Keep components small and typed. No `any`. No unused code.
- Match the backend's field names exactly (camelCase as in the guide).
- If you are unsure about a business rule (for example when a student counts as present), read the guide's "Gotchas" first, then ask me.

Start with Phase 0 now. First summarise in 10 lines what you understood from `FRONTEND_GUIDE.md`, then list any questions, then proceed.
