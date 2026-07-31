# IMPROVEMENTS.md — Codebase Analysis & Technical Roadmap

**Author:** Engineering (AI-assisted review) · **Scope:** `backend/` (Express + Prisma/SQLite + Temporal) and `frontend/` (React + Vite + React Query) · **Status:** Draft for team discussion

## How to read this

This is a snapshot analysis of the TinyEnginy codebase plus a proposed sequencing for closing the gaps, written as a project-management doc rather than a code review. Findings are grouped by area within each project; every item carries a priority:

- **P0 — Critical**: correctness/reliability risk in production paths, fix before building more on top.
- **P1 — High**: meaningfully hurts velocity, quality, or user trust; schedule soon.
- **P2 — Medium**: real but not urgent; bundle with adjacent work.
- **P3 — Nice to have**: polish, do opportunistically.

**Current state of the two README bugs/features:**
- ✅ **Shipped** — "Email verification hangs indefinitely" fix (commit `3ec66ef`, now on `main`): timeout + retry policy on the Temporal workflow, connection/execution timeouts on the backend, and pending-state UI on the frontend.
- ✅ **Shipped** — "CSV import displays invalid country codes" fix (commits `623468c`/`af5acad`): backend normalization/warnings + frontend surfacing.
- 🚧 **In progress** — "Add new lead data fields" (phone, years at current company, LinkedIn) is the active workstream on branch `feature/new-lead-fields`.
- ⬜ **Not started** — "Enrich phone" Temporal workflow.

---

## Backend (`backend/`)

Stack: Express 5, Prisma 6 + SQLite, Temporal for async workflows, Vitest, TypeScript strict. No framework-level layering — the entire REST API lives in `src/index.ts`.

### Codebase Analysis

**Architecture & code organization**
- **[P1]** `src/index.ts` mixes route registration, validation, business logic, and Temporal client wiring in one ~350-line file with no `routes/`, `services/`, or `repositories/` layers. This will get materially harder to extend once new lead fields and the enrich-phone workflow land.
- **[P2]** Bulk-import dedup logic keys on `firstName + lastName` only, ignoring `email` — two different people with the same name collide; the same person with a misspelled name doesn't.
- **[P2]** `PATCH /leads/:id` only updates `firstName`/`email`, silently drops `lastName`, `jobTitle`, `countryCode`, `companyName`, and can write the literal string `"undefined"` when those fields are omitted from the request body (`String(undefined)`).

**Reliability & error handling**
- **[P0]** Several routes (`GET /leads/:id`, `PATCH /leads/:id`, `DELETE /leads/:id`, `POST /leads`) have no `try/catch`. A Prisma error (not-found, `Number(id)` being `NaN`) becomes an unhandled rejection with no global error-handling middleware to catch it — this can crash the process, which also hosts the Temporal worker (`runTemporalWorker()` runs in the same process).
- **[P1]** The shipped `withTimeout()` fix (commit `3ec66ef`) correctly bounds `Connection.connect` and `client.workflow.execute`, but doesn't cancel the raced-out promise — a timed-out Temporal call keeps running in the background (leaked connections / zombie workflow executions). Follow-up: cancel or detach cleanly instead of just racing.
- **[P2]** `POST /leads/verify-emails` processes leads serially in a `for` loop — total request time scales linearly with batch size instead of running verifications concurrently (with a bounded concurrency limit).

**Validation & data integrity**
- **[P1]** No validation library (zod/joi/etc.) anywhere; validation is manual and inconsistent across routes — some (`/leads/bulk`, `/leads/generate-messages`) validate deeply, others (`POST /leads`) barely check truthiness, with no email-format or length checks.
- **[P2]** `normalizeCountryCode` (`src/utils/countryCode.ts`) only checks "exactly 2 letters" via regex — nonsense codes like `"ZZ"`/`"XX"` pass as valid since there's no real ISO-3166-1 alpha-2 list check.

**Security**
- **[P0]** No authentication or authorization on any route — the entire API is open. Fine for a take-home, not for anything real.
- **[P1]** CORS is hand-rolled with `Access-Control-Allow-Origin: *` instead of the `cors` package with an allowlist; no rate limiting anywhere (relevant given the upcoming external provider calls in the enrich-phone feature).

**Observability & developer experience**
- **[P1]** No structured logging (only `console.log`/`console.error`), no API documentation (no OpenAPI/Swagger), no ESLint configuration, no CI pipeline (no `.github/workflows` in the repo at all).
- **[P2]** `.env.sample` documents a MySQL `DATABASE_URL`, but `prisma/schema.prisma` hardcodes SQLite and never reads that env var — misleading for onboarding. Temporal address (`localhost:7233`) and API port (`4000`) are hardcoded rather than configurable.
- **[P3]** `prisma/dev.db` (a binary SQLite file) is tracked in git and shows as locally modified in `git status`; a stray `.DS_Store` is staged for commit. Both should be gitignored.

**Testing**
- **[P1]** Test coverage is limited to two pure-utility files (`countryCode.test.ts`, `messageGenerator.test.ts`). There is zero coverage on Express routes, the Temporal workflow/activity (`verifyEmailWorkflow`/`verifyEmail`), or Prisma interactions — including the email-verification path that was just fixed, which shipped with no regression test.

**Temporal workflow design**
- **[P1]** The shipped `verifyEmailWorkflow` fix (timeout 1s→25s, added `retry: { maximumAttempts: 3 }`) is a reasonable direct fix for the "hangs indefinitely" bug, but as noted above it still needs the cancellation/cleanup follow-up to be fully correct under load.

### Roadmap

| Phase | Workstream |
|---|---|
| **Done** | ✅ Email-verification hang fixed (timeout + retry policy + connection/execution timeouts, commit `3ec66ef`). ✅ CSV country-code validation/normalization shipped. |
| **Now** | 🚧 **New lead fields** (active on `feature/new-lead-fields`): Prisma migration for phone/years-at-company/LinkedIn, updated bulk-import parsing/validation, updated message-generation template fields. |
| **Now** | Small follow-ups on the verification fix while it's fresh: add a regression test for `verifyEmailWorkflow`/`verifyEmail`, and cancel/detach the raced-out promise in `withTimeout()` instead of letting it run in the background. |
| **Next** | Wrap the remaining unguarded routes (`GET/PATCH/DELETE /leads/:id`, `POST /leads`) in try/catch, add a global Express error handler, and introduce a shared validation layer (zod schemas per route) — fix `PATCH /leads/:id` to handle all lead fields correctly as part of this. |
| **Next** | Extract route handlers out of `index.ts` into `routes/` + `services/` layers — worth doing once the new-lead-fields work lands, before the enrich-phone feature adds even more surface area to the same file. |
| **Next** | Build the **enrich-phone** Temporal workflow per the spec: one activity per provider with short timeout + exponential-backoff retry (3 attempts), early-stop on first phone found, idempotency keyed per lead, and a shared abstraction layer to normalize the three providers' differing request/response shapes (`phone` vs `phoneNmbr` vs `number`+`countryCode`, differing auth mechanisms). |
| **Later** | Add auth/authz, rate limiting (especially ahead of the providers' announced future rate limits), structured logging, and OpenAPI docs. |
| **Later** | Replace the naive 2-letter country-code check with a real ISO-3166-1 alpha-2 validation list; revisit bulk-import dedup to use email as (part of) the uniqueness key. |

---

## Frontend (`frontend/`)

Stack: React 18 + Vite (SWC) + TypeScript strict + Tailwind v4 + TanStack React Query + axios. Single-page app (no router) with three components.

### Codebase Analysis

**Architecture & component design**
- **[P1]** `LeadsList.tsx` (~350 lines) owns selection state, delete/verify mutations, dropdown menu state, table rendering, and loading/error/empty states, plus wires up two modals — a strong candidate to split into a toolbar, table, and row subcomponents, with selection logic pulled into a hook.
- **[P2]** The React Query key `['leads', 'getMany']` is duplicated as a magic string across `LeadsList.tsx`, `CsvImportModal.tsx`, and `MessageTemplateModal.tsx` instead of centralized in a query-key factory.
- **[P3]** `useApiMutation.ts` (an elaborate generic mutation wrapper with optimistic-update support) and the `leads.create` endpoint/types are entirely unused — there's no "add a single lead" UI. Either finish wiring it up or remove the dead code.

**Reusability / design system**
- **[P1]** `CsvImportModal.tsx` and `MessageTemplateModal.tsx` duplicate near-identical modal chrome (portal setup, escape-key handling, body-scroll lock, backdrop click, spinner SVG) — prime candidate for shared `Modal`, `Button`, and `Spinner` primitives.
- **[P3]** `@tabler/icons-react` is installed but never imported; every icon is a hand-rolled inline `<svg>`, duplicated per usage. Either adopt the library consistently or drop the dependency.

**Type safety & dead code**
- **[P2]** Strict TypeScript config (`strict: true`, `noUnusedLocals`, etc.) is undermined by `any` in API contracts (`lead: any` inside `bulkImport`'s `errors`/`warnings`) and global `$TSFixMe`/`$TSFixMeFunction` escape hatches in `globalTypes.d.ts`.

**Accessibility**
- **[P1]** Custom modals (`CsvImportModal`, `MessageTemplateModal`) have no focus trap, no `role="dialog"`/`aria-modal`, and don't return focus to the trigger element on close. Icon-only buttons generally lack `aria-label`s, and valid/invalid/warning states in the CSV preview table rely on color alone with no accompanying text/icon for colorblind users.

**Testing**
- **[P1]** The only test file in the frontend is `csvParser.test.ts`. `@testing-library/react` isn't even installed (only `@testing-library/jest-dom` is), so component-level tests for `LeadsList`, `CsvImportModal`, or `MessageTemplateModal` aren't currently possible without adding that dependency first.

**UX consistency & error handling**
- **[P1]** The shipped email-verification fix (`LeadsList.tsx`) correctly adds a spinner/disabled state for the "Verify Email" button, but `verifyEmails`'s per-lead `errors` array is fetched by the API layer and never rendered — failures are still swallowed behind a single generic `toast.error`.
- **[P2]** Warning toasts (e.g., "N leads had an invalid country code cleared") are shown via `toast.error(...)`, which visually signals a hard failure for what is a soft, non-blocking warning.
- **[P2]** The leads-fetch error state recovers via `window.location.reload()` — a full page reload — rather than a React Query refetch/`invalidateQueries` call.
- **[P3]** The "Guess Gender" enrich menu item is visible in the UI but only shows `toast.error('Gender guessing feature is not yet implemented')` when clicked — a stub shipped to users. Either hide it behind a feature flag or remove it until implemented.

**Environment & tooling**
- **[P2]** No `.env.example` for frontend contributors (backend has `.env.sample`), and `frontend/.env` itself appears to be tracked in git rather than gitignored — low risk today (one non-secret URL) but sets a bad precedent.

### Roadmap

| Phase | Workstream |
|---|---|
| **Done** | ✅ Email-verification pending/spinner state shipped on the "Verify Email" button (`LeadsList.tsx`). ✅ CSV import invalid-country-code warnings surfaced. |
| **Now** | 🚧 **New lead fields UI** (active on `feature/new-lead-fields`): table columns, CSV import mapping, and — per the README's explicit callout — redesign message composition (currently a hardcoded `availableFields` array) so it scales as the field list grows (e.g., a searchable/categorized field picker instead of a flat list). |
| **Now** | Small follow-up on the verification fix: surface per-lead `verifyEmails` errors in the table instead of a generic toast. |
| **Next** | Install `@testing-library/react` and add component tests for `LeadsList`, `CsvImportModal`, and `MessageTemplateModal` as a baseline before further refactors. |
| **Next** | Extract shared `Modal`, `Button`, and `Spinner` primitives; do an accessibility pass (focus trap, `role="dialog"`, aria-labels) while touching that code. |
| **Next** | Split `LeadsList.tsx` into smaller components + a selection hook; centralize the `['leads','getMany']` query key. |
| **Later** | Build the **enrich-phone** progress UI: per-lead status (which provider is being tried, found/not-found), wired to the new backend workflow. |
| **Later** | Cleanup pass: remove or finish `useApiMutation`/`leads.create`, resolve the `@tabler/icons-react` question, fix warning-vs-error toast styling, replace `window.location.reload()` with a refetch, tighten `any` usage in API types. |

---

## Cross-Cutting / Platform

Items that don't belong to just one side of the stack:

- **[P0]** **No CI pipeline anywhere in the repo.** Add a GitHub Actions workflow running `lint` + `test` + `build`/`typecheck` for both `backend/` and `frontend/` on every PR — this is the single highest-leverage change, since it would have caught several of the issues above automatically going forward.
- **[P1]** **Environment & secrets convention**: fix the stale `backend/.env.sample`, add a `frontend/.env.example`, stop tracking `frontend/.env`, and move hardcoded values (Temporal address, API port) to env vars with sane defaults.
- **[P2]** **Git hygiene**: gitignore and untrack `backend/prisma/dev.db`; remove the staged `.DS_Store`; consider a seed script for local dev data instead of a committed DB file.
- **[P2]** **API documentation**: an OpenAPI spec (or even a lightweight `docs/API.md`) would help the frontend and backend stay in sync as new fields/endpoints (enrich-phone, new lead fields) are added in parallel.

## Suggested Sequencing Summary

Backend and frontend workstreams are easiest to land in matched pairs so neither side blocks the other:

| Phase | Backend | Frontend |
|---|---|---|
| **Phase 1 — Stabilize** ✅ done / small follow-ups remain | Email-verification fix shipped; remaining: cancellation cleanup, regression test | Verification UX shipped; remaining: surface per-lead errors |
| **Phase 2 — New lead fields** 🚧 in progress (`feature/new-lead-fields`) | Schema migration + bulk-import + message-template support for phone/years/LinkedIn | Table columns + CSV mapping + scalable message-composition UX |
| **Phase 3 — Foundation** | Extract routes/services layer; add validation layer | Extract shared Modal/Button/Spinner + a11y pass; split `LeadsList` |
| **Phase 4 — Enrich phone** | Temporal workflow: 3 providers, retries, idempotency, provider abstraction | Per-lead enrichment progress/status UI |
| **Phase 5 — Harden for production** | Auth, rate limiting, structured logging, OpenAPI docs | Dead-code cleanup, toast/UX consistency pass |

Foundation work (Phase 3) is reordered after the in-flight new-lead-fields work rather than blocking it — better to land the fields feature that's already underway, then refactor `index.ts`/`LeadsList.tsx` once the new surface area (fields, enrich-phone) is fully known.

Plus the cross-cutting **CI pipeline** and **environment/secrets** items, which should land as early as possible (ideally alongside the in-progress Phase 2) since they make every later phase safer and faster.
