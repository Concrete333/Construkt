# app — React + Vite Frontend

React 19 + TypeScript + Vite frontend for Construkt. Connects to the on-chain Anchor program via `@coral-xyz/anchor` and `@solana/web3.js`.

**Status:** Development phase. Not yet the canonical live UI — see [`frontend-prototype/web/`](../frontend-prototype/web/) for the current demo.

## Prerequisites

- Node.js (v18+) and npm
- No WSL or blockchain connection needed for local dev and unit tests

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
│   ├── components/     # shared UI components (AppHeader, RoleSwitcher, WalletDisplay, …)
│   ├── pages/          # route-level page components (Dashboard2, ProjectList, WorkPackageView, …)
│   ├── selectors/      # pure state-derivation helpers (payment, project, audit)
│   ├── lib/            # client interfaces, mock, PDA helpers, format, router, theme
│   ├── styles/         # design tokens and global CSS
│   ├── idl/            # Anchor IDL (construkt.json)
│   └── main.tsx        # app entry point
├── public/             # static assets
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

## Connecting to the on-chain program

To connect to a real network the Anchor program must be deployed and a wallet must be available in the browser. For local development, start localnet first:

```bash
# In WSL
bash ../scripts/setup-localnet.sh
npx ts-node ../scripts/seed-localnet.ts   # optional demo data
```

Then run `npm run dev` and point the network selector to localnet (`http://localhost:8899`).
