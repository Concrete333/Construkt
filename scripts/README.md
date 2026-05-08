# scripts — Localnet Setup and Seed Utilities

Helper scripts for starting a local Solana validator with the Construkt program pre-loaded and seeding it with demo data.

## Prerequisites

- WSL (Ubuntu) with Solana CLI and Anchor CLI installed
- `anchor build` must have run at least once so `target/deploy/` exists

## Usage

Run these in order from WSL:

```bash
# 1. Start solana-test-validator with the Construkt program pre-loaded
bash scripts/setup-localnet.sh

# 2. (optional) Seed with demo wallets, mint, project, and work packages
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
| `setup-localnet.sh`     | Starts `solana-test-validator` with the compiled program loaded at the correct program ID       |
| `seed-localnet.ts`      | Creates demo keypairs, an SPL Token mint, a project, and work packages on the running validator |
| `seed-localnet-wsl.ps1` | Windows PowerShell wrapper that locates the repo in WSL and calls `npm run seed:localnet`       |
| `wsl-anchor-test.sh`    | Thin wrapper that runs `anchor test --provider.cluster localnet`                                |
| `wsl-anchor-test.ps1`   | Windows PowerShell wrapper that locates the repo in WSL and calls `wsl-anchor-test.sh`          |

Seed keypairs use deterministic fill-byte seeds so the same demo wallets are reproducible across resets.
