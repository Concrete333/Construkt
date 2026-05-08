# Frontend / Backend Convergence Plan

This plan defines how Construkt should move from two parallel demos into one backend-backed product experience.

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

This surface is presentation-first. It is allowed to use mocked/local state, but it must not be described as on-chain truth.

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

## Capability Gap Map

| Product capability from the frontend | Current backend support | Convergence target |
| --- | --- | --- |
| Project-level budget | Partial: package caps only | Store project budget and validate package/milestone caps against it |
| Project type selection | Metadata/display only | Store package/payment model metadata off-chain; enforce only the payment rules on-chain |
| Work package cap | Supported | Keep; validate against project budget |
| Milestone packages | Not first-class | Add milestone/tranche accounts under work packages |
| Milestone names/dates/amounts | Metadata only | Store compact milestone refs, dates, amounts, status on-chain or split long copy off-chain |
| No overlapping milestone dates | Not supported | Enforce for milestones under the same package |
| PM package creation | Not supported; Finance creates packages | Add PM draft flow or keep Finance-only creation and adjust UX |
| Contractor assignment after package setup | Limited | Allow controlled pre-activity contractor assignment/update |
| Contractor invoice submission | Supported | Extend to package-level or milestone-level request targets |
| PM approval | Supported | Keep as default release gate |
| Optional high approval | Supported as fixed role | Move toward configurable approval policies |
| Finance release | Supported | Keep; release from PM-approved or high-approved states |
| Holds | Supported at request level | Keep; consider package/milestone holds later only if needed |
| Audit trail | Partial | Strengthen event coverage and off-chain indexing/display |
| Dashboard history | Partial | Build app-side state summaries from chain reads plus metadata/events |
| Custom roles | Not supported beyond fixed roles | Add configurable labels first; dynamic role policies later |

## Backend Workstreams

### 1. Project Budget And Package Cap Controls

Objective: make project creation and package setup match the frontend's budget expectations.

Backend tasks:

- Add `budget_amount` or equivalent to `ProjectAccount`.
- Add tracked allocated amount or derive allocation from package caps.
- Reject package creation when total active package caps exceed project budget.
- Decide whether cancelled packages return budget capacity.
- Add events for project budget and package allocation.

React app tasks:

- Add project budget input to Anchor-backed project creation.
- Show project budget, allocated package budget, funded amount, released amount, and remaining budget.
- Display clear validation errors when caps exceed budget.

Tests:

- project can initialize with a valid budget
- zero budget rejected if budget is required
- package cap cannot exceed project remaining budget
- multiple packages accumulate against project budget
- cancelled package budget behavior is tested once cancellation exists

### 2. Milestone / Tranche Accounts

Objective: make milestone-style packages real instead of only frontend placeholders.

Recommended model:

```text
ProjectAccount
  WorkPackageAccount
    MilestoneAccount
    PaymentRequestAccount
```

A `PaymentRequestAccount` should reference either:

- the whole work package, for simple package requests
- a milestone/tranche account, for milestone-based requests

Backend tasks:

- Add `MilestoneAccount` with package reference, milestone id, cap/amount, start date, end date, released amount, status, and metadata ref.
- Add `create_milestone` instruction.
- Enforce milestone amount/cap within work package cap.
- Enforce non-overlapping milestone date ranges within the same work package.
- Allow payment requests to target a milestone.
- Update release logic to mark milestone complete when fully released.
- Decide whether work package completion is based on total released amount, all milestones complete, or both.

React app tasks:

- Replace placeholder milestone schedules with real milestone creation against Anchor/localnet.
- Show package total while milestones are being added.
- Prevent overlapping dates in UI before transaction submission.
- Show milestone-level status and payment history.

Tests:

- milestone creation succeeds within package cap
- milestone amount exceeding package remaining cap fails
- overlapping milestone dates fail
- adjacent non-overlapping milestone dates succeed
- payment request can target a milestone
- release updates milestone and package totals correctly

### 3. Package Draft And Activation Flow

Objective: reconcile the frontend's PM package workflow with Finance control over money.

Decision needed:

- Option A: Finance remains the only creator of work packages.
- Option B: PM can create draft packages, but Finance must activate/fund before payment requests.

Recommended for product fit: Option B.

Backend tasks:

- Add package status such as `Draft`, `Active`, `Completed`, `Cancelled`.
- Add `create_package_draft` for PM/LowApprover or an assigned project manager role.
- Add `activate_work_package` for Finance.
- Block funding, requests, approvals, and release until package is active.
- Preserve Finance-only escrow funding and release.

React app tasks:

- Let PM create a draft package/milestone schedule.
- Let Finance review, set/confirm funding, and activate.
- Make draft vs active states obvious on dashboards.

Tests:

- PM can create draft package if assigned
- unassigned wallet cannot create draft package
- contractor cannot submit request against draft package
- Finance can activate and fund draft package
- active package follows normal request/approval/release flow

### 4. Contractor Assignment And Package Ownership

Objective: support the frontend's contractor-picking workflow without weakening backend invariants.

Backend tasks:

- Add controlled contractor update before first payment request or before package activation.
- Ensure contractor role assignment and `work_package.contractor` stay consistent.
- Prevent contractor changes after payment activity begins.

React app tasks:

- Let Finance or PM draft select a contractor at the expected point in the flow.
- Show whether contractor assignment is pending, confirmed, or locked.

Tests:

- contractor can be assigned before activation/activity
- contractor role assignment is created or validated
- contractor cannot be changed after request submission
- old contractor cannot submit after reassignment

### 5. Approval Policies And Custom Roles

Objective: move from hard-coded role language to configurable approval behavior.

Practical staged approach:

1. Keep current role enum for backend safety.
2. Add metadata-driven display labels for roles.
3. Add approval policy account once custom approval paths are needed.

Backend tasks for first policy version:

- Add `ApprovalPolicyAccount` scoped to package or project.
- Store whether high approval is required, optional, or disabled.
- Keep `LowApprover` as the minimum release gate.
- Make `release_payment` consult policy when high approval is required.

React app tasks:

- Let package setup choose approval policy.
- Explain which approvals are required for release.
- Hide optional Director/high controls when disabled.

Tests:

- default policy releases after PM approval
- required-high policy blocks release until high approval
- disabled-high policy rejects high approval attempts or hides them at UI level
- policy cannot be changed after active request unless explicitly allowed

### 6. Audit And Dashboard Convergence

Objective: make dashboard/history views reflect real backend state rather than static demo assumptions.

Backend/app tasks:

- Review emitted events for all user-facing state changes.
- Ensure all events include enough account keys for indexing.
- Add app selectors for project-level summaries:
  - total budget
  - allocated package cap
  - funded amount
  - requested amount
  - approved amount
  - released amount
  - held amount
  - overdue packages/milestones
- Persist off-chain metadata and event-derived audit notes for demo continuity.

Tests:

- selector tests for every dashboard metric
- event/account tests for key state transitions
- app tests for release-ready, held, rejected, completed, and draft states

### 7. Demo Seed Alignment

Objective: make localnet seed data tell the same story as the polished static demo.

Seed targets:

- one project with realistic budget
- simple package, no request
- milestone package with multiple milestones
- package with PM-approved request ready for Finance
- package with optional high approval recorded
- package on hold
- rejected request with package unblocked for a new request
- released package with audit trail

Tests:

- seed script type-checks
- seeded account presence check passes
- seeded package metadata refs resolve
- app can load seeded state in Anchor mode

## Implementation Order

### Phase 1: Budget And Validation

Deliverable: project budget exists on-chain and package caps cannot exceed it.

Why first: every later workflow depends on knowing what budget is being allocated.

### Phase 2: Real Milestones

Deliverable: milestone/tranche accounts with names/refs, dates, amounts, and non-overlap validation.

Why second: this is the largest frontend/backend mismatch in package setup.

### Phase 3: React App Package Builder

Deliverable: the React app can create real backend packages and milestones using the UX shape from the static prototype.

Why third: once the backend supports milestones, the app can stop using placeholder schedules.

### Phase 4: PM Drafts And Finance Activation

Deliverable: PM can prepare package/milestone structure; Finance activates and funds it.

Why fourth: this matches the demo's role workflow while keeping Finance in control of money.

### Phase 5: Approval Policy

Deliverable: optional vs required high approval is a package policy, not just a hard-coded role convention.

Why fifth: it converts "customizable roles" from copy into real product behavior.

### Phase 6: Dashboard And Audit Polish

Deliverable: dashboards and audit trails in `app/` match the clarity of the static demo and are backed by real state.

Why sixth: this becomes most valuable once richer backend state exists.

### Phase 7: Static Prototype Retirement Or Repositioning

Deliverable: either retire the static demo as the canonical walkthrough or clearly label it as a pitch/demo artifact.

Why seventh: after `app/` converges, maintaining two product surfaces will create avoidable drift.

## Near-Term First Slice

Start with Phase 1 and a small piece of Phase 2:

1. Add project budget to `ProjectAccount`.
2. Validate package caps against project budget.
3. Add tests for budget allocation and over-allocation.
4. Add a minimal `MilestoneAccount` design document or scaffold.
5. Update localnet seed data to include a realistic project budget.
6. Update the React app to show project budget and remaining allocatable budget.

This is the smallest useful slice because it improves the real backend while immediately making the package creation flow feel closer to the frontend demo.

## Open Decisions

1. Should PMs be able to create package drafts, or should Finance remain the only package creator for V0?
2. Should milestones be required for milestone packages, or can a work package remain payable as a single unit?
3. Should project budget be hard on-chain enforcement, display metadata, or both?
4. Should milestone names live on-chain, or should on-chain accounts store only compact metadata refs?
5. Should high approval be optional, required, or disabled per project or per package?
6. How much audit history must be reconstructable from chain events alone versus off-chain metadata/indexing?

## Definition Of Converged

The frontend/backend convergence is successful when:

- a user can create a project budget in `app/`
- a user can create packages and milestone schedules in `app/`
- package and milestone caps are enforced by the backend
- contractors can submit requests against the right payable unit
- PM approval unlocks Finance release by default
- optional high approval can be configured when needed
- holds, rejection, release, and audit trail behave consistently across app screens
- seeded localnet data tells the same story as the demo
- the static prototype no longer promises core behavior that the backend cannot represent
