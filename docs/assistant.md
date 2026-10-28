# Warehouse assistant: architecture and setup

## Repositories and processes

There are exactly three repositories:

| Repository            | Responsibility                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `warehouse-frontend`  | Business app, Question/Feedback panel, contributor conversations and testing updates.                            |
| `warehouse-backend`   | HTTP API, PostgreSQL/Drizzle schema, Gemini planning/coding worker and email worker.                             |
| `warehouse-assistant` | Developer review app: inbox, Markdown preview/editor, version history, Copy for AI, approvals and run/PR status. |

The planning, coding and email workers **stay in warehouse-backend**. They are commands run from that repository, not separate applications or repositories. The HTTP server does not start workers implicitly.

| Command (in warehouse-backend)   | Purpose                                                                                                       | Needs local repo checkouts?                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `npm run start:dev`              | HTTP API for both browser apps.                                                                               | No                                              |
| `npm run assistant:worker`       | Generate answers/plans, deliver queued emails and implement explicitly approved plans when coding is enabled. | Yes for planning/coding; not for answers/email. |
| `npm run assistant:email-worker` | Optional email-only process for prompt delivery during long coding jobs.                                      | No                                              |

No repository-path variables are required for the standard checkout layout:

```text
warehouse/
  warehouse-backend/    # Run the planning/coding worker here.
  warehouse-frontend/   # The worker finds this sibling checkout automatically.
  warehouse-assistant/  # Developer review frontend; no worker code here.
```

The worker defaults to its current working directory for the backend and `../warehouse-frontend` for the frontend. The HTTP API and email-only process do not read repository files. A custom worker-host layout can override these defaults, but that is not part of normal setup.

API settings belong in warehouse-backend's `.env`, based on `.env.example`. Worker settings belong in `.env.worker`, based on `.env.worker.example`, in the **same backend repo**. Start the worker with `DOTENV_CONFIG_PATH=.env.worker npm run assistant:worker` (or `assistant:email-worker`). Both files must use the same database. The local `.env.worker` is Git-ignored. Existing shared `.env` setups still work because the loader defaults to `.env` unless `DOTENV_CONFIG_PATH` is set.

## Accounts and authentication

Both frontends use the existing Cognito user pool. Configure a dedicated **public Cognito app client without a client secret** for warehouse-assistant; enable the SRP authentication flow used by the business app. Existing emails and passwords are reused. There is no separate assistant registration. The API validates access tokens with Cognito, restricts the configured user-pool issuer, and loads current account permissions from PostgreSQL.

`users.assistant_access` is separate from business roles such as Admin or Manager:

| Value         | Access                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `NONE`        | Default. No contributor panel or conversation access.                                                           |
| `CONTRIBUTOR` | Ask questions, submit feedback, and reply to their own conversations in their tenant.                           |
| `DEVELOPER`   | Enter warehouse-assistant; review all tenant conversations, edit plans and explicitly authorize implementation. |

Every request enforces permissions and tenant boundaries on the server. The access endpoint reports the current account ID, tenant, assistant access and the API process's Gemini-key presence indicator. It does not expose credentials. Grant/revoke access using the backend CLI; no public permission-granting endpoint exists.

## Initial setup

1. Review the changes in all three repos. Commit the code used for planning: only committed source is read; uncommitted changes are excluded.
2. Point warehouse-backend's `DATABASE_URL` at the intended testing database. Run `npm run db:migrate`. This applies **all pending migrations**, including `0012_assistant_review` (permissions, conversations, plans and runs) and `0013_assistant_plan_email` (provider-independent email outbox). Existing accounts default to `NONE`. No migration is needed when switching from SES to Resend.
3. Assign existing accounts from warehouse-backend:

   ```sh
   npm run assistant:access -- developer@example.com DEVELOPER
   npm run assistant:access -- reviewer@example.com CONTRIBUTOR
   npm run assistant:access -- reviewer@example.com NONE
   ```

4. Configure the API's `COGNITO_USER_POOL_ID`, `FRONTEND_URL` (business-app origin) and `ASSISTANT_APP_URL` (review-app origin). CORS allows those two configured browser origins. Set `ASSISTANT_APP_URL=http://localhost:3006` locally; use the actual HTTPS origin when deployed.
5. In warehouse-assistant, copy `.env.example` to `.env` and configure `REACT_APP_API_URL`, `REACT_APP_COGNITO_USER_POOL_ID`, `REACT_APP_COGNITO_CLIENT_ID` and optional `REACT_APP_WAREHOUSE_URL`. Run `npm ci` and `npm start`; the app uses port 3006. These frontend settings are public; never put Gemini or email API keys there.
6. Restart the API and business frontend. The contributor panel appears according to account permissions. Configure `REACT_APP_RELEASE` at business-frontend build time; its existing deployment workflow supplies the commit SHA.
7. In warehouse-backend, copy `.env.worker.example` to `.env.worker`; set the same `DATABASE_URL` as the API, a `GEMINI_API_KEY` and a `GEMINI_MODEL` available to that key. Keep the two existing code repos in the sibling layout shown above; no path variables are needed. The API currently reports AI readiness from its own Gemini-key presence, so keep that indicator consistent with the worker configuration; it is not a worker health check. Start `DOTENV_CONFIG_PATH=.env.worker npm run assistant:worker`. Coding remains disabled until `ASSISTANT_IMPLEMENTATION_ENABLED=true` is deliberately configured.
8. Configure optional Resend email delivery below. Missing email credentials leave notifications queued and do not prevent plans from being saved.

For real email links, the assistant host must rewrite `/plans/*` and `/threads/*` to `index.html`. Set the same deployed HTTPS origin in the API and worker's `ASSISTANT_APP_URL`. A localhost email link only works on the machine hosting that app.

## Questions, feedback and plan review

Contributors choose Question or Feedback and write one message. There is no required title, category, priority or questionnaire. The app automatically captures the page path, frontend release and browser; query strings and hashes are discarded.

Questions receive AI answers using a conservative product guide and conversation context. No live business records or arbitrary source access are available to this question-answering path. Feedback queues an AI plan using selected committed frontend/backend source excerpts. Missing evidence and open questions belong in the developer's plan, rather than a contributor questionnaire. Subsequent feedback replies do not expand an approved job: a developer regenerates the plan to incorporate them.

Plans and conversations stay in PostgreSQL. There is **no separate file storage**, public share URL, share token, or required download. In warehouse-assistant:

- `/` opens the inbox (the existing API returns the most recent 100 conversations).
- `/threads/<thread-id>` opens a discussion and its latest plan.
- `/plans/<plan-id>` opens an exact immutable plan version, including from an email.
- Copy for AI copies the selected Markdown plan, source commits, revision metadata and current discussion to the clipboard. It does not send anything to another AI or authorize coding.
- Editing creates a new plan version. Raw Markdown HTML is never executed in the preview.

Email links contain only a plan ID, not an authorization credential. Login preserves the requested route. Forwarding an email grants no access. Contributors cannot open the developer workspace. Old plan versions and plans based on stale feedback cannot be approved. Private workspace state is cleared/revalidated when the account or tenant changes.

Approve & start requires confirmation. The backend locks the thread, checks the latest plan ID/current feedback revision and absence of active work, then records the exact approved plan, actor and time in the implementation job. Duplicate execution of a plan is blocked. The worker also rechecks the approver's developer permission and tenant before starting.

Successful coding produces draft PRs and `CODE_REVIEW` status. You review, merge and deploy separately, then click Deployed—ready to test. The contributor can choose Looks good or Still needs work. No email view, copy action or plan approval merges/deploys code automatically.

The business app also retains its existing in-app review controls. Screenshots, element pinning and cross-device unread state are outside v1; in-app polling and local unread indicators are implemented.

## Low-volume email with Resend

Email now uses **Resend's REST API**, not AWS SES. It uses Node's built-in HTTPS client, with no additional npm SDK dependency. AWS credentials, SES region/verification and IAM email permissions are not needed. Existing AWS dependencies remain because Cognito and other application features still use them.

Resend currently lists a free transactional allowance of **3,000 emails/month with a 100/day limit**. This suits occasional plan notifications; check [current pricing](https://resend.com/pricing) before enabling. Nodemailer is a mail library rather than an email service: it would still need an SMTP account. Resend was chosen here because it supplies the delivery service and can be called without adding a package. SES can be reconsidered at higher volume or if an existing SES sender is already configured; it is not required for v1.

Setup:

1. Create a Resend account and a sending API key.
2. Configure an approved sender. Resend's onboarding sender is for restricted testing, not arbitrary recipients; verify a domain you control for sending to other developer accounts. Follow the [domain setup](https://resend.com/docs/dashboard/domains/introduction).
3. Add these variables **to the backend worker environment**, never a frontend:

   ```dotenv
   ASSISTANT_EMAIL_ENABLED=true
   ASSISTANT_EMAIL_FROM=Warehouse Assistant <notifications@your-domain.com>
   RESEND_API_KEY=your-sending-api-key
   ASSISTANT_APP_URL=https://assistant.example.com
   ```

4. Run `DOTENV_CONFIG_PATH=.env.worker npm run assistant:worker` in warehouse-backend. For prompt email delivery during long coding jobs, optionally supervise `DOTENV_CONFIG_PATH=.env.worker npm run assistant:email-worker` from that same repo. The email-only process needs `DATABASE_URL` and email settings, but neither a Gemini key nor repository checkouts. Sending defaults to disabled.

The old `ASSISTANT_EMAIL_REGION` variable is unused and can be removed. No real email was sent during implementation. Sender verification, quotas and recipient restrictions must be checked with your configured account during the live smoke test.

### Delivery guarantees and recovery

A successfully generated **current** AI plan enqueues one email per existing developer in that tenant within the plan-save transaction. Manual edits do not enqueue email. Stale AI output remains saved but does not trigger a review notification. A unique index prevents duplicate enqueueing, row locks prevent concurrent claims, and recipient permission/tenant access is checked again before sending. Emails contain a version and authenticated review link, not the plan or feedback body.

Each API request uses a stable idempotency key derived from its email-outbox ID. Resend documents a [24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys); it is not an unlimited exactly-once guarantee. A receipt is recorded for accepted sends. HTTP 429 responses retry with exponential backoff up to six attempts; explicit other 4xx responses become FAILED. A timeout, malformed response, server error or interrupted send becomes UNCERTAIN and is not automatically resent. Check provider activity before requeueing because an email may already have been accepted, especially outside the provider's deduplication window. SENT means provider acceptance, not confirmed inbox delivery or bounce tracking.

Inspect the provider-independent outbox:

```sql
SELECT id, plan_id, recipient_id, status, attempts, last_error, sent_at
FROM assistant_plan_emails
ORDER BY created_at DESC;
```

After correcting configuration, an operator can requeue a reviewed FAILED record. Requeue UNCERTAIN records only after checking whether the provider already accepted the email:

```sql
UPDATE assistant_plan_emails
SET status = 'PENDING', attempts = 0, locked_at = NULL,
    next_attempt_at = now(), last_error = NULL
WHERE id = '<reviewed-email-job-id>' AND status IN ('FAILED', 'UNCERTAIN');
```

## Coding-worker prerequisites and limits

Coding stays in warehouse-backend. Enable `ASSISTANT_IMPLEMENTATION_ENABLED=true` only on the worker process with:

- The existing warehouse-backend/warehouse-frontend Git checkouts, approved commits and matching installed dependencies.
- GitHub origins without embedded credentials, Git push access and an authenticated `gh` CLI. Configure `ASSISTANT_BACKEND_BASE_BRANCH` and `ASSISTANT_FRONTEND_BASE_BRANCH` if they are not `main`.
- Docker access and a pre-pulled `ASSISTANT_CHECK_IMAGE` (default `node:22-bookworm-slim`). Pin an image digest for controlled deployment.

The runner clones approved commits into temporary directories, limits Gemini to 50 bounded source operations, rejects traversal/symlinks and secret/config/auth/deployment paths, then runs fixed builds/tests in Docker without network, host environment secrets or capabilities. Git metadata and dependency mounts are read-only; host-side commits disable hooks. All changed repositories must pass before publishing draft PRs. Temporary workspaces need operator retention/cleanup. A partial GitHub publish is possible; recorded PR links remain visible if another publish step fails.

The current runner supports application source changes in the two business-code repos. Dependency, configuration, authentication and schema-migration work needs manual handling with a reviewed plan. It does not execute model-provided shell commands, merge PRs or deploy. No separate worker project is required.

## Validation and remaining deployment work

Run backend build/tests and assistant-app build/tests from their own repositories:

```sh
# warehouse-backend
npm run build
npm test -- --runInBand

# warehouse-assistant
npm run build
CI=true npm test -- --watchAll=false --runInBand
```

Tests cover permissions, tenant isolation, stale/duplicate approvals, coding path restrictions, authenticated exact-version links, clipboard export and mail/outbox behavior. Live Gemini, Resend and Docker/GitHub runs still require configured credentials and infrastructure. Implementation has not automatically migrated a database, provisioned Cognito clients, verified email domains or deployed a host.

Failed generation can be retried from the developer inbox. An implementation retry requires a newly reviewed plan version; inspect any workspace/PRs before retrying. Interrupted RUNNING AI/coding jobs are not automatically replayed. Pending coding stays queued while coding is disabled.

Keep feedback tables when resetting testing business data. The existing backend deployment workflows still reference Prisma and must be reconciled with Drizzle and the actual hosting setup before deployment.
