# Front/Back Merge Plan

Living plan for merging the canonical Construkt Anchor backend in `ConstruktDev/` with the frontend prototype now staged at `ConstruktDev/frontend-prototype/`.

This document should be updated as the frontend develops. Its job is to keep the team aligned on source of truth, data ownership, schema mapping, and integration steps.

## Current State

### Backend: `ConstruktDev/`

`ConstruktDev/` is the canonical backend.

It is a Solana Anchor program, not a traditional web backend. There is no REST API, Django API, database, or off-chain application server in V0.

The on-chain accounts are the backend data layer:

- `ProjectAccount`
- `WorkPackageAccount`
- `RoleAssignmentAccount`
- `PaymentRequestAccount`
- `ApprovalRecord`
- SPL Token mint/accounts for mock USDC escrow

### Frontend Prototype: `ConstruktDev/frontend-prototype/`

The Django/static frontend prototype has been moved out of `ConstruktFrontend/` and into `ConstruktDev/frontend-prototype/` so the working frontend and backend now live under the same development tree.

The backendless demo entry point is `ConstruktDev/frontend-prototype/web/index.html`. Treat this as the canonical standalone static demo for product-flow walkthroughs and UX iteration before Anchor integration. It should run without Django, a REST API, wallet connection, localnet/devnet, or an Anchor client. Mocked/local-only state is acceptable in this file, but it must not be treated as on-chain truth.

Run any remaining Django/static prototype surfaces from `ConstruktDev/frontend-prototype/web` only when intentionally working on those legacy/static assets.

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

### Frontend Prototype: `ConstruktFrontend/Construkt-mar-dev/`

`ConstruktFrontend/Construkt-mar-dev/` is the current frontend prototype and design reference.

It is currently a Django shell serving one static HTML page from `web/templates/projects/construkt.html`, with UI behavior driven by a hardcoded JavaScript object in `web/static/projects/js/construkt.js`.

There are no meaningful Django models, no app database, no API layer, no fetch/axios calls, and no wallet or Anchor client integration.

`website/construkt.html` appears to be a standalone/exported copy of the same prototype and should be treated as a visual reference only unless it is intentionally chosen as the working source.

`ConstruktFrontend/Construkt-mar-dev/` also contains a duplicate Anchor workspace and program under `programs/construkt`. That duplicate program is not canonical and should not be merged into the backend.

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

`ConstruktDev/` is the canonical repo for the merged product.

The recommended frontend target remains:

```text
ConstruktDev/app/
```

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

- Keep `ConstruktDev/` as canonical.
- Do not merge `ConstruktFrontend/Construkt-mar-dev/programs/construkt`.
- Keep `frontend-prototype/web/index.html` as the backendless demo surface until its UX is intentionally migrated.
- Create `ConstruktDev/app/`.
- Add frontend PDA helpers from the backend tests.
- Add a typed client interface that can be backed by mock data first and Anchor later.
- Decide whether `web/templates/projects/construkt.html` or `website/construkt.html` is the authoritative visual source; avoid maintaining both during the merge.

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
