# Construkt Frontend Implementation Plan V0

This plan covers the React/Vite app for the V0 demo. The frontend should make the Solana escrow and approval flow understandable, demonstrable, and hard to misread.

The frontend must not be the source of truth for permissions, approval state, release eligibility, or token balances. Those come from the Anchor program and SPL Token accounts.

## Backendless Demo

The backendless presentation demo lives at `frontend-prototype/web/index.html`.

Use that file as the standalone static demo surface for product-flow exploration and stakeholder walkthroughs before the Anchor-connected app is ready. It should run without Django, a REST API, wallet connection, localnet/devnet, or an Anchor client. Any business state there is mocked/local-only and must be labelled or treated as demo state, not on-chain truth.

The integrated V0 frontend target remains the React/Vite app in `app/`. Reuse UI flow, copy, and interaction ideas from `frontend-prototype/web/index.html`, but move real permission, escrow, request, approval, hold, release, and audit truth to the Anchor-backed client layer when integration begins.

## Product Goal

Build the smallest useful Construkt frontend:

1. Finance creates a project and work package.
2. Finance assigns role wallets for Contractor, PM, and Director.
3. Finance funds escrow with localnet/devnet mock USDC.
4. Contractor submits a payment request with a document hash/reference.
5. PM approves first.
6. Director approves second.
7. Finance explicitly releases funds only after approvals are complete and no hold is active.
8. UI shows request state, release state, token balances, blocked-state reasons, and an audit trail.

## Frontend Scope

Own these areas:

- Frontend app folder: `app`
- Frontend package name: `construkt-app`
- React/Vite app shell
- Wallet connection or clearly labelled local demo signer mode
- Solana/Anchor client wrapper
- PDA derivation helpers if not generated/shared by backend
- Pages, forms, status displays, audit trail, and demo UX
- Reuse/adaptation of useful legacy UI from `../construct-flow-demo-main`

Do not port the old Ethereum/Django app. Do not preserve old product naming.

## Source Material

Use `../construct-flow-demo-main` only as a legacy React UI reference.

Useful concepts to adapt:

- approval tracker
- status chip
- transaction signature display
- request cards
- audit timeline rows
- role-oriented dashboard ideas

Do not reuse the legacy mocked business logic directly. In particular, the old demo uses local Zustand state and auto-release behavior. V0 requires explicit finance release through the Solana program.

## Recommended App Structure

Create the frontend under `ConstruktDev/app`:

```text
app/
  package.json
  src/
    main.tsx
    App.tsx
    lib/
      anchorClient.ts
      program.ts
      pda.ts
      types.ts
      format.ts
    components/
      WalletConnector.tsx
      CreateProjectForm.tsx
      CreateWorkPackageForm.tsx
      AssignRolesForm.tsx
      FundEscrowForm.tsx
      SubmitPaymentRequestForm.tsx
      ApprovalTracker.tsx
      FinanceReleasePanel.tsx
      HoldPanel.tsx
      AuditTrail.tsx
      StatusChip.tsx
      TxSignature.tsx
    pages/
      Dashboard.tsx
      Setup.tsx
      RequestDetail.tsx
      WalletEscrow.tsx
```

Use lowercase `construkt` for code-level names and `Construkt` for product-facing text.

## Pages

### Dashboard

Show:

- project/work package summary
- escrow balance
- current pending request
- approval/release status
- recent audit trail
- clear localnet/devnet mock USDC labelling

### Setup

Support:

- create project
- create work package
- assign Contractor, PM, and Director wallets
- fund escrow
- show created account addresses and transaction signatures

### Request Detail

Show:

- payment request state
- document reference
- approval tracker
- blocked release reasons
- role-specific actions
- hold state
- relevant account addresses/tx signatures

### Wallet/Escrow

Show:

- finance token account balance
- vault token account balance
- contractor received amount
- release transaction signatures
- localnet/devnet mock USDC label

## Components

Reuse/adapt from the old React demo where useful:

- `ApprovalTracker`
- `StatusChip`
- transaction signature display
- request cards
- audit timeline rows

Build or replace:

- `WalletConnector`
- `CreateProjectForm`
- `CreateWorkPackageForm`
- `AssignRolesForm`
- `FundEscrowForm`
- `SubmitPaymentRequestForm`
- `FinanceReleasePanel`
- `HoldPanel`
- `AuditTrail`

## Role Switching Rule

A UI role switcher may be used for demo navigation and filtering only.

It must not imply authority. Program permissions are enforced by the signer wallet, not UI role selection.

Good UI behavior:

- Show the selected demo role as a viewing/filtering mode.
- Show the connected signer wallet separately.
- Disable or warn on actions when the connected signer does not match the required role.
- Still submit transactions to the program and let on-chain checks be final.

For local demo, prefer a seed/demo script that creates four local keypairs:

- `finance.json`
- `contractor.json`
- `pm.json`
- `director.json`

The frontend can connect one wallet at a time or use a local demo signer mode clearly labelled as local/demo only.

## Audit Trail Rule

For V0, audit trail means a UI timeline built from:

- current on-chain account state
- `ApprovalRecord` accounts
- transaction signatures captured during the current demo session
- emitted Anchor events where easily available

Do not promise full historical indexing in V0. Production would need an indexer.

## Client Layer

Create a small Solana client wrapper.

Responsibilities:

- connect wallet or local demo signer
- load program ID and IDL
- derive PDAs
- fetch project/package/request/role/approval accounts
- fetch SPL token balances
- submit each program instruction
- parse transaction signatures
- parse program events where practical
- expose blocked release reasons from fetched state

Suggested files:

- `src/lib/anchorClient.ts`
- `src/lib/program.ts`
- `src/lib/pda.ts`
- `src/lib/types.ts`

Keep UI state derived from chain where possible. Local UI state is acceptable for form drafts, selected demo role, pending transaction UI, and current-session transaction history.

## Frontend/Backend Contract

The frontend depends on backend outputs:

- Program ID for localnet/devnet: `34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL`.
- Generated IDL from `anchor build`.
- PDA seed specs or helper functions.
- Account type definitions.
- Instruction argument specs.
- Demo seed script output.
- Status enum values.
- Event names and event fields when available.

Until the Anchor program stabilizes, build against a typed mock adapter that mirrors the planned client API. Keep the adapter boundary thin so switching to Anchor calls does not rewrite the UI.

Current backend status:

- Backend milestones B0-B2 are implemented and covered by Anchor tests.
- Available on-chain instructions today: `initialize_project`, `create_work_package`, `assign_role`, and `fund_escrow`.
- `create_work_package` creates the vault associated token account for `(work_package.mint, vault authority PDA)`.
- `fund_escrow` account inputs are: `authority`, `project`, `work_package`, `mint`, `finance_token_account`, `vault`, and `token_program`.
- `EscrowFunded` is emitted with `project`, `work_package`, `authority`, `mint`, `vault`, `amount`, and running `funded_amount`.
- Tests currently derive project, work package, vault authority, vault token account, and role assignment PDAs; these derivations should become frontend `pda.ts` helpers or seed-script output before F2/F3 integration.

Example adapter shape:

```ts
interface ConstruktClient {
  fetchDemoState(): Promise<DemoState>;
  initializeProject(input: InitializeProjectInput): Promise<TxResult>;
  createWorkPackage(input: CreateWorkPackageInput): Promise<TxResult>;
  assignRole(input: AssignRoleInput): Promise<TxResult>;
  fundEscrow(input: FundEscrowInput): Promise<TxResult>;
  submitPaymentRequest(input: SubmitPaymentRequestInput): Promise<TxResult>;
  approveRequest(input: ApproveRequestInput): Promise<TxResult>;
  rejectRequest(input: RejectRequestInput): Promise<TxResult>;
  placeHold(input: PlaceHoldInput): Promise<TxResult>;
  removeHold(input: RemoveHoldInput): Promise<TxResult>;
  releasePayment(input: ReleasePaymentInput): Promise<TxResult>;
}
```

## User Flow

Build one clean end-to-end flow:

1. Select/connect demo wallets for each role.
2. Create project/work package.
3. Assign Contractor, PM, and Director wallet addresses.
4. Fund escrow with mock USDC.
5. Contractor submits payment request.
6. Contractor adds or updates document hash/reference if needed.
7. PM approves or rejects.
8. Director approves or rejects.
9. Finance attempts release and sees blocked states when appropriate.
10. Finance places/removes hold.
11. Finance releases after approvals and no hold.
12. Dashboard/audit trail shows statuses, tx signatures, and event history.

Hold semantics: while a request is on hold, approval, rejection, document-reference updates, and release are blocked by the program.

Role-assignment semantics: one wallet cannot be both PM/LowApprover and Director/HighApprover on the same work package. In V0, deactivating one approver role does not free that wallet for the opposing approver role.

## Required Blocked-State UX

The UI should make invalid actions demonstrable:

- wrong approver
- early director approval
- duplicate approval
- second active request
- same wallet assigned to both approver roles
- no-op role activation/deactivation
- document update during hold
- rejection during hold
- release before approvals
- release during hold
- release by non-finance signer
- release to invalid/wrong token account if exposed in demo

The UI may pre-explain likely blocked reasons, but the program result is authoritative.

## Frontend Milestones

### Milestone F0: App Scaffold

Done when:

- `app/` exists.
- React/Vite app runs.
- Product naming says `Construkt`.
- Legacy UI pieces are copied/adapted only where useful.
- No old `SmartFundX`, `Construckt`, or `construct-flow-demo-main` product naming appears in user-facing text.

### Milestone F1: Mocked Vertical Slice

Done when:

- A typed mock client can run the planned flow without chain access.
- Pages and components represent the final account/status model.
- Finance release is explicit, not automatic.
- Role switching is clearly demo/navigation-only.

### Milestone F2: Anchor Client Integration

Done when:

- App loads program ID and IDL.
- Wallet/local demo signer can submit transactions.
- PDA helpers derive project, package, role assignment, payment request, approval, vault authority, and vault addresses.
- Account fetches replace mocked truth.

Backend-ready now:

- Project, work package, role assignment, vault authority, and vault token account derivations can be implemented against the current B0-B2 contract.
- Payment request and approval derivations should stay mocked until backend B3 lands.

### Milestone F3: Setup and Escrow

Done when:

- Finance can create project/work package.
- Finance can assign roles.
- Finance can fund escrow.
- Vault balance is readable in the UI.
- Transaction signatures are captured and displayed.

### Milestone F4: Request, Approval, Hold, Release

Done when:

- Contractor can submit a request with document reference.
- PM approval advances status.
- Director approval advances status.
- Finance can place/remove hold.
- Finance can release funds only after rules are satisfied.
- Contractor token balance increase is visible.

### Milestone F5: Demo Polish

Done when:

- UI can run the full flow against localnet/devnet.
- Blocked release attempt is demonstrable.
- Audit trail shows key transactions.
- README or app text clearly labels localnet/devnet mock USDC.
- App is usable on normal desktop and reasonable laptop widths.

## Frontend Definition of Done

Frontend V0 is done when a user can demonstrate live:

1. Create package.
2. Assign wallets to Contractor, PM, and Director.
3. Fund escrow as Finance/project authority.
4. Submit request with document reference as Contractor.
5. Attempt invalid actions and see them blocked:
   - wrong approver
   - early director approval
   - duplicate approval
   - second active request
   - release before approvals
   - release during hold
6. Approve in correct order.
7. Finance releases funds.
8. Contractor token account balance increases.
9. UI audit trail shows the transaction sequence.

## Frontend Out of Scope

- Real GBP payments.
- Real USDC mainnet flows.
- T1, Autodesk, Forma, or bank integrations.
- Retention.
- Variations/change orders.
- Application-for-Payment legal workflows.
- Document uploads/storage.
- Enterprise identity management.
- Confidential/private execution.
- AI assistant features.
- Full historical indexing.
- Any UI that implies role switching grants signing authority.
