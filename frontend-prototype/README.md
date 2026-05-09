# frontend-prototype - Static Demo UI + Frontend Unit Tests

Contains the canonical backendless demo and the unit test suite for its helper functions.

## Demo UI

Open [`web/index.html`](web/index.html) in any browser. No build step, no server, and no blockchain connection are required. Business state is fully mocked.

This is the current canonical demo surface for product walkthroughs.

## What the prototype currently demonstrates

The prototype models the current intended user flow:

1. Finance Director creates a project.
2. Project Manager creates an estimated work package.
3. Project Manager assigns a contractor.
4. Finance Director approves escrow for that package.
5. Contractor submits an invoice against the package or a milestone.
6. Project Manager reviews evidence and approves or rejects the request.
7. Finance Director releases funds to the contractor withdrawal balance.
8. Contractor withdraws released funds.

The prototype also includes lightweight UX around:

- milestone, valuation, and bespoke payment schedules
- variation requests
- document references and uploads
- evidence pack review
- audit history
- chain-state placeholders

These flows are mocked in the prototype. They are the product target, not a claim that every step is already implemented on-chain.

## Frontend unit tests

75 unit tests cover the pure helper functions in [`web/static/projects/js/construkt.js`](web/static/projects/js/construkt.js). Runs in Node via ts-mocha - no WSL, localnet, or browser required.

```bash
# From the repo root
npm run test:frontend

# Or directly from this directory
npx ts-mocha -p ../tsconfig.json -t 10000 "tests/construkt.frontend.ts"
```

### What the tests cover

`formatGBP`, `parseMoneyKpi`, `formatMoneyKpi`, `easeOutCubic`, `clampPercent`, `dateProgress`, role helpers, `initials`, `chipTone`, `timelineDot`, `modelLabel`, `timelineStatusClass`, `getProjectTotals`, `hasAssignedContractor`, `financeApprovalStatus`, `packageStatusClass`, `packageStatusLabel`, `buildBespokeTimeline`

## Directory layout

```text
frontend-prototype/
|-- web/
|   |-- index.html                          # demo entry point
|   |-- static/projects/css/construkt.css  # shared styles
|   |-- static/projects/js/construkt.js    # demo logic and mocked business state
|   `-- static/projects/img/               # logos and assets
`-- tests/
    `-- construkt.frontend.ts              # 75 unit tests
```

Behavior changes should go into:

- `web/index.html`
- `web/static/projects/js/construkt.js`
- `web/static/projects/css/construkt.css`

The old duplicate Django and standalone HTML exports were removed during the front/back merge cleanup and should not be treated as active surfaces.
