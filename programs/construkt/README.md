# programs/construkt — Anchor On-Chain Program

Single Anchor/Rust program that enforces the Construkt escrow and approval workflow on Solana.

**Program ID:** `34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL`
**Target networks:** localnet and devnet only. Do not target mainnet.

## Prerequisites

All commands must run inside **WSL (Ubuntu)**. Solana CLI and Anchor CLI are installed in WSL only — they do not work on the Windows side.

Required tools (WSL):
- Rust + Cargo
- Solana CLI
- Anchor CLI

## Commands

```bash
# Build the program (outputs to target/deploy/)
anchor build

# Run all integration tests against localnet (preferred)
anchor test --provider.cluster localnet

# Run a single test file
npx ts-mocha -p ./tsconfig.json -t 1000000 "tests/construkt.b1-accounts.ts"
```

From the repo root you can also use:

```bash
npm run anchor:test
```

## Account hierarchy

```
ProjectAccount          (authority = finance wallet)
  └── WorkPackageAccount  (holds escrow vault reference, cap, counters)
        ├── RoleAssignmentAccount  (one per role per wallet)
        ├── PaymentRequestAccount  (one active at a time per package)
        │     └── ApprovalRecord  (one per approver role)
        └── vault  (SPL Token ATA, owned by vault_authority PDA)
```

## PDA seeds

| Account | Seeds |
|---|---|
| Project | `["project", authority, project_id_le_bytes]` |
| WorkPackage | `["work_package", project, package_id_le_bytes]` |
| VaultAuthority | `["vault_authority", work_package]` |
| RoleAssignment | `["role", work_package, role_byte, wallet]` |
| PaymentRequest | `["payment_request", work_package, request_id_le_bytes]` |
| ApprovalRecord | `["approval", payment_request, role_byte]` |

Role bytes: `Contractor=1`, `LowApprover=2`, `HighApprover=3`

## Payment request lifecycle

```
Submitted → LowApproved → Released
                                        (or Rejected at any stage)
```

`HighApproved` is retained as an optional/custom approval state. It is not required before release in the current PM-to-finance demo flow.

Holds block approval, rejection, document updates, and release at any stage.

## Key invariants

- Only one active unreleased request per work package
- LowApprover must approve before HighApprover
- Contractor cannot approve their own request
- Same wallet cannot hold both LowApprover and HighApprover on a package
- Release checks cap, tracked funded balance, and real vault token balance
- Finance is always `ProjectAccount.authority`; only authority can release
