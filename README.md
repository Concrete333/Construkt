# Construkt

Solana-backed escrow and approval engine for construction work-package payments. The on-chain Anchor program enforces a role-based approval flow before finance can release SPL Token funds from an escrow vault to a contractor.

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

```bash
# 1. In WSL — start localnet with the program pre-loaded
bash scripts/setup-localnet.sh

# 2. In WSL — run all four test files against localnet
npm run anchor:test

# 3. Optional — seed localnet with demo data
npx ts-node scripts/seed-localnet.ts
```

### Develop the React app

```bash
cd app
npm install
npm run dev        # Vite dev server at http://localhost:5173
```

## Root npm scripts

| Script | What it does | Requires WSL? |
|---|---|---|
| `npm run anchor:test` | Run on-chain Anchor tests against localnet | Yes |
| `npm run test:frontend` | Run 75 frontend unit tests in Node | No |
| `npm run lint` | Check formatting for `migrations/` and `tests/` | No |
| `npm run lint:fix` | Auto-fix formatting | No |

## Architecture summary

A single Anchor program at `34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL` holds all business logic — no off-chain backend for V0. Finance wallets own `ProjectAccount`; escrow funds live in SPL Token ATAs controlled by PDA vault authorities. The payment-request lifecycle is:

```
Submitted → LowApproved → HighApproved → Released
                                        (or Rejected at any stage)
```

