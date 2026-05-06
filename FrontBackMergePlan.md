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

### Phase 2: Port Prototype UX

- Port useful layout, visual language, and page concepts from the Django/static prototype.
- Prioritize the working app surfaces: dashboard, project list/detail, work package detail, payment/request timeline, documents panel, and setup/action modals.
- Treat `dashboard2` as the canonical V0 dashboard. Task upload/review/response and chart fullscreen remain demo polish unless needed for the main presentation path.
- Avoid carrying over the in-memory store as the long-term data model.
- Keep UI state for form drafts, selected demo role, pending tx state, and current-session tx history only.
- Replace the current Finance-only release flow with PM approval, Director approval, then Finance release.

### Phase 3: Data Adapter

- Build mock adapter with backend-shaped data.
- Build selector layer from backend-shaped data to UI view models.
- Add off-chain metadata adapter for rich project/document/team/milestone display data.
- Map prototype rich fields into metadata refs:
  - project client, contract model, dates, and milestones -> `metadata_ref`
  - package descriptions, contractor display names, and milestone grouping -> `scope_ref` or metadata adapter
  - document names, versions, file names, and URLs -> `document_ref`
  - approval/rejection/hold notes -> `note_ref` and `hold_ref`

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

- What off-chain metadata store should V0 use?
- When should the backendless `frontend-prototype/web/index.html` demo be retired or migrated into the React/Vite app?
- How will local demo wallets be created and selected?
- Where should generated IDL and TypeScript types live for frontend consumption?
- What is the minimum audit trail for the first integrated demo?
- Which prototype pages are in V0 scope versus later polish?
- Which `dashboard2` task workflow screens should remain in the main demo path versus staying as secondary polish?
- Should the first mock adapter seed data mirror the existing hospital fit-out demo exactly or be regenerated from backend test/seed scripts?

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
