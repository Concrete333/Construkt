# frontend-prototype - Static Product Walkthrough + Frontend Unit Tests

Contains the backendless static walkthrough and the unit test suite for its helper functions.

## Product Walkthrough

Open [`web/index.html`](web/index.html) in any browser. No build step, no server, and no blockchain connection are required. Business state is fully mocked.

This is a static product walkthrough used for comparison and live presentation. The converged implementation surface is `../app`, which connects the same product flow to seeded review state or the Anchor-backed Solana program.

## What the prototype currently demonstrates

The prototype models the current intended user flow:

1. Finance Director creates a project.
2. Project Manager creates an estimated work package.
3. Project Manager assigns a contractor.
4. Finance Director approves escrow for that package.
5. Contractor submits an invoice against the package or a milestone.
6. Project Manager reviews evidence and approves or rejects the request.
7. Finance Director releases funds.
8. Contractor sees released-but-not-cleared funds and can mark them withdrawn in app state.

The prototype also includes lightweight UX around:

- milestone, valuation, and bespoke payment schedules
- variation requests
- document references and uploads
- evidence pack review
- audit history
- mocked state/reference logs

These flows are mocked in the prototype. They are the product target and static UX reference, not a claim that every step is implemented on-chain. The current release keeps raw files, document-request state, and contractor withdrawal clearing off-chain/app-derived; token release still happens at Finance release.

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
|   |-- index.html                          # walkthrough entry point
|   |-- static/projects/css/construkt.css  # shared styles
|   |-- static/projects/js/construkt.js    # walkthrough logic and mocked business state
|   `-- static/projects/img/               # logos and assets
`-- tests/
    `-- construkt.frontend.ts              # 75 unit tests
```

Behavior changes should go into:

- `web/index.html`
- `web/static/projects/js/construkt.js`
- `web/static/projects/css/construkt.css`

The old duplicate Django and standalone HTML exports were removed during the front/back merge cleanup and should not be treated as active surfaces.
