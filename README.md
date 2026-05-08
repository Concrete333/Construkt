# Construkt

Solana-backed escrow and approval engine for construction work-package payments. The on-chain Anchor program enforces the PM-to-Finance release flow before finance can release SPL Token funds from an escrow vault to a contractor. Optional high approval remains available for packages that need an extra review step.

**Target networks: localnet and devnet only. Do not target mainnet.**

## Repository layout

| Directory | What it is |
|---|---|
| [`programs/construkt/`](programs/construkt/) | Anchor/Rust on-chain program |
| [`tests/`](tests/) | On-chain integration tests (requires WSL + localnet) |
| [`frontend-prototype/`](frontend-prototype/) | Static demo UI + frontend unit tests |
| [`app/`](app/) | React + Vite full frontend (development phase) |
| [`scripts/`](scripts/) | Localnet setup and seed utilities |
| [`migrations/`](migrations/) | Anchor migration scripts |
| [`docs/`](docs/) | Product plans (V0/V1/V2 MVP) and front/back integration log |

## Quick start

### View the demo UI (no blockchain required)

Open [`frontend-prototype/web/index.html`](frontend-prototype/web/index.html) in any browser. Business state is fully mocked.

### Run frontend unit tests (no blockchain required)

```bash
npm run test:frontend
```

### Run on-chain tests (requires WSL)

All Anchor and Solana CLI commands must run inside WSL (Ubuntu). Solana and Anchor are not installed on the Windows side.
From Windows PowerShell, use `npm run anchor:test:wsl` to call the WSL test wrapper.

```bash
# In WSL — run all four test files against localnet
npm run anchor:test

# Or, from Windows PowerShell, run the same tests through WSL
npm run anchor:test:wsl

# Optional app/demo localnet — start a validator with the program pre-loaded
bash scripts/setup-localnet.sh

# Optional — seed that running localnet with demo data
npm run seed:localnet

# Or, from Windows PowerShell, seed through WSL
npm run seed:localnet:wsl
```

### Develop the React app

```bash
cd app
npm install
npm run dev        # Vite dev server at http://localhost:5173
```

## Root npm scripts

| Script                      | What it does                                              | Requires WSL? |
| --------------------------- | --------------------------------------------------------- | ------------- |
| `npm run anchor:test`       | Run on-chain Anchor tests against localnet                | Yes           |
| `npm run anchor:test:wsl`   | Run the WSL Anchor test wrapper from Windows PowerShell   | Yes           |
| `npm run seed:localnet`     | Seed localnet with deterministic demo data                | Yes           |
| `npm run seed:localnet:wsl` | Run the WSL localnet seed wrapper from Windows PowerShell | Yes           |
| `npm run typecheck:scripts` | Type-check TypeScript utility scripts                     | No            |
| `npm run test:frontend`     | Run 75 frontend unit tests in Node                        | No            |
| `npm run lint`              | Check formatting for `migrations/` and `tests/`           | No            |
| `npm run lint:fix`          | Auto-fix formatting                                       | No            |

## Architecture summary

A single Anchor program at `34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL` holds all business logic — no off-chain backend for V0. The program is deployed once; projects, work packages, payment requests, approval records, and vaults are PDA/accounts under it rather than separate deployed smart contracts. Finance wallets own `ProjectAccount`; escrow funds live in SPL Token ATAs controlled by PDA vault authorities. The payment-request lifecycle is:

```
Submitted → LowApproved → Released
                                        (or Rejected at any stage)
```

`HighApproved` remains available as an optional/custom approval state, but finance release does not require it in the current PM-to-finance flow.
