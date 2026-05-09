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


<claude-mem-context>
# Memory Context

# [Construkt] recent context, 2026-05-09 5:28pm GMT+1

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (18,646t read) | 871,967t work | 98% savings

### May 9, 2026
239 3:22p 🔵 Full call-site map for createWorkPackage and createPackageDraft across 17 files
240 3:23p 🔵 tests/setup.ts shared test fixture functions identified — both need optional highApprovalRequired param
241 " 🔵 ProjectDetailPage.tsx has 4 call sites for createWorkPackage/createPackageDraft needing Phase 5 updates
242 " 🔵 ProjectDetailPage.tsx package creation handler fully mapped — single form submission handles both Finance and PM paths
243 " 🔵 anchorClient.ts RawWorkPackageAccount and mapper function both need highApprovalRequired for Slice 1
245 " 🟣 create_work_package instruction updated to accept and store high_approval_required
246 " 🟣 Added highApprovalRequired field to WorkPackageAccount across client layer
244 3:24p 🟣 high_approval_required field added to WorkPackageAccount struct and SPACE constant in lib.rs
247 3:26p 🟣 Slice 1: highApprovalRequired propagated through all client adapters and test infrastructure
248 3:28p 🟣 IDL synced: highApprovalRequired added to app/src/idl/construkt.json
249 " 🔴 Vitest failed on Windows: missing @rolldown/binding-win32-x64-msvc native binding
250 " 🔵 ESLint not on Windows PATH; must be invoked via node directly
251 3:36p 🟣 Slice 1 fully verified: 157 vitest tests pass, TypeScript compiles clean
252 " 🔴 npm run anchor:test fails via WSL: anchor not on PATH inside npm subprocess
253 3:37p 🔵 wsl-anchor-test.sh smart-detects running validator to skip startup
254 3:40p 🔵 anchor test fails in WSL: node not found in WSL PATH
255 3:41p 🔵 WSL has nvm installed but node is not on PATH — anchor test script cannot invoke npx
256 " 🔵 WSL has nvm node v24.10.0 installed but no default alias set; anchor subprocess sees Windows node from /mnt/c
257 " 🔵 Anchor tests now run but expose pre-existing account resolution failures in b1-accounts and b5-budget suites
258 3:43p 🔵 Full anchor test run: 49 passing, 10 failing — all failures in b1-accounts and b5-budget, pre-dating Slice 1
259 3:54p 🔵 createWorkPackage IDL confirmed: authority is required account, highApprovalRequired is 5th arg
260 3:58p 🔵 Direct createWorkPackage calls in b1-accounts.ts and b5-budget.ts still pass only 4 args — missing highApprovalRequired
261 4:01p 🔴 All direct `.createWorkPackage()` Anchor call sites patched with 5th `highApprovalRequired` arg
262 " 🟣 Slice 1: `highApprovalRequired` field fully propagated through all TypeScript client layers
263 4:09p 🔵 release_payment instruction located at line 1012 in programs/construkt/src/lib.rs
264 " 🔵 release_payment approval gate currently accepts LowApproved OR HighApproved status
265 " 🔵 ConstruktError enum fully mapped — no existing HighApprovalRequired error variant
266 " 🟣 Slice 3 — b9 anchor test suite for highApprovalRequired policy gate
267 4:19p 🔵 lib.rs structure mapped for Slice 4 update_high_approval_policy instruction
S100 Slice 4: Implement update_high_approval_policy Anchor instruction + TypeScript clients + tests (May 9, 4:32 PM)
268 4:33p 🟣 Slice 4: update_high_approval_policy instruction implemented end-to-end
S101 Slice 4 complete — anchor test 67/67 confirmed; now scoping Slice 5 mock client parity tests for updateHighApprovalPolicy (May 9, 4:51 PM)
S102 Slice 4 complete — reading mockClient.test.ts tail to find insertion point for updateHighApprovalPolicy parity tests (May 9, 4:52 PM)
S103 Scoping mockClient.test.ts for updateHighApprovalPolicy parity tests — checking which methods are already covered (May 9, 4:52 PM)
S104 Modifying seedFundedPackage to accept highApprovalRequired option for updateHighApprovalPolicy test setup (May 9, 4:53 PM)
S105 Appending "MockConstruktClient — high approval policy parity" describe block to mockClient.test.ts (May 9, 4:53 PM)
S106 Slice 5 — mock client parity tests for high approval policy (May 9, 4:53 PM)
269 4:57p 🟣 mockClient.test.ts — high approval policy parity describe block added
S107 Slice 5 — mock client parity tests for high approval policy (9 new vitest tests, 166/166 passing) (May 9, 4:58 PM)
270 4:58p 🟣 Slice 5 vitest suite: 166/166 passing after high approval policy parity tests
S108 Slice 6 scoping — reading ProjectDetailPage.tsx to map all insertion points for highApprovalRequired toggle (May 9, 4:58 PM)
271 4:59p 🔵 ProjectDetailPage.tsx package creation UI structure mapped
272 " 🔵 ProjectDetailPage.tsx add-package form and submission handler fully mapped for Slice 6
273 5:00p 🔵 Package card "Approve package" button and draft status display mapped in ProjectDetailPage.tsx
274 " 🟣 ProjectDetailPage.tsx — highApprovalRequired form state added
275 5:01p 🟣 ProjectDetailPage.tsx — highApprovalRequired wired into milestone-path call sites
276 " 🟣 ProjectDetailPage.tsx — highApprovalRequired wired into simple-path call sites and post-submit reset
277 " 🟣 ProjectDetailPage.tsx — Cancel button now resets highApprovalRequired to false
S109 Slice 6: Add highApprovalRequired checkbox UI to add-package form, wire state into all 4 client call sites, add visual indicators to package cards, verify all checks pass (May 9, 5:01 PM)
278 5:03p ✅ Demo Hospital Fit-Out project budget increased
279 5:12p ✅ Added complianceUpgrade package to demo project structure
281 5:13p 🟣 Added complianceUpgrade package to demo seeding with required-high approval
282 " ✅ Updated mockSeed tests to reflect 7 work packages in demo
280 " ✅ setupPackage helper now supports configurable high approval requirements
283 " 🟣 seed-localnet.ts extended with 7th complianceUpgrade package (slice 8)
284 5:24p 🟣 seed-localnet.ts: setupPackage gains highApprovalRequired option; 7th package block added to main()
285 " 🔴 Replaced undefined approveByPm with existing approve(..., "lowApprover") in seed-localnet.ts
286 " 🟣 slice 8 complete: seed-localnet.ts now seeds 7 work packages including complianceUpgrade with required-high approval
287 5:25p ✅ FrontendBackendConvergencePlan.md: Phase 5 marked complete; Phase 6 is the next open phase
288 " ✅ FrontendBackendConvergencePlan.md: Capability Gap Map updated to reflect Phase 5 completion

Access 872k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>