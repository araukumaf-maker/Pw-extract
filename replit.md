# PW Study Vault

PW Study Vault lets PW students sign in with their own PW session and browse enrolled notes, DPPs, and announcements.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/pw-study-vault run dev` — run the PW Study Vault web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string for the shared API template (the PW proxy routes do not persist user data)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/pw-study-vault/` — React/Vite frontend and visual theme
- `artifacts/api-server/src/routes/pw.ts` — server-side proxy for the PW API
- `lib/api-spec/openapi.yaml` — source of truth for the generated PW API hooks
- `lib/api-client-react/src/generated/` — generated client and response types

## Architecture decisions

- PW credentials are not persisted by the app; the frontend keeps the user token in `sessionStorage` and sends it only as a bearer token to the proxy.
- The server proxy normalizes PW's upstream response shapes into the stable OpenAPI contract before returning data to the browser.
- The app only exposes enrolled study resources and does not proxy video or protected lecture content.

## Product

Users can authenticate with an existing PW token or phone OTP, browse batches, subjects, and topics, search notes and DPPs, open/download attachments, view announcements, refresh data, and recover from expired sessions.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
- Keep `dom.iterable` in the API client TypeScript libs because generated fetch helpers call `Headers.entries()`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
