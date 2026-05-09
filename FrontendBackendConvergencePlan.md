# Frontend / Backend Convergence Plan

This plan defines how Construkt moves from two parallel demos into one backend-backed product experience.

The static frontend in `frontend-prototype/web/index.html` is the clearest expression of the intended product flow. The React app in `app/` is the target runtime for the backend-backed product. The Anchor program in `programs/construkt/` is the source of truth for payment-control rules.

The goal is not to copy every static-demo shortcut into the backend. The goal is to make the backend and React app support the same user-visible capabilities that the demo promises, while preserving the Solana model: one deployed program, with projects, packages, milestones, payment requests, approvals, and vaults represented as accounts under it.

## Implementation Status

Current repo status:

- Phase 0 is complete: `npm run reset:localnet` rebuilds, syncs IDL, resets localnet, and reseeds demo state.
- Phase 1 is complete: project mint, budget, and tracked package allocation are enforced on-chain and reflected in app clients/tests.
- Phase 2 is complete: milestone accounts, milestone-targeted payment requests, reserved request accounting, and milestone-aware release/reject flows are implemented in Anchor and mirrored in the mock client.
- Phase 3 is complete: `app/` can create milestone-mode packages on the Finance-created active package path, display real milestone account state, target contractor invoices at milestones, and seed one milestone-backed package in mock and localnet demo state.
- Phase 4 is complete: project drafter authorization, PM-created draft packages, draft milestone schedules, Finance activation, contractor role assignment at activation, and post-activation funding are implemented in Anchor, mirrored in app clients, and wired into the React project-detail flow.
- Phase 5 is complete: `WorkPackageAccount.high_approval_required` is plumbed through `create_work_package`, `create_package_draft`, and `activate_work_package`; `release_payment` rejects low-only releases on required-high packages with `HighApprovalRequired`; `update_high_approval_policy` lets Finance flip the flag only while no request value is reserved on the package, covering both package-level and milestone-targeted active requests; mock and Anchor clients mirror everything; React UI exposes the toggle in the create form, switches Optional/Required labels, and ships a Finance-only `ApprovalPolicyPanel`. Demo seed adds a `complianceUpgrade` package parked at `lowApproved` to demonstrate the gated release.
- Phase 6 onward remain open.

Important repo notes for the remaining phases:

- The canonical program id is now `cTkcdfaMNy3LbZVtaX4j4RwFrE91j34gRZQ5CHTKCb4`. Anchor config, generated IDL, app config, tests, and scripts are already aligned to it.
- `scripts/wsl-anchor-test.sh` now reuses a running validator and skips deploy when appropriate. If localnet was just refreshed with `npm run reset:localnet`, Anchor tests can run against that validator without fighting the preloaded program state.
- `scripts/seed-localnet.ts` now seeds the Interior Fit-Out package as a real milestone-backed package before funding escrow and assigns the PM as project drafter for the demo project. The package-level seed paths remain for comparison and regression coverage.

## Agent Handoff Contract

If another agent is implementing this plan, use these rules to avoid drift:

1. Treat `app/` plus the Anchor program as the implementation target. Treat `frontend-prototype/` as the product reference and demo oracle, not the place to build backend-backed functionality.
2. Work in the phase order unless the user explicitly asks for a different slice. Later phases assume account fields, IDL, seed data, and app client changes from earlier phases.
3. Each backend phase that changes account or instruction shape must update the Anchor program, Anchor tests, generated IDL, `app/src/lib/anchorClient.ts`, mock/local clients as needed, seed data, and affected docs.
4. Do not implement a current Director role, dynamic role engine, raw file storage, production account migration, or separate on-chain withdrawal instruction unless a later product decision explicitly asks for it.
5. When this plan says "wallet", read it as a backend authority/account concept. User-facing copy can say Finance Director, Project Manager, Contractor, approver, or payee.
6. If a detail appears in Resolved Decisions, implement it. If a detail appears in Open Decisions, do not block the current phase unless that open decision is named as a prerequisite for that phase.
7. The mock client and Anchor client must accept the same parameters and produce the same observable behavior. When a backend change adds an argument, state rule, or error condition, update both clients and keep app selectors/pages working identically against either mode.
8. In V0, Finance is `ProjectAccount.authority`. The terms "Finance", "project authority", and "Finance/project authority" are interchangeable in this plan unless a later phase explicitly introduces a different authority.

## Canonical V0 Flow

This is the flow the backend-backed React app must support by the end of this convergence plan:

1. Finance creates a project with a budget and mint.
2. Finance authorizes a PM/project drafter.
3. The PM creates a draft work package with either a simple package value or a complete milestone schedule.
4. The PM assigns or proposes the contractor while the package is still a draft.
5. Finance reviews the contractor, cap, schedule, approval policy, and funding details, then activates the package and funds escrow.
6. The contractor submits a payment request against either the whole package or a specific milestone, with evidence/document references.
7. The PM reviews evidence and approves, rejects, or holds the request.
8. If the package requires high approval, the configured high approver must approve before Finance can release.
9. Finance releases funds. For V0, the token transfer still happens at release time; the contractor withdrawal balance is app-derived from release state.
10. The contractor withdrawal UI shows released-but-not-cleared funds and lets the app mark them as withdrawn/cleared for product demonstration.

## Current State

### Static Frontend Prototype

The static prototype currently demonstrates:

- landing/splash page and product explanation
- project dashboards by role
- project creation with project type choices
- PM work package creation and package status views
- contractor assignment after the PM estimate is created
- Finance escrow approval for assigned packages
- milestone / bespoke / valuation-style package language
- contractor invoice submission against package-level or milestone-level payment sections
- PM evidence review with linked document references
- Finance release to a contractor withdrawal balance
- contractor withdrawal of released funds
- lightweight variation requests and document/evidence references
- role-specific actions for Finance, PM, and Contractor
- holds, rejection, release, chain-state references, and audit trail
- polished UX copy and presentation-focused flow

This surface is presentation-first. It can use mocked/local state, but it must not be described as on-chain truth.

### React App

The React app currently supports:

- mock-client mode by default
- Anchor-backed mode with `VITE_ANCHOR_RPC`
- deterministic demo wallets for localnet/devnet testing
- repeatable localnet reset and reseed workflow via `npm run reset:localnet`
- project, package, request, approval, hold, release, role, metadata, and audit views
- milestone-aware account models and milestone-aware client parity in mock and Anchor modes
- project drafter authorization, PM-created package drafts, draft milestones, and Finance activation
- seeded demo data that mirrors several backend states

This is the product runtime to converge toward. New backend-backed UI work belongs here, with the static prototype used as the UX reference.

### Anchor Backend

The backend currently supports:

- `initialize_project`
- `create_work_package`
- `assign_project_drafter`
- `set_project_drafter_active`
- `create_package_draft`
- `create_draft_milestone`
- `activate_work_package`
- `create_milestone`
- `assign_role`
- `fund_escrow`
- `submit_payment_request`
- `add_document_reference`
- `approve_request`
- `reject_request`
- `place_hold`
- `remove_hold`
- `release_payment`

Current release path:

```text
Contractor submits -> PM/LowApprover approves -> Finance releases
```

Current request path:

```text
Request target = whole package OR specific milestone
```

`HighApproved` remains available as an optional/custom approval state. It is not mandatory before release. The early "optional Director" idea should be treated as future configurable approval policy, not as a role that must exist in the current frontend or backend.

## Code Map

Backend:

- `programs/construkt/src/lib.rs`: Anchor program; instructions, accounts, events, errors, and account validation live here.
- `tests/construkt.b1-accounts.ts` through `tests/construkt.b8-package-drafts.ts`: current Anchor test suites.
- `tests/setup.ts`: shared Anchor test fixtures and helpers.
- `app/src/idl/construkt.json`: generated IDL consumed by the React app; commit this whenever the program interface changes.

React app:

- `app/src/pages/`: page-level React flows.
- `app/src/components/`: reusable React UI components.
- `app/src/selectors/`: pure state derivation functions used by dashboards and task lists.
- `app/src/lib/anchorClient.ts`: Anchor-backed client implementation.
- `app/src/lib/mockClient.ts`: mock-mode client implementation; must mirror Anchor client parameters and observable behavior.
- `app/src/lib/metadataClient.ts`: off-chain metadata interfaces and local implementations.
- `app/src/lib/metadataSeed.ts`: demo metadata seed writes.
- `app/src/lib/mockSeed.ts`: mock-client demo seed state.
- `app/src/lib/clients.ts`: runtime wiring between mock mode and Anchor-backed mode.

Seed and tooling:

- `scripts/seed-localnet.ts`: on-chain localnet demo seed.
- `scripts/setup-localnet.sh`: local validator setup helper.
- `scripts/seed-localnet-wsl.ps1`: Windows/WSL wrapper for localnet seeding.
- `scripts/wsl-anchor-test.ps1`: Windows/WSL wrapper for Anchor tests.

## Execution Map

| Phase                                                      | Primary workstream(s)                          | Purpose                                                                                                |
| ---------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Phase 0: Localnet Reset Tooling                            | Tooling prerequisite                           | Add repeatable reset/rebuild/reseed workflow for account-layout changes                                |
| Phase 1: Budget And Validation                             | Workstream 1                                   | Add project budget, mint, allocation, and package cap enforcement                                      |
| Phase 2: Milestone Backend                                 | Workstream 2                                   | Add milestone accounts and milestone-targeted payment requests                                         |
| Phase 3: Milestone React Flow                              | Workstream 2 app path                          | Wire real milestone creation and display into `app/`; uses Finance-created packages until drafts land  |
| Phase 4: Project Drafters And Package Drafts               | Workstreams 0, 3, and 4                        | Add project drafters, contractor assignment, draft packages, Finance activation, and escrow approval   |
| Phase 5: High-Approval Policy Flag                         | Workstream 5                                   | Add package-level optional/required high approval policy                                               |
| Phase 6: Evidence, Withdrawal, Dashboard, And Audit Polish | Workstream 6                                   | Align evidence refs, withdrawal UX, dashboard selectors, and audit views with real state               |
| Workstream 7: Demo Seed Alignment                          | Continuous workstream                          | Extend localnet seed data after each phase so seeded state demonstrates the implemented behavior       |
| Phase 7: Static Prototype Audit                            | Final audit pass, no backend workstream number | Verify prototype claims against implemented backend/app behavior after each phase and again at the end |

## Convergence Principles

1. `app/` is the backend-backed product target.
2. `frontend-prototype/` is the UX/storytelling reference, not the backend source of truth.
3. The backend matches user-visible functionality, not demo implementation shortcuts.
4. On-chain state stays narrow: payment-control rules, role authority, caps, escrow, payment status, holds, document refs/hashes, and audit-critical events.
5. Full documents, long descriptions, display copy, and rich files stay off-chain.
6. Finance remains the release and funding authority.
7. PM/LowApprover approval is the default release gate.
8. Optional higher approval is configurable, not hard-coded as mandatory Director review. Future clients may label that second approval as Director, QS, commercial lead, or another client-specific approver.
9. Milestones are account-backed payment-control units, not separate deployed programs.
10. Every backend feature must have an Anchor test and a corresponding React app path.
11. Backend workstreams that change account layout must regenerate and commit the IDL.

## Migration Policy

Anchor accounts are fixed-layout. Adding fields to `ProjectAccount`, `WorkPackageAccount`, `PaymentRequestAccount`, or new account relationships is a breaking account-layout change.

For V0:

- Localnet/devnet are resettable demo networks. Backend workstreams that change account layout must ship with `--reset` instructions and a fresh `npm run seed:localnet` flow, not migration code.
- Every backend workstream that changes the program must include `anchor build`, regenerated IDL JSON under `app/src/idl/`, and any required updates to `app/src/lib/anchorClient.ts`.
- Devnet testers should expect old accounts to become unreadable after layout changes. Reset/redeploy/reseed is the supported V0 path.
- Any future non-resettable environment needs a separate migration plan before account layout changes are merged.
- Phase 0 is now landed: use `npm run reset:localnet` as the default rebuild/reset/reseed path for layout-changing backend work.

## Capability Gap Map

| Product capability from the frontend      | Current backend support                                                                                                                     | Convergence target                                                                                                                                                                                         | Owner                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Project-level budget                      | Supported on-chain and in app clients                                                                                                       | Store project budget, project mint, tracked allocated cap, and enforce package/milestone caps against them                                                                                                 | WS 1 / Phase 1 complete                                                                      |
| Project type selection                    | Metadata/display only                                                                                                                       | Store package/payment model metadata off-chain; enforce only payment-control rules on-chain                                                                                                                | Off-chain metadata / WS 6                                                                    |
| Work package cap                          | Supported with project-budget enforcement                                                                                                   | Keep; validate against project budget and project mint                                                                                                                                                     | WS 1 / Phase 1 complete                                                                      |
| Milestone packages                        | Backend supported; React app supports Finance-created and PM-drafted milestone packages, milestone display, and milestone-targeted invoices | Add milestone/tranche accounts under work packages                                                                                                                                                         | WS 2 / Phase 3 complete; draft path complete in Phase 4                                      |
| Milestone names/dates/amounts             | Metadata only                                                                                                                               | Store compact milestone metadata ref, date bounds, amount/cap, released amount, and status                                                                                                                 | WS 2 / Phases 2-3                                                                            |
| Milestone date overlap                    | UI/local only                                                                                                                               | Validate overlap off-chain/UI; on-chain only enforces `start_at < end_at` and money invariants                                                                                                             | WS 2 app path / Phase 3                                                                      |
| PM package creation                       | Supported through authorized project drafter package drafts in `app/` and Anchor                                                            | Add project-level drafter authorization before PM draft package flow                                                                                                                                       | WS 0 + WS 4 / Phase 4 complete                                                               |
| Contractor assignment after package setup | Contractor is proposed on the draft and formalized as contractor role assignment at Finance activation                                      | Allow controlled pre-activity contractor assignment/update                                                                                                                                                 | WS 3 / Phase 4 complete for draft activation; explicit draft edit path remains future polish |
| Finance escrow approval after assignment  | Supported: Finance activates draft package, creates vault/contractor role assignment, then funds escrow                                     | Add draft activation / escrow approval path before funding and requests                                                                                                                                    | WS 4 / Phase 4 complete                                                                      |
| Contractor invoice submission             | Supported at package level and milestone level in backend and app                                                                           | Extend to package-level or milestone-level request targets                                                                                                                                                 | WS 2 / Phase 3 complete                                                                      |
| Evidence pack review                      | Partial: document reference exists; review UX is prototype-only                                                                             | Treat evidence/document refs as request-linked workflow inputs; keep raw files off-chain                                                                                                                   | WS 6 / Phase 6                                                                               |
| Document requests and uploads             | Partial: `add_document_reference` only                                                                                                      | Add app metadata flow for requested/fulfilled document refs, linked to packages, requests, and milestones                                                                                                  | WS 6 / Phase 6                                                                               |
| Approval behavior and role labels         | Package-level `high_approval_required` flag enforced on chain and exposed in app                                                            | Use metadata for richer labels; defer dynamic roles                                                                                                                                                        | WS 5 / Phase 5 complete                                                                      |
| Finance release                           | Supported with policy gate (low-only on default, high required on flagged packages)                                                         | Keep; release from PM-approved or high-approved states depending on package policy                                                                                                                         | WS 5 / Phase 5 complete                                                                      |
| Contractor withdrawal balance             | Not first-class; release sends tokens directly                                                                                              | Model withdrawal UX in the app from release state; keep distinct backend claim/withdraw out of scope for V0                                                                                                | WS 6 / Phase 6                                                                               |
| Lightweight variation requests            | Not first-class                                                                                                                             | Keep variation details off-chain at first; add references/events only when a variation affects cap, milestone amount, contractor assignment, `high_approval_required`, or the wallet authorized to release | Deferred / metadata-first                                                                    |
| Holds                                     | Supported at request level                                                                                                                  | Keep request-level holds in V0; package/milestone holds are out of scope until explicitly requested                                                                                                        | Current backend / WS 6 display                                                               |
| Audit trail                               | Partial                                                                                                                                     | Strengthen event coverage and off-chain indexing/display                                                                                                                                                   | WS 6 / Phase 6                                                                               |
| Dashboard history                         | Partial                                                                                                                                     | Build app-side state summaries from chain reads plus metadata/events                                                                                                                                       | WS 6 / Phase 6                                                                               |

## Remaining Phase Notes

Phase 3 should assume the following are already true:

- Milestone mode is one-way once the first milestone exists.
- Funding in milestone mode is blocked until milestone amounts sum to package cap.
- Milestone-targeted requests can run in parallel across different milestones.
- Package-level requests are blocked once a package enters milestone mode.
- Reserved request value is tracked at the work-package level and reduced on reject/release.

That means the React milestone UI does not need to invent fallback behavior for mixed package/milestone request modes. It should present milestone mode as a deliberate, locking choice.

Phase 3 should also add one real seeded milestone-backed package to both mock/demo state and localnet seed state early in the phase, so the new UI has a durable walkthrough path instead of only test coverage.

Phase 4 should assume the existing direct `create_work_package` path remains valid for Finance-created active packages. Draft packages and project drafters are an additive path, not a rewrite of the current active-package flow.

## Backend Workstreams

### 0. Project-Level Role Prerequisite

Objective: define who can act on a project before a work package exists.

This is a prerequisite for PM draft packages. Current `RoleAssignmentAccount` is package-scoped:

```text
["role", work_package, role_byte, wallet]
```

There is no "PM of the project" account today.

V0 path:

- Add a small project-level drafter authorization account rather than full dynamic project roles.
- PDA seed: `["project_drafter", project, wallet]`.
- Field shape mirrors `RoleAssignmentAccount` minus the role field and minus `work_package`:
  - `project: Pubkey`
  - `wallet: Pubkey`
  - `active: bool`
  - `assigned_by: Pubkey`
  - `assigned_at: i64`
  - `updated_by: Pubkey`
  - `updated_at: i64`
  - `bump: u8`
- Finance/project authority can add or deactivate project drafters.
- Project drafters can create package drafts once Workstream 4 exists.

Tests:

- Finance can add a project drafter
- non-Finance cannot add a project drafter
- inactive drafter cannot create draft package once drafts exist
- project drafter PDA validates parent project and wallet

### 1. Project Budget And Package Cap Controls

Objective: make project creation and package setup match the frontend's budget expectations.

V0 budget assumptions:

- One mint per project.
- All amounts are stored in mint base units: `budget_amount`, `cap_amount`, `allocated_amount`, milestone amounts, request amounts, funded amounts, and released amounts. Decimal scaling belongs in metadata/UI, not on-chain.
- `ProjectAccount` stores `mint`, `budget_amount`, and `allocated_amount`.
- Project mint is set during `initialize_project` and immutable after initialization.
- `create_work_package` validates `work_package.mint == project.mint`.
- Allocation is tracked on `ProjectAccount`; it is not derived by iterating package accounts inside instructions.
- Cancellation is out of scope until a `cancel_work_package` instruction exists.

Backend tasks:

- Add `mint`, `budget_amount`, and `allocated_amount` to `ProjectAccount`.
- Update `initialize_project` to set project mint and budget.
- When `initialize_project` gains required arguments, update `app/src/lib/program.ts`, `app/src/lib/mockClient.ts`, `app/src/lib/anchorClient.ts`, `app/src/lib/mockSeed.ts`, `scripts/seed-localnet.ts`, `app/src/pages/ProjectListPage.tsx` (`onCreateSubmit`), and affected tests together. The IDL change will not catch every call site by itself.
- Update `create_work_package` to reject caps that exceed `budget_amount - allocated_amount`.
- Increment `ProjectAccount.allocated_amount` during package creation.
- Emit events that include project budget and allocation after package creation.
- Regenerate and commit the IDL.

React app tasks:

- Add project budget input to Anchor-backed project creation.
- Show project budget, allocated package budget, funded amount, released amount, and remaining allocatable budget.
- Display clear validation errors when caps exceed budget.

Tests:

- `tests/construkt.b5-budget.ts`
- project can initialize with a valid budget and mint
- zero budget is rejected if budget is required
- package mint must match project mint
- package cap cannot exceed project remaining budget
- multiple packages accumulate against `allocated_amount`
- IDL/client/seed script are updated with the new fields

### 2. Milestone / Tranche Accounts

Objective: make milestone-style packages real instead of only frontend placeholders.

V0 model:

```text
ProjectAccount
  WorkPackageAccount
    MilestoneAccount
    PaymentRequestAccount
```

Milestones are payable units under a work package. They are not separate deployed programs.

Resolved V0 decisions:

- Milestone names follow the existing metadata convention: compact `metadata_ref` on-chain, rich name/description off-chain.
- Milestone PDA seed: `["milestone", work_package, milestone_id_le_bytes]`.
- Add `milestone_counter: u64` to `WorkPackageAccount`. It is independent of the payment request counter and is the only source for milestone IDs.
- Milestone IDs are `u64`, scoped per work package, start at `1`, and increment from `WorkPackageAccount.milestone_counter`.
- Milestone status is intentionally narrow for V0: `Active`, `Completed`, and reserved `Cancelled`. Do not add richer status states unless payment-control behavior needs them.
- In Phase 2, `create_milestone` is callable by the package's project authority / Finance path for active packages. Phase 4 adds the authorized drafter path for draft packages.
- `PaymentRequestAccount` uses explicit milestone target fields, matching the repo's existing boolean-plus-pubkey style: `has_milestone: bool` and `milestone: Pubkey`. Do not use `Option<Pubkey>` for V0.
- On-chain milestone validation does not enforce date overlap. Date overlap is UI/off-chain validation because it does not protect funds and is awkward to enforce safely in Solana without requiring all sibling milestones as accounts.
- On-chain date validation enforces `start_at < end_at`.
- On-chain money validation enforces `amount > 0` and milestone caps within remaining work package cap.
- `WorkPackageAccount` stores `allocated_milestone_amount: u64`; milestone allocation is tracked, not derived by scanning milestone accounts.
- For V0 milestone packages used by the app, the milestone schedule must be financially complete before activation/funding: milestone amounts sum to the work package cap.
- Simple packages complete when released amount equals package cap. Milestone packages complete when every created milestone is complete and released milestone value equals package cap.

Active request invariant:

- Non-milestone packages keep the current package-scoped `has_active_request` and `active_request`.
- Milestone packages use a milestone-scoped active request flag on `MilestoneAccount`.
- `submit_payment_request` branches on whether the request targets a milestone:
  - no milestone target: check and set `WorkPackageAccount.has_active_request`
  - milestone target: check and set `MilestoneAccount.has_active_request`
- A package with milestones can have parallel active requests across different milestones, but not two active requests on the same milestone.
- Milestone mode is one-way: before any payment request, a package may transition from package-level mode to milestone mode by creating its first milestone. Once any milestone exists, the package remains in milestone mode for life and all future requests must target a milestone.

Backend tasks:

- Add `MilestoneAccount` with package reference, milestone id, amount/cap, released amount, start/end timestamps, status, metadata ref, active request flag, and bump.
- Add `milestone_counter: u64` to `WorkPackageAccount`; do not reuse the payment request counter for milestone IDs.
- Add `create_milestone`.
- Add `allocated_milestone_amount` to `WorkPackageAccount` and update it during milestone creation.
- Reject milestone creation when `allocated_milestone_amount + milestone_amount > work_package.cap_amount`.
- In Phase 2, enforce the sum-equals-cap rule on `fund_escrow` for packages in milestone mode: reject funding when `allocated_milestone_amount != work_package.cap_amount`.
- In Phase 4, enforce the same sum-equals-cap rule on `activate_work_package` for draft packages in milestone mode.
- Extend `PaymentRequestAccount` with `has_milestone: bool` and `milestone: Pubkey`.
- Update `submit_payment_request` to support package-level or milestone-level targets.
- Update `release_payment` to update milestone totals/status when a milestone target exists.
- Regenerate and commit the IDL.

React app tasks:

- Replace placeholder milestone schedules with real milestone creation against Anchor/localnet.
- Show package total while milestones are being added.
- Prevent overlapping dates in UI before transaction submission.
- Show milestone-level status and payment history.

Tests:

- `tests/construkt.b6-milestones.ts`
- milestone creation succeeds within package cap
- milestone amount exceeding package remaining milestone allocation fails
- `start_at >= end_at` fails
- overlapping dates can be blocked by app tests, not Anchor tests
- payment request can target a milestone
- two milestones can have parallel active requests
- the same milestone cannot have two active requests
- package-level request is blocked once milestone mode is used
- release updates milestone and package totals correctly

### 3. Contractor Assignment And Package Ownership

Objective: support the frontend's contractor-picking workflow without weakening backend invariants.

Resolved V0 direction:

- Direct Finance-created active packages may update contractor only before payment activity begins.
- Draft packages may carry a proposed contractor before activation.
- Finance activation confirms the contractor and locks assignment for payment activity.
- After payment activity begins, contractor changes are blocked.

Backend tasks:

- Add controlled contractor update before first payment request or before package activation.
- Ensure contractor role assignment and `work_package.contractor` stay consistent.
- Prevent contractor changes after payment activity begins.
- Regenerate and commit the IDL if account or instruction shapes change.

React app tasks:

- Let PM / authorized project drafter select a contractor during the draft package flow.
- Let Finance confirm the assigned contractor during activation / escrow approval.
- Show whether contractor assignment is pending, confirmed, or locked.

Tests:

- `tests/construkt.b7-contractor-assignment.ts`
- contractor can be assigned before activation/activity
- contractor role assignment is created or validated
- contractor cannot be changed after request submission
- old contractor cannot submit after reassignment

### 4. Package Draft And Activation Flow

Objective: reconcile the frontend's PM package workflow with Finance control over money.

Prerequisite:

- Workstream 0 project-level drafter authorization must exist.
- Workstream 1 budget fields must exist because draft activation enforces project remaining budget.
- Workstream 3 contractor assignment rules must exist because drafts carry proposed contractors.

Resolved V0 direction:

- PM/project drafter can create draft packages.
- PM/project drafter can assign or propose the contractor while the package is still a draft.
- Finance activates packages and funds escrow.
- Finance remains the only release and escrow-funding authority.
- Keep existing `create_work_package` as the direct Finance-created active package path. Add `create_package_draft` as the new drafter path instead of replacing the existing instruction.
- `Cancelled` may be reserved in the package status enum for forward compatibility, but V0 has no cancellation transition until a `cancel_work_package` instruction is explicitly added.

Vault timing decision:

- Draft package creation does not create the vault ATA.
- `activate_work_package` creates the vault ATA and vault authority relationship, using the same associated token program and mint accounts that `create_work_package` uses today.
- This avoids PM/drafter paying ATA rent for drafts that Finance may reject.

Backend tasks:

- Add package status such as `Draft`, `Active`, `Completed`, `Cancelled`.
- Add `create_package_draft` for authorized project drafters.
- Add `activate_work_package` for Finance/project authority.
- Move vault creation to activation for draft-created packages.
- Treat Finance activation as the backend equivalent of the prototype's "Approve escrow" step.
- Block funding, requests, approvals, and release until package is active.
- Regenerate and commit the IDL.

React app tasks:

- Let PM create a draft package/milestone schedule.
- Let PM assign the contractor before sending the package to Finance.
- Let Finance review, confirm contractor/schedule/cap, activate, and fund.
- Make draft vs active states obvious on dashboards.

Tests:

- `tests/construkt.b8-package-drafts.ts`
- authorized drafter can create draft package
- unassigned wallet cannot create draft package
- draft package has no vault ATA until activation
- contractor cannot submit request against draft package
- Finance can activate and fund draft package
- active package follows normal request/approval/release flow

### 5. Approval Policy And Role Labels

Objective: move from hard-coded role language to configurable approval behavior without overbuilding dynamic roles too early.

Resolved V0 direction:

- Do not add an `ApprovalPolicyAccount` yet.
- Add `high_approval_required: bool` to `WorkPackageAccount`.
- Default is `false`, matching the current PM-to-Finance flow.
- Continue using the fixed role enum for program safety.
- Store role display labels in metadata/off-chain config first.
- Treat the early "optional Director" concept as a future display label / approval-policy option, not a current hard-coded role.
- Promote to a dedicated policy account only when a second policy dimension appears.

Backend tasks:

- Add `high_approval_required` to `WorkPackageAccount`.
- Extend `create_work_package`, `create_package_draft`, and `activate_work_package` to accept `high_approval_required`. Default `false` preserves current behavior.
- Update `release_payment`:
  - if `high_approval_required == false`, release accepts `LowApproved` or `HighApproved`
  - if `high_approval_required == true`, release requires `HighApproved`
- Allow Finance to update `high_approval_required` only when `reserved_request_amount == 0` on the package. This is the canonical lock because it covers both package-level active requests and milestone-targeted active requests. Once any request reserves value, the flag is immutable until that request reaches a terminal state and releases or clears the reservation.
- Regenerate and commit the IDL.

React app tasks:

- Let package setup choose whether high approval is required.
- Explain which approvals are required for release.
- Label high controls as optional when `high_approval_required == false` and required when `high_approval_required == true`.

Tests:

- `tests/construkt.b9-approval-policy.ts`
- default policy releases after PM approval
- required-high policy blocks release until high approval
- required-high policy releases after high approval
- milestone-targeted requests obey the same release gate and policy-lock rules
- no-op policy updates reject with `RoleAlreadyInRequestedState`
- UI selector tests show required vs optional approval labels correctly

### 6. Evidence, Withdrawal, Audit, And Dashboard Convergence

Objective: make evidence review, withdrawal UX, dashboards, and history views reflect real backend state rather than static demo assumptions.

Backend/app tasks:

- Review emitted events for all user-facing state changes.
- Default for Phase 6: emit events generously, with one event per user-facing state transition. Open Decision 1 may later prune event volume; pruning is cheaper than retro-adding missing audit events.
- Ensure all events include enough account keys for indexing.
- Use the existing `MetadataClient` / `LocalStorageMetadataClient` seam for off-chain display metadata.
- Add event-derived notes or summaries where current local metadata is not enough.
- Model evidence packs as request-linked document references and metadata, not raw on-chain files.
- Support document-request state in the app metadata layer: requested, fulfilled, linked to request/package/milestone, and reviewer note.
- Derive contractor withdrawal balance from released-but-not-withdrawn amounts in the app first.
- Keep a separate on-chain claim/withdraw instruction out of scope for V0. Revisit only if Open Decision 2 changes release semantics.
- Phase 6 ships the app-derived withdrawal model. If Open Decision 2 later resolves toward an on-chain claim instruction, that becomes a separate V1/Phase 8 task and the Phase 6 app code becomes the migration starting point rather than throwaway work.
- Add app selectors for project-level summaries:
  - total budget
  - allocated package cap
  - funded amount
  - requested amount
  - approved amount
  - released amount
  - contractor withdrawal balance
  - held amount
  - overdue packages/milestones
  - evidence awaiting review
  - document requests outstanding

Tests:

- selector tests for every dashboard metric
- event/account tests for key state transitions
- app tests for release-ready, held, rejected, completed, draft, milestone, evidence-review, document-request, and withdrawal states

### 7. Demo Seed Alignment

Objective: make localnet seed data tell the same story as the polished static demo.

Seed targets:

- one project with realistic budget and project mint
- simple package, no request
- milestone package with multiple milestones
- package with PM-approved request ready for Finance
- package with assigned contractor awaiting Finance escrow approval
- package with linked evidence/document refs awaiting PM review
- package with optional high approval recorded
- package requiring high approval before Finance release
- package on hold
- rejected request with package unblocked for a new request
- second successful request after rejection, if we want the seed to demonstrate retry behavior
- released package with audit trail
- released package with contractor withdrawal balance
- released package already withdrawn, so the demo dashboard is not overloaded with old placeholder balances

Tests:

- seed script type-checks
- seeded account presence check passes
- seeded package metadata refs resolve
- app can load seeded state in Anchor mode
- rejected-then-retried seed path is covered if added

## Implementation Order

Each phase is complete only when:

- backend instructions and accounts compile
- generated IDL is committed when the program changes
- Anchor tests cover the new happy path and at least one authority/error path
- the React app can read/write the new state in mock mode and Anchor-backed mode where applicable
- seed data demonstrates the new state without breaking the existing walkthrough
- dashboard/task selectors do not show stale placeholder data for the new state
- docs or comments that describe the affected flow are updated

### Phase 0: Localnet Reset Tooling

Deliverable: design and implement a repeatable localnet reset workflow for account-layout changes.

Status: complete in repo.

Recommended command shape:

```text
npm run reset:localnet
```

The command builds the program, regenerates/commits IDL as part of the developer workflow, restarts localnet with `--reset`, and reseeds demo data. This phase supports the Migration Policy; it does not replace the requirement that each backend PR commit regenerated IDL.

Expected script behavior:

1. Fail early with a clear message if required tooling is missing: WSL where needed, Anchor, Solana CLI, Node dependencies, or the configured program keypair.
2. Run the Anchor build path used by the repo.
3. Regenerate the committed IDL consumed by `app/src/idl/construkt.json`.
4. Stop any existing local validator started by the script, or document when manual shutdown is required.
5. Start a fresh local validator with reset semantics.
6. Deploy the program to localnet.
7. Run `npm run seed:localnet` or the Windows/WSL wrapper as appropriate.
8. Exit non-zero on build, deploy, or seed failure.
9. Print the local RPC URL, program id, and next app command when successful.

Why first: all later backend phases change account layouts, and the manual reset/reseed loop will otherwise slow us down.

### Phase 1: Budget And Validation

Deliverable: project budget, project mint, tracked allocation, and package cap validation exist on-chain.

Status: complete in repo.

Why first: every later workflow depends on knowing what budget is being allocated.

### Phase 2: Milestone Backend

Deliverable: milestone/tranche accounts, active-request semantics, and milestone-targeted payment requests exist on-chain.

Status: complete in repo.

Why second: this is the largest frontend/backend mismatch in package setup.

### Phase 3: Milestone React Flow

Deliverable: the React app can create real backend packages and milestones using the UX shape from the static prototype.

Status: complete in repo.

Why third: this is the frontend convergence step that consumes the Phase 1 and Phase 2 backend work.

Implementation notes:

- Start with Finance-created active packages rather than waiting for draft packages.
- Seed at least one milestone-backed package in mock mode and localnet mode at the start of the phase.
- Make milestone mode explicit in the UI because the backend treats it as one-way once the first milestone exists.
- Keep overlap validation in the UI only; on-chain continues to enforce only `start_at < end_at`.

### Phase 4: Project Drafters And Package Drafts

Deliverable: authorized project drafters can prepare package/milestone structure; Finance activates and funds it. Contractor assignment updates land here because they share the draft/activation lifecycle.

Why fourth: this matches the demo's PM workflow while keeping Finance in control of money.

Status: complete in repo.

Implementation notes:

- Keep the existing direct Finance-created active package path in place.
- Add the drafter/draft path beside it.
- Do not move milestone backend rules out of the active-package path; draft activation should reuse them.
- Implemented with `ProjectDrafterAccount`, `WorkPackageStatus::Draft`, `create_package_draft`, `create_draft_milestone`, and `activate_work_package`.
- Activation is the point where project budget allocation, vault ATA creation, contractor role assignment, and milestone sum-equals-cap checks become binding.
- `tests/construkt.b8-package-drafts.ts` covers authorized drafter creation, inactive/unassigned drafter rejection, pre-activation funding rejection, simple activation/funding, and milestone schedule completeness.

### Phase 5: High-Approval Policy Flag

Deliverable: optional vs required high approval is a package field, not just a convention.

Status: complete in repo.

Why fifth: it turns "customizable approval path" from copy into real product behavior without overbuilding full dynamic roles.

Implementation notes:

- `high_approval_required: bool` is set at `create_work_package` and `create_package_draft`; `activate_work_package` carries the draft value through and emits it.
- `release_payment` rejects low-only releases on required-high packages with the new `HighApprovalRequired` error.
- `update_high_approval_policy` lets Finance flip the flag while the package is `Draft`/`Active` and `reserved_request_amount == 0`; no-op updates reject with `RoleAlreadyInRequestedState`. `WorkPackagePolicyUpdated` event records each real flip.
- App selectors include `HighApprovalRequired` as a release-blocked reason; React UI exposes a checkbox in the create form, switches Optional/Required labels, and ships a Finance-only `ApprovalPolicyPanel` that locks on reserved request value and warns when required-high is enabled without an active high-approver assignment.
- `tests/construkt.b9-approval-policy.ts` covers create-time persistence, the release gate (default, required-high blocked, required-high happy), milestone-targeted required-high behavior, and `update_high_approval_policy` (flip, no-op rejection, non-Finance rejection, blocked while package-level or milestone-level requests are active).
- Demo seed adds a `complianceUpgrade` package parked at `lowApproved` to walk through the gated-release narrative.

### Phase 6: Evidence, Withdrawal, Dashboard, And Audit Polish

Deliverable: evidence review, document-reference state, contractor withdrawal balances, dashboards, and audit trails in `app/` match the clarity of the static demo and are backed by real state.

Why sixth: this becomes most valuable once richer backend state exists.

### Phase 7: Static Prototype Audit

Deliverable: walk through `frontend-prototype/web/index.html` and `frontend-prototype/web/static/projects/js/construkt.js`; every core product claim is either backed by a workstream, backed by current backend behavior, or removed/reworded.

Why seventh: after `app/` converges, maintaining two product surfaces will create avoidable drift. The audit should explicitly check milestone invoices, evidence refs, document requests, escrow approval, release, and contractor withdrawal views.

Audit checklist:

- project creation flow
- PM package creation and milestone editor
- contractor assignment
- Finance escrow approval step
- contractor invoice submission for package-level and milestone-level requests
- evidence review screen
- document request flow
- variation request flow
- Finance release
- contractor withdrawal balance and clear-withdrawn UI
- audit trail screen
- dashboard role views for Finance, PM, and Contractor

Workstream 7 is continuous rather than a discrete phase: every backend phase ends by extending localnet seed data enough to demonstrate that phase's behavior end-to-end.

## Near-Term First Slice

Phase 0 through Phase 5 are complete. The next useful slice is Phase 6 (Workstream 6 — evidence, withdrawal, dashboard, audit polish):

1. Treat evidence packs and document requests as request-linked metadata with status (`requested`, `fulfilled`, reviewer note).
2. Derive contractor withdrawal balance in the app from released-but-not-cleared state and add a "mark withdrawn" UX.
3. Promote dashboard selectors to surface project-level totals (allocated, funded, requested, approved, released, contractor-withdrawal balance, held amount, evidence awaiting review, document requests outstanding).
4. Strengthen audit-trail event coverage so user-facing state transitions are reconstructable from chain reads plus metadata.

This is the next useful slice because the on-chain payment-control surface is now feature-complete for V0; Phase 6 makes the resulting state understandable and demoable on the React surface.

## Resolved Decisions

1. Project budget is hard on-chain enforcement and is displayed in the app.
2. Project budget is mint-scoped; V0 supports one mint per project.
3. Project mint is immutable after `initialize_project`.
4. Project allocation is tracked on `ProjectAccount`, not derived by scanning package accounts.
5. Milestone allocation is tracked on `WorkPackageAccount` as `allocated_milestone_amount`.
6. Milestone PDA seed is `["milestone", work_package, milestone_id_le_bytes]`.
7. `WorkPackageAccount` gets `milestone_counter: u64`; milestone IDs are per-package `u64` values starting at `1` and independent of the payment request counter.
8. Milestone status is V0-narrow: `Active`, `Completed`, and reserved `Cancelled`.
9. `PaymentRequestAccount` uses `has_milestone: bool` plus `milestone: Pubkey` for milestone-targeted requests.
10. Phase 2 `create_milestone` is Finance/project-authority callable for active packages; Phase 4 adds the drafter path for draft packages.
11. Milestone display names/descriptions stay off-chain behind compact metadata refs.
12. Milestone date overlap is UI/off-chain validation; on-chain validates only date order and money invariants.
13. Milestone mode is one-way: once any milestone exists, the package is in milestone mode for life and all future requests must target a milestone.
14. V0 milestone packages must have milestone amounts sum to package cap before `fund_escrow` in Phase 2 and before `activate_work_package` in Phase 4.
15. Simple packages complete when released amount equals package cap.
16. Milestone packages complete when every created milestone is complete and released milestone value equals package cap.
17. High approval starts as `high_approval_required: bool` on `WorkPackageAccount`, not a separate policy account.
18. `high_approval_required` is immutable while a payment request is active.
19. Package drafts require project-level drafter authorization before they can be implemented safely.
20. Finance can authorize any wallet as a project drafter; UI may present this as "Add PM" for the demo.
21. Draft packages create vault ATA only at Finance activation.
22. Keep `create_work_package` as the direct Finance-created active package path.
23. `Cancelled` may be reserved in the package status enum, but `cancel_work_package` is out of scope until explicitly added.
24. The early "optional Director" concept is a future configurable approval-policy label, not a current required role in the frontend or backend.
25. Evidence packs and document requests use off-chain document/reference metadata linked to packages, milestones, and payment requests; raw files do not belong on-chain.
26. Contractor withdrawal balance can be app-derived from released-but-not-withdrawn state for now; a separate on-chain claim/withdraw instruction is a later product decision.
27. Lightweight variation requests can remain metadata-first unless they change package cap, milestone amount, contractor assignment, `high_approval_required`, or the wallet authorized to release.

## Open Decisions

1. How much audit history must be reconstructable from chain events alone versus off-chain metadata/indexing?
2. Should released funds transfer immediately, or should a later backend version create a claimable withdrawal balance that the contractor explicitly withdraws on-chain?
3. Which variation requests should become first-class on-chain state rather than off-chain metadata plus references?
4. Should the static prototype be retired once `app/` converges, or kept as a pitch-only artifact with explicit labels?

## Test File Convention

Current Anchor tests are split into focused `b*` suites through `b8`. New backend workstreams should add focused files rather than keep growing the existing suites indefinitely:

- `tests/construkt.b5-budget.ts`
- `tests/construkt.b6-milestones.ts`
- `tests/construkt.b7-contractor-assignment.ts`
- `tests/construkt.b8-package-drafts.ts`
- `tests/construkt.b9-approval-policy.ts`
- `tests/construkt.b10-audit-metadata.ts` covers Workstream 6 event/metadata changes

Project drafter authorization tests can live in `tests/construkt.b8-package-drafts.ts`, because the drafter account exists to enable the draft package flow.

Shared fixtures should remain in `tests/setup.ts`.

App-side tests live next to the unit they cover as `*.test.ts`. Selector additions in Phase 6 should land in `app/src/selectors/*.test.ts`; client parity changes should update both `app/src/lib/mockClient.test.ts` and any Anchor-client integration coverage that exists for the touched behavior.

## Definition Of Converged

The frontend/backend convergence is successful when:

- a user can create a project budget in `app/`
- a user can create packages and milestone schedules in `app/`
- package and milestone caps are enforced by the backend
- PMs or authorized project drafters can assign contractors before Finance activation
- Finance can review the assigned contractor, package cap, milestone schedule, and approve escrow before requests are submitted
- contractors can submit requests against the right payable unit
- submitted evidence and document references are available to PM review
- PM approval unlocks Finance release by default
- required high approval can be configured when needed
- released funds appear in contractor withdrawal views and can be cleared from the app state when withdrawn
- lightweight variation/document workflows have a clear metadata/reference path when they affect project delivery or release decisions
- holds, rejection, release, and audit trail behave consistently across app screens
- seeded localnet data tells the same story as the demo
- `frontend-prototype/web/index.html` and `frontend-prototype/web/static/projects/js/construkt.js` have been audited so every core product claim is backed by current backend behavior, assigned to a workstream, or removed/reworded
