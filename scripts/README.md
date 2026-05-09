# scripts — Localnet Setup and Seed Utilities

Helper scripts for starting or resetting a local Solana validator with the Construkt program pre-loaded and seeding it with deterministic demo data for the React app's Anchor mode.

## Prerequisites

- WSL (Ubuntu) with Solana CLI and Anchor CLI installed
- `anchor build` must have run at least once so `target/deploy/` exists

## Usage

Preferred one-command reset:

```bash
npm run reset:localnet
```

That command:

- runs `anchor build`
- syncs `target/idl/construkt.json` into the app-facing camelCase IDL at `app/src/idl/construkt.json`
- stops any existing local validator process
- resets the repo-local `test-ledger/`
- starts `solana-test-validator`
- reseeds demo data

Manual fallback, run these in order from WSL:

```bash
# 1. Start solana-test-validator with the Construkt program pre-loaded
bash scripts/setup-localnet.sh

# 2. Seed with demo wallets, mint, project, work packages, requests, approvals, holds, and release states
npm run seed:localnet
```

From Windows PowerShell, call the seed command through WSL:

```bash
npm run seed:localnet:wsl
```

Once localnet is running, execute the integration tests from the repo root:

```bash
npm run anchor:test
```

From Windows PowerShell, use the WSL wrapper entry point:

```bash
npm run anchor:test:wsl
```

## Files

| File                    | What it does                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `reset-localnet.ts`     | Cross-platform entry point that runs the reset workflow directly or routes through WSL          |
| `reset-localnet.sh`     | One-shot WSL workflow for build, IDL sync, validator reset, and reseed                          |
| `setup-localnet.sh`     | Starts `solana-test-validator` with the compiled program loaded at the correct program ID       |
| `seed-localnet.ts`      | Creates demo keypairs, an SPL Token mint, a project, and work packages on the running validator |
| `sync-idl.ts`           | Regenerates `app/src/idl/construkt.json` from Anchor's generated `target/idl/construkt.json`   |
| `seed-localnet-wsl.ps1` | Windows PowerShell wrapper that locates the repo in WSL and calls `npm run seed:localnet`       |
| `wsl-anchor-test.sh`    | Thin wrapper that runs `anchor test --provider.cluster localnet`                                |
| `wsl-anchor-test.ps1`   | Windows PowerShell wrapper that locates the repo in WSL and calls `wsl-anchor-test.sh`          |

Seed keypairs use deterministic fill-byte seeds so the same demo wallets are reproducible across resets.

`app/src/idl/construkt.json` is generated output. Do not edit it by hand; rerun `npm run idl:sync` or `npm run reset:localnet` after `anchor build`.

The seed creates one demo project with six package states: released after PM plus optional high approval, high-approved waiting for Finance, low-approved ready for Finance, submitted on hold, funded with no request, and rejected/unblocked.
