# Construkt Agent Notes

## Naming

The product is named **Construkt**.

`ConstruktDev` is only the local development folder / parent workspace folder.

Use lowercase `construkt` for code-level names:

- Anchor workspace/program: `construkt`
- Program folder: `programs/construkt`
- Anchor test files: `tests/construkt.b1-accounts.ts` through `tests/construkt.b4-release.ts`
- Shared Anchor test fixture: `tests/setup.ts`
- Frontend app folder: `app`
- Frontend package name: `construkt-app`

Deprecated names — do not use:

- `SmartFundX`
- `Construckt`
- `construct-flow-demo-main` as a product name

## Product Intent

Construkt is a Solana-backed escrow and approval engine for construction work-package payments. The product is a narrow payment-control and approval layer, not a full ERP, document platform, procurement system, or private blockchain.

Target demo network: Solana localnet or devnet only. Do not target mainnet.

## V0 Guardrails — Do Not Build

- full construction ERP
- real GBP bank payment integration
- T1 integration
- Autodesk/Forma integration
- retention
- variations/change orders
- confidential/private execution
- multi-project enterprise permissions
- document storage
- legal payment notice automation
- AI assistant features
- full historical indexing

Prefer the smallest working vertical slice over broad scaffolding.

## Further Reading

- [`docs/V0MVP.md`](docs/V0MVP.md) — V0 product vision, roles, demo narrative, success criteria
- [`docs/V1MVP.md`](docs/V1MVP.md) — V1 roadmap (AI assistant, crypto payment manager)
- [`docs/V2MVP.md`](docs/V2MVP.md) — V2 roadmap (full construction operations)
- [`docs/FrontBackMergePlan.md`](docs/FrontBackMergePlan.md) — Front/back integration plan and implementation log
- [`CLAUDE.md`](CLAUDE.md) — Architecture, commands, and design decisions for Claude Code
