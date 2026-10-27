"""
Smoke test from FRONTEND brief section 5, run in a real (headless) browser against the real backend.

Needs: the API on http://localhost:4000, the site on http://localhost:5173, a fake mail inbox writing .eml files.
Usage:  python3 smoke/smoke_test.py <admin-email> <admin-password> <mail-folder>
Prints one PASS/FAIL line per check and exits non-zero if any check fails.
"""
import email
import json
import pathlib
import re
import sys
import time
import urllib.request
from email import policy

from playwright.sync_api import sync_playwright

SITE = "http://localhost:5173"
API = "http://localhost:4000/api/v1"
ADMIN_EMAIL, ADMIN_PASSWORD, MAIL_DIR = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3])
SHOTS = pathlib.Path(__file__).parent / "screenshots"
SHOTS.mkdir(exist_ok=True)

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")


def api(page, method: str, path: str, body=None):
    """Calls the API from inside the page, with the page's cookies (credentials: include)."""
    return page.evaluate(
        """async ([url, method, body]) => {
            const res = await fetch(url, { method, credentials: "include",
              headers: body ? { "Content-Type": "application/json" } : {},
              body: body ? JSON.stringify(body) : undefined });
            let json = null; try { json = await res.json(); } catch {}
            return { status: res.status, json };
        }""",
        [f"{API}{path}", method, body],
    )


def latest_link(to: str, kind: str, since: float) -> str | None:
    for _ in range(40):
        for f in sorted(MAIL_DIR.glob(f"*-{to}.eml"), reverse=True):
            if float(f.name.split("-")[0]) < since:
                continue
            msg = email.message_from_bytes(f.read_bytes(), policy=policy.default)
            parts = [p.get_content() for p in msg.walk() if p.get_content_type() in ("text/plain", "text/html")]
            m = re.search(rf"{re.escape(SITE)}/{kind}\?token=([A-Za-z0-9_\-.%]+)", " ".join(parts))
            if m:
                return m.group(1)
        time.sleep(0.25)
    return None


with sync_playwright() as p:
    browser = p.chromium.launch()

    # ---- 1) health
    admin_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    admin = admin_ctx.new_page()
    admin.goto(f"{SITE}/login")
    with urllib.request.urlopen(f"{API}/health") as r:
        body = json.loads(r.read())
        check("1. GET /health is ok", r.status == 200 and body["status"] == "ok", json.dumps(body))
    try:
        api(admin, "GET", "/health")
        print("NOTE  1b. /health is readable from the browser")
    except Exception:
        print("NOTE  1b. /health is NOT readable from the browser (no CORS headers on that route) -> backend issue")

    # ---- 2) admin login through the website
    admin.screenshot(path=str(SHOTS / "01-login.png"))
    admin.fill('input[type="email"]', ADMIN_EMAIL)
    admin.fill('input[type="password"]', ADMIN_PASSWORD)
    admin.click('button[type="submit"]')
    admin.wait_for_url(f"{SITE}/admin", timeout=10000)
    cookies = {c["name"]: c for c in admin_ctx.cookies(["http://localhost:4000/api/v1/users/refresh-token"])}
    check(
        "2a. login sets accessToken + refreshToken cookies (HttpOnly)",
        "accessToken" in cookies and "refreshToken" in cookies and cookies["accessToken"]["httpOnly"],
        f"refresh cookie path={cookies.get('refreshToken', {}).get('path')}",
    )
    me = api(admin, "GET", "/users/current-user")
    check("2b. GET /users/current-user returns type ADMIN", me["json"]["data"]["type"] == "ADMIN", me["json"]["data"]["email"])
    admin.wait_for_selector("text=Dashboard")
    admin.screenshot(path=str(SHOTS / "02-admin-shell.png"))

    # ---- 3) lists work, and a non-admin gets 403
    unis = api(admin, "GET", "/universities")
    courses = api(admin, "GET", "/courses")
    check("3a. GET /universities works", unis["status"] == 200 and isinstance(unis["json"]["data"], list), f"{len(unis['json']['data'])} university")
    check(
        "3b. GET /courses works (empty list is fine)",
        courses["status"] == 200 and "courses" in courses["json"]["data"],
        f"pagination={courses['json']['data'].get('pagination')}",
    )

    stamp = int(time.time())
    student_email = f"smoke.student.{stamp}@example.com"
    since = time.time()
    created = api(admin, "POST", "/users", {
        "firstName": "Smoke", "lastName": "Student", "email": student_email,
        "type": "STUDENT", "studentId": f"9{stamp % 10000000:07d}",
    })
    check("3c. admin creates an INVITED student", created["status"] in (200, 201) and created["json"]["data"]["user"]["status"] == "INVITED",
          f"emailSent={created['json']['data'].get('emailSent')}")
    token = latest_link(student_email, "activate", since)
    check("3d. activation email arrives with a /activate?token= link to the website", token is not None)
    activated = api(admin, "POST", "/users/activate", {"token": token, "password": "Student-Pass-2026"})
    check("3e. POST /users/activate sets the password", activated["status"] == 200, activated["json"].get("message", ""))

    student_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    student = student_ctx.new_page()
    student.goto(f"{SITE}/login")
    student.fill('input[type="email"]', student_email)
    student.fill('input[type="password"]', "Student-Pass-2026")
    student.click('button[type="submit"]')
    student.wait_for_url(f"{SITE}/student", timeout=10000)
    student.wait_for_selector("text=Schedule")
    student.screenshot(path=str(SHOTS / "03-student-shell.png"))
    forbidden = api(student, "GET", "/users")
    check("3f. a student calling an admin route (GET /users) gets 403", forbidden["status"] == 403, forbidden["json"].get("message", ""))
    student.goto(f"{SITE}/admin")
    student.wait_for_url(f"{SITE}/student", timeout=10000)
    check("3g. the UI keeps a student out of /admin (sent back to /student)", student.url == f"{SITE}/student")

    # ---- 4) delete the access cookie: the site must refresh and retry by itself
    admin_ctx.clear_cookies(name="accessToken")
    seen: list[str] = []
    admin.on("response", lambda r: seen.append(f"{r.request.method} {r.url.replace(API, '')} -> {r.status}") if r.url.startswith(API) else None)
    admin.reload()
    admin.wait_for_selector("text=Dashboard", timeout=10000)
    time.sleep(0.5)
    still_admin = admin.url == f"{SITE}/admin"
    refreshed = any("/users/refresh-token -> 200" in s for s in seen)
    retried = [s for s in seen if "/users/current-user" in s]
    check(
        "4. without the access cookie, the client refreshes once and retries (user stays logged in)",
        still_admin and refreshed and retried[:1] == ["GET /users/current-user -> 401"] and retried[-1:] == ["GET /users/current-user -> 200"]
        and sum("/users/refresh-token" in s for s in seen) == 1,
        " | ".join(seen),
    )
    new_cookies = {c["name"] for c in admin_ctx.cookies(["http://localhost:4000/api/v1/users/refresh-token"])}
    check("4b. new cookies were issued", {"accessToken", "refreshToken"} <= new_cookies)

    # ---- extra: logout clears the session
    admin.click('button[aria-label="Account menu"]')
    admin.click("text=Log out")
    admin.wait_for_url(f"{SITE}/login", timeout=10000)
    after = api(admin, "GET", "/users/current-user")
    check("5. log out ends the session (current-user -> 401)", after["status"] == 401)

    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
