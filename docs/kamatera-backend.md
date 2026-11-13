# Backend CD: GitHub Actions → Kamatera → PM2

The production workflow builds/tests on GitHub, uploads compiled JavaScript and
Drizzle migrations over SSH, installs production dependencies on Kamatera, applies
migrations and starts/restarts `warehouse-api` through PM2. The server does not
compile TypeScript. Production secrets stay on the server.

Triggers: pushes to `master`, or **Actions → Deploy backend to Kamatera → Run workflow**.
Change the branch filter if production uses another branch. Restrict deployment
branches in the GitHub `production` environment to your intended release branch.
The older development workflow is a separate legacy pipeline; it is not used here.

## One-time server setup

Use a dedicated non-root SSH deployment account. Install Node **24**, npm, PM2,
curl, tar, flock (util-linux), Nginx and a PostgreSQL client. Ensure `node`, `npm`
and `pm2` are available in non-interactive SSH sessions. The deployment script
loads nvm from `$NVM_DIR` or `~/.nvm` when present and selects Node 24. Install
Node 24 and PM2 under that version for the same SSH deployment user. CI and server must use the same Node
major version. Install PM2 globally using your normal server administration tools.

Create directories owned by that deployment account (replace `deploy` with its
actual username/group):

```sh
sudo install -d -o deploy -g deploy -m 0750 /srv/warehouse-api
sudo install -d -o deploy -g deploy -m 0750 /srv/warehouse-api/incoming /srv/warehouse-api/releases /srv/warehouse-api/shared /srv/warehouse-api/shared/storage/logs
```

Copy `deploy/kamatera/api.env.example` to `/srv/warehouse-api/shared/.env`, set
mode `0600`, and edit it on the server. Set the real `DATABASE_URL`, random
`JWT_SIGNATURE`, Cognito pool, port `3300`, and exact browser origins. Do not
commit this file or place it in a GitHub artifact. Values use dotenv syntax;
URL-encode special characters in database credentials. Create PostgreSQL's
database and a dedicated database role before deploying. Keep database and API
ports private; only Nginx needs public HTTP/HTTPS access.

As the deployment user, run `pm2 startup` and execute its generated administrator
command so the same user's saved processes return after reboot. The deployment
script runs `pm2 save` after successful activation. Configure retention for PM2,
Nginx and application `storage/logs` files.

## GitHub configuration

Create the `production` environment and add these secrets there (repository
secrets also work where environment secrets are unavailable):

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | Server IPv4 address or SSH hostname |
| `DEPLOY_USER` | Dedicated deployment account |
| `DEPLOY_PORT` | SSH port; optional, defaults to 22 |
| `DEPLOY_SSH_KEY` | Private deployment key; authorize its public key on the server |

The workflow fetches the server host key with `ssh-keyscan` at deployment time;
no known-hosts secret is required. This does not independently verify the server's
identity. Allow SSH from the runner through
your server/provider firewall; standard GitHub-hosted runners do not have one
fixed outbound IP. Database and application credentials are not needed in GitHub.

Commit/push the intended backend code and these files before running the workflow.
It packages only `dist`, package manifests, SQL/journal files and deployment
scripts. It does not upload `.env`, Git history, database dumps, or local dependencies.

## Deployment behavior

Each run creates `/srv/warehouse-api/releases/<sha>-<run>-<attempt>`. It symlinks
the shared environment and log storage, runs `npm ci --omit=dev`, then executes
the **compiled** Drizzle migrator. The SQL files keep the `src/drizzle/migrations`
path expected by that migrator. All pending migrations run, so review them and
take a database backup before deploying to an existing database.

PM2 runs the release's absolute `dist/src/main.js` path in fork mode. A deployment
causes a brief restart. After an HTTP smoke check succeeds, the release is saved
in PM2 and the `current` symlink is advanced. The smoke check verifies HTTP
startup; it does not prove database queries or authentication work. Check a real
authenticated read/write after the first deployment.

If activation fails, the script restarts the previous release where one exists.
Migration/dependency failures leave the previously running process alone.
**Code rollback does not reverse database migrations.** Use compatible migrations
and a reviewed backup/restore plan. Releases are retained for rollback; remove
old inactive releases periodically, preserving the current and previous versions.

For manual code rollback, as the deployment user:

```sh
pm2 startOrRestart /srv/warehouse-api/releases/PREVIOUS_RELEASE/deploy/kamatera/ecosystem.config.cjs --update-env
# Verify HTTP and authenticated application requests before saving.
pm2 save
ln -sfn /srv/warehouse-api/releases/PREVIOUS_RELEASE /srv/warehouse-api/current
```

## Nginx, HTTPS and Cloudflare

Use `deploy/kamatera/nginx.conf`, replace `api.example.com`, install it into the
server's enabled Nginx configuration, run `nginx -t` and reload Nginx. It proxies
to `127.0.0.1:3300` and preserves `/api/v1/`. Issue a valid origin certificate
using Certbot, verify HTTPS, then enable Cloudflare with **Full (strict)** TLS.
Bypass caching for the API hostname. Block public access to 3300 and 5432,
including IPv6: the current API listens on all interfaces.

## Assistant worker

PM2 also starts/restarts `warehouse-assistant-worker` when
`/srv/warehouse-api/shared/.env.worker` exists. It runs the release's compiled
`dist/scripts/assistant-worker.js`, with that shared file selected through
`DOTENV_CONFIG_PATH`. Without this file, deployment starts only the HTTP API.

Create the file from `.env.worker.example`, restrict its permissions to `0600`,
and use the API's database. Configure `ASSISTANT_BACKEND_REPO` and
`ASSISTANT_FRONTEND_REPO` to dedicated committed Git checkouts outside the release
directory, for example `/srv/warehouse-source/warehouse-backend` and
`/srv/warehouse-source/warehouse-frontend`. The worker fetches origin and fast-forwards clean source checkouts before each
feedback plan/regeneration. Optional `ASSISTANT_BACKEND_SOURCE_BRANCH` and
`ASSISTANT_FRONTEND_SOURCE_BRANCH` pin the expected branches. The worker user
needs write access and non-interactive Git read access to origin. Source follows
the branch tip, which may differ from deployed code; API deployment does not
update these checkouts. Keep coding disabled until
its additional prerequisites are configured. See [assistant.md](assistant.md).

After creating the environment file, deploy again or run:

```sh
pm2 startOrRestart /srv/warehouse-api/current/deploy/kamatera/ecosystem.config.cjs --update-env
pm2 logs warehouse-assistant-worker --lines 50
```

Stop any manually started worker before switching to PM2, then run `pm2 save`
after verifying it. The API HTTP smoke check does not verify worker health;
submit a question and feedback to verify generation separately.

References: [PM2 ecosystem configuration](https://pm2.keymetrics.io/docs/usage/application-declaration/),
[GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments).
