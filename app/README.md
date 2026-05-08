# app — React + Vite Frontend

React 19 + TypeScript + Vite frontend for Construkt. Defaults to a seeded mock client, and can run in Anchor mode against localnet/devnet via `@coral-xyz/anchor` and `@solana/web3.js`.

**Status:** Development phase. Not yet the canonical live UI — see [`frontend-prototype/web/`](../frontend-prototype/web/) for the current demo.

## Prerequisites

- Node.js (v18+) and npm
- No WSL or blockchain connection needed for default mock local dev and unit tests
- WSL/localnet is needed only for Anchor-backed demo mode

## Commands

All commands run from this directory (`app/`).

```bash
npm install          # install dependencies (first time only)
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # type-check + production bundle → dist/
npm run preview      # serve the production bundle locally
npm run test         # run unit tests once (vitest)
npm run test:watch   # run tests in watch mode
npm run lint         # ESLint + Prettier check
npm run lint:fix     # auto-fix lint and formatting issues
```

## Project structure

```
app/
├── src/
│   ├── components/     # shared UI components
│   ├── pages/          # route-level page components
│   ├── selectors/      # pure state-derivation helpers
│   ├── lib/            # clients, metadata adapters, PDA helpers, formatting
│   ├── idl/            # Anchor IDL (auto-generated)
│   ├── styles/         # shared global styles
│   └── main.tsx        # app entry point
├── public/             # static assets
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

## Connecting to the on-chain program

The app does not use a real wallet adapter yet. In Anchor mode it signs with deterministic demo keypairs that match the seeded localnet data. Start localnet and seed it from the repo root:

```bash
# In WSL, from repo root
bash scripts/setup-localnet.sh
npm run seed:localnet
```

From Windows PowerShell, seed through WSL after starting the validator in Ubuntu:

```powershell
npm run seed:localnet:wsl
```

Then start the app with `VITE_ANCHOR_RPC` set:

```bash
cd app
VITE_ANCHOR_RPC=http://localhost:8899 npm run dev
```

```powershell
cd app
$env:VITE_ANCHOR_RPC = "http://localhost:8899"; npm run dev
```
