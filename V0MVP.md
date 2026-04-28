# V0 MVP

## Purpose

V0 is the demo and proof-of-concept release.

The goal is to show the basic Construkt idea in a way that is easy to understand, presentation-friendly, and technically credible. V0 should prove that construction work packages can be represented as smart-contract-backed payment flows on Solana, while keeping the frontend simple enough for a non-technical stakeholder to follow in a live demo.

## Product Thesis

Construkt helps a client or project owner control construction payments by tying funds to work packages, approvals, contractor evidence, and escrow release.

The V0 story should be:

1. Finance creates or oversees a project.
2. A Project Manager creates work packages.
3. A contractor is assigned to a work package.
4. Finance approves and locks escrow for the work package.
5. The contractor submits an invoice and supporting documents.
6. The Project Manager approves or rejects the invoice.
7. Finance releases payment from escrow.
8. The audit trail proves who did what and when.

## Target Audience

V0 is for:

- investors
- hackathon/demo judges
- university or enterprise innovation teams
- early customer discovery conversations
- internal product validation

It is not yet intended for real construction administration.

## Roles

### Finance

Finance represents the broad financial oversight role.

Finance needs to see:

- project funding overview
- work package budget exposure
- escrow locked
- released payments
- pending releases
- audit trail
- ability to approve/lock package escrow
- ability to release funds after approval

### Project Manager

The Project Manager is the operational approver.

The Project Manager needs to:

- view assigned projects
- create estimated work packages
- assign package contractor and budget assumptions
- approve or reject contractor invoices with notes
- request documents from the contractor
- submit or review package variation requests
- see package status and evidence

### Contractor

The contractor is the service provider and payment recipient.

The contractor needs to:

- see only assigned projects and assigned work packages
- open a work package view
- submit invoice requests
- submit variation requests
- upload supporting documents
- respond to document requests
- see payment and approval status

## Core Frontend Scope

V0 frontend should focus on a clean, convincing demo flow:

- role switcher for Finance, Project Manager, and Contractor
- `#dashboard2` as the canonical V0 dashboard and main presentation surface
- projects list scoped by role
- project detail with work packages
- shared work package view for PM and contractor
- work package milestone/payment schedule visual
- package action card
- invoice submission
- invoice approve/reject
- document upload
- document request
- variation request
- finance overview
- audit trail

The frontend can remain prototype-style while the backend integration is proven, but it should feel coherent and intentional.

## Backendless Demo Home

The backendless V0 demo lives at `frontend-prototype/web/index.html`.

This is the standalone presentation surface for the clickable/product-flow demo. It should run without Django, a REST API, wallet connection, localnet/devnet, or an Anchor client. Mocked/local-only state is acceptable there as long as it is treated as demo state, not proof of on-chain execution.

The Anchor-backed implementation remains the technical proof for escrow, approvals, holds, release, and audit truth. When the integrated frontend is built, useful UX from `frontend-prototype/web/index.html` should be migrated into the planned `app/` runtime.

## Core Backend Scope

V0 backend should prove the smart contract primitive:

- initialize project
- create work package
- assign roles
- fund escrow
- submit payment request
- add document reference
- approve request
- reject request
- place/remove hold
- release payment

The key backend proof is that escrow funding and release are not just UI state. They should be demonstrated through Solana program instructions and account state.

## Demo Narrative

The ideal V0 demo should take 5 to 8 minutes:

1. Start as Finance and show the project funding overview.
2. Switch to Project Manager and create or inspect an estimated package.
3. Show package moving toward Finance approval/escrow lock.
4. Switch to Contractor and open the assigned work package.
5. Submit invoice and upload a document reference.
6. Switch to Project Manager and approve the invoice.
7. Switch to Finance and release funds.
8. Show the audit trail and explain that the payment flow maps to Solana escrow.

## Must Be Impressive

V0 should feel impressive because it makes a complicated process simple:

- visual bars for funding and package status
- clear role-based views
- visible escrow language
- visible approval sequence
- clean work package drilldown
- understandable audit trail
- simple construction-specific labels

Avoid overloading the demo with every real-world construction edge case.

## Explicitly Out Of Scope

V0 does not need:

- full NEC/JCT contract administration
- production document storage
- AI assistant
- real wallet onboarding for all users
- production KYC/KYB
- procurement workflows
- full cost forecasting
- VAT/CIS/retention treatment
- enterprise permissions
- real notification delivery
- multi-tenant production backend

## Refinements Worth Considering Before Demo

- Add a clearer Finance release screen that shows escrow before and after.
- Add one polished end-to-end seeded demo project.
- Keep `#work-package-view` as the main package surface and treat older package-detail screens as legacy/internal only.
- Fix stale references to old frontend paths.
- Add a "View on Solana" style placeholder that can later show explorer links.
- Add a compact "what just happened on-chain" panel after key actions.
- Show frontend-only on-chain action feedback for escrow PDA creation, mock USDC funding, payment request account creation, approval recording, and fund release.
- Make demo seed data match backend test accounts where practical.

## Success Criteria

V0 succeeds if a viewer can understand:

- what a work package is
- why escrow matters
- who approves what
- how contractors get paid
- how evidence and audit trail support trust
- what Solana is doing behind the scenes

V0 is successful when it creates belief in the core concept.
