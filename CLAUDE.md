# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## What This Is

Construkt is a Solana-backed escrow and approval engine for construction work-package payments.

There are two important truths to keep separate:

- The current on-chain program enforces the PM-to-Finance payment release path.
- The frontend prototype models the wider product workflow we intend the backend to support.

Target networks: `localnet` and `devnet` only. Do not target mainnet.

## Commands

All Anchor and program commands must run inside WSL (Ubuntu), not Windows, because Solana CLI and Anchor are installed there only.

```bash
# Build the Anchor program
anchor build

# Run all on-chain tests against localnet
npm run anchor:test

# Or directly
anchor test --provider.cluster localnet

# From Windows PowerShell, call the WSL test wrapper
npm run anchor:test:wsl

# From Windows PowerShell, seed localnet through WSL
npm run seed:localnet:wsl

# Run a single on-chain test file
npx ts-mocha -p ./tsconfig.json -t 1000000 "tests/construkt.b1-accounts.ts"

# Run frontend unit tests
npm run test:frontend

# Lint / format check
npm run lint

# Auto-fix formatting
npm run lint:fix
```

## Architecture

### On-chain Program (`programs/construkt/src/lib.rs`)

Single Anchor program at `34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL`. All business logic for V0 lives here - no off-chain backend for the current release path.

The program is deployed once. Projects, work packages, payment requests, role assignments, approval records, and vaults are PDA/accounts under that program. The backend does not deploy a new smart contract per project or work package.

Account hierarchy:

```text
ProjectAccount  (authority = finance wallet)
  `-- WorkPackageAccount  (holds escrow vault reference, cap, counters)
        |-- RoleAssignmentAccount  (one per role per wallet)
        |-- PaymentRequestAccount  (one active at a time per package)
        |    `-- ApprovalRecord  (one per approver role, prevents duplicates)
        `-- vault (SPL Token ATA, owned by vault_authority PDA)
```

PDA seeds:

- Project: `["project", authority, project_id_le_bytes]`
- WorkPackage: `["work_package", project, package_id_le_bytes]`
- VaultAuthority: `["vault_authority", work_package]`
- RoleAssignment: `["role", work_package, role_byte, wallet]`
- PaymentRequest: `["payment_request", work_package, request_id_le_bytes]`
- ApprovalRecord: `["approval", payment_request, role_byte]`

Role bytes: Contractor=`1`, LowApprover=`2`, HighApprover=`3`

Payment request lifecycle on-chain:

```text
Submitted -> LowApproved -> Released
                     (or Rejected at any stage)
```

`HighApproved` remains available as an optional/custom approval state.

Key invariants enforced on-chain:

- only one active unreleased request per work package
- if `HighApprover` is used, `LowApprover` must approve first
- contractor cannot approve their own request
- same wallet cannot hold both `LowApprover` and `HighApprover` on a package
- holds block approval, rejection, document updates, and release
- release checks cap, tracked funded balance, and real vault token balance
- finance is always `ProjectAccount.authority`; only authority can release

### Prototype Alignment Notes

The frontend prototype is intentionally ahead of the current on-chain implementation in a few areas. Treat these as product targets, not as proof that the Anchor program already supports them all.

The current prototype flow is:

1. Finance Director creates a project.
2. Project Manager creates an estimated package.
3. Project Manager assigns a contractor.
4. Finance Director approves escrow.
5. Contractor submits an invoice against the package or a milestone.
6. Project Manager reviews evidence.
7. Finance Director releases funds to a contractor withdrawal balance.
8. Contractor withdraws released funds.

The prototype also includes:

- lightweight variation requests
- document references and evidence review
- chain-state placeholders
- contractor withdrawal UX

For backend alignment:

- do not store raw documents on-chain
- do treat document and evidence state as first-class workflow inputs
- do keep user-facing language focused on escrow, approvals, and withdrawal balance
- do not assume the user needs to see wallet mechanics directly

### On-Chain Tests (`tests/`)

Tests are split into four ordered files using ts-mocha with shared fixtures from `tests/setup.ts`. The `createFixture()` helper creates isolated per-test keypairs and PDAs so test suites do not share state. Requires WSL plus localnet.

- `construkt.b1-accounts.ts` - project and package setup, role assignment
- `construkt.b2-funding.ts` - escrow funding
- `construkt.b3-requests.ts` - request submission, document ref, approvals, rejection, holds
- `construkt.b4-release.ts` - payment release and blocked-state guards

### Frontend Unit Tests (`frontend-prototype/tests/construkt.frontend.ts`)

75 unit tests cover the pure helper functions in `frontend-prototype/web/static/projects/js/construkt.js`. Runs in Node via ts-mocha - no WSL, browser, or localnet required.

```bash
npm run test:frontend
```

Covers:

- `formatGBP`
- `parseMoneyKpi`
- `formatMoneyKpi`
- `easeOutCubic`
- `clampPercent`
- `dateProgress`
- role helpers
- `initials`
- `chipTone`
- `timelineDot`
- `modelLabel`
- `timelineStatusClass`
- `getProjectTotals`
- `hasAssignedContractor`
- `financeApprovalStatus`
- `packageStatusClass`
- `packageStatusLabel`
- `buildBespokeTimeline`

### Backendless Demo (`frontend-prototype/web/index.html`)

Static HTML, CSS, and JS demo - the canonical presentation entry point. No wallet, no Anchor, and no server required. Business state is mocked.

The older duplicate HTML sources were removed during the front/back merge cleanup. Do not recreate or edit them as active surfaces:

- `frontend-prototype/web/templates/projects/construkt.html`
- `frontend-prototype/website/construkt.html`

Keep product behavior changes in:

- `frontend-prototype/web/index.html`
- `frontend-prototype/web/static/projects/js/construkt.js`
- `frontend-prototype/web/static/projects/css/construkt.css`

## V0 Design Decisions

- finance = `ProjectAccount.authority` for all privileged on-chain actions
- standard SPL Token only, not Token-2022
- current on-chain release path is `Submitted -> LowApproved -> Released`
- `HighApproved` is optional/custom, not mandatory
- V0 on-chain releases are full-amount only
- string fields store hashes and references only - no PII or raw documents on-chain
- audit trail is built from account state, approval records, and emitted Anchor events
- full historical indexing is out of scope for now
