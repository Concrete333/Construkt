# Construkt

Solana-backed escrow and approval engine for construction work-package payments.

The repository currently has two closely related surfaces:

- The on-chain Anchor program enforces the current PM-to-Finance payment release path.
- The frontend prototype models the broader end-to-end product flow we want the backend to grow into.

Target networks: `localnet` and `devnet` only. Do not target mainnet.

## Repository layout

| Directory | What it is |
|---|---|
| [`programs/construkt/`](programs/construkt/) | Anchor/Rust on-chain program |
| [`tests/`](tests/) | On-chain integration tests (requires WSL + localnet) |
| [`frontend-prototype/`](frontend-prototype/) | Static demo UI + frontend unit tests |
| [`app/`](app/) | React + Vite frontend in development |
| [`scripts/`](scripts/) | Localnet setup and seed utilities |
| [`migrations/`](migrations/) | Anchor migration scripts |
| [`docs/`](docs/) | Product plans and front/back integration notes |

## Quick start

### View the demo UI

Open [`frontend-prototype/web/index.html`](frontend-prototype/web/index.html) in any browser. No build step, no server, and no blockchain connection are required.

### Run frontend unit tests

```bash
npm run test:frontend
```

### Run on-chain tests

All Anchor and Solana CLI commands must run inside WSL (Ubuntu). Solana and Anchor are not installed on the Windows side.

```bash
# Preferred: rebuild, reset localnet, sync IDL, and reseed in one command
npm run reset:localnet

# In WSL
npm run anchor:test

# From Windows PowerShell, call the WSL wrapper
npm run anchor:test:wsl

# Optional: start a validator with the program pre-loaded
bash scripts/setup-localnet.sh

# Optional: seed that running localnet with demo data
npm run seed:localnet

# From Windows PowerShell, seed through WSL
npm run seed:localnet:wsl
```

### Develop the React app

```bash
cd app
npm install
npm run dev
```

## Root npm scripts

| Script | What it does | Requires WSL? |
|---|---|---|
| `npm run anchor:test` | Run on-chain Anchor tests against localnet | Yes |
| `npm run anchor:test:wsl` | Run the WSL Anchor test wrapper from Windows PowerShell | Yes |
| `npm run idl:sync` | Regenerate the app-facing camelCase IDL from `target/idl/construkt.json` | Yes |
| `npm run reset:localnet` | Build, sync IDL, reset localnet, preload the program, and reseed demo state | Yes |
| `npm run seed:localnet` | Seed localnet with deterministic demo data | Yes |
| `npm run seed:localnet:wsl` | Run the WSL localnet seed wrapper from Windows PowerShell | Yes |
| `npm run typecheck:scripts` | Type-check TypeScript utility scripts | No |
| `npm run test:frontend` | Run 75 frontend unit tests in Node | No |
| `npm run lint` | Check formatting for `migrations/` and `tests/` | No |
| `npm run lint:fix` | Auto-fix formatting | No |

## Current prototype flow

The static prototype is the current canonical demo surface. It models this user journey:

1. Finance Director creates a project.
2. Project Manager creates an estimated work package, with milestones or another payment schedule if needed.
3. Project Manager assigns that package to a contractor.
4. Finance Director approves escrow for the assigned package.
5. Contractor submits an invoice against the package or a specific milestone.
6. Project Manager reviews evidence and approves or rejects the request.
7. Finance Director releases funds to the contractor withdrawal balance.
8. Contractor withdraws released funds.

The prototype also includes lightweight variation requests, document references, evidence review, audit history, and chain-state placeholders. Those flows are mocked in the prototype and should be treated as product targets, not as proof that the on-chain program already implements them all.

## Architecture summary

### On-chain program today

A single Anchor program at `cTkcdfaMNy3LbZVtaX4j4RwFrE91j34gRZQ5CHTKCb4` holds the business logic. The program is deployed once; projects, work packages, payment requests, approval records, and vaults are PDA/accounts under it rather than separate deployed smart contracts.

Finance wallets own `ProjectAccount`. Escrow funds live in SPL Token ATAs controlled by PDA vault authorities.

The current on-chain payment-request lifecycle is:

```text
Submitted -> LowApproved -> Released
                     (or Rejected at any stage)
```

`HighApproved` remains available as an optional/custom approval state, but finance release does not require it in the current PM-to-Finance path.

### Prototype alignment notes

- The prototype is ahead of the current on-chain flow in a few places, especially package assignment, evidence handling, variation workflow, and contractor withdrawal UX.
- The backend should treat the prototype as the target product workflow where practical, while still documenting what is already implemented on-chain versus what remains mocked.
- User-facing prototype copy now uses `withdrawal balance` rather than exposing wallet mechanics directly, even though the eventual backend will still map releases and withdrawals to real signer and token-account behavior.
