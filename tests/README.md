# tests — On-Chain Integration Tests

Four ordered TypeScript test files that run against a live Solana localnet validator. Each file covers a distinct phase of the Construkt lifecycle.

## Prerequisites

- WSL (Ubuntu) with Solana CLI and Anchor CLI installed
- Localnet running (see [`scripts/`](../scripts/))

## Run

```bash
# All four files (from repo root, in WSL)
npm run anchor:test
# or directly:
anchor test --provider.cluster localnet

# From Windows PowerShell
npm run anchor:test:wsl

# Single file (in WSL)
npx ts-mocha -p ./tsconfig.json -t 1000000 "tests/construkt.b1-accounts.ts"
```

## Test files

| File | Covers |
|---|---|
| `construkt.b1-accounts.ts` | Project and work package creation, role assignment |
| `construkt.b2-funding.ts` | Escrow vault funding |
| `construkt.b3-requests.ts` | Payment request submission, document references, approvals, rejections, holds |
| `construkt.b4-release.ts` | Payment release and blocked-state guards, including both PM-approved release and optional high-approved release |

Files must run in order (b1 → b4) because later suites depend on state established by earlier ones.

## Fixtures

`tests/setup.ts` exports `createFixture()`, which generates isolated per-test keypairs and PDAs. This prevents test suites from sharing mutable on-chain state.
