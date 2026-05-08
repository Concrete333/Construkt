# Frontend / Backend Convergence Plan

This plan defines how Construkt moves from two parallel demos into one backend-backed product experience.

The static frontend in `frontend-prototype/web/index.html` is the clearest expression of the intended product flow. The React app in `app/` is the target runtime for the backend-backed product. The Anchor program in `programs/construkt/` is the source of truth for payment-control rules.

The goal is not to copy every static-demo shortcut into the backend. The goal is to make the backend and React app support the same user-visible capabilities that the demo promises, while preserving the Solana model: one deployed program, with projects, packages, milestones, payment requests, approvals, and vaults represented as accounts under it.

## Current State

### Static Frontend Prototype

The static prototype currently demonstrates:

- landing/splash page and product explanation
- project dashboards by role
- project creation with project type choices
- work package creation and package status views
- milestone / bespoke / valuation-style package language
- role-specific actions for Finance, PM, Contractor, and optional Director
- invoice submission, approval, holds, release, and audit trail
- polished UX copy and presentation-focused flow

This surface is presentation-first. It can use mocked/local state, but it must not be described as on-chain truth.

### React App

The React app currently supports:

- mock-client mode by default
- Anchor-backed mode with `VITE_ANCHOR_RPC`
- deterministic demo wallets for localnet/devnet testing
- project, package, request, approval, hold, release, role, metadata, and audit views
- seeded demo data that mirrors several backend states

This is the product runtime we should converge toward. New backend-backed UI work should happen here, with the static prototype used as the UX reference.

### Anchor Backend

The backend currently supports:

- `initialize_project`
- `create_work_package`
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

`HighApproved` remains available as an optional/custom approval state. It is not mandatory before release.

## Convergence Principles

1. `app/` is the backend-backed product target.
2. `frontend-prototype/` is the UX/storytelling reference, not the backend source of truth.
3. The backend should match user-visible functionality, not demo implementation shortcuts.
4. On-chain state should stay narrow: payment-control rules, role authority, caps, escrow, payment status, holds, document refs/hashes, and audit-critical events.
5. Full documents, long descriptions, display copy, and rich files stay off-chain.
6. Finance remains the release and funding authority.
7. PM/LowApprover approval is the default release gate.
8. Optional higher approval should be configurable, not hard-coded as mandatory Director review.
9. Milestones should be account-backed payment-control units, not separate deployed programs.
10. Every backend feature should have an Anchor test and a corresponding React app path.
11. Backend workstreams that change account layout must regenerate and commit the IDL.

## Migration Policy

Anchor accounts are fixed-layout. Adding fields to `ProjectAccount`, `WorkPackageAccount`, `PaymentRequestAccount`, or new account relationships is a breaking account-layout change.

For V0:

- Localnet/devnet are resettable demo networks. Backend workstreams that change account layout should ship with `--reset` instructions and a fresh `npm run seed:localnet` flow, not migration code.
- Every backend workstream that changes the program must include `anchor build`, regenerated IDL JSON under `app/src/idl/`, and any required updates to `app/src/lib/anchorClient.ts`.
- Devnet testers should expect old accounts to become unreadable after layout changes. Reset/redeploy/reseed is the supported V0 path.
- Any future non-resettable environment needs a separate migration plan before account layout changes are merged.

## Capability Gap Map

| Product capability from the frontend | Current backend support | Convergence target |
| --- | --- | --- |
| Project-level budget | Partial: package caps only | Store project budget, project mint, tracked allocated cap, and enforce package/milestone caps against them |
| Project type selection | Metadata/display only | Store package/payment model metadata off-chain; enforce only payment-control rules on-chain |
| Work package cap | Supported | Keep; validate against project budget and project mint |
| Milestone packages | Not first-class | Add milestone/tranche accounts under work packages |
| Milestone names/dates/amounts | Metadata only | Store compact milestone metadata ref, date bounds, amount/cap, released amount, and status |
| Milestone date overlap | UI/local only | Validate overlap off-chain/UI; on-chain only enforces `start_at < end_at` and money invariants |
| PM package creation | Not supported; Finance creates packages | Add project-level drafter authorization before PM draft package flow |
| Contractor assignment after package setup | Limited | Allow controlled pre-activity contractor assignment/update |
| Contractor invoice submission | Supported at package level | Extend to package-level or milestone-level request targets |
| Approval behavior and role labels | Fixed role enum; optional high approval exists | Add package-level high-approval policy flag first; use metadata for labels; defer dynamic roles |
| Finance release | Supported | Keep; release from PM-approved or high-approved states depending on package policy |
| Holds | Supported at request level | Keep request-level holds; consider package/milestone holds only if a product need appears |
| Audit trail | Partial | Strengthen event coverage and off-chain indexing/display |
| Dashboard history | Partial | Build app-side state summaries from chain reads plus metadata/events |

## Backend Workstreams

### 0. Project-Level Role Prerequisite

Objective: define who can act on a project before a work package exists.

This is a prerequisite for PM draft packages. Current `RoleAssignmentAccount` is package-scoped:

```text
["role", work_package, role_byte, wallet]
```

There is no "PM of the project" account today.

Recommended V0 path:

- Add a small project-level drafter authorization account rather than full dynamic project roles.
- PDA seed: `["project_drafter", project, wallet]`.
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
- `ProjectAccount` stores `mint`, `budget_amount`, and `allocated_amount`.
- `create_work_package` validates `work_package.mint == project.mint`.
- Allocation is tracked on `ProjectAccount`; it is not derived by iterating package accounts inside instructions.
- Cancellation is out of scope until a `cancel_work_package` instruction exists.

Backend tasks:

- Add `mint`, `budget_amount`, and `allocated_amount` to `ProjectAccount`.
- Update `initialize_project` to set project mint and budget.
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

Recommended model:

```text
ProjectAccount
  WorkPackageAccount
    MilestoneAccount
    PaymentRequestAccount
```

Milestones are payable units under a work package. They are not separate deployed programs.

Resolved V0 decisions:

- Milestone names should follow existing metadata convention: compact `metadata_ref` on-chain, rich name/description off-chain.
- On-chain milestone validation should not enforce date overlap. Date overlap is UI/off-chain validation because it does not protect funds and is awkward to enforce safely in Solana without requiring all sibling milestones as accounts.
- On-chain date validation should enforce `start_at < end_at`.
- On-chain money validation should enforce `amount > 0` and milestone caps within remaining work package cap.

Active request invariant:

- Non-milestone packages keep the current package-scoped `has_active_request` and `active_request`.
- Milestone packages use a milestone-scoped active request flag on `MilestoneAccount`.
- `submit_payment_request` branches on whether the request targets a milestone:
  - no milestone target: check and set `WorkPackageAccount.has_active_request`
  - milestone target: check and set `MilestoneAccount.has_active_request`
- A package with milestones can have parallel active requests across different milestones, but not two active requests on the same milestone.
- A package should not mix whole-package payment requests and milestone payment requests once milestone accounts exist.

Backend tasks:

- Add `MilestoneAccount` with package reference, milestone id, amount/cap, released amount, start/end timestamps, status, metadata ref, active request flag, and bump.
- Add `create_milestone`.
- Track allocated milestone amount on `WorkPackageAccount`, or otherwise store enough state to prevent milestone caps exceeding package cap without scanning all milestone accounts.
- Extend `PaymentRequestAccount` with optional milestone target fields.
- Update `submit_payment_request` to support package-level or milestone-level targets.
- Update `release_payment` to update milestone totals/status when a milestone target exists.
- Define package completion rules:
  - simple package: completed when package released amount equals package cap
  - milestone package: completed when all milestone value is released or package released amount equals package cap
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

Backend tasks:

- Add controlled contractor update before first payment request or before package activation.
- Ensure contractor role assignment and `work_package.contractor` stay consistent.
- Prevent contractor changes after payment activity begins.
- Regenerate and commit the IDL if account or instruction shapes change.

React app tasks:

- Let Finance or an authorized project drafter select a contractor at the expected point in the flow.
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

Resolved V0 direction:

- PM/project drafter can create draft packages.
- Finance activates packages and funds escrow.
- Finance remains the only release and escrow-funding authority.

Vault timing decision:

- Draft package creation should not create the vault ATA.
- `activate_work_package` creates the vault ATA and vault authority relationship, using the same associated token program and mint accounts that `create_work_package` uses today.
- This avoids PM/drafter paying ATA rent for drafts that Finance may reject.

Backend tasks:

- Add package status such as `Draft`, `Active`, `Completed`, `Cancelled`.
- Add `create_package_draft` for authorized project drafters.
- Add `activate_work_package` for Finance/project authority.
- Move vault creation to activation for draft-created packages.
- Keep a direct Finance-created active package path only if it materially reduces demo friction.
- Block funding, requests, approvals, and release until package is active.
- Regenerate and commit the IDL.

React app tasks:

- Let PM create a draft package/milestone schedule.
- Let Finance review, set/confirm funding, activate, and fund.
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
- Promote to a dedicated policy account only when a second policy dimension appears.

Backend tasks:

- Add `high_approval_required` to `WorkPackageAccount`.
- Update `release_payment`:
  - if `high_approval_required == false`, release accepts `LowApproved` or `HighApproved`
  - if `high_approval_required == true`, release requires `HighApproved`
- Add or update package creation/activation params to set the flag.
- Regenerate and commit the IDL.

React app tasks:

- Let package setup choose whether high approval is required.
- Explain which approvals are required for release.
- Hide optional Director/high controls when disabled by product choice, or label them as optional when available.

Tests:

- `tests/construkt.b9-approval-policy.ts`
- default policy releases after PM approval
- required-high policy blocks release until high approval
- required-high policy releases after high approval
- UI selector tests show required vs optional approval labels correctly

### 6. Audit And Dashboard Convergence

Objective: make dashboard/history views reflect real backend state rather than static demo assumptions.

Backend/app tasks:

- Review emitted events for all user-facing state changes.
- Ensure all events include enough account keys for indexing.
- Use the existing `MetadataClient` / `LocalStorageMetadataClient` seam for off-chain display metadata.
- Add event-derived notes or summaries where current local metadata is not enough.
- Add app selectors for project-level summaries:
  - total budget
  - allocated package cap
  - funded amount
  - requested amount
  - approved amount
  - released amount
  - held amount
  - overdue packages/milestones

Tests:

- selector tests for every dashboard metric
- event/account tests for key state transitions
- app tests for release-ready, held, rejected, completed, draft, and milestone states

### 7. Demo Seed Alignment

Objective: make localnet seed data tell the same story as the polished static demo.

Seed targets:

- one project with realistic budget and project mint
- simple package, no request
- milestone package with multiple milestones
- package with PM-approved request ready for Finance
- package with optional high approval recorded
- package requiring high approval before Finance release
- package on hold
- rejected request with package unblocked for a new request
- second successful request after rejection, if we want the seed to demonstrate retry behavior
- released package with audit trail

Tests:

- seed script type-checks
- seeded account presence check passes
- seeded package metadata refs resolve
- app can load seeded state in Anchor mode
- rejected-then-retried seed path is covered if added

## Implementation Order

### Phase 0: Account Layout And IDL Discipline

Deliverable: every backend PR follows reset/seed instructions and commits regenerated IDL.

Why first: all later phases change account layouts.

### Phase 1: Budget And Validation

Deliverable: project budget, project mint, tracked allocation, and package cap validation exist on-chain.

Why first: every later workflow depends on knowing what budget is being allocated.

### Phase 2: Milestone Backend

Deliverable: milestone/tranche accounts, active-request semantics, and milestone-targeted payment requests exist on-chain.

Why second: this is the largest frontend/backend mismatch in package setup.

### Phase 3: Milestone React Flow

Deliverable: the React app can create real backend packages and milestones using the UX shape from the static prototype.

Why third: this is the frontend convergence step that consumes the Phase 1 and Phase 2 backend work.

### Phase 4: Project Drafters And Package Drafts

Deliverable: authorized project drafters can prepare package/milestone structure; Finance activates and funds it.

Why fourth: this matches the demo's PM workflow while keeping Finance in control of money.

### Phase 5: High-Approval Policy Flag

Deliverable: optional vs required high approval is a package field, not just a convention.

Why fifth: it turns "customizable approval path" from copy into real product behavior without overbuilding full dynamic roles.

### Phase 6: Dashboard And Audit Polish

Deliverable: dashboards and audit trails in `app/` match the clarity of the static demo and are backed by real state.

Why sixth: this becomes most valuable once richer backend state exists.

### Phase 7: Static Prototype Audit

Deliverable: walk through `frontend-prototype/web/index.html` and `frontend-prototype/web/static/projects/js/construkt.js`; every core product claim is either backed by a workstream, backed by current backend behavior, or removed/reworded.

Why seventh: after `app/` converges, maintaining two product surfaces will create avoidable drift.

## Near-Term First Slice

Start with Phase 0 and Phase 1:

1. Add project `mint`, `budget_amount`, and `allocated_amount` to `ProjectAccount`.
2. Update `initialize_project`, `create_work_package`, seed script, mock client, app client, and IDL.
3. Validate package caps against project remaining allocation.
4. Add `tests/construkt.b5-budget.ts`.
5. Update localnet seed data to include a realistic project budget.
6. Update the React app to show project budget and remaining allocatable budget.
7. Document the reset/reseed expectation for the account layout change.

This is the smallest useful slice because it improves the real backend while immediately making the package creation flow feel closer to the frontend demo.

## Resolved Decisions

1. Project budget should be hard on-chain enforcement and displayed in the app.
2. Project budget is mint-scoped; V0 supports one mint per project.
3. Allocation is tracked on `ProjectAccount`, not derived by scanning package accounts.
4. Milestone display names/descriptions stay off-chain behind compact metadata refs.
5. Milestone date overlap is UI/off-chain validation; on-chain validates only date order and money invariants.
6. High approval starts as `high_approval_required: bool` on `WorkPackageAccount`, not a separate policy account.
7. Package drafts require project-level drafter authorization before they can be implemented safely.
8. Draft packages should create vault ATA only at Finance activation.
9. `cancel_work_package` is out of scope until explicitly added.

## Open Decisions

1. Should milestone packages require all payment requests to target milestones, or allow a one-time conversion from package-level mode before activity?
2. Should package completion for milestone packages depend on all milestones being complete, released amount equaling package cap, or both?
3. Should project drafters be limited to PM-style users, or can Finance authorize any wallet as a drafter?
4. How much audit history must be reconstructable from chain events alone versus off-chain metadata/indexing?
5. Should the static prototype be retired once `app/` converges, or kept as a pitch-only artifact with explicit labels?

## Test File Convention

Current Anchor tests are split into `b1` through `b4`. New backend workstreams should add focused files rather than keep growing the existing suites indefinitely:

- `tests/construkt.b5-budget.ts`
- `tests/construkt.b6-milestones.ts`
- `tests/construkt.b7-contractor-assignment.ts`
- `tests/construkt.b8-package-drafts.ts`
- `tests/construkt.b9-approval-policy.ts`

Shared fixtures should remain in `tests/setup.ts`.

## Definition Of Converged

The frontend/backend convergence is successful when:

- a user can create a project budget in `app/`
- a user can create packages and milestone schedules in `app/`
- package and milestone caps are enforced by the backend
- contractors can submit requests against the right payable unit
- PM approval unlocks Finance release by default
- required high approval can be configured when needed
- holds, rejection, release, and audit trail behave consistently across app screens
- seeded localnet data tells the same story as the demo
- `frontend-prototype/web/index.html` and `frontend-prototype/web/static/projects/js/construkt.js` have been audited so every core product claim is backed by current backend behavior, assigned to a workstream, or removed/reworded
