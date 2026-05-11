# Construkt On-Chain Program

The `programs/construkt/` folder contains the Solana program that enforces Construkt's escrow and approval rules.

This is the control layer behind the product. It is where package budgets, payment requests, approval states, and release permissions become enforceable rather than merely presentational.

## Why It Exists

Construkt is not using blockchain as branding. The on-chain program exists to solve a practical coordination problem in construction payments:

- who is allowed to approve a request
- whether a package has been funded
- whether a milestone schedule is complete
- whether a payment is ready for release
- whether the release authority can actually move funds

That gives Finance Directors and Project Managers a shared, structured source of truth for payment control.

## What It Models

The program manages a hierarchy of project-related state rather than deploying a new smart contract for every deal.

At a high level it covers:

- projects and budgets
- work packages
- milestone schedules
- role assignments
- payment requests
- approval records
- escrow vault relationships
- release decisions

This keeps Construkt focused on work-package payment control instead of expanding into a full ERP or document-management platform.

## Product Meaning

For judges, the important point is that this folder shows the commercial workflow has a real enforcement model underneath it.

The prototype may show the user journey and the app may show the operational surface, but this program is what makes the most sensitive parts of the flow meaningful:

- approval order
- release gating
- milestone-based controls
- funded versus released state
- authority boundaries

## In Context

Viewed together with the rest of the repository:

- the prototype shows the intended experience
- the app shows the runtime product
- this program shows the payment-control engine that supports both
