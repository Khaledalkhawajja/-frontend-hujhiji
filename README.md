# AI Classroom: website (PWA)

Frontend for the AI Classroom attendance system. It talks only to the backend API
(`mahmoud-12-svg/ai-classroom`). The API contract is in [`docs/FRONTEND_GUIDE.md`](docs/FRONTEND_GUIDE.md),
the build plan in [`docs/FRONTEND_PROMPT.md`](docs/FRONTEND_PROMPT.md).

**Status:** Phase 0 (setup) done. See [`INTEGRATION_LOG.md`](INTEGRATION_LOG.md) for what was verified against the real API
and [`BACKEND_REQUESTS.md`](BACKEND_REQUESTS.md) for what the backend still needs.

## Run it

1. Start the backend (see its README): `docker compose up -d`, `npm run seed`, `npm run dev`.
   In the backend `.env`, `CORS_ORIGIN` and `APP_URL` must include `http://localhost:5173`.
2. In this folder:
   ```bash
   cp .env.example .env.local   # optional: the defaults already point at http://localhost:4000/api/v1
   npm install
   npm run dev                  # http://localhost:5173
   ```
3. Log in with the backend's `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

Use `localhost` for both the site and the API (never `127.0.0.1` for one of them), or the browser drops the login cookies.
If cookies still give trouble, set `VITE_API_URL=/api/v1` to go through the dev-server proxy.

## Scripts

| Command                                                                 | What it does                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                                                           | Dev server on port 5173                                             |
| `npm run build`                                                         | Type-check and build to `dist/` (with the service worker)           |
| `npm run preview`                                                       | Serve the built app on port 5173                                    |
| `npm test`                                                              | Unit tests (Vitest + Testing Library + MSW)                         |
| `npm run lint` / `npm run typecheck` / `npm run format`                 | ESLint, TypeScript, Prettier                                        |
| `python3 smoke/smoke_test.py <admin-email> <admin-password> <mail-dir>` | End-to-end smoke test in a headless browser against the running API |

## Structure

```
src/
  api/          http.ts (the only place that calls fetch: cookies, envelope, 401 -> one refresh -> retry) + one file per area
  types/        models and enums exactly as the API sends them
  features/     auth/, student/, instructor/, admin/
  components/   layout (app shell, menus) and ui (buttons, spinner, logo)
  routes/       router, guards (RequireAuth, RequireRole), menu per role
  lib/          env, strings (all visible text, translation-ready), helpers
```

Stack: React 18, TypeScript, Vite, React Router, TanStack Query, react-hook-form + zod, Tailwind CSS, lucide-react, vite-plugin-pwa.

## Rules we follow

- Login is cookie-based: every request uses `credentials: "include"`; nothing about auth goes in `localStorage`.
- The service worker caches the app shell only, never API responses (they contain personal data).
- Students never see photos or other students' data; the UI also hides what a role can't use (the server enforces it with 403).
- All visible text lives in `src/lib/strings.ts`, and layouts use start/end spacing so Arabic (right-to-left) can be added.
