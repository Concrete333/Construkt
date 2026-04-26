# Construkt Backend Implementation Plan V0

This plan covers the Solana/Anchor side of the V0 demo: program state, SPL Token escrow, permission enforcement, tests, IDL, and demo seeding.

The backend for V0 is not a Django/API server. It is the Anchor program plus the scripts and tests needed for the frontend to run a localnet/devnet demo.

## Product Goal

Build the smallest useful Solana-native Construkt backend:

1. Finance creates a project and work package.
2. Finance assigns role wallets for Contractor, PM, and Director.
3. Finance funds an escrow vault with mock USDC on localnet/devnet.
4. Contractor submits one active payment request with a document hash/reference.
5. Project Manager approves first.
6. Director approves second.
7. Finance releases funds only after approvals are complete and no request hold is active.
8. Program state and events support a frontend audit trail.

## Backend Scope

Own these areas:

- Anchor workspace/program: `construkt`
- Program folder: `programs/construkt`
- Program source: `programs/construkt/src/lib.rs`
- Anchor tests: `tests/construkt.ts`
- Demo/seed scripts for localnet/devnet
- SPL Token mock USDC mint setup
- IDL generation and stability
- PDA derivation rules and documentation
- Any shared generated client types needed by `app/`

Do not build a traditional web backend for V0 unless a new requirement clearly needs one.

## Locked Design Decisions

For V0:

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
12. UI role switching is only a demo/navigation aid. Signer wallet permissions must be enforced on-chain.
13. Audit trail support comes from account state, `ApprovalRecord` accounts, transaction signatures, and emitted Anchor events where practical.
14. Full historical indexing is out of scope.

## Non-Negotiables

- Build for Solana localnet/devnet only.
- Use Rust and Anchor unless a concrete blocker appears.
- Use SPL Token escrow with a local/devnet mock USDC mint.
- Store document hashes/references only.
- Enforce permissions and release rules on-chain.
- Finance release is explicit. Do not auto-release after approvals.
- Use checked arithmetic for all token amount calculations.
- Keep V0 to one payment path: invoice-style payment request.

## Toolchain

Verify from WSL Ubuntu:

```sh
rustc --version
cargo --version
solana --version
anchor --version
command -v node
node -p "process.platform"
node -p "process.execPath"
npm -v
```

Expected Node for Anchor tests:

- platform: `linux`
- executable: `/usr/bin/node`

Known status:

- Solana CLI and Anchor work in WSL Ubuntu.
- Native WSL Node works at `/usr/bin/node`.
- Devnet wallet has SOL available.
- Localnet scaffold test has passed.
- `scripts/wsl-anchor-test.sh` now runs `anchor test --provider.cluster localnet` without `--skip-build`, so the default local test path rebuilds current Rust/IDL artifacts.
- `npm run lint` / `npm run lint:fix` format the TypeScript test and migration files without unmatched glob failures.

## Constants

Use fixed maximum string lengths for predictable Anchor account space:

```rust
pub const MAX_NAME_LEN: usize = 64;
pub const MAX_REF_LEN: usize = 128;
pub const MAX_NOTE_REF_LEN: usize = 128;
```

Use `MAX_REF_LEN` for metadata refs, scope refs, document refs, and hold refs unless a field needs a stricter limit.

## On-Chain Model

### Enums

Use compact Anchor enums:

- `ProjectStatus`: `Active`, `Completed`, `Cancelled`
- `WorkPackageStatus`: `Active`, `Completed`, `Cancelled`
- `PaymentRequestStatus`: `Submitted`, `LowApproved`, `HighApproved`, `Rejected`, `Released`
- `Role`: `Contractor`, `LowApprover`, `HighApprover`
- `Decision`: `Approved`, `Rejected`

Do not include a Finance role in V0. Finance is the project authority.

Use stable role bytes for PDA seeds:

```text
Contractor = 1
LowApprover = 2
HighApprover = 3
```

Seed bytes:

- role assignment: `["role", work_package, role.to_u8(), wallet]`
- approval: `["approval", payment_request, role.to_u8()]`

Amounts should be `u64` token base units. Timestamps should use Solana clock unix timestamps.

### `ProjectAccount`

Fields:

- `authority: Pubkey`
- `project_id: u64`
- `name: String`
- `status: ProjectStatus`
- `created_at: i64`
- `metadata_ref: String`
- `bump: u8`

Seed:

```text
["project", authority, project_id]
```

### `WorkPackageAccount`

Fields:

- `project: Pubkey`
- `package_id: u64`
- `cap_amount: u64`
- `funded_amount: u64`
- `released_amount: u64`
- `contractor: Pubkey`
- `mint: Pubkey`
- `vault: Pubkey`
- `vault_authority_bump: u8`
- `status: WorkPackageStatus`
- `scope_ref: String`
- `request_counter: u64`
- `has_active_request: bool`
- `active_request: Pubkey`
- `bump: u8`

Seed:

```text
["work_package", project, package_id]
```

The `has_active_request` / `active_request` pair prevents pending-request overcommitment. A contractor cannot submit a second active request until the existing one is rejected or released.

### `RoleAssignmentAccount`

Fields:

- `work_package: Pubkey`
- `wallet: Pubkey`
- `role: Role`
- `active: bool`
- `assigned_by: Pubkey`
- `assigned_at: i64`
- `bump: u8`

Seed:

```text
["role", work_package, role.to_u8(), wallet]
```

### `PaymentRequestAccount`

Fields:

- `work_package: Pubkey`
- `request_id: u64`
- `contractor: Pubkey`
- `amount: u64`
- `document_ref: String`
- `status: PaymentRequestStatus`
- `submitted_at: i64`
- `updated_at: i64`
- `released_amount: u64`
- `hold_active: bool`
- `hold_by: Pubkey`
- `hold_ref: String`
- `bump: u8`

Seed:

```text
["payment_request", work_package, request_id]
```

### `ApprovalRecord`

Fields:

- `payment_request: Pubkey`
- `approver: Pubkey`
- `role: Role`
- `decision: Decision`
- `note_ref: String`
- `created_at: i64`
- `bump: u8`

Seed:

```text
["approval", payment_request, role.to_u8()]
```

This prevents duplicate approvals from the same role.

## Escrow Vault

Use standard SPL Token.

Vault authority PDA seed:

```text
["vault_authority", work_package]
```

Vault token account:

- mint = `work_package.mint`
- authority = vault authority PDA
- address = associated token account for `(mint, vault authority PDA)`

Escrow flow:

```text
Finance token account -> vault token account -> contractor token account
```

`release_payment` signs the vault transfer using the vault authority PDA seeds.

## Program Instructions

### `initialize_project`

Signer: Finance / project authority.

Creates `ProjectAccount`.

Checks:

- project id is unique for authority seed
- name length `<= MAX_NAME_LEN`
- metadata ref length `<= MAX_REF_LEN`

Events:

- `ProjectInitialized`

### `create_work_package`

Signer: `project.authority`.

Creates `WorkPackageAccount`, vault authority PDA, and vault associated token account.

Checks:

- signer equals `project.authority`
- cap amount > 0
- contractor is not default pubkey
- scope ref length `<= MAX_REF_LEN`
- token mint is the work package mint

Initial state:

- `funded_amount = 0`
- `released_amount = 0`
- `has_active_request = false`
- `active_request = Pubkey::default()`
- `status = Active`

Events:

- `WorkPackageCreated`

### `assign_role`

Signer: `project.authority`.

Creates `RoleAssignmentAccount`.

Role activation/deactivation should be handled by a later explicit instruction, such as `set_role_active(active: bool)`, instead of overloading `assign_role`.

Checks:

- signer equals `project.authority`
- role is Contractor, LowApprover, or HighApprover
- wallet is not default pubkey
- assigning Contractor must match `work_package.contractor`

Events:

- `RoleAssigned`

### `fund_escrow`

Signer: `project.authority`.

Transfers tokens from Finance token account into the work package vault.

Checks:

- signer equals `project.authority`
- amount > 0
- token mint matches work package mint
- Finance source token account mint matches work package mint
- vault token account address is pinned to `work_package.vault`; that vault is created as the associated token account for `(work_package.mint, vault authority PDA)` during `create_work_package`
- use `checked_add` for `funded_amount += amount`
- funding does not exceed package cap

Events:

- `EscrowFunded`

### `submit_payment_request`

Signer: contractor.

Creates `PaymentRequestAccount`.

Checks:

- signer has active Contractor role assignment for the work package
- signer equals `work_package.contractor`
- work package status is `Active`
- `work_package.has_active_request == false`
- `request_id == work_package.request_counter + 1`
- amount > 0
- document reference is present and length `<= MAX_REF_LEN`
- use checked arithmetic for remaining cap
- `amount <= cap_amount - released_amount`
- `amount <= vault available balance`

State changes:

- `work_package.request_counter += 1` using `checked_add`
- `work_package.has_active_request = true`
- `work_package.active_request = payment_request.key()`

Events:

- `PaymentRequestSubmitted`

### `add_document_reference`

Signer: contractor.

Updates document hash/reference before final release.

Checks:

- signer has active Contractor role assignment
- signer equals request contractor
- request is not rejected or released
- document reference is present and length `<= MAX_REF_LEN`

Events:

- `DocumentReferenceUpdated`

### `approve_request`

Signer: active approver role.

Creates `ApprovalRecord` and advances request status.

Checks:

- request is not on hold
- request is not rejected or released
- signer is not the contractor
- signer has active role assignment for required next approval role
- approval PDA for role does not already exist
- role must be `LowApprover` when status is `Submitted`
- role must be `HighApprover` when status is `LowApproved`

Status transitions:

- `Submitted` -> `LowApproved`
- `LowApproved` -> `HighApproved`

Events:

- `PaymentRequestApproved`

### `reject_request`

Signer: active LowApprover or HighApprover.

Creates `ApprovalRecord` with rejected decision and sets status to `Rejected`.

Checks:

- request is not released
- signer has active low/high approver role
- signer is not contractor

State changes:

- request status -> `Rejected`
- `work_package.has_active_request = false`
- `work_package.active_request = Pubkey::default()`

Events:

- `PaymentRequestRejected`

### `place_hold`

Signer: `project.authority`.

Sets request-level hold state.

Checks:

- signer equals `project.authority`
- request is not released
- hold ref length `<= MAX_REF_LEN`

Events:

- `HoldPlaced`

### `remove_hold`

Signer: `project.authority`.

Clears request-level hold state.

Checks:

- signer equals `project.authority`
- hold is active

Events:

- `HoldRemoved`

### `release_payment`

Signer: `project.authority`.

Transfers tokens from vault to contractor token account.

Checks:

- signer equals `project.authority`
- request status is `HighApproved`
- request hold is not active
- request amount <= remaining package cap
- request amount <= vault token balance
- contractor token account owner matches request contractor
- contractor token account mint matches work package mint
- vault token account mint matches work package mint
- vault token account authority is vault authority PDA
- use checked arithmetic for all state updates

State changes:

- request status -> `Released`
- request released amount -> requested amount
- `work_package.released_amount += requested amount`
- `work_package.has_active_request = false`
- `work_package.active_request = Pubkey::default()`
- work package status may become `Completed` if cap fully released

Events:

- `PaymentReleased`

## Errors

Add explicit program errors, including:

- `Unauthorized`
- `InvalidRole`
- `InactiveRoleAssignment`
- `InvalidAccountRelationship`
- `InvalidStatus`
- `InvalidApprovalOrder`
- `InvalidRequestId`
- `ContractorCannotApprove`
- `ActiveRequestExists`
- `MissingDocumentReference`
- `StringTooLong`
- `RequestOnHold`
- `HoldNotActive`
- `RequestAlreadyReleased`
- `InsufficientRemainingCap`
- `InsufficientVaultBalance`
- `WrongMint`
- `WrongTokenOwner`
- `ArithmeticOverflow`
- `InvalidAmount`

## Test Plan

Anchor tests should create a mock mint, mint tokens to Finance, create vaults, and use separate keypairs for:

- finance
- contractor
- pm
- director
- unrelated user

Required test cases:

| Test | Expected result |
| --- | --- |
| Finance creates project and package | success |
| Non-finance creates package | fails |
| Finance assigns roles | success |
| Contractor submits request | success |
| Non-contractor submits request | fails |
| Contractor submits second active request before first is released/rejected | fails |
| Submit request with empty document reference | fails |
| Submit request when package is cancelled/completed | fails |
| Contractor approval attempt | fails |
| Director approves before PM | fails |
| Approver role assignment is inactive | fails |
| Old PM cannot approve after role is deactivated | fails |
| PM approves first | success |
| PM duplicate approval | fails |
| Release after PM only | fails |
| Director approves second | success |
| Non-finance release | fails |
| Hold blocks release | fails |
| Finance removes hold | success |
| Request exactly equals remaining cap | succeeds |
| Request exceeds remaining cap by 1 | fails |
| Request above cap | fails |
| Finance funds with wrong mint | fails |
| Finance funds with amount zero | fails |
| Non-finance funds escrow | fails |
| Funding exactly to package cap | succeeds |
| Multiple escrow fundings accumulate | succeeds |
| Release to token account not owned by contractor | fails |
| Release to token account with wrong mint | fails |
| Finance releases after both approvals | success and token balances update |
| Release same request twice | fails |

## Backend Milestones

### Milestone B0: Toolchain and Scaffold

Done:

- Anchor workspace exists.
- Program builds.
- Test runner starts on localnet.
- Native WSL Node is verified.

### Milestone B1: Account Creation

Done:

- `initialize_project` works.
- `create_work_package` works.
- `assign_role` works.
- Tests verify unauthorized setup is blocked.
- IDL exposes the account/instruction shapes needed by the frontend.

### Milestone B2: Escrow Funding

Done:

- Mock USDC mint is created in tests.
- Finance funds package vault.
- Vault balance is readable.
- Wrong mint, wrong token owner, zero amount, non-finance funding, over-cap, exact-cap, and multi-fund accumulation tests pass.
- `EscrowFunded` is emitted with `amount` and running `funded_amount`.
- PDA derivation details for project, package, vault authority, vault token account, and role assignments are present in tests and should be promoted into frontend helpers or seed output before frontend integration.

### Milestone B3: Payment Request and Approvals

Done when:

- Contractor submits request.
- Second active request is blocked.
- PM approval advances status.
- Director approval advances status.
- Wrong role/order/duplicate/inactive approval tests pass.

### Milestone B4: Holds and Release

Done:

- Finance can place/remove request hold.
- Hold blocks release.
- Finance release transfers tokens to contractor.
- Re-release is blocked.
- Token balances and account state are easy for the frontend to fetch.
- Release before high approval, non-finance release, wrong token owner, and wrong token mint tests pass.
- Full backend suite passes with 31 tests.

### Milestone B5: Demo Seed Script

Done when:

- Seed/demo script creates wallets, mint, project, package, roles, and escrow.
- Script outputs addresses and key files the frontend needs.
- README or notes explain local demo steps.
- UI labels can safely say localnet/devnet mock USDC.

## Frontend Contract

Provide the frontend person with:

- Program ID for localnet/devnet.
- Generated IDL.
- PDA derivation helpers or exact seed specs.
- Account shape/type definitions.
- Instruction argument specs.
- Demo seed output format.
- Known status enum values and display mapping.
- Any event names and event fields available for audit trail.

The frontend may build against a mock adapter first, but the backend source of truth is the Anchor program state.

## Backend Definition of Done

Backend V0 is done when Anchor tests prove:

1. Authorized setup succeeds.
2. Unauthorized setup/actions fail.
3. Contractor can submit one active request with a document reference.
4. Approvals must occur in PM then Director order.
5. Contractor cannot approve.
6. Duplicate approvals are blocked.
7. Holds block release.
8. Finance can explicitly release only after all rules are satisfied.
9. Token balances update correctly.
10. The generated IDL and demo seed flow support the frontend vertical slice.

## Backend Out of Scope

- Django/API server.
- Mainnet deployment.
- Real USDC or GBP payments.
- T1, Autodesk, Forma, or bank integrations.
- Retention.
- Variations/change orders.
- Document uploads/storage.
- Enterprise identity management.
- Confidential/private execution.
- AI assistant features.
- Full historical indexing.
