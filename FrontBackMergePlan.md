# Front/Back Merge Plan

Living plan for merging the canonical Construkt Anchor backend (top of this repo) with the frontend prototype staged at `frontend-prototype/`.

This document should be updated as the frontend develops. Its job is to keep the team aligned on source of truth, data ownership, schema mapping, and integration steps.

> **Path note (2026-05-06):** Earlier revisions of this plan referenced `ConstruktDev/` and `ConstruktFrontend/Construkt-mar-dev/` as separate sibling repos. Those have been consolidated into this single repo. Read `ConstruktDev/` as **the repo root**, and read `ConstruktFrontend/Construkt-mar-dev/` as **`frontend-prototype/`**.

## Current State

### Backend (repo root)

The repo root is the canonical backend.

It is a Solana Anchor program, not a traditional web backend. There is no REST API, Django API, database, or off-chain application server in V0.

The on-chain accounts are the backend data layer:

- `ProjectAccount`
- `WorkPackageAccount`
- `RoleAssignmentAccount`
- `PaymentRequestAccount`
- `ApprovalRecord`
- SPL Token mint/accounts for mock USDC escrow

### Frontend Prototype: `frontend-prototype/`

The Django/static frontend prototype lives in `frontend-prototype/`, so the working frontend and backend share one development tree.

The backendless demo entry point is `frontend-prototype/web/index.html`. Treat this as the canonical standalone static demo for product-flow walkthroughs and UX iteration before Anchor integration. It should run without Django, a REST API, wallet connection, localnet/devnet, or an Anchor client. Mocked/local-only state is acceptable in this file, but it must not be treated as on-chain truth.

Run any remaining Django/static prototype surfaces from `frontend-prototype/web` only when intentionally working on those legacy/static assets.

The implemented instruction set currently includes:

- `initialize_project`
- `create_work_package`
- `assign_role`
- `set_role_active`
- `fund_escrow`
- `submit_payment_request`
- `add_document_reference`
- `approve_request`
- `reject_request`
- `place_hold`
- `remove_hold`
- `release_payment`

The source of truth is `programs/construkt/src/lib.rs`, with tests under `tests/`.

### Visual Source of Truth Inside `frontend-prototype/`

The active visual source of truth is `frontend-prototype/web/index.html` — a pure static demo (no Django) that links directly to `static/projects/css/construkt.css` and `static/projects/js/construkt.js`. UI behavior is driven by a hardcoded JavaScript `store` object in `construkt.js`.

There are no meaningful Django models, no app database, no API layer, no fetch/axios calls, and no wallet or Anchor client integration.

Two older HTML copies exist alongside it and are now considered **stale archives — do not edit, do not maintain**:

- `frontend-prototype/web/templates/projects/construkt.html` — the Django-templated version (still wired through `web/projects/views.py`, but no longer kept in sync with `index.html`).
- `frontend-prototype/website/construkt.html` — a standalone/exported copy with inlined CSS.

`frontend-prototype/` previously contained a duplicate Anchor workspace and a Django shell. Those were removed on 2026-05-06 (see Phase 1 Cleanup below); the prototype now contains only the static demo (`web/index.html`, `web/static/`) and the frontend unit test suite (`tests/construkt.frontend.ts`).

## Current Frontend Functionality Scan

The prototype is feature-rich as a click-through UI, but all product data is local browser state:

- Hash routes: `home`, `signin`, `dashboard2`, `chart-fullscreen`, `work-package-view`, `upload-task`, `review-task`, `response-task`, `projects`, `project-detail`, and `settings`. Legacy `#dashboard` and `#work-package-detail` hashes should alias to `#dashboard2` and `#work-package-view`.
- Demo role switcher: Finance Director, Project Manager, and Contractor. It controls visible panels/actions only.
- Project views: project list, project detail, work package list, milestone timeline, team list, audit log, and work package detail.
- Workflow modals: create project, add package, fund package, place hold, submit invoice, approve request, reject request, release funds, add team member, add document, and edit document.
- Contract model UI: milestone, valuation, and bespoke project setup paths.
- Document UI: document list, filters, linked-payment selection, package attachment, edit flow, version increment flow, and local file-name display.
- Payment UI: request cards/tables, expandable payment rows, approval timeline, linked documents, and role-specific action buttons.
- V0 dashboard UI: `#dashboard2`, chart fullscreen, task upload/review/response screens, and work-package drilldown using `sessionStorage`.
- Persistence: `localStorage` only stores theme; `sessionStorage` stores temporary task/package navigation context. Business state resets on refresh.

Important implementation anchors in `web/static/projects/js/construkt.js`:

- `store` defines all projects, packages, payment requests, documents, milestones, team members, and audit rows.
- `createProject()` adds inline project metadata and local milestone/team objects.
- `addPackage()` creates nested package objects under a project.
- `fundPackage()` increments `pkg.funded` and updates string status.
- `placeHold()` sets package status to `Locked`.
- `submitInvoice()` appends a nested request object under a package.
- `approveRequest()` always models PM approval and moves to `Pending Finance Review`.
- `rejectRequest()` sets local request status to `Rejected`.
- `releaseFunds()` sets finance approval fields, marks request `Released`, and increments package released amount.
- `addDocument()`, `editDocument()`, and `updateDocument()` manage rich document metadata and version display locally.

## Prototype Gaps To Preserve In Merge Planning

- The navbar currently labels the network as `SOLANA MAINNET`; the V0 integrated app should label localnet/devnet mock USDC clearly.
- Finance release and second approval are conflated in `releaseFunds()`. Backend V0 separates Director/`HighApprover` approval from Finance/project-authority release.
- Holds are package-level UI locks in the prototype, but backend holds are payment-request-level fields.
- Funding and release are GBP-style JS numbers in the prototype, but backend escrow uses SPL Token base units.
- `approveRequest()` is only PM-shaped. The integrated UI needs distinct PM low approval and Director high approval actions.
- Role visibility is not authorization. The integrated UI must compare the connected signer wallet with assigned role accounts and still rely on program errors.
- Project/team/milestone/document detail is richer than the on-chain accounts. That data needs an off-chain metadata adapter.
- The static/Django template is large and tightly coupled to imperative DOM rendering. Porting should extract view models and component boundaries rather than copying the JS store forward as architecture.

## Canonical Repo Decision

This repo (root of `Construkt/`) is the canonical repo for the merged product.

The recommended frontend target is:

```text
app/
```

(at the repo root, sibling to `programs/` and `frontend-prototype/`.)

Use the prototype as a UX/design source, not as the runtime architecture.

## Material Data Differences

| Concern | Backend: Anchor/on-chain | Frontend prototype: JS store |
| --- | --- | --- |
| Source of truth | Solana program accounts fetched via Anchor and IDL | Hardcoded in-memory `store` object |
| Identity | Wallet public keys and transaction signers | Demo role strings and a role switcher |
| Finance | `ProjectAccount.authority` | `finance_director` semantic role |
| PM | `Role::LowApprover` assignment | `project_manager` string |
| Director | `Role::HighApprover` assignment | Not cleanly separated from finance release in the prototype |
| Contractor | `Role::Contractor` assignment and request signer | `contractor` string/name |
| Project metadata | Minimal fields plus `metadata_ref` pointer | Rich inline object: client, contract model, dates, team, milestones |
| Work packages | Separate PDA account per package | Nested `packages[]` array |
| Payment requests | Separate PDA account per request | Nested `requests[]` array inside package |
| Approvals | `ApprovalRecord` PDAs plus request status enum | Flat booleans like `pmApproved`, `fdApproved` |
| Status flow | `Submitted -> LowApproved -> HighApproved -> Released` or `Rejected` | Human strings like `Submitted`, `Pending Finance Review`, `Released`, `Locked` |
| Holds | Request-level fields: `hold_active`, `hold_by`, `hold_ref` | Package-level lock/status behavior through `placeHold()` |
| Money | `u64` token base units, SPL Token escrow vault, checked arithmetic | Plain JS numbers formatted as GBP |
| Documents | `document_ref` string pointer only | Full `documents[]` objects with versions and links |
| Audit | Account state, approval records, transaction signatures, emitted events | Hand-populated `auditLog[]` array |

## Important Integration Rules

1. The UI may explain likely blocked states, but the Anchor program decides what is valid.
2. Role switching is only a demo/navigation aid. It must not imply signing authority.
3. The connected signer wallet must match the required role or authority.
4. Finance is not the high approver. Finance is the project authority and handles funding, holds, and release.
5. PM maps to `LowApprover`.
6. Director maps to `HighApprover`.
7. Holds are request-level in the backend, even if the UI presents them in a package context.
8. Full document storage, project/team metadata, and milestone details are off-chain concerns.

## Off-Chain Metadata Gap

Several backend fields are references, not full payloads:

- `metadata_ref`
- `scope_ref`
- `document_ref`
- `note_ref`
- `hold_ref`

The prototype assumes rich inline data for:

- client details
- contract model
- start/end dates
- team members
- milestones
- document names/types/versions/files
- payment notice style metadata
- audit display text

V0 needs a simple answer for where that data lives.

Options:

- Session/local JSON for a local demo only
- Static seed JSON checked into `app/`
- Supabase or another lightweight database
- IPFS/S3-style document and metadata storage

Short-term recommendation: use a small off-chain metadata adapter in the frontend, backed by seed JSON for demo, with refs written to chain where required. Keep the adapter boundary narrow so it can later point to Supabase/IPFS/S3.

## Proposed Frontend Architecture

Create a React/Vite app:

```text
app/
  src/
    lib/
      anchorClient.ts
      pda.ts
      program.ts
      format.ts
      metadataClient.ts
    selectors/
      projectSelectors.ts
      paymentSelectors.ts
      auditSelectors.ts
    components/
    pages/
```

### Client Layer

`anchorClient.ts` should own:

- wallet/provider setup
- program ID and IDL loading
- account fetches
- transaction submission
- SPL token balance reads
- transaction signature capture

`pda.ts` should own all PDA derivations:

```text
["project", authority, project_id]
["work_package", project, package_id]
["vault_authority", work_package]
["role", work_package, role_byte, wallet]
["payment_request", work_package, request_id]
["approval", payment_request, role_byte]
```

Role seed bytes:

```text
Contractor = 1
LowApprover = 2
HighApprover = 3
```

### Selector/View Model Layer

Selectors should translate raw Anchor accounts into UI-friendly view models.

Example responsibilities:

- Convert `PaymentRequestStatus` enum to display labels.
- Merge `PaymentRequestAccount` and `ApprovalRecord[]` into an approval tracker.
- Compute release blocked reasons from fetched state.
- Convert token base units into mock USDC display values.
- Resolve `metadata_ref`, `scope_ref`, `document_ref`, and `note_ref` through the off-chain metadata adapter.
- Build audit timeline rows from current account state, approval records, transaction signatures, and events where available.

This keeps React components clean and avoids scattering Anchor-specific shapes through the UI.

## Prototype Function Mapping

| Prototype function | Backend-backed replacement |
| --- | --- |
| `createProject()` | `initializeProject()` plus metadata ref creation |
| `addPackage()` | `createWorkPackage()` plus scope metadata ref |
| `addTeamMember()` | Usually `assignRole()` for V0 roles; richer team data stays off-chain |
| `fundPackage()` | `fundEscrow()` |
| `submitInvoice()` | `submitPaymentRequest()` |
| `addDocument()` / `updateDocument()` | Off-chain metadata update plus `addDocumentReference()` when linked to active request |
| `approveRequest()` | Split into PM `approveRequest({ lowApprover: {} })` and Director `approveRequest({ highApprover: {} })` actions |
| `rejectRequest()` | `rejectRequest(role, noteRef)` |
| `placeHold()` | `placeHold(holdRef)` on the active request |
| `releaseFunds()` | `releasePayment()` |

## Merge Plan

### Phase 1: Stabilize Boundaries

Resolved 2026-05-06:

- ✅ Repo root is canonical. The on-chain program at `programs/construkt/` and the tests at `tests/` are the source of truth.
- ✅ Do not merge `frontend-prototype/programs/construkt/`. It is a stale snapshot (~537 lines vs canonical ~1381) and must not flow back into the canonical program.
- ✅ Keep `frontend-prototype/web/index.html` as the backendless demo surface until its UX is intentionally migrated.
- ✅ Authoritative visual source = `frontend-prototype/web/index.html`. The two stale `construkt.html` copies were deleted (see Phase 1 Cleanup below).
- ✅ Phase 1 cleanup executed: duplicate Anchor workspace, frozen HTML archives, and Django shell deleted from `frontend-prototype/`.
- ✅ `app/` scaffolded at the repo root (Vite + React 19 + TypeScript + ESLint flat config + Prettier 3). Base folder structure (`src/lib/`, `src/selectors/`, `src/components/`, `src/pages/`) seeded with `.gitkeep` placeholders. `npm run build` and `npm run lint` both green.
- ✅ Frontend PDA helpers ported to `app/src/lib/pda.ts` (project, work_package, vault_authority, role, payment_request, approval) plus `ROLE_BYTES` constants and a `u64Seed` helper. Vitest added; `npm test` runs 14 cases including six golden-PDA regressions.
- ✅ Typed `ConstruktClient` interface in `app/src/lib/program.ts` with all 12 instructions, all 5 account fetches (single + per-parent), and a typed `ConstruktClientError` mirroring on-chain error codes. `MockConstruktClient` in `app/src/lib/mockClient.ts` enforces status flow, hold blocking, single-active-request, contractor-cannot-approve, finance-only release, and approver-role conflict. `app/src/lib/anchorClient.ts` is a Phase 4 stub that throws on construction. 28 vitest cases cover happy path + invariants.

Phase 1 is now fully closed.

### Phase 1 Cleanup (executed 2026-05-06)

Removed from `frontend-prototype/` on the `Frontback-integration` branch — recoverable from git history if needed:

- Duplicate Anchor workspace: `Anchor.toml`, `Cargo.toml`, `Cargo.lock`, `programs/`, `migrations/`, `tests/construkt.ts` (old single-file test), `scripts/wsl-anchor-test.sh`. Canonical Anchor program and tests at the repo root are unaffected.
- Frozen HTML archives: `web/templates/projects/construkt.html`, `website/construkt.html`. `web/index.html` is now the only HTML entry point.
- Django shell: `web/manage.py`, `web/construkt_web/`, `web/projects/`, `web/requirements.txt`. The prototype is now pure static.

Intentionally kept: `frontend-prototype/tests/construkt.frontend.ts` (the active 75-test frontend unit suite, run from the repo root via `npm run test:frontend`), plus `frontend-prototype/package.json` / `tsconfig.json` (still useful for editor/test tooling inside the prototype tree).

### Phase 1 Implementation Notes

Issues, decisions, and limitations recorded per step so future phases inherit the context.

**Step 1 — Stabilize boundaries**

- The plan was originally written when `ConstruktDev/` and `ConstruktFrontend/Construkt-mar-dev/` were separate sibling repos. Both have since been consolidated into this single repo, so every path in the plan had to be rewritten (`ConstruktDev/` → repo root, `ConstruktFrontend/Construkt-mar-dev/` → `frontend-prototype/`). Always re-check path references against the repo before acting on plan instructions.
- The plan asked us to choose between `web/templates/projects/construkt.html` and `website/construkt.html`, but a third file — `frontend-prototype/web/index.html` — had quietly become the active visual source. Both `construkt.html` copies were demoted/deleted instead of one being kept.
- `frontend-prototype/tests/` could not be blanket-deleted. It held both the dead Anchor test (`construkt.ts`) and the live frontend unit suite (`construkt.frontend.ts`) which root `package.json` runs directly. Only the dead file was removed.
- The duplicate Anchor program at `frontend-prototype/programs/construkt/src/lib.rs` was 537 lines vs the canonical 1381 — significantly stale, not a small drift. Treat any future "duplicate workspace" as definitionally not canonical.

**Step 2 — Scaffold `app/`**

- Vite's scaffolded boilerplate uses formatting that doesn't match Prettier 3 defaults (mostly single vs double quotes), so the freshly generated files failed `npm run lint` immediately and had to be auto-formatted. Same will happen on any future Vite upgrade.
- Plan §2.3 says "match the existing repo's Prettier conventions". The repo uses Prettier `^2.6.2`, but the React 19 / TS 6 / TSX ecosystem inside `app/` is much better served by Prettier 3.x. We diverged inside `app/` — each package gets its own deps. Backend-only paths still run on Prettier 2.

**Step 3 — Port PDA helpers**

- Used `Uint8Array` instead of `Buffer` for seed building so the module is browser-ready without a Vite polyfill plugin. The on-chain test setup at `tests/setup.ts` uses `Buffer`; functional behavior is identical, but the diff is intentional, not stylistic.
- The "golden PDA" tests are computed by the same `@solana/web3.js` library the port uses, so they catch our regressions and library-version drift but do **not** independently verify the port matches the on-chain program. True cross-verification needs a localnet integration test (WSL only). Deferred to Step 14 (Anchor wiring).

**Step 4 — Client interface, mock, anchor stub**

- TypeScript `verbatimModuleSyntax` (Vite scaffolding's default) requires `import type` for type-only imports. Runtime classes (`ConstruktClientError`) and runtime values (`ROLE_BYTES`, `derive*`) had to be separated from interface/type imports. New files in `app/src/` should follow the same pattern.
- TS `noUnusedParameters` and ESLint `no-unused-vars` both fire on the Phase 4 stub's unused `opts` arg. Resolved project-wide by adding `argsIgnorePattern: '^_'` to `app/eslint.config.js`. Future stubs/placeholders should prefix unused args with `_`.
- Used `bigint` for all `u64`/`i64` fields instead of Anchor `BN`, so `bn.js` never leaks into the UI layer. The future Anchor adapter at `app/src/lib/anchorClient.ts` will translate at its boundary.
- Mock limitations to remember when reading mock-driven tests: no real SPL token mechanics — no mint matching, no ATA ownership checks, no vault balance independent of `funded_amount`. The mock cannot reproduce `WrongMint` / `WrongTokenOwner` failures. Phase 4 must add integration tests that exercise those paths against localnet.

**Step 10 — Mock seed (Demo Hospital Fit-Out)**

- Demo wallets are derived via `Keypair.fromSeed(new Uint8Array(32).fill(N))` so they're deterministic across runs but obviously demo-only. The fill byte doubles as a label (1 = finance, 2 = PM, 3 = director, 4 = contractor, 10 = mint). Never use this pattern for production keys.
- The seed exports `Keypair` (not just `PublicKey`) for the demo wallets so Phase 4's localnet path can fund and sign as them without a second derivation. The mock itself only consumes the public keys.
- Off-chain rich fields (org names, milestone copy, contract model, contractor full name) are intentionally excluded from the seed — they belong to the metadata adapter (Step 12). The seed only stores opaque ref strings (`metadata://demo/...`).
- All amounts are `bigint` and use mock-USDC base units (6 decimals): `200_000_000n` = $200.00. Cap and funding are equal per package so the demo never trips `InsufficientRemainingCap` accidentally.
- Status coverage was deliberately spread across six packages (released, highApproved, lowApproved, submitted-on-hold, no-request, rejected) so Phase 2 surfaces have one canonical example of every UI state without needing additional fixtures.

**Step 11 — Selector layer**

- Selectors are placed under `app/src/selectors/` per the plan's proposed architecture; money helpers stay in `app/src/lib/format.ts`. Selectors do **not** import the client — they take `Fetched<…>` data as plain arguments. UI composition is responsible for fetching the right inputs and feeding them in.
- `paymentRequestDisplayStatus` collapses on-chain `status` + `holdActive` into eight UI-relevant values. Terminal statuses (`released`, `rejected`) ignore `holdActive` so the UI doesn't accidentally show "on-hold released" — matches the on-chain rule that holds can't be placed on terminal requests.
- `selectReleaseReadiness` mirrors the runtime guards in `release_payment` exactly (cap, funded-remaining, status === HighApproved, hold, package active). When this selector reports `ready: true` and the Anchor adapter still rejects, it's a token/ATA mismatch — the mock cannot detect those, so flag any divergence as a Phase 4 integration bug, not a selector bug.
- `formatMockUsdc` truncates rather than rounds. Finance demos showing rounded-up amounts caused confusion when the on-chain release amount was lower than the displayed value; truncation guarantees the displayed amount is always ≤ the on-chain amount. `parseMockUsdc` rejects too many fraction digits (more than the mint's decimals) instead of silently truncating, so form validation can surface user-visible errors at the boundary.
- `selectAuditTimeline` is best-effort over current account state. Known limitations (documented in source): no funding-history, no document-ref edit history, no past-hold visibility, no package-creation event. Phase 4 must capture program events (`PaymentRequestSubmitted`, `EscrowFunded`, `HoldRemoved`, etc.) to fill these gaps; until then the audit log is structurally incomplete and any "audit completeness" claim should defer to Phase 4.
- `filterProjectsByContractor` uses a `Map<string, Fetched<WorkPackageAccount>[]>` keyed by base58 project address rather than nested loops — selector callers should pre-build the map once per render to keep the dashboard cheap as the project count grows.

**Step 12 — Off-chain metadata adapter**

- Read and write surfaces are split into `MetadataClient` and `MetadataWriter`. The UI imports `MetadataClient` only; `MetadataWriter` is for the demo seed today and a real backend's mutation path tomorrow. Splitting now means the UI never accidentally gains a write path it shouldn't have.
- `MockMetadataClient` deep-clones on both read and write. Without this, mutating a returned object would silently edit the underlying seed — a subtle source of cross-test bleed since selectors and components hold onto these objects across renders.
- The on-chain seed (`mockSeed.ts`) and the metadata seed (`metadataSeed.ts`) **both** derive `metadata://demo/...` ref strings from the same slug rule rather than importing one from the other. The `metadataSeed.test.ts` round-trip tests verify that every on-chain `documentRef` and `holdRef` actually resolves through the metadata client — if the slug rule drifts in either file, those tests fail loudly. Do not collapse the duplication without keeping that round-trip check.
- All metadata timestamps are ISO-8601 strings, not on-chain `bigint` Unix seconds. The on-chain side uses `bigint` for `i64` fields; the UI converts at the boundary. Tests use a fixed `now` so seeded values are reproducible.
- The Director demo wallet's display name (`Lin Park`) was added at the metadata layer because the prototype's hardcoded store conflated finance and director. Do not assume `Maya Shah` plays both roles — the integrated UI must treat finance authority and director approver as distinct identities even when only one of them is rendered on a given screen.

**Step 6 — Layout & visual language**

- Design tokens were copied (not imported) from the prototype's `:root` into `app/src/styles/tokens.css`. Both files must drift together until the prototype is retired; visual regressions are easier to spot when both build off the same custom-property names.
- Each component pairs `Component.tsx` with a sibling `Component.css` imported from the component itself. No CSS-in-JS, no module-css runtime — keeps the bundle small and the CSS inspectable in DevTools without source-map gymnastics. As the surface grows we can swap to module-css, but the breakpoint isn't here yet.
- `RoleBadge` is intentionally **display-only** at this step. The interactive role switcher waits for Step 8 so we don't ship a half-working role-change UI that doesn't actually re-filter data.
- `NetworkBadge` is the canonical place to surface the active network. Per the plan's landmines list ("Do not ship the current `SOLANA MAINNET` label"), the formatter in `lib/theme.ts` mechanically excludes mainnet — the test suite asserts that. Always go through `networkBadgeContent` when displaying the network anywhere, do not hand-format strings.
- The Vite welcome page (`hero.png`, `react.svg`, `vite.svg`, `public/icons.svg`) was deleted in this step now that `App.tsx` renders the real shell. The boilerplate references in the previous `App.css` were a near-miss for shipping into the integrated demo — flag and remove generated boilerplate as soon as a real surface lands on top of it.
- Visual verification on this step is **build + lint only**. There is no headless DOM env in the test runner yet, and I cannot open a browser from this session. Visual regressions on `AppHeader`, `NetworkBadge`, `RoleBadge`, and `ThemeToggle` need a manual `npm run dev` pass before sign-off.

**Step 7a — Router, ClientsProvider, Project List**

- Hash routing is implemented in 60 lines (`app/src/lib/router.ts`) rather than pulling in `react-router`. Surface is small enough that the dependency cost outweighs the convenience; revisit if/when nested routes show up.
- `parseHash` maps legacy aliases (`#dashboard` → `dashboard2`, `#work-package-detail` → `workPackageView`) per Step 5's V0 scope decision. New tests assert this; legacy URLs from the prototype keep working.
- `useClients` was extracted into `app/src/components/clientsContext.ts` separately from `<ClientsProvider>` because the `react-refresh/only-export-components` lint rule rejects mixed component + non-component exports. This pattern (provider + sibling hook file) should be the default for future contexts in this app.
- `<ClientsProvider>` accepts an `override` prop so tests and alternative composition roots (Phase 4 Anchor adapter, future Storybook) can inject a pre-built bundle without going through the demo seed.
- Bundle size jumped from ~193 KB to ~460 KB on this step. The cost is `@solana/web3.js` becoming a runtime dependency (it was already in tests). The Anchor adapter in Step 14 will add `@coral-xyz/anchor` on top — budget for ~600 KB total before we worry about code-splitting.
- `Money` is the canonical component for rendering token amounts. Components must not call `formatMockUsdc` directly from JSX so the truncate-not-round contract stays a single chokepoint.
- `StatusPill` tones (`info` / `warning` / `success` / `error` / `neutral`) match the `ApprovalChipTone` set returned by payment selectors so selector output flows through unchanged.

**Step 7c — Work Package View**

- `WorkPackageViewPage` (`#work-package-view?address=…`) renders one work package end-to-end: header (project breadcrumb, contractor, scope), escrow balance panel with cap/funded/released bar, payment-request list (newest first), document panel, package-scoped audit log, plus an aside with approval tracker, release-readiness panel (driven by `selectReleaseReadiness`), and team list. The "approve" / "reject" / "release" buttons themselves are deliberately deferred to Step 8 — this step ports the surface and read paths only, not the write actions.
- `selectAuditTimeline` is project-wide; the page filters its output to events whose `workPackageAddress` matches and drops the `projectCreated` row, keeping the log focused on this package without duplicating selector logic. If a future selector adds package-scoped audit support, swap to that and drop the inline filter.
- The release-readiness panel surfaces `selectReleaseReadiness(activeRequest, pkg).reasons` verbatim through `releaseBlockedReasonLabel`. This is the same selector finance will eventually call right before invoking `releasePayment`, so divergence between displayed reasons and the on-chain rejection at write time is a Phase 4 integration bug, not a UI bug.
- Balance bar uses two stacked layers (funded behind, released in front) computed via a `pctOf(part, whole)` helper that does the bigint→percent dance (multiply by 10000, then divide, then divide by 100) to keep one decimal of precision without floating-point drift on large `u64` values. Both layers clamp to [0, 100].
- Active-request detection compares `pkg.activeRequest` against each fetched request via `PublicKey.equals` rather than relying on status — this stays correct if the on-chain semantics ever distinguish "currently active" from "in a non-terminal status".
- Package heading defers to `scope.description.split(".")[0]` (matches `ProjectDetailPage`'s pattern), then falls back to `Package #${packageId}` when no scope metadata is seeded. Don't switch to `scope.contractModel` for the title — the contract model is shown on the package metric strip and conflating the two muddies the navigation hierarchy.
- Documents panel is built by deduping `documentRef` across all requests on the package, so a request that updated its document reference twice still shows once. This matches the on-chain reality (only the latest `document_ref` is preserved), and is documented as a known audit-log gap in Step 11 notes — the unique view is the right shape for V0.
- Document file-icon uses the filename's extension. If the filename is missing (metadata not seeded), the icon falls back to "DOC" so the row still renders.
- Page is not unit-tested. As of Step 7a, no DOM env is wired into vitest (selectors and lib helpers still take all 125 cases). The selector inputs the page composes are individually covered; the page itself needs manual `npm run dev` verification or a Phase 4 happy-path E2E to be confidence-checked.

**Step 7d — Dashboard2**

- `Dashboard2Page` (`#dashboard2`) is the canonical V0 landing surface for all four demo roles. Renders: role-aware welcome header, cross-project KPI strip (projects, packages, total cap, funded, released, outstanding, active requests, holds), role-filtered Outstanding Tasks panel, project quick-access cards, and a Recent Activity feed (newest-first, capped at 8 across all visible projects).
- Outstanding-task list is built by a single `roleMatchesActiveRequest(role, displayStatus)` switch so each role's "what's mine to do" derives from selector output without bespoke per-role queries. Finance sees `highApproved` (release) + every `*OnHold` (review hold); PM sees `submitted` (approve); Director sees `lowApproved` (approve). Contractor is the only role with two task sources: their request statuses become "Awaiting …" reminders, and packages with funded balance but no active request prompt a "Submit invoice".
- Project visibility for the contractor uses `filterProjectsByContractor` — same selector the project list uses, so contractor scope is identical across surfaces. Other roles see all projects (V0 demo data is single-project anyway; the cross-project plumbing is in place for when more seeds land).
- Recent Activity reuses `selectAuditTimeline` per project then merges, sorts newest-first, and slices. Per-event project name is added inline so the feed stays single-line readable. Audit-log gaps documented in Step 11 (no funding history, no past-hold visibility) apply here too — what's missing on the work-package surface is also missing on the dashboard feed.
- Activity dot tone derives from `AuditEventKind` only (success / warning / error / info / neutral), not from the request status — this keeps dashboard color semantics independent of any later changes to `paymentRequestChipTone`.
- KPI strip uses `aggregateKpis(bundles)` with `bigint` sums everywhere; no `Number` casts on `u64` totals. The shape mirrors `ProjectRollup` so a future `selectCrossProjectRollup` selector could replace this inline aggregator without touching the page.
- Active-request fan-out is a sequential await loop (project → package → request → approvals) rather than `Promise.all` to keep the mock client's deterministic ordering. Phase 4 may switch this to parallel against Anchor when network latency dominates; the mock is in-memory so the loop is fine.
- Home placeholder CTA gained an "Open dashboard" button alongside "Browse projects" — matches the prototype's behaviour where the navbar logo lands on `#dashboard2`.
- Same testing caveat as Steps 7a–7c: the page itself is not unit-tested (no DOM env yet); selector inputs are individually covered by the existing 125 cases. Visual verification needs `npm run dev`.

**Step 8a — Functional RoleSwitcher**

- Replaced display-only `RoleBadge` (and its CSS) with `RoleSwitcher` — a styled native `<select>` driving role state hoisted to `App.tsx`. All four pages (Dashboard2, ProjectList, ProjectDetail, WorkPackageView) re-derive their data from the new role on change because role flows down from the same `useState` that previously rendered the badge.
- Native `<select>` rather than a custom listbox: gets keyboard, screen-reader, and mobile-touch behavior for free; the visual cost is just hiding the OS chevron and overlaying our own SVG. If a future surface needs a non-`select` control (e.g. with avatar chips), revisit; for the header, `<select>` is the right amount of UI.
- Added `DEMO_ROLES` (readonly tuple, Finance first) to `lib/theme.ts` so the switcher iterates from a single source rather than re-hardcoding the four values. 3 new vitest cases assert the tuple matches the `DEMO_ROLE_LABEL` keys + Finance-first ordering — these would catch a quiet drift if a fifth role gets added to the union but missed in the tuple.
- The component carries a "Demo role" caption inside the badge so it remains visually obvious the switcher is **not** signing authority. This matches the plan's "Role visibility is not authorization" landmine — Phase 4 must wire the actual signer wallet before this control could ever be conflated with permissions.
- Deleted `RoleBadge.tsx` + `RoleBadge.css` rather than keeping a read-only variant. No remaining caller; YAGNI per the project's "don't add features beyond what the task requires" rule. Recoverable from git history if a read-only badge is later needed.

### Phase 2: Port Prototype UX

Ground rules:

- Port useful layout, visual language, and page concepts from the static prototype at `frontend-prototype/web/index.html`. The prototype is the design reference; do not carry the in-memory `store` forward as runtime architecture.
- Keep React UI state for form drafts, selected demo role, pending tx state, and current-session tx history only. Everything else comes from `ConstruktClient` + `MetadataClient` via the selectors.
- Replace the prototype's Finance-only release flow with the explicit PM-approve → Director-approve → Finance-release split that the on-chain program enforces.

#### V0 Screen Scope (Step 5 — resolved 2026-05-07)

`✅ in V0` = ported into `app/`, must work end-to-end on the demo path.
`🟡 polish` = keep the prototype version as a static reference, not ported into `app/` for V0; revisit once the V0 demo is signed off.
`🗑 retire` = drop entirely; superseded by the V0 design.

| Prototype hash route | V0 status | Notes |
| --- | --- | --- |
| `#home` | ✅ in V0 | Public landing page; one CTA into `#signin`. |
| `#signin` | ✅ in V0 | Demo wallet + role picker (no real auth). |
| `#dashboard2` | ✅ in V0 | Canonical V0 dashboard for all three roles. |
| `#projects` | ✅ in V0 | Project list. Contractor view filtered via `filterProjectsByContractor`. |
| `#project-detail` | ✅ in V0 | Project header, package list, team panel, audit log. |
| `#work-package-view` | ✅ in V0 | Single package surface for PM + Contractor + Finance. |
| `#dashboard` (legacy) | ✅ in V0 | Alias only — redirect to `#dashboard2`. |
| `#work-package-detail` (legacy) | ✅ in V0 | Alias only — redirect to `#work-package-view`. |
| `#settings` | 🟡 polish | Render a read-only stub for V0 (theme + demo role display); defer the rest. |
| `#chart-fullscreen` | 🟡 polish | Keep on the prototype; not on the V0 demo path. |
| `#upload-task` | 🟡 polish | Document upload UX is in scope as part of `#work-package-view`'s document panel — the dedicated task screen is not. |
| `#review-task` | 🟡 polish | PM approval/rejection happens inside `#work-package-view` for V0; the standalone review screen is deferred. |
| `#response-task` | 🟡 polish | Contractor responses live inline in the document panel for V0; the standalone screen is deferred. |

#### V0 Modals (must work end-to-end)

These are entry points for the on-chain instructions and gate the demo flow. Each one maps to exactly one `ConstruktClient` write call (plus optional `MetadataWriter` updates):

| Modal | Calls | Available to |
| --- | --- | --- |
| Create project | `initializeProject` | Finance |
| Add work package | `createWorkPackage` | PM (off-chain draft) → Finance approves on-chain in V0 |
| Fund package | `fundEscrow` | Finance |
| Assign team member | `assignRole` | Finance |
| Submit invoice | `submitPaymentRequest` | Contractor |
| Add / edit document | metadata write + `addDocumentReference` when linked to active request | Contractor |
| Place hold | `placeHold` (selects an active request, not the package) | Finance |
| Remove hold | `removeHold` | Finance |
| Approve request (PM) | `approveRequest({ role: 'lowApprover' })` | PM |
| Approve request (Director) | `approveRequest({ role: 'highApprover' })` | Director |
| Reject request | `rejectRequest` | PM or Director |
| Release payment | `releasePayment` | Finance |

#### Per-role landing surfaces

- **Finance Director**: lands on `#dashboard2` with the cross-project KPIs; can navigate to any project, fund packages, place/remove holds, and release.
- **Project Manager**: lands on `#dashboard2` filtered to their projects; can create packages (off-chain draft), assign roles (with Finance), approve/reject as `LowApprover`.
- **Director (HighApprover)**: lands on `#dashboard2` showing requests pending HighApprover sign-off; approves/rejects as `HighApprover`.
- **Contractor**: lands on `#dashboard2` showing only the projects with at least one assigned package; can submit invoices, upload documents, view release status.

#### Out-of-scope for V0

- Variation requests / variation flow.
- Materials vesting certificate, certificate of practical completion, site photos, progress reports — represented as document type metadata only; richer per-type UI deferred.
- Internal package milestones / payment schedules.
- Document-request workflow (PM requests doc from contractor).
- Multi-project KPIs beyond the seed dataset.
- The chart-fullscreen visualization and the dedicated task screens listed above.

### Phase 3: Data Adapter

- ✅ Mock client adapter with backend-shaped data — `app/src/lib/mockClient.ts` (Step 4) plus `app/src/lib/mockSeed.ts` (Step 10).
- ✅ Seed-data source decision (2026-05-06): **mirror the prototype's "Demo Hospital Fit-Out" narrative**. Backend test fixtures are minimal and aimed at correctness, not demo continuity; the prototype already has stakeholder-recognizable copy and a known-good UX shape against the same data. The seed builds one project plus six work packages spanning the full status spectrum (released, highApproved, lowApproved, submitted-on-hold, funded-only, rejected) so Phase 2 surfaces have material to render.
- ✅ Selector layer at `app/src/selectors/` (Step 11) — `paymentSelectors.ts`, `projectSelectors.ts`, `auditSelectors.ts` — plus money helpers at `app/src/lib/format.ts`. Selectors are pure functions over `Fetched<…>` account data; the UI composes them, the client never appears in selector code.
- ✅ Off-chain metadata adapter at `app/src/lib/metadataClient.ts` (Step 12). `MetadataClient` (read) and `MetadataWriter` (write) are split interfaces; `MockMetadataClient` satisfies both. `seedDemoMetadata` in `app/src/lib/metadataSeed.ts` populates the Demo Hospital Fit-Out narrative (Northstar Health Trust, Maya Shah / Eleanor Lane / Lin Park / Daniel Okafor) keyed off the same ref strings the on-chain seed produces.
- ✅ Prototype rich fields are mapped onto metadata categories per the table below; refs stay opaque on chain.
  - project client, contract model, dates, team -> `metadata_ref` → `MetadataClient.resolveProject`
  - package descriptions, contractor display names, package contract model, internal milestones -> `scope_ref` → `resolvePackageScope`
  - document filenames, versions, uploader, type, URLs -> `document_ref` → `resolveDocument`
  - approval/rejection notes -> `note_ref` → `resolveNote`
  - hold reasons -> `hold_ref` → `resolveHold`

### Phase 4: Anchor Integration

- Load generated IDL.
- Connect wallet/local demo signer.
- Replace mock setup calls with Anchor instructions.
- Fetch project, package, request, role, approval, and token account state.
- Capture transaction signatures.
- Surface program errors in user-friendly copy.
- Read SPL token balances for finance token account, vault, and contractor destination account.
- Display PDA/account addresses in setup/debug affordances so demo failures are traceable.

### Phase 5: Demo Completion

- Demonstrate full flow on localnet/devnet:
  - finance creates project/package
  - finance assigns contractor, PM, director
  - finance funds escrow
  - contractor submits request
  - PM approves
  - director approves
  - finance places/removes hold
  - finance releases
  - contractor token balance increases
- Demonstrate blocked states:
  - wrong signer
  - early director approval
  - duplicate approval
  - second active request
  - release before approvals
  - release during hold

## Frontend-Specific Merge Tasks From Current Prototype

- Replace the prototype `store` with a `ConstruktClient` mock adapter that mirrors Anchor account shapes.
- Move money formatting behind helpers that can display mock USDC token units; do not hard-code GBP as the canonical unit.
- Add a Director role/view/action path. The current role switcher has Finance, PM, and Contractor only.
- Split `releaseFunds()` into selector-derived release readiness plus an explicit `releasePayment()` transaction.
- Rework `placeHold()` so the UI asks for/selects an active request, not only a package.
- Keep the document table/version UI, but route content through an off-chain metadata client and write only refs/hashes to chain.
- Replace static "View on chain" links with transaction signature/account explorer links once signatures and addresses are available.
- Add wallet/signer display separate from demo role display.
- Remove or relabel `SOLANA MAINNET` in the prototype navbar before any localnet/devnet demo.
- Avoid copying `sessionStorage` task state into the integrated architecture; `dashboard2` is now V0 scope, but its transient state should still be replaced by view models/selectors.

## Project And Work Package Ownership Workflow

The frontend prototype is now modelling this intended V0 workflow:

- Finance Director creates a project.
- During project creation, Finance invites or assigns the Project Manager owner.
- Project creation supports two client contexts:
  - end-client projects, such as University of Exeter, where no external `Client / Organisation` field is needed
  - contractor-created projects, where `Client / Organisation` is shown and a project-level contract model can be recorded as reference
- Project-level contract model is reference metadata only; a project can still contain multiple package contract models.
- Project Manager creates work packages inside assigned projects.
- Contract type is selected at work package creation: milestone-based, valuation-based, or bespoke schedule.
- Work packages are not assigned to project milestones.
- Some work packages may contain their own internal milestones/payment schedule, but those belong to the package.
- New work packages always begin as `Estimated`.
- A package may show `Awaiting Finance Approval` once contractor selection and budget agreement are represented.
- Finance Director approval is the future integration point for escrow locking through the Anchor backend.
- After Finance approval/escrow lock, the package moves to `In Progress`.
- Contractor contracts are represented as assignments to work packages.
- Contractor `dashboard2` should show only projects where they have assigned work packages, then the assigned work packages under each project.
- The Contractor Projects page should use the same assignment filter, so contractors do not see unrelated projects.
- The shared package surface is `#work-package-view`; Contractor and Project Manager package links should land there for package-level actions.
- Contractor work package bars mirror the Finance/PM funding visual, but at package level:
  - released funds
  - submitted invoice requests
  - not-yet-invoiced package value
  - contested or held value
- Contractors can submit invoices against a work package to request escrow release. The release basis depends on package contract terms: whole package, package milestone/payment schedule, valuation period, or bespoke trigger.
- Contractors can submit variation requests against the work package only, never against project milestones. Cost and time changes should generally be separate variation claims.
- Contractors can upload package documents, including materials vesting certificates, certificates of practical completion, site photos, and progress reports. Documents may include an optional package milestone reference for context.
- Project Managers can request package documents from the assigned contractor.
- Project Managers can approve or reject contractor invoices with review notes.
- Project Managers can submit package-level variation requests. Those move to Finance approval, then to contractor agreement.
- Project Managers can approve or reject contractor-submitted variation requests before Finance review.
- A package moves to `Completed` only when no disputes, work, invoices, or payments remain open.

Backend mapping note: Project Manager package creation is mostly off-chain/project metadata until Finance approval. Finance approval should call the backend instructions that create/fund/lock the on-chain escrow state for the selected contractor and approved package budget.

## Open Decisions

- ~~What off-chain metadata store should V0 use?~~ Resolved 2026-05-06 (Step 12): in-memory `MockMetadataClient` for V0 demo. The `MetadataClient` / `MetadataWriter` interfaces are the contract; Phase 4+ can swap in Supabase / IPFS / S3 by satisfying them. Selectors and components must always go through `MetadataClient`, never a concrete impl.
- ~~Which prototype pages are in V0 scope versus later polish?~~ Resolved 2026-05-07 (Step 5): see the **V0 Screen Scope** table under Phase 2 above.
- ~~Which `dashboard2` task workflow screens should remain in the main demo path versus staying as secondary polish?~~ Resolved 2026-05-07 (Step 5): `#upload-task`, `#review-task`, `#response-task` are all 🟡 polish for V0. Their flows are absorbed into `#work-package-view`'s document panel and approve/reject modals.
- When should the backendless `frontend-prototype/web/index.html` demo be retired or migrated into the React/Vite app?
- How will local demo wallets be created and selected?
- Where should generated IDL and TypeScript types live for frontend consumption?
- What is the minimum audit trail for the first integrated demo?
- Which prototype pages are in V0 scope versus later polish?
- Which `dashboard2` task workflow screens should remain in the main demo path versus staying as secondary polish?
- ~~Should the first mock adapter seed data mirror the existing hospital fit-out demo exactly or be regenerated from backend test/seed scripts?~~ Resolved 2026-05-06 (Step 10): mirror the prototype narrative; see `app/src/lib/mockSeed.ts`.
- Demo wallets in `mockSeed.ts` are deterministic via `Keypair.fromSeed`. Open question: do the same demo wallets become the funded localnet test wallets in Phase 4, or should Phase 4 generate fresh keypairs and only reuse the labels?

## Known Landmines

- Do not map Finance Director to `HighApprover`; backend separates finance release authority from director approval.
- Do not rely on package status `Locked` for holds; backend holds live on payment requests.
- Do not store rich documents on-chain; only refs/hashes belong there.
- Do not use frontend role switching as permission logic.
- Do not keep two Anchor program copies.
- Do not treat direct vault SPL transfers as budget; backend tracked funding is canonical.
- Do not ship the current `SOLANA MAINNET` label in a local/devnet mock-USDC demo.
- Do not let Finance release stand in for Director approval.

## Update Log

- 2026-04-27: Created initial living merge plan from backend/frontend scan and agent analysis.
- 2026-04-27: Updated scan for `ConstruktFrontend/Construkt-mar-dev`, including current static/Django functionality, local store mutation points, and frontend-specific merge tasks.
- 2026-05-06: Phase 1 boundary decisions resolved. Updated path references (`ConstruktDev/` → repo root, `ConstruktFrontend/Construkt-mar-dev/` → `frontend-prototype/`). Authoritative visual source set to `frontend-prototype/web/index.html`; both `construkt.html` copies frozen. Duplicate Anchor workspace inside `frontend-prototype/` confirmed stale and listed as a cleanup candidate pending owner approval.
- 2026-05-06: Phase 1 cleanup executed on the `Frontback-integration` branch. Deleted the duplicate Anchor workspace, both frozen `construkt.html` archives, and the Django shell from `frontend-prototype/`. The prototype is now a pure static demo plus the frontend unit test suite.
- 2026-05-06: `app/` scaffolded with Vite + React 19 + TypeScript on the `Frontback-integration` branch. ESLint flat config (Vite default) and Prettier 3 wired into `npm run lint` / `lint:fix`. Empty `src/{lib,selectors,components,pages}/` stubs created for upcoming PDA helpers, client, selectors, and ported UI.
- 2026-05-06: PDA helpers ported into `app/src/lib/pda.ts` — six derivers, `ROLE_BYTES` constants, `u64Seed` (Uint8Array, browser-ready). Vitest wired in; 14 tests cover golden-PDA regressions (computed offline) plus invariants like determinism and seed sensitivity.
- 2026-05-06: `ConstruktClient` interface, `MockConstruktClient` mock, and `createAnchorClient` Phase 4 stub added under `app/src/lib/`. Mock enforces the status flow, hold blocking, single-active-request, contractor-cannot-approve, finance-only release, and approver-role conflict invariants. 28 vitest cases now cover the full app library.
- 2026-05-06: `seedHospitalFitOut` added at `app/src/lib/mockSeed.ts`. Builds the demo world (one project, six work packages spanning released / highApproved / lowApproved / submitted-on-hold / no-request / rejected) on top of a `MockConstruktClient`. Resolves the Phase 3 open-decision on seed source in favour of mirroring the prototype's Demo Hospital Fit-Out narrative. 13 new vitest cases cover seed shape, per-package final state, approval records, and determinism. App test suite is now at 41 cases.
- 2026-05-06: Selector layer landed at `app/src/selectors/` — `paymentSelectors.ts` (display status, approval tracker, release readiness, summary), `projectSelectors.ts` (package + project rollups, contractor visibility filter), `auditSelectors.ts` (chronological audit timeline). Money helpers `formatMockUsdc` / `parseMockUsdc` added at `app/src/lib/format.ts`. 48 new vitest cases bring the app suite to 89 passing.
- 2026-05-06: Off-chain metadata adapter landed at `app/src/lib/metadataClient.ts` (`MetadataClient` read interface, `MetadataWriter` write interface, `MockMetadataClient` impl). Demo seed `seedDemoMetadata` at `app/src/lib/metadataSeed.ts` populates the Demo Hospital Fit-Out narrative (project metadata, six package scopes, five invoices, six approval/rejection notes, one hold). Resolves the Phase 1 open-decision on V0 metadata storage in favour of an in-memory mock with a Supabase / IPFS / S3-swap-ready interface. 16 new vitest cases bring the app suite to 105 passing.
- 2026-05-07: Step 5 V0 screen scope locked in. Phase 2 section now carries the explicit ✅/🟡/🗑 table for every prototype hash route, the V0 modal list (each tied to one `ConstruktClient` write), per-role landing surfaces for Finance / PM / Director / Contractor, and an out-of-scope list. Closes the "which prototype pages" and "which dashboard2 task screens" open decisions.
- 2026-05-07: Step 6 layout & visual language landed. Design tokens copied from the prototype's `:root` into `app/src/styles/tokens.css` (light + dark). Layout components (`AppShell`, `AppHeader`, `NetworkBadge`, `RoleBadge`, `ThemeToggle`) added under `app/src/components/`. `App.tsx` and `index.css` rebuilt to render the real shell instead of the Vite welcome page. Theme toggle (light ↔ dark via `data-theme`) is functional. Network badge guarantees no mainnet copy by formatter contract. 5 new vitest cases (110/110 total). Vite boilerplate assets (`hero.png`, `react.svg`, `vite.svg`, `public/icons.svg`) deleted. Visual verification deferred to manual `npm run dev` pass.
- 2026-05-07: Step 7a (first slice of Phase 2 page work) landed. Adds: hash router at `app/src/lib/router.ts` with legacy-alias support; `buildDemoClients` composition helper; `<ClientsProvider>` + sibling `useClients` hook context; UI primitives `StatusPill` and `Money`; first real page `ProjectListPage` rendering one card per project with cap/funded/released rollups, hold-count badge, and contractor-filtered visibility. `App.tsx` now switches between routes via `useHashRoute`. 10 new vitest cases (120/120 total). Bundle size note: jumped to ~460 KB once `@solana/web3.js` joined runtime deps; budget for ~600 KB once Anchor lands in Step 14.
- 2026-05-07: Step 7b — `ProjectDetailPage` (`#project-detail?address=…`) lands. Renders project header with cap/funded/released/outstanding metrics, client + date range from metadata, package cards each linking to `#work-package-view`, team panel from `metadata.team`, and a chronological audit log (newest first, scroll-bounded) built from `selectAuditTimeline` and enriched with display names + ref-resolved detail text (note text, hold reason, document filename). Adds `formatTimestamp` and `shortAddress` to `lib/format.ts`, plus `teamRoleLabel` to `lib/metadataClient.ts`. Surfaces a "Project not found" fallback for missing/invalid `address` params. 5 new vitest cases (125/125 total).
- 2026-05-07: Step 7c — `WorkPackageViewPage` (`#work-package-view?address=…`) lands. Renders one work package end-to-end: header with project breadcrumb / contractor / scope and short-form package/vault/mint addresses; escrow-balance panel with cap/funded/released/outstanding/remaining-cap metrics plus a stacked funded-vs-released percentage bar (bigint-precision via a local `pctOf` helper); newest-first payment-request cards each carrying status pill, amount, submitted/updated timestamps, linked document, and PM/Director approval slots; deduped document panel keyed by `documentRef`; package-scoped audit log filtered out of `selectAuditTimeline`; aside with three panels — approval tracker for the active request, release-readiness panel that surfaces every blocked reason from `selectReleaseReadiness` verbatim, and team list with an "Assigned" tag on the package's contractor. Wires `workPackageView` route into `App.tsx`. Write actions (approve/reject/release/hold) deliberately deferred to Step 8. Suite still at 125/125; bundle 486.38 kB.
- 2026-05-07: Step 7d — `Dashboard2Page` (`#dashboard2`) lands as the canonical V0 landing surface. Renders role-aware welcome header, cross-project KPI strip (projects/packages/cap/funded/released/outstanding/active requests/holds, all bigint-summed), role-filtered Outstanding Tasks panel driven by a single `roleMatchesActiveRequest` switch (Finance: release + hold review; PM: submitted; Director: low-approved; Contractor: rejected/awaiting + submit-invoice prompts on funded packages with no active request), project quick-access cards, and Recent Activity feed (cross-project, newest-first, capped at 8) built by merging `selectAuditTimeline` per project. Contractor visibility uses the existing `filterProjectsByContractor` selector. Wires `dashboard2` route into `App.tsx` and adds an "Open dashboard" CTA to the Home placeholder. Closes the Phase 2 7-series ahead of Step 8 (action wiring). Suite still at 125/125; bundle 495.66 kB.
- 2026-05-07: Step 8a — Display-only `RoleBadge` replaced by interactive `RoleSwitcher` (styled native `<select>` with a "Demo role" caption that keeps the demo-only nature visible). Role state hoisted to `App.tsx` and threaded through `AppHeader.onChangeRole`; all four pages re-render against the new role automatically. Added `DEMO_ROLES` readonly tuple to `lib/theme.ts` so the switcher iterates from a single source, with 3 new vitest cases that catch tuple-vs-union drift. `RoleBadge.tsx` + `.css` deleted (recoverable from git). Suite now 128/128; bundle 496.25 kB.
