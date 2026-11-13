# Finit assistant integration (staging)

Finit users sign in only with Better Auth. The Finit API validates the session and
sends its user ID to a contributor-only warehouse API route using a dedicated
server-to-server bearer credential. Browser cookies, email addresses and client
Authorization/identity headers are not forwarded. The credential stays in the
API environments; do not put it in Vite, Cloudflare or frontend GitHub variables.

## Server environment

Generate one new integration credential using `openssl rand -hex 32`. Copy the
same value to both API environment files below. Do not reuse BETTER_AUTH_SECRET,
the Gemini key, deployment keys or a Cognito token.

On the Finit server, `/srv/finit-expenses-api/shared/.env`:

```dotenv
ASSISTANT_API_URL=https://api-pahak.finit.am/api/v1/assistant/integrations/finit
ASSISTANT_INTEGRATION_KEY=THE_NEW_SHARED_CREDENTIAL
```

On the warehouse API server, `/srv/warehouse-api/shared/.env`:

```dotenv
ASSISTANT_FINIT_INTEGRATION_KEY=THE_NEW_SHARED_CREDENTIAL
ASSISTANT_FINIT_TENANT_ID=YOUR_EXISTING_DEVELOPER_TENANT_ID
```

Choose the existing warehouse tenant whose developers should review Finit
conversations. Look up the correct tenant ID in PostgreSQL:

```sql
SELECT id, email, tenant_id FROM users WHERE assistant_access = 'DEVELOPER';
```

There is no default tenant ID. Do not guess one. All developers in that tenant
can review Finit feedback, alongside their existing warehouse conversations.
Finit contributors cannot see each other's conversations or warehouse threads.
An unset/short credential or missing tenant setting disables the integration.
All traffic between hosts must use HTTPS; HTTP is allowed only on loopback for
local testing. The existing Nginx proxies and Finit Pages `/api` Function need no
additional route configuration.

On the warehouse worker, `/srv/warehouse-api/shared/.env.worker`:

```dotenv
ASSISTANT_FINIT_REPO=/srv/finit-source/finit-expenses
```

This must be a separate committed checkout of the Finit monorepo root, containing
`apps/api/src` and `apps/web/src`. The worker fetches origin and fast-forwards its current branch before each feedback
plan/regeneration. Optional `ASSISTANT_FINIT_SOURCE_BRANCH=main` pins the expected
branch (it must already be checked out). Latest branch source may include
undeployed code. Do not
point it at a Finit deployment release: those contain compiled backend code only.
The worker needs writable checkout access and non-interactive Git read access
to origin. Dirty, detached, ahead/diverged checkouts or failed fetches fail the
plan instead of using stale source. No manual pull or separate API is needed.
The checkout is used for feedback plans; product questions use the Finit guide
and conversation, with no live expense/database access. Existing worker settings
(DATABASE_URL, GEMINI_API_KEY, GEMINI_MODEL and optional email) still apply. Use
the same PostgreSQL database as the warehouse API. No integration credential is
needed by the worker.

## Deployment order

1. Push/deploy warehouse-backend. Its normal migrator applies
   `0015_assistant_finit.sql`, adding the project discriminator and preserving
   all existing threads as warehouse threads. Back up PostgreSQL using your
   normal deployment procedure. Restart the worker after setting its checkout.
2. Push/deploy warehouse-assistant for the Finit project labels and manual
   implementation controls. Developer authentication continues using Cognito.
3. Push/deploy Finit backend and frontend. The signed-in frontend shows a
   Question / Feedback button. No Cognito registration or second login is needed.

Questions queue AI answers. Feedback queues a proposal for developer review;
contributors can reply but cannot view private plans, approve coding or edit
plans. Developers can copy/edit Finit plans and implement them manually. Finit
coding approvals are rejected server-side and by the coding worker because the
existing runner supports warehouse's two-repository layout, not Finit's monorepo.
After manual implementation, review and deployment, a developer may mark a Finit
plan Deployed—ready to test. Its author can confirm or reopen it.

## Identities and access

Each Finit user gets a deterministic assistant-only users row under the configured
tenant, with a synthetic `@assistant.invalid` email, no password/business role,
and CONTRIBUTOR access. No Cognito user is created. Warehouse Cognito and legacy
JWT guards reject these reserved identities. Existing assistant author/tenant
checks apply, with an additional `project = finit` restriction on integration reads.
Do not grant these identities DEVELOPER or assign business roles.

To revoke one external contributor, set that synthetic row's `assistant_access`
to `NONE`; the integration does not re-enable it. Removing the warehouse
integration key disables all Finit access. Rotate the key on both API processes
and restart them together. A key mismatch is reported as temporary assistant
unavailability without exposing upstream errors or credentials.

## Verify

- Sign in to Finit, ask a product question, and wait for the worker's answer.
- Submit feedback and verify the Finit label and plan in the developer app.
- Use a second Finit account: the first account's threads must not appear.
- Sign out: assistant endpoints must return 401.
- Copy and implement a plan manually; mark it ready to test and confirm from Finit.
- Verify warehouse questions/feedback still use the warehouse guide and sources.

Finit checks: `npm run build`, `npm run test:assistant`, `npm run test:expenses`,
and `node --test scripts/test-proxy.mjs`. The assistant tests use real Better Auth
sessions and a mocked warehouse transport; they do not call Gemini or production.
Warehouse checks: `npm run build`, `npm test -- --runInBand`, and
`npm run test:source-refresh`. Review-app checks:
`npm run build` and `CI=true npm test -- --watchAll=false --runInBand`.
