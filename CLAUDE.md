# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Construkt is a Solana-backed escrow and approval engine for construction work-package payments. The on-chain program (Anchor/Rust) enforces a strict role-based approval flow before finance can release SPL Token funds from an escrow vault to a contractor.

Target networks: **localnet and devnet only**. Do not target mainnet.

## Commands

All Anchor/program commands must run inside WSL (Ubuntu), not Windows, because Solana CLI and Anchor are installed there only.

```bash
# Build the Anchor program
anchor build

# Run all tests against localnet (preferred)
npm run anchor:test
# or directly:
anchor test --provider.cluster localnet

# Run a single test file (ts-mocha reads tsconfig.json)
npx ts-mocha -p ./tsconfig.json -t 1000000 "tests/construkt.b1-accounts.ts"

# Run frontend unit tests (pure JS helpers — no WSL, no localnet needed)
npm run test:frontend

# Lint / format check
npm run lint

# Auto-fix formatting
npm run lint:fix
```

## Architecture

### On-Chain Program (`programs/construkt/src/lib.rs`)

Single Anchor program at `34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL`. All business logic lives here — no off-chain backend for V0.

**Account hierarchy:**

```
ProjectAccount  (authority = finance wallet)
  └── WorkPackageAccount  (holds escrow vault reference, cap, counters)
        ├── RoleAssignmentAccount  (one per role per wallet)
        ├── PaymentRequestAccount  (one active at a time per package)
        │     └── ApprovalRecord  (one per approver role, prevents duplicates)
        └── vault (SPL Token ATA, owned by vault_authority PDA)
```

**PDA seeds:**
- Project: `["project", authority, project_id_le_bytes]`
- WorkPackage: `["work_package", project, package_id_le_bytes]`
- VaultAuthority: `["vault_authority", work_package]`
- RoleAssignment: `["role", work_package, role_byte, wallet]`
- PaymentRequest: `["payment_request", work_package, request_id_le_bytes]`
- ApprovalRecord: `["approval", payment_request, role_byte]`

Role bytes: Contractor=1, LowApprover=2, HighApprover=3

**Payment request lifecycle:**
`Submitted` → `LowApproved` → `HighApproved` → `Released` (or `Rejected` at any stage)

**Key invariants enforced on-chain:**
- Only one active unreleased request per work package
- LowApprover must approve before HighApprover
- Contractor cannot approve their own request
- Same wallet cannot hold both LowApprover and HighApprover on a package
- Holds block approval, rejection, document updates, and release
- Release checks cap, tracked funded balance, and real vault token balance
- Finance is always `ProjectAccount.authority`; only authority can release

### On-Chain Tests (`tests/`)

Tests are split into four ordered files (b1–b4) using ts-mocha with shared fixtures from `tests/setup.ts`. The `createFixture()` helper creates isolated per-test keypairs and PDAs so test suites don't share state. Requires WSL + localnet.

- `construkt.b1-accounts.ts` — project/package setup, role assignment
- `construkt.b2-funding.ts` — escrow funding
- `construkt.b3-requests.ts` — request submission, document ref, approvals, rejection, holds
- `construkt.b4-release.ts` — payment release and blocked-state guards

### Frontend Unit Tests (`frontend-prototype/tests/construkt.frontend.ts`)

75 unit tests for the pure helper functions in `frontend-prototype/web/static/projects/js/construkt.js`. Runs in Node via ts-mocha — no WSL, no browser, no localnet required.

```bash
npm run test:frontend
```

Covers: `formatGBP`, `parseMoneyKpi`, `formatMoneyKpi`, `easeOutCubic`, `clampPercent`, `dateProgress`, role helpers, `initials`, `chipTone`, `timelineDot`, `modelLabel`, `timelineStatusClass`, `getProjectTotals`, `hasAssignedContractor`, `financeApprovalStatus`, `packageStatusClass`, `packageStatusLabel`, `buildBespokeTimeline`.

### Backendless Demo (`frontend-prototype/web/index.html`)

Static HTML/CSS/JS demo — the canonical presentation entry point. No wallet, no Anchor, no server required. Business state is mocked. Used for UX iteration alongside the Solana-integrated React frontend in `app/`.

The older duplicate HTML sources were removed during the front/back merge cleanup. Do not recreate or edit them as active surfaces:

- `frontend-prototype/web/templates/projects/construkt.html`
- `frontend-prototype/website/construkt.html`
- Keep product behavior changes in `frontend-prototype/web/static/projects/js/construkt.js` and shared CSS unless a specific HTML source is being updated deliberately.

## V0 Design Decisions

- Finance = `ProjectAccount.authority` for all privileged actions
- Standard SPL Token only (not Token-2022)
- V0 releases are full-amount only (`released_amount` is either 0 or equal to `amount`)
- All string fields store hashes/references only — no PII or documents on-chain
- Audit trail is built from account state + approval records + emitted Anchor events; full historical indexing is out of scope
