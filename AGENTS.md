# Construkt Agent Notes

This folder is the working home for the Construkt Solana MVP.

## Naming

The product is named **Construkt**.

`ConstruktDev` is only the local development folder / parent workspace folder.

Use lowercase `construkt` for code-level names:

- Anchor workspace/program: `construkt`
- Program folder: `programs/construkt`
- Anchor test files: `tests/construkt.b1-accounts.ts` through `tests/construkt.b4-release.ts`
- Shared Anchor test fixture: `tests/setup.ts`
- Frontend app folder: `app`
- Frontend package name: `construkt-app`

Deprecated names:

- `SmartFundX`
- `Construckt`
- `construct-flow-demo-main` as a product name. It may remain only as a legacy source folder/reference.

## Product Intent

Construkt is a Solana-backed escrow and approval engine for construction work-package payments. The product is a narrow payment-control and approval layer, not a full ERP, document platform, procurement system, or private blockchain.

The MVP must prove one thing:

1. A contractor submits a construction payment request.
2. The right roles approve it in the right order.
3. Release is blocked when rules are not satisfied.
4. Finance releases funds only after all rules are satisfied.
5. The app shows a clear audit trail.

Target demo network: Solana localnet or devnet only. Do not target mainnet.

## Reference Material

Read these before making broad decisions:

- `../ComprehensiveRev.md` - legacy project review and positioning.
- `../creation flow.txt` - short build-flow notes.
- `../SmartFundX-main` - legacy Ethereum/Django crowdfunding reference. Treat as conceptual only.
- `../construct-flow-demo-main` - legacy React/Vite frontend demo. Reuse UI ideas only.

Current assessment of reference projects:

- `../SmartFundX-main` is a Django + Hardhat + Solidity Sepolia crowdfunding app. It includes wallet linking, deposits, proposals, voting, deployment docs, and transaction history. It should not be ported directly because its contract is weighted contributor voting, not construction role approvals.
- `../construct-flow-demo-main` already models contractor, PM, director, finance, projects, requests, mock escrow, tx hashes, approval tracker, dashboards, and ledger events. Reuse the product flow and UI ideas, but replace mocked Zustand actions with Solana program calls and rename product-facing text to Construkt.

## Build Direction

Preferred stack:

- Anchor Rust program for Solana.
- Standard SPL Token escrow using a local/devnet mock USDC mint.
- React/Vite frontend in `app/`.
- No Django backend for v0 unless a later requirement clearly needs it.

Backendless demo path:

- `frontend-prototype/web/index.html` is the canonical backendless demo entry point.
- Treat it as a standalone static browser demo for presentation, product-flow exploration, and UX iteration before full Anchor integration.
- It should not require Django, a REST API, wallet connection, localnet, devnet, or an Anchor client.
- Business state in this backendless demo may be mocked/local-only and must not be described as on-chain truth.
- When building the Solana-integrated V0 frontend, keep `app/` as the target runtime and migrate useful UX from the backendless demo deliberately.

Known toolchain status:

- WSL Ubuntu has Solana CLI, Anchor, Rust/Cargo, and native Linux Node.
- Localnet Anchor scaffold test has passed.
- Devnet keypair has SOL available.

## V0 Design Decisions Locked

For v0:

1. Finance is `ProjectAccount.authority`.
2. Only `ProjectAccount.authority` can create work packages.
3. Only `ProjectAccount.authority` can fund escrow.
4. Only `ProjectAccount.authority` can place/remove holds.
5. Only `ProjectAccount.authority` can release funds.
6. Role assignments are scoped to work packages.
7. Only Contractor, LowApprover, and HighApprover require role assignment.
8. Request-level holds only. Package-level holds are deferred.
9. One active unreleased payment request per work package.
10. Use standard SPL Token only, not Token-2022.
11. Vault is a token account controlled by a vault-authority PDA.
12. UI role switching is only a demo/navigation aid. The signer wallet must still match the required role.
13. Holds freeze request mutation: approval, rejection, document update, and release are blocked while `hold_active`.
14. The same wallet cannot hold both LowApprover and HighApprover for one work package. An inactive opposing approver role still blocks reassignment in V0.
15. Audit trail is built from account state, approval records, transaction signatures captured during the current demo session, and emitted Anchor events where easily available.
16. Full historical indexing is out of scope.

## MVP Roles

- Finance / Overseer
  - Stored as `ProjectAccount.authority`.
  - Creates projects/work packages.
  - Assigns role wallets.
  - Funds escrow.
  - Places/removes request holds.
  - Executes final release.

- LowApprover / Project Manager
  - First approval stage.
  - Can reject.
  - Cannot act while request is on hold.
  - Cannot release funds.

- HighApprover / Director
  - Second approval stage.
  - Can reject.
  - Cannot act while request is on hold.
  - Cannot release funds in v0.

- Contractor
  - Submits payment requests.
  - Adds document hash/reference.
  - Receives released funds.
  - Cannot approve own request.
  - Cannot release funds.

## Minimum On-Chain Model

Use PDAs where appropriate and validate account relationships on every instruction.

Use fixed string lengths:

- `MAX_NAME_LEN = 64`
- `MAX_REF_LEN = 128`
- `MAX_NOTE_REF_LEN = 128`

Use checked arithmetic for all amount updates.

### `ProjectAccount`

- authority/finance wallet
- project id/name
- status
- created timestamp
- optional metadata URI/hash

### `WorkPackageAccount`

- project reference
- package cap/budget
- funded amount
- released amount
- contractor/recipient wallet
- mint
- escrow vault token account
- vault authority PDA bump
- status: active, completed, cancelled
- optional scope hash or PO reference
- request counter
- `has_active_request: bool`
- `active_request: Pubkey`

### `RoleAssignmentAccount`

- wallet address
- assigned role: Contractor, LowApprover, HighApprover
- work-package scope
- active/inactive status
- assignment and update metadata: `assigned_by`, `assigned_at`, `updated_by`, `updated_at`

PDA seed:

```text
["role", work_package, role.to_u8(), wallet]
```

Stable role bytes:

- Contractor = 1
- LowApprover = 2
- HighApprover = 3

### `PaymentRequestAccount`

- work package reference
- contractor wallet
- requested amount
- document hash/reference
- status: submitted, low approved, high approved, rejected, released
- timestamps
- released amount
- request-level hold state
- V0 release is full-request only, so request `released_amount` is either 0 or equal to amount.

### `ApprovalRecord`

- payment request reference
- approver wallet
- approver role
- decision: approve/reject
- timestamp
- optional note/hash

PDA seed:

```text
["approval", payment_request, role.to_u8()]
```

This prevents duplicate approvals from the same role.

### Escrow Vault

Use standard SPL Token.

Vault authority PDA seed:

```text
["vault_authority", work_package]
```

Vault token account:

- mint = work package mint
- authority = vault authority PDA

Flow:

```text
Finance token account -> vault token account -> contractor token account
```

## Program Instructions

Initial instruction set:

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

## Required On-Chain Rules

Enforce these in the program, not just in the UI:

- Every instruction validates signer authority.
- Every instruction validates account ownership and expected parent/child relationships.
- Contractor can submit only for their assigned work package.
- Contractor cannot approve their own request.
- Low-level approval must happen before high-level approval.
- Duplicate approvals for the same role are rejected.
- A work package can have only one active unreleased request.
- Release is blocked if:
  - required approvals are missing
  - request is rejected
  - request is on hold
  - request exceeds package cap, tracked funded remaining amount, or vault token balance
  - signer is not project authority
- Holds also block approval, rejection, and document-reference updates.
- Same-wallet LowApprover/HighApprover conflicts are rejected on-chain.
- Finance release is explicit. Do not auto-release after approval.
- Documents and PII are not stored on-chain. Store hashes/references only.
- Emit events for audit trail: project created, package created, role assigned, role active-state changed, escrow funded, request submitted, document added, approved, rejected, hold placed, hold removed, payment released.

## Frontend Flow

Build one clean end-to-end flow:

1. Select/connect demo wallets for each role.
2. Create project/work package.
3. Assign Contractor, PM, and Director wallet addresses.
4. Fund escrow with mock USDC.
5. Contractor submits payment request.
6. Contractor adds document hash/reference.
7. PM approves or rejects.
8. Director approves or rejects.
9. Finance attempts release and sees blocked states when appropriate.
10. Finance releases after approvals and no hold.
11. Dashboard/audit trail shows statuses, tx signatures, and event history.

Role switching is a demo/navigation aid only. Program permissions are enforced by the signer wallet, not UI selection.

## Tests

Commands:

- `npm run test:frontend` runs the backendless demo helper unit tests from the repository root. It uses `frontend-prototype/tests/construkt.frontend.ts`, does not require WSL, Django, a browser, localnet, devnet, or Anchor.
- `npm run anchor:test` runs the Anchor/localnet program tests. Run Anchor/Solana program commands inside WSL Ubuntu.

Frontend helper tests currently cover:

- money formatting/parsing, easing, percent clamping, and date progress helpers
- role labels, initials, chip tones, timeline dots, and model labels
- project totals, contractor assignment detection, finance approval status, package status labels/classes, and bespoke timeline generation

These tests are useful regression checks for expected frontend helper behavior, but they copy pure helper logic into the test file instead of importing the browser bundle directly. Keep that limitation in mind when changing `frontend-prototype/web/static/projects/js/construkt.js`.

Anchor tests should cover at least:

- unauthorized project/package setup
- unauthorized approval
- contractor self-approval blocked
- wrong approval order blocked
- duplicate approval blocked
- inactive approver role blocked
- second active request blocked
- empty document reference blocked
- over-cap request blocked
- exact remaining-cap request allowed
- hold blocking release
- wrong release authority blocked
- wrong mint funding/release blocked
- release to token account not owned by contractor blocked
- successful release transfers funds and updates state

## Product Guardrails

Do not build these in v0:

- full construction ERP
- real GBP bank payment integration
- T1 integration
- Autodesk/Forma integration
- retention
- variations/change orders
- confidential/private execution
- multi-project enterprise permissions
- document storage
- legal payment notice automation
- AI assistant features
- full historical indexing

Prefer the smallest working vertical slice over broad scaffolding.

## Suggested First Implementation Sequence

1. Define account structs, enums, constants, and errors.
2. Implement `initialize_project`, `create_work_package`, and `assign_role`.
3. Implement SPL token escrow funding.
4. Implement request submission and document reference storage.
5. Implement ordered approvals and rejection.
6. Implement request hold/remove hold.
7. Implement guarded `release_payment`.
8. Add Anchor tests for the required rule set.
9. Build the React/Vite `app/`.
10. Polish audit trail and blocked-state demo.
