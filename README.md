# Construkt

Construkt is a Solana-backed payment-control product for construction projects.

It gives Finance Directors, Project Managers, and Contractors a customizable, shared workflow for creating work packages, assigning contractors, funding escrow, approving milestone invoices, releasing funds, and tracking contractor withdrawal balances.

The core idea is simple: construction payments should not depend on scattered spreadsheets, email trails, and unclear approval status. Construkt turns the payment lifecycle into a structured product flow, with Solana enforcing the parts that matter most: authority, escrow, approvals, and release conditions.

## Product Snapshot

Construkt supports the full work-package payment journey:

1. Finance creates a project and budget.
2. A Project Manager creates an estimated work package, with milestones where needed.
3. A contractor is assigned to the package.
4. Finance approves and funds escrow.
5. The contractor submits an invoice against the package or a specific milestone.
6. The Project Manager reviews the request and evidence.
7. Finance releases funds once the approval conditions are met.
8. The contractor sees released funds available for withdrawal.

The product also includes role-specific dashboards, evidence review, document references, audit visibility, and lightweight variation handling.

## What Is In This Repository

This repository contains two product surfaces and the Solana program behind them.

| Area | What it shows |
| --- | --- |
| [`frontend-prototype/`](frontend-prototype/) | The polished product walkthrough and clearest view of the intended UX |
| [`app/`](app/) | The backend-backed React app connected to the Construkt account and approval model |
| [`programs/construkt/`](programs/construkt/) | The Solana program that enforces escrow, authority, approval, milestone, and release rules |
| [`tests/`](tests/) | Validation of the on-chain payment-control lifecycle |

## Try The Product

### Frontend Prototype

The quickest way to understand Construkt is to open the prototype:

- Hosted version: [`construkt.uk`](https://construkt.uk)
- Local version: open [`frontend-prototype/web/index.html`](frontend-prototype/web/index.html) in a browser

The prototype is fully browser-based. It does not require a server, wallet, Solana connection, or local build step. It is the best view of the complete intended product experience.

### Backend-Backed App

The app is the same product direction connected to real application state and the Solana account model.

For a quick browser-only review:

```bash
cd app
npm install
npm run dev
```

For the local Solana-backed run:

```bash
npm install
npm run reset:localnet
cd app
npm install
VITE_ANCHOR_RPC=http://127.0.0.1:8899 npm run dev
```

On Windows PowerShell:

```powershell
npm install
npm run reset:localnet
cd app
npm install
$env:VITE_ANCHOR_RPC = "http://127.0.0.1:8899"
npm run dev
```

Without `VITE_ANCHOR_RPC`, the app starts with seeded in-browser state so the product can be reviewed quickly. With `VITE_ANCHOR_RPC` set to a local validator, it runs against localnet. Devnet mode is supported when pointed at a compatible deployed environment.

## Why Solana

The first target customer is a project owner, main contractor, or delivery team managing staged package payments where a single release can represent tens or hundreds of thousands of pounds. In that environment, shared and enforceable payment state is valuable because it reduces disputes, improves cash-flow visibility, and moves trust out of private spreadsheets.

Construkt uses Solana for the parts of that workflow where a normal web app is weakest:

- escrow state that should be visible and verifiable
- release rules that should not change mid-request
- role and authority boundaries that need enforcement
- milestone payment schedules that need a shared source of truth
- an audit trail for payment decisions

The app still keeps normal product metadata off-chain where that makes sense. The chain is used for payment control, not for storing every document or UI detail.

## Prototype And App Relationship

The prototype is the clearest expression of the finished user experience. It shows the full commercial story and the intended interface for each role.

The app shows that same product becoming operational. It connects the flow to project accounts, work packages, milestones, payment requests, approvals, escrow funding, release decisions, and contractor balances.

Together, they show both sides of Construkt: the product people can understand immediately, and the enforcement model that makes it credible.

## Architecture In Plain English

Construkt does not create a separate smart contract for every project. One Solana program manages project, package, milestone, approval, escrow, and release accounts under a shared product model.

That keeps the architecture focused on the commercial problem:

- who is allowed to approve
- when funds can be locked
- what conditions must be met before release
- how milestone payments are tracked
- how Finance, PMs, and Contractors see the same payment state

## Recommended Review Path

Start with [`construkt.uk`](https://construkt.uk) to see the product as a user would experience it. Then open the backend-backed app to see the same workflow tied to real state. Finally, review the Solana program and tests to see how the payment-control rules are enforced.
