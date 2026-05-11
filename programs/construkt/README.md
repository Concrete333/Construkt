# Construkt Solana Program

The Construkt program is the payment-control layer behind the app. It keeps the commercial workflow readable in the UI while using Solana accounts to enforce the rules that should not depend on private spreadsheets or manual reconciliation.

## Product Flows Mapped To Program Logic

| Product flow | Program responsibilities |
| --- | --- |
| Project setup | Create the project account, store the finance authority, record the project mint, and track total budget allocation. |
| PM package drafting | Authorize project drafters, create draft work packages, attach proposed contractors, and keep draft packages out of escrow until Finance activates them. |
| Work package activation | Confirm the package, create the token vault, assign the contractor role, and allocate the approved cap against the project budget. |
| Milestone schedules | Create per-package milestone accounts, enforce milestone totals against package caps, and support milestone-targeted requests. |
| Escrow funding | Move SPL tokens into the package vault and keep funded, reserved, released, and available amounts consistent. |
| Role permissions | Enforce Finance, PM, Contractor, and optional High Approver authority through PDA-backed role assignment accounts. |
| Invoice requests | Record package-level or milestone-level payment requests, reserve requested value, and prevent conflicting active requests. |
| Evidence and references | Store compact document reference hashes and metadata references while keeping raw files off chain. |
| Approvals, holds, and release | Require the correct approval sequence, block release while holds are active, and release funds only when package policy is satisfied. |
| Audit visibility | Emit events for project, package, milestone, request, approval, hold, release, and policy changes so off-chain views can reconstruct the payment history. |

## Why This Uses Solana

Construkt uses Solana where shared, enforceable state matters most: authority, escrow, release rules, milestone status, and payment history. Product metadata such as long-form notes, document files, and rich UI content can stay off chain, while the payment-control state remains verifiable.

The program uses deterministic PDAs for projects, packages, milestones, payment requests, role assignments, and document references. SPL token vaults hold package funds, and account constraints keep the release path tied to the correct project, package, mint, role, and approval state.
