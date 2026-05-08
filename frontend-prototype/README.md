# frontend-prototype — Static Demo UI + Frontend Unit Tests

Contains the canonical backendless demo and the unit test suite for its helper functions.

## Demo UI

Open [`web/index.html`](web/index.html) in any browser. No build step, no server, no wallet required. Business state is fully mocked — used for UX iteration before the full Solana-integrated frontend.

## Frontend unit tests

75 unit tests for the pure helper functions in [`web/static/projects/js/construkt.js`](web/static/projects/js/construkt.js). Runs in Node via ts-mocha — no WSL, no localnet, no browser required.

```bash
# From the repo root
npm run test:frontend

# Or directly from this directory
npx ts-mocha -p ../tsconfig.json -t 10000 "tests/construkt.frontend.ts"
```

### What the tests cover

`formatGBP`, `parseMoneyKpi`, `formatMoneyKpi`, `easeOutCubic`, `clampPercent`, `dateProgress`, role helpers, `initials`, `chipTone`, `timelineDot`, `modelLabel`, `timelineStatusClass`, `getProjectTotals`, `hasAssignedContractor`, `financeApprovalStatus`, `packageStatusClass`, `packageStatusLabel`, `buildBespokeTimeline`

## Directory layout

```
frontend-prototype/
├── web/
│   ├── index.html                          # demo entry point (open in browser)
│   ├── static/projects/css/construkt.css  # shared styles
│   ├── static/projects/js/construkt.js    # all business logic helpers
│   └── static/projects/img/               # logos and assets
└── tests/
    └── construkt.frontend.ts              # 75 unit tests
```

Behavior changes should go into `web/static/projects/js/construkt.js`, `web/index.html`, and shared CSS as needed. The old duplicate Django/standalone HTML exports were removed during the front/back merge cleanup and should not be treated as active surfaces.
