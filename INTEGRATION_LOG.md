# Integration log

What was verified against the real backend API, and what failed. Newest first.

## 2026-10-27: Phase 0 setup + smoke test (brief section 5)

**Backend under test:** `mahmoud-12-svg/ai-classroom`, branch `main` (zip download, docs dated 2026-10-18).
**Frontend:** this repo, branch `phase-0-setup`, `npm run dev` on `http://localhost:5173`, `VITE_API_URL=http://localhost:4000/api/v1`.

**How the backend was run** (cloud workspace, Docker Hub not reachable from there):

| docker compose service | Stand-in used                                                                 |
| ---------------------- | ----------------------------------------------------------------------------- |
| `mongo` (mongo:7)      | `mongod` 7.0.34 from conda-forge, `127.0.0.1:27017`                           |
| `redis`                | `redis-server`, `127.0.0.1:6379`                                              |
| `mailhog`              | small Python SMTP catcher on port 1025 that saves each email as a `.eml` file |
| `s3`                   | not needed: `STORAGE_DRIVER` left on `local`                                  |
| `worker`               | not started yet (needed from Phase 3 for photo processing)                    |

`.env`: `CORS_ORIGIN=http://localhost:5173`, `APP_URL=http://localhost:5173`, random token secrets, `RECOGNIZER=fake`. Then `npm install`, `npm run seed`, `node src/index.js`.

**Smoke test** (`smoke/smoke_test.py`, headless Chromium, real cookies):

| #   | Check                                                                                                                                | Result |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | `GET /health` → `{"status":"ok","mongo":true,"redis":true}`                                                                          | PASS   |
| 2a  | Login through the website sets `accessToken` and `refreshToken` HttpOnly cookies (refresh cookie path `/api/v1/users/refresh-token`) | PASS   |
| 2b  | `GET /users/current-user` → `type: "ADMIN"`                                                                                          | PASS   |
| 3a  | `GET /universities` → list with the seeded university                                                                                | PASS   |
| 3b  | `GET /courses` → `{ courses: [], pagination }`                                                                                       | PASS   |
| 3c  | Admin creates a student → `INVITED`, `emailSent: true`                                                                               | PASS   |
| 3d  | Activation email links to `http://localhost:5173/activate?token=…`                                                                   | PASS   |
| 3e  | `POST /users/activate` → "Account activated. You can log in now."                                                                    | PASS   |
| 3f  | Student calls `GET /users` (admin only) → **403** "You do not have permission to perform this action"                                | PASS   |
| 3g  | Website sends a student who opens `/admin` back to `/student`                                                                        | PASS   |
| 4   | Access cookie deleted → `current-user 401` → **one** `refresh-token 200` → `current-user 200`, user stays logged in                  | PASS   |
| 4b  | New cookies issued after the refresh                                                                                                 | PASS   |
| 5   | Log out → `current-user` answers 401                                                                                                 | PASS   |

Unit tests (`npm test`): 17 passed, including "5 concurrent 401s trigger exactly one refresh".

**Failed / reported to the backend owner** (details in `BACKEND_REQUESTS.md`):

- `GET /health` has no CORS headers, so the website can't read it from `localhost:5173` (blocked by the browser).
- The auth rate limit (20 per 15 min per IP) is shared by login, refresh, activate, forgot and reset password.
