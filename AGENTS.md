# Construkt Agent Notes

## Naming

The product is named **Construkt**.

`ConstruktDev` is only the local development folder and workspace folder.

Use lowercase `construkt` for code-level names:

- Anchor workspace/program: `construkt`
- Program folder: `programs/construkt`
- Anchor test files: `tests/construkt.b1-accounts.ts` through `tests/construkt.b4-release.ts`
- Shared Anchor test fixture: `tests/setup.ts`
- Frontend app folder: `app`
- Frontend package name: `construkt-app`

Deprecated names - do not use:

- `SmartFundX`
- `Construckt`
- `construct-flow-demo-main` as a product name

## Product Intent

Construkt is a Solana-backed escrow and approval engine for construction work-package payments. The product is a narrow payment-control and approval layer, not a full ERP, procurement system, or private blockchain.

The current frontend prototype also models lightweight supporting workflow around:

- estimated package creation
- contractor assignment
- escrow approval
- evidence and document references
- variation requests
- contractor withdrawal balance UX

Those prototype flows are valid product targets. They should not be mistaken for a full construction document platform or a finished commercial-management system.

Target demo network: Solana localnet or devnet only. Do not target mainnet.

## V0 Guardrails - Do Not Build

- full construction ERP
- real GBP bank payment integration
- T1 integration
- Autodesk/Forma integration
- retention engine
- full variation or change-order engine beyond the lightweight demo workflow
- production document storage, preview pipeline, or external DMS sync
- confidential or private execution
- multi-project enterprise permissions
- legal payment notice automation
- AI assistant features
- full historical indexing

Prefer the smallest working vertical slice over broad scaffolding.

## Documentation rule

When the frontend prototype is ahead of the backend, document both states explicitly:

- what the prototype currently demonstrates
- what the backend or on-chain program currently enforces

Do not collapse those into one vague description.

## Further Reading

- [`docs/V0MVP.md`](docs/V0MVP.md) - V0 product vision, roles, demo narrative, success criteria
- [`docs/V1MVP.md`](docs/V1MVP.md) - V1 roadmap
- [`docs/V2MVP.md`](docs/V2MVP.md) - V2 roadmap
- [`docs/FrontBackMergePlan.md`](docs/FrontBackMergePlan.md) - front/back integration plan and implementation log
- [`CLAUDE.md`](CLAUDE.md) - architecture, commands, and design decisions
