# Front/Back Merge Plan

Current plan for connecting the Construkt frontend prototype to the Anchor smart contract backend.

This plan is frontend-first. The current frontend tells us which product actions users expect. The backend work is to make each action execute at the correct time, with the correct signer, against the correct Anchor instruction or off-chain metadata path.

Working source:

- Frontend demo: `frontend-prototype/web/index.html`
- Frontend behavior: `frontend-prototype/web/static/projects/js/construkt.js`
- Frontend unit tests: `frontend-prototype/tests/construkt.frontend.ts`
- Anchor program: `programs/construkt/src/lib.rs`
- Anchor tests: `tests/`

Frontend source policy:

- `frontend-prototype/web/index.html` is the canonical backendless demo entry point for current demos.
- `frontend-prototype/web/templates/projects/construkt.html` is retained for possible Django-based planning.
- `frontend-prototype/website/construkt.html` is retained as a standalone legacy/export source.
- These three HTML sources may intentionally diverge until the final frontend runtime is chosen. Keep product behavior changes in `frontend-prototype/web/static/projects/js/construkt.js` and shared CSS unless a specific HTML source is being updated deliberately.

## Goal

Build backwards from the current frontend so the integrated product can complete one real escrow payment flow:

1. Finance creates a project.
2. A package is prepared from frontend inputs.
3. Finance approves the package for escrow.
4. The backend creates the work package, role assignments, vault, and funding.
5. Contractor submits a payment request with a document reference.
6. Project Manager approves or rejects.
7. Finance performs the final approval/release path required by the backend.
8. Contractor receives tokens.
9. The UI updates from backend account state and transaction results.

For V0, the smart contract remains the source of truth for escrow, roles, request status, holds, approvals, and release. Rich product data stays off-chain unless explicitly listed as an Anchor account requirement.

## Current Backend Capability

The current Anchor program supports:

- `initialize_project(project_id, name, metadata_ref)`
- `create_work_package(package_id, cap_amount, contractor, scope_ref)`
- `assign_role(role, wallet)`
- `set_role_active(active)`
- `fund_escrow(amount)`
- `submit_payment_request(request_id, amount, document_ref)`
- `add_document_reference(document_ref)`
- `approve_request(role, note_ref)`
- `reject_request(role, note_ref)`
- `place_hold(hold_ref)`
- `remove_hold()`
- `release_payment()`

Current on-chain accounts:

- `ProjectAccount`
- `WorkPackageAccount`
- `RoleAssignmentAccount`
- `PaymentRequestAccount`
- `ApprovalRecord`
- SPL Token mint/accounts for mock USDC escrow

Current backend-enforced flow:

1. `initialize_project`
2. `create_work_package`
3. `assign_role(Role::Contractor)`
4. `assign_role(Role::LowApprover)`
5. `assign_role(Role::HighApprover)`
6. `fund_escrow`
7. `submit_payment_request`
8. `approve_request(Role::LowApprover)`
9. `approve_request(Role::HighApprover)`
10. `release_payment`

Important backend constraints:

- Only `ProjectAccount.authority` can create work packages, fund escrow, place/remove holds, and release.
- Contractor must be assigned and active before submitting requests.
- Low approver must approve before high approver.
- Contractor cannot approve their own request.
- Same wallet cannot hold both approver roles for one package.
- Holds are request-level, not package-level.
- Release requires `PaymentRequestStatus::HighApproved`.
- The backend tracks funded amount; direct SPL transfers to the vault do not expand budget.

## Current Frontend Actions

The current frontend has these user-facing actions:

| Frontend action | Current frontend function | Backend requirement |
|---|---|---|
| Create project | `createProject` | `initialize_project` plus off-chain metadata save |
| Add estimated package | `addPackage` | Off-chain package draft, then later on-chain `create_work_package` |
| Finance approve package | `approveWorkPackage` | Orchestrate `create_work_package`, `assign_role`, and maybe `fund_escrow` |
| Fund package | `fundPackage` | `fund_escrow` |
| Place hold | `placeHold` | `place_hold` on an active payment request, not package status |
| Remove hold | No clear current UI action | Add UI action for `remove_hold` |
| Submit invoice | `submitInvoice` | `submit_payment_request` |
| Add/update document | `addDocument`, `editDocument`, `updateDocument` | Off-chain document metadata; `add_document_reference` only when updating request reference |
| Request documents | `requestDocuments` | Off-chain task/notification metadata |
| PM approve request | `approveRequest` | `approve_request(Role::LowApprover)` |
| Finance/final approve request | currently folded into `releaseFunds` | Must either call `approve_request(Role::HighApprover)` or backend must be changed |
| Reject request | `rejectRequest` | `reject_request(role)` |
| Release funds | `releaseFunds` | `release_payment` after high approval |
| Add team member | `addTeamMember` | Off-chain team metadata and/or `assign_role` when wallet + package role are known |
| Submit variation | `submitVariation` | No current backend support |
| Approve/reject variation | `approveVariation`, `rejectVariation` | No current backend support |
| Settings/profile/notifications | settings UI | Off-chain only |

## Product Decision: Finance And High Approval

The largest mismatch is final approval.

The frontend currently has three roles:

- Finance Director
- Project Manager
- Contractor

The backend has four distinct responsibilities:

- Project authority/Finance: funds, holds, releases
- Contractor: submits payment request
- LowApprover: first approval, maps naturally to Project Manager
- HighApprover: second approval, required before release

We need one explicit decision before integration work starts:

Option A: Add a Director/High Approver role to the frontend.

- Best match for the existing smart contract.
- Keeps Finance release separate from second approval.
- Requires UI updates for role switcher, dashboard tasks, request cards, and work-package action rows.

Option B: Treat Finance Director as both `HighApprover` and project authority in V0 demos.

- Smaller frontend change.
- The same wallet may approve as high approver and then release.
- Must be documented as demo simplification.
- Still requires two backend transactions: high approval, then release.

Option C: Modify the smart contract to remove high approval from V0.

- Best match for the current frontend, but weakens the locked approval model.
- Requires changing `PaymentRequestStatus`, `approve_request`, tests, release guard, and AGENTS.md design assumptions.
- Not recommended unless the product has intentionally changed to PM approval plus Finance release only.

Recommended path: Option B for the first integrated demo, followed by Option A if the product needs a true separate Director actor.

## Backend Modifications Needed

These are the smart contract or backend-adjacent changes needed to support the current frontend cleanly.

### Required For First Integrated Demo

1. Add a frontend integration client layer.

   Files to create under the future app or integration package:

   - `src/lib/construkt/anchorClient.ts`
   - `src/lib/construkt/pda.ts`
   - `src/lib/construkt/transactions.ts`
   - `src/lib/construkt/viewModels.ts`
   - `src/lib/construkt/metadataClient.ts`

   Responsibilities:

   - create Anchor provider/program
   - derive all PDAs
   - build each transaction from UI input
   - convert token display units to base units
   - fetch Anchor accounts
   - return UI-friendly view models
   - preserve transaction signatures for audit display

2. Add seed/dev wallet setup.

   Needed wallets:

   - Finance/project authority
   - Project Manager/LowApprover
   - HighApprover, either separate Director or Finance for demo
   - Contractor

   Needed token accounts:

   - finance mock USDC token account
   - contractor mock USDC token account
   - per-package escrow vault ATA, created by `create_work_package`

3. Add ID and PDA mapping.

   Frontend IDs like `proj-...`, `wp-...`, and `req-...` cannot be sent directly to Anchor.

   Required mapping:

   - project display ID -> `u64 project_id`
   - package display ID -> `u64 package_id`
   - request display ID -> `u64 request_id`
   - off-chain metadata ID -> `metadata_ref`, `scope_ref`, `document_ref`, `note_ref`, `hold_ref`

   PDA seeds to implement:

   - `["project", authority, project_id_le_bytes]`
   - `["work_package", project, package_id_le_bytes]`
   - `["vault_authority", work_package]`
   - `["role", work_package, role_byte, wallet]`
   - `["payment_request", work_package, request_id_le_bytes]`
   - `["approval", payment_request, role_byte]`

4. Add transaction orchestration for package approval.

   The frontend `approveWorkPackage()` currently does too much as a local state update.

   Backend-backed flow should be:

   - save or resolve package metadata off-chain
   - call `create_work_package`
   - call `assign_role(Role::Contractor)`
   - call `assign_role(Role::LowApprover)`
   - call `assign_role(Role::HighApprover)`
   - optionally call `fund_escrow` immediately if Finance enters funding amount
   - refresh project/package accounts
   - show vault address and transaction signatures

   Keep the UI label "Approve package" if that makes product sense, but internally it must become multiple backend operations.

5. Split final request handling.

   Current `releaseFunds()` must be split into:

   - `approveHighRequest()` -> `approve_request(Role::HighApprover, note_ref)`
   - `releasePayment()` -> `release_payment()`

   The release button must not be enabled until the request account is `HighApproved`, not merely PM-approved.

6. Rework holds.

   Current `placeHold()` sets package status to `Locked`.

   Backend-backed behavior:

   - user selects or confirms an active request
   - UI writes hold note metadata and passes `hold_ref`
   - call `place_hold(hold_ref)`
   - render request as held from `PaymentRequestAccount.hold_active`
   - add a visible "Remove hold" action for Finance
   - call `remove_hold()`

7. Route document actions through metadata.

   Current frontend document objects contain names, versions, file details, payment links, package links, uploader, and dates.

   V0 backend should not store rich document data on-chain.

   Required behavior:

   - save document metadata off-chain
   - attach returned ref/hash to frontend view model
   - when a payment request document reference changes, call `add_document_reference(document_ref)`
   - keep document filters and version display off-chain

8. Add account-state based view models.

   Replace local mutation as source of truth with selectors over fetched state.

   Required selectors:

   - project summary
   - package funding status
   - package release readiness
   - request approval timeline
   - active request per package
   - held request state
   - role-specific actions
   - token balances
   - audit/event timeline

### Backend Program Changes To Consider After First Demo

These are not required for the first on-chain escrow demo, but the current frontend already models them.

1. Estimated/unassigned work packages.

   Current contract requires a contractor and cap at `create_work_package`.

   Options:

   - keep estimates off-chain until Finance approval
   - add an on-chain `PackageDraftAccount`
   - allow nullable contractor/zero funding in `WorkPackageAccount`

   Recommendation: keep estimates off-chain in V0.

2. Package-level holds.

   Current contract supports request-level holds only.

   Options:

   - keep UI package hold as "place hold on active request"
   - add package-level hold fields to `WorkPackageAccount`

   Recommendation: keep request-level holds for V0 and change the UI wording.

3. Variations/change orders.

   Current frontend supports variation submission, PM approval, Finance approval, contractor agreement, and rejection.

   Backend options:

   - off-chain only for V0
   - add `VariationRequestAccount`
   - add cap adjustment instruction after approvals

   Recommendation: off-chain only for V0 unless variations become part of the escrow demo.

4. Document requests.

   Current frontend supports PM requesting documents from contractor.

   Backend options:

   - off-chain task/notification only
   - add `DocumentRequestAccount`

   Recommendation: off-chain only for V0.

5. Milestone, valuation, and bespoke schedules.

   Current frontend has contract model UI and package milestone schedule display.

   Backend options:

   - off-chain metadata only
   - add schedule accounts and partial release support

   Recommendation: off-chain metadata only for V0 because current backend releases each payment request in full.

6. Partial release/retention.

   Current backend V0 releases request amount in full.

   Do not add partial release until the basic flow is integrated and tested.

## Integration Architecture

Use three layers between UI and Anchor.

### 1. Metadata Adapter

Stores rich fields that are not on-chain:

- client/organisation
- project dates
- project contract model
- package display name and contract reference
- package start/completion dates
- package contract model
- milestones/payment schedule
- team member display names/orgs
- document names/types/files/versions
- approval/rejection/hold note text
- variation data
- document request data

For first demo this can be seed JSON plus local persistence. Later it can point to Supabase, IPFS, S3, or another backend.

### 2. Anchor Client

Owns all blockchain work:

- provider/program creation
- wallet/signer checks
- PDA derivation
- instruction calls
- account fetches
- token account lookup
- unit conversion
- transaction signature capture
- explorer URL generation for localnet/devnet

### 3. View Model Layer

Combines Anchor state and metadata:

- account state is authoritative for escrow/request/action status
- metadata supplies names, descriptions, docs, and display context
- view models decide which buttons are visible or disabled
- components should not inspect raw Anchor account shapes directly

## Required Frontend Refactors

1. Replace local `store` mutations with adapter calls.

   Keep a mock implementation first, but make the interface match the eventual Anchor-backed implementation.

2. Replace role switcher permissions.

   Role switcher may remain as a demo aid, but transaction permissions must come from connected wallet and on-chain `RoleAssignmentAccount`.

3. Add wallet state.

   UI needs to show:

   - connected wallet
   - active demo role
   - whether wallet matches required signer for an action
   - token account availability

4. Split request actions.

   PM approval, high approval, rejection, hold, remove hold, and release need separate action states.

5. Convert money values.

   Frontend uses GBP-style display values. Backend uses SPL Token base units.

   Add helper functions:

   - display amount -> token base units
   - token base units -> display amount
   - mock USDC label formatting

6. Replace mock chain log entries.

   Current `logChainAction()` creates fake chain messages.

   Replace with real:

   - transaction signatures
   - account addresses
   - event/account fetch results
   - explorer links

7. Preserve frontend unit tests.

   Keep `npm run test:frontend` passing while moving helpers behind reusable modules. The current tests copy pure helper logic, so follow-up work should import helpers from source modules when the frontend is modularized.

## Execution Plan

### Phase 1: Define Interfaces

- Create `ConstruktClient` TypeScript interface.
- Implement `MockConstruktClient` using current demo state.
- Define view model types for project, package, request, approval step, document, and task.
- Add PDA helper functions and unit tests.
- Add money conversion helper tests.

Exit criteria:

- Current UI can run against mock client.
- No user-facing behavior has regressed.
- `npm run test:frontend` passes.

### Phase 2: Backend Seed And Wallet Setup

- Add local/devnet seed script for mock USDC mint.
- Create or document demo wallets for Finance, PM, HighApprover/Director, Contractor.
- Create finance and contractor token accounts.
- Add package/project ID mapping strategy.
- Generate and commit IDL/types in a frontend-consumable location.

Exit criteria:

- A script can prepare localnet/devnet demo state.
- Frontend can derive expected PDAs from known IDs.

### Phase 3: Anchor Client Read Path

- Fetch projects by known PDA/seed registry.
- Fetch work packages for project.
- Fetch role assignments.
- Fetch payment requests and approval records.
- Fetch vault and contractor token balances.
- Merge fetched state with metadata adapter.

Exit criteria:

- UI renders from backend-shaped state.
- Read-only dashboard/project/package views work.

### Phase 4: Anchor Client Write Path

Integrate write actions in this order:

1. `initialize_project`
2. `create_work_package`
3. `assign_role`
4. `fund_escrow`
5. `submit_payment_request`
6. `approve_request(Role::LowApprover)`
7. `approve_request(Role::HighApprover)`
8. `place_hold`
9. `remove_hold`
10. `reject_request`
11. `add_document_reference`
12. `release_payment`

Exit criteria:

- Every write action refreshes account state after confirmation.
- UI shows transaction signature and resulting status.
- Invalid signer actions are blocked or fail with readable errors.

### Phase 5: Flow Polish

- Update copy so package holds are request holds.
- Update Finance release screen so high approval is explicit.
- Add remove-hold UI.
- Add separate high-approval task/action if using Option A.
- Add disabled/readiness reasons for unavailable actions.
- Keep variations and document requests clearly marked as off-chain metadata unless backend support is added.

Exit criteria:

- A user can understand why each action is available or blocked.
- No UI implies off-chain metadata is on-chain truth.

### Phase 6: Tests

Add or update tests for:

- frontend helper behavior
- PDA derivation
- money conversion
- view model state mapping
- mock client action sequencing
- Anchor happy path
- Anchor blocked paths

Backend paths that must stay covered:

- unauthorized project/package setup
- unauthorized role assignment
- contractor self-approval blocked
- wrong approval order blocked
- duplicate approval blocked
- inactive role blocked
- second active request blocked
- empty document reference blocked
- over-cap request blocked
- exact remaining-cap request allowed
- hold blocking approval/rejection/document update/release
- remove hold restores action availability
- wrong mint funding/release blocked
- release before high approval blocked
- successful release transfers funds and updates request/package state

## First Integrated Demo Acceptance Criteria

The demo is complete when:

- Finance connects a demo wallet.
- Finance creates a project or selects seeded project metadata.
- Finance approves a frontend package into an on-chain `WorkPackageAccount`.
- Finance assigns Contractor, PM/LowApprover, and HighApprover.
- Finance funds escrow with mock USDC.
- Contractor submits a request with a document reference.
- PM approves.
- HighApprover approves, or Finance approves as HighApprover under the documented demo simplification.
- Finance can place and remove a request hold.
- Finance releases funds only after high approval and no active hold.
- Contractor token balance increases.
- UI shows real status from Anchor accounts.
- UI shows transaction signatures/account links instead of fake chain logs.
- `npm run test:frontend` passes.
- Anchor tests pass in WSL/localnet.

## Commit-By-Commit Implementation Plan

Each commit should leave the repo in a runnable state. Prefer small commits that either add a boundary, wire one backend operation, or update one frontend flow. Do not mix broad UI polish with Anchor behavior changes.

### Commit 1: Lock The Integration Decision

Purpose:

- Choose the first-demo approval model.
- Recommended: Finance acts as `HighApprover` for the first integrated demo, while still sending a separate high-approval transaction before release.

Files likely touched:

- `FrontBackMergePlan.md`
- `AGENTS.md`
- `V0MVP.md`

Changes:

- Record the chosen Finance/HighApprover model.
- Update wording so Finance release never implies skipped high approval.
- Make clear that a separate Director role can be added later.

Verification:

- Documentation review only.

### Commit 2: Add Frontend Integration Types

Purpose:

- Create the stable frontend/backend contract before replacing UI behavior.

Files likely added:

- `frontend-prototype/src/lib/construkt/types.ts`
- `frontend-prototype/src/lib/construkt/client.ts`

Changes:

- Define `ConstruktClient`.
- Define view model types for projects, packages, requests, approvals, roles, documents, balances, and action readiness.
- Define backend operation inputs such as `CreateProjectInput`, `ApprovePackageInput`, `SubmitRequestInput`, `ApproveRequestInput`, `ReleasePaymentInput`.

Verification:

- TypeScript compile or `npx tsc --noEmit` once the frontend TS structure exists.
- `npm run test:frontend`.

### Commit 3: Add PDA And ID Helpers

Purpose:

- Make frontend IDs deterministic and compatible with Anchor PDAs.

Files likely added:

- `frontend-prototype/src/lib/construkt/pda.ts`
- `frontend-prototype/tests/construkt.pda.ts`

Changes:

- Add helpers for project, work package, vault authority, role assignment, payment request, and approval record PDAs.
- Add `u64` ID allocation helpers for project/package/request IDs.
- Add role byte mapping: Contractor=1, LowApprover=2, HighApprover=3.

Verification:

- Unit tests compare generated PDA addresses against backend test fixtures or known examples.
- `npm run test:frontend`.

### Commit 4: Add Token Amount Helpers

Purpose:

- Stop treating GBP-style display numbers as SPL token base units.

Files likely added or changed:

- `frontend-prototype/src/lib/construkt/money.ts`
- `frontend-prototype/tests/construkt.frontend.ts`

Changes:

- Add display amount to base-unit conversion.
- Add base-unit to display amount conversion.
- Add mock USDC formatting helpers.
- Keep display copy flexible so the UI can show GBP project values and mock USDC escrow values separately.

Verification:

- Unit tests for decimals, rounding, zero, large values, and invalid input.
- `npm run test:frontend`.

### Commit 5: Add Metadata Adapter

Purpose:

- Move rich frontend-only fields behind an explicit off-chain boundary.

Files likely added:

- `frontend-prototype/src/lib/construkt/metadataClient.ts`
- `frontend-prototype/src/lib/construkt/demoMetadata.ts`

Changes:

- Store project client, dates, contract model, team display data, milestones, document metadata, variation data, and document request data off-chain.
- Return compact refs suitable for `metadata_ref`, `scope_ref`, `document_ref`, `note_ref`, and `hold_ref`.
- Keep first implementation local/seeded; do not add a real database yet.

Verification:

- Metadata save/read unit tests.
- `npm run test:frontend`.

### Commit 6: Add Mock Construkt Client

Purpose:

- Replace direct local mutation with a client interface while preserving the existing static frontend behavior.

Files likely added or changed:

- `frontend-prototype/src/lib/construkt/mockClient.ts`
- `frontend-prototype/web/static/projects/js/construkt.js`

Changes:

- Implement `MockConstruktClient` with backend-shaped operations.
- Keep current demo data, but reshape it around project/package/request/account concepts.
- Update frontend mutation points to call the mock client instead of directly changing raw `store` wherever practical.

Verification:

- Current static demo still works.
- `npm run test:frontend`.

### Commit 7: Generate And Expose Anchor IDL/Types

Purpose:

- Make the frontend consume the real Anchor program interface.

Files likely added or changed:

- `target/idl/construkt.json` generated locally but do not commit generated target output unless intentionally placed elsewhere.
- `frontend-prototype/src/lib/construkt/idl/construkt.json`
- `frontend-prototype/src/lib/construkt/idl/construkt.ts`
- package scripts as needed

Changes:

- Add a repeatable command/script to copy generated IDL/types into the frontend-consumable location.
- Document that Anchor build commands run in WSL.

Verification:

- `anchor build` in WSL.
- Frontend type import compiles.

### Commit 8: Add Local/Devnet Demo Setup Script

Purpose:

- Prepare wallets, mint, and token accounts needed by the integrated flow.

Files likely added:

- `scripts/setup-demo.ts`
- `scripts/demo-wallets.example.json`
- docs update in `AGENTS.md` or this plan

Changes:

- Create or document Finance, PM/LowApprover, HighApprover, and Contractor wallets.
- Create mock USDC mint.
- Create finance and contractor token accounts.
- Mint demo funds to Finance.
- Print addresses needed by the frontend.

Verification:

- Script runs on localnet/devnet.
- Token balances are visible.

### Commit 9: Add Anchor Client Read Path

Purpose:

- Let the UI render from backend account state before writing transactions.

Files likely added or changed:

- `frontend-prototype/src/lib/construkt/anchorClient.ts`
- `frontend-prototype/src/lib/construkt/viewModels.ts`

Changes:

- Fetch project, work package, role assignment, payment request, approval record, vault balance, and contractor token balance accounts.
- Merge account state with metadata adapter output.
- Add status and readiness selectors.

Verification:

- Read-only seeded demo renders project/package/request state.
- Unit tests for view model mapping.
- `npm run test:frontend`.

### Commit 10: Wire Project Creation

Purpose:

- Make frontend project creation call `initialize_project`.

Files likely changed:

- `anchorClient.ts`
- `transactions.ts`
- frontend modal handler around `createProject`

Changes:

- Save project metadata off-chain.
- Send `initialize_project(project_id, name, metadata_ref)`.
- Refresh backend state after confirmation.
- Show transaction signature in UI audit surface.

Verification:

- Project account exists at expected PDA.
- UI displays project from fetched account + metadata.
- Anchor project tests still pass.

### Commit 11: Wire Package Approval Into On-Chain Package Creation

Purpose:

- Turn "Approve package" into the backend creation point for escrow packages.

Files likely changed:

- `anchorClient.ts`
- `transactions.ts`
- package approval modal/action code

Changes:

- Save package metadata and scope ref.
- Call `create_work_package`.
- Derive vault and vault authority.
- Assign Contractor, LowApprover, and HighApprover roles.
- Refresh package and role state.

Verification:

- Work package account exists.
- Vault ATA exists.
- Role assignment accounts exist.
- UI shows package as backend-backed.

### Commit 12: Wire Escrow Funding

Purpose:

- Make `fundPackage` call `fund_escrow`.

Files likely changed:

- `anchorClient.ts`
- funding modal/action code
- view model balance selectors

Changes:

- Convert display amount to token base units.
- Use finance token account as source.
- Call `fund_escrow(amount)`.
- Refresh funded amount and vault balance.

Verification:

- Vault balance increases.
- `WorkPackageAccount.funded_amount` increases.
- Over-cap funding fails with readable UI error.

### Commit 13: Wire Contractor Payment Request

Purpose:

- Make `submitInvoice` call `submit_payment_request`.

Files likely changed:

- `anchorClient.ts`
- submit invoice modal/action code
- request view models

Changes:

- Require connected signer to match assigned contractor.
- Save document metadata and use returned `document_ref`.
- Allocate next `request_id`.
- Call `submit_payment_request`.
- Render request status from `PaymentRequestAccount`.

Verification:

- Request PDA exists.
- Package active request is set.
- Missing document ref and over-funded requests fail correctly.

### Commit 14: Wire PM Approval And Rejection

Purpose:

- Make PM review actions call backend approval/rejection.

Files likely changed:

- `anchorClient.ts`
- request review modal/action code
- approval timeline view models

Changes:

- PM approve calls `approve_request(Role::LowApprover, note_ref)`.
- PM reject calls `reject_request(Role::LowApprover, note_ref)`.
- Save note text off-chain and pass note ref.
- Refresh request and approval record state.

Verification:

- Request moves `Submitted -> LowApproved`.
- Rejected request clears active request.
- Contractor self-approval and wrong signer fail.

### Commit 15: Wire High Approval

Purpose:

- Add the required high-approval step before release.

Files likely changed:

- request action UI
- `anchorClient.ts`
- readiness selectors

Changes:

- Add high approval button/task for chosen approval model.
- If using Finance-as-HighApprover, label clearly as "Final approval" before "Release".
- Call `approve_request(Role::HighApprover, note_ref)`.
- Refresh approval timeline.

Verification:

- Request moves `LowApproved -> HighApproved`.
- Release remains disabled before high approval.
- Wrong approval order fails.

### Commit 16: Wire Holds And Remove Hold

Purpose:

- Align frontend hold behavior with request-level backend holds.

Files likely changed:

- hold modal/action code
- work package/request view models
- copy in package views

Changes:

- Place hold on active request via `place_hold(hold_ref)`.
- Add remove-hold action via `remove_hold()`.
- Replace package status `Locked` logic with request hold state.
- Show blocked reasons from account state.

Verification:

- Held request blocks approval/rejection/document update/release.
- Remove hold restores action availability.
- UI no longer treats package-level lock as backend truth.

### Commit 17: Wire Payment Release

Purpose:

- Make Finance release funds through `release_payment`.

Files likely changed:

- `anchorClient.ts`
- release modal/action code
- balance selectors
- audit/transaction display

Changes:

- Require request status `HighApproved`.
- Use vault, vault authority, and contractor token account.
- Call `release_payment`.
- Refresh request status, package released amount, vault balance, and contractor balance.

Verification:

- Contractor token balance increases.
- Request status becomes `Released`.
- Package active request clears.
- Release during hold or before high approval fails.

### Commit 18: Wire Document Reference Updates

Purpose:

- Connect payment document ref changes to `add_document_reference`.

Files likely changed:

- document modal/action code
- metadata adapter
- request document selectors

Changes:

- Keep rich documents off-chain.
- When the active payment request document ref changes, call `add_document_reference`.
- Keep document version UI based on metadata.

Verification:

- Request `document_ref` updates on-chain.
- Terminal or held requests reject document updates.

### Commit 19: Replace Fake Chain Logs

Purpose:

- Make audit/chain display use real backend results.

Files likely changed:

- audit/chain feedback rendering
- transaction result handling
- explorer URL helper

Changes:

- Replace fake `logChainAction()` entries with real transaction signatures and account addresses.
- Add localnet/devnet explorer link formatting.
- Include emitted events or fetched account deltas where available.

Verification:

- Every backend write shows a real signature.
- No fake "Mock USDC funded" chain message remains once actual funding is wired.

### Commit 20: Keep Off-Chain-Only Features Honest

Purpose:

- Preserve current frontend richness without implying unsupported smart contract behavior.

Files likely changed:

- variation UI copy/action code
- document request UI copy/action code
- metadata adapter

Changes:

- Mark variations as off-chain metadata/tasks for V0.
- Mark document requests as off-chain tasks for V0.
- Ensure neither changes escrow math or on-chain package/request status.

Verification:

- Variation and document request actions do not call unsupported backend instructions.
- UI copy does not claim these are on-chain.

### Commit 21: End-To-End Demo Script And Tests

Purpose:

- Add repeatable evidence that frontend-triggered backend timing is correct.

Files likely added or changed:

- `tests/` Anchor integration tests
- frontend integration/mock tests
- demo script docs

Changes:

- Add happy-path test matching the frontend flow.
- Add blocked-path tests for frontend-important failure states.
- Add a short manual demo checklist.

Verification:

- `npm run test:frontend`.
- Anchor tests pass in WSL/localnet.
- Manual demo completes from package approval through release.

### Commit 22: Cleanup And Migration Notes

Purpose:

- Remove stale labels, old assumptions, and temporary integration scaffolding that is no longer needed.

Files likely changed:

- `AGENTS.md`
- `CLAUDE.md`
- frontend copy/config
- this plan

Changes:

- Ensure all docs point at `frontend-prototype/web/index.html` and the integration client path.
- Remove any mainnet labels/config from the demo.
- Document remaining V1 gaps: true Director role, variations, package-level holds, rich document backend, milestones/payment schedules.

Verification:

- Documentation review.
- `npm run test:frontend`.

## Landmines

- Do not treat frontend role switching as authorization.
- Do not let Finance release stand in for high approval unless the demo simplification is explicit and still sends the high approval transaction.
- Do not model package holds as backend truth unless the smart contract adds package-level hold fields.
- Do not store rich documents, files, or PII on-chain.
- Do not treat direct vault SPL transfers as funding capacity.
- Do not use GBP display numbers as token base units.
- Do not ship a mainnet label or mainnet configuration in this demo.
- Do not keep fake chain logs once Anchor transactions are wired.
- Do not make variations part of escrow math until the backend explicitly supports them.

## Immediate Next Work

1. Decide Finance/HighApprover path: Option A separate Director, or Option B Finance-as-HighApprover for demo.
2. Create the TypeScript client interface and mock implementation.
3. Add PDA and money conversion helpers with tests.
4. Build the package approval orchestration around `create_work_package`, `assign_role`, and `fund_escrow`.
5. Split frontend `releaseFunds()` into high approval and release.
6. Add request-level hold/remove-hold UI.
7. Add an Anchor-backed read path for package/request status.
