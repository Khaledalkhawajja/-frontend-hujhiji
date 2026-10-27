# Operations guide

How to run, deploy, back up and maintain the AI Classroom backend.

## 1. What runs where

| Part | Runs as | Needed for |
|---|---|---|
| API (Node) | `npm run dev` on your PC, or the `api` Docker service | everything |
| MongoDB | Docker `mongo` | all data |
| Redis | Docker `redis` | the photo queue |
| Worker (Python) | Docker `worker` | face recognition |
| Image storage | folder, or Docker `s3` (RustFS), or Cloudinary | camera photos + profile photos |
| MailHog | Docker `mailhog` | development only: catches emails, inbox at http://localhost:8025 |

```bash
docker compose up -d                      # database, queue, worker, fake inbox, S3 server
docker compose --profile full up -d       # same + the API in Docker (set WORKER_API_URL=http://api:4000 in .env)
npm run dev                               # the API on your PC (instead of the api service)
```

Health check (no login): `GET /api/v1/health` → `200 {"status":"ok"}`. `"degraded"` = API works but Redis is down
(photos wait and are processed later). `503 "down"` = the database is unreachable. Docker uses it to mark the container unhealthy.

## 2. Two MongoDB servers on one PC (a trap on Windows)

If MongoDB is **also installed on Windows** (the "MongoDB" service), it and Docker's MongoDB both use port 27017:

- Windows MongoDB answers on `127.0.0.1:27017`.
- Docker MongoDB answers on `[::1]:27017` (IPv6).
- `localhost` usually means `::1`, so the app and Compass reach **Docker's** MongoDB, until Docker is stopped.
  Then `localhost` silently falls back to the Windows one, which is empty, and your data seems to be gone.

Check: `Get-NetTCPConnection -LocalPort 27017 -State Listen` shows both listeners.
Fix (pick one): stop and disable the Windows service (`services.msc` → MongoDB, as administrator), **or** change the Docker port in
`docker-compose.yml` to `"27018:27017"` and use `mongodb://localhost:27018` everywhere (and in Compass).
Your data is not lost either way: it stays in the Docker volume `mongo-data`.

## 3. Configuration

Every setting is explained in `.env.example`. In `NODE_ENV=production` the API refuses to start (and says why) if:
the token secrets are shorter than 32 characters or identical, `CORS_ORIGIN` is empty or `*`, `APP_URL` is missing,
`WORKER_SECRET` is shorter than 16 characters, or S3 still uses the development credentials. It warns if the mail server is not real
or the website address is not HTTPS.

## 4. Deploying to a server (outline)

1. A Linux server with Docker. A domain name for the API and one for the website, both on **HTTPS**
   (login cookies are `Secure; SameSite=None` in production, so plain HTTP will not log anyone in).
2. Copy the project, create `.env` from `.env.example` with real values. Generate secrets with
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Set:
   `NODE_ENV=production`, `CORS_ORIGIN=https://<website>`, `APP_URL=https://<website>`, real `SMTP_*`, `TRUST_PROXY=1`,
   `STORAGE_DRIVER=s3` with real `S3_*` credentials (or Amazon S3), `SEED_*` for the first admin.
3. Put a reverse proxy in front for HTTPS. Example Caddyfile (Caddy gets and renews the certificate by itself):
   ```
   api.example.edu {
       reverse_proxy 127.0.0.1:4000
   }
   ```
4. Do **not** publish MongoDB, Redis or the S3 ports to the internet: remove their `ports:` lines or bind them to `127.0.0.1`,
   and use a firewall. Only 80/443 should be open.
5. `docker compose --profile full up -d --build`, then `npm run seed` once (or `docker compose exec api node src/scripts/seed.js`).
6. Remove the `mailhog` service in production.

## 5. Backups

Everything important is in MongoDB (+ the images in the storage). Back up regularly:

```bash
# database -> a compressed file
docker exec ai-classroom-mongo mongodump --db dpvasani --archive --gzip > backup-$(date +%F).archive.gz
# restore (into a running, ideally empty, database)
docker exec -i ai-classroom-mongo mongorestore --archive --gzip --drop < backup-2026-10-18.archive.gz
```
Images: back up the Docker volume `s3-data` (or `storage-data`, or your bucket's own versioning/replication).
Test a restore once; an untested backup is only a hope. Keep backups encrypted and off the server: they contain personal data.

## 6. Privacy: photos and faces

Classroom photos and profile photos show faces (biometric data). Check your university's rules, and:
- keep storage private (the API checks who may see each photo; students can never see classroom photos),
- classroom photos are deleted automatically after `SNAPSHOT_RETENTION_DAYS` (default 30); attendance results are kept,
- profile photos are deleted when the user is deleted or replaces the photo,
- the face data used for matching (`faceEmbedding`) is stored with the user: delete the user to remove it,
- tell students that a camera records attendance.

## 7. Face recognition

`RECOGNIZER=fake` only simulates results. For real recognition: set `RECOGNIZER=insightface` in `.env`, then
`docker compose build worker && docker compose up -d worker` (first start downloads ~300 MB of model).
Use `worker/evaluate.py` (instructions at the top of the file) with real profile and group photos to see the similarity scores
and choose `MATCH_THRESHOLD` (default 0.4). Accuracy depends on the camera: faces that are small, far away or turned away are missed,
which is why several photos per lecture are combined.

## 8. Tests

`npm test` (fast) and `npm run test:e2e` (full, needs Docker services). They use their own database, queue, port and folders.

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Website gets CORS errors | its address is not in `CORS_ORIGIN` |
| Login works but the next request is 401 | the site does not send cookies (`credentials: "include"`), or HTTPS/SameSite problem in production |
| Photos stay `PENDING` | worker or Redis is down (`docker compose ps`); the API re-queues them after 5 minutes automatically |
| Everything is empty after restarting Docker | the app reached the other MongoDB, see section 2 |
| Activation / reset emails do not arrive | development: look in MailHog (http://localhost:8025); production: check `SMTP_*` |
| API container "unhealthy" | `GET /api/v1/health`: database down (503) |
| Avatar upload fails | check `STORAGE_DRIVER` and, for S3, the endpoint, bucket and credentials |
