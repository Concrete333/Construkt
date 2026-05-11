# Construkt

Construkt is a construction payment-control product that uses Solana to coordinate escrow, approvals, release decisions, and contractor payout visibility at the work-package level.

This repository contains two public-facing product surfaces:

- [`frontend-prototype/`](frontend-prototype/) is the clearest walkthrough of the intended user experience. It is a polished browser prototype that shows the full product story across Finance Director, Project Manager, and Contractor roles.
- [`app/`](app/) is the backend-backed application runtime. It connects the product flow to the real Construkt account model, approval rules, and escrow logic.

Together, they show both the product vision and the real system architecture behind it.

## What Construkt Does

Construkt is designed for construction teams that need tighter control over how package budgets move from approval to release.

At a high level, the product supports this flow:

1. Finance creates a project and budget.
2. A Project Manager creates an estimated work package, with milestones where needed.
3. The contractor is assigned to that package.
4. Finance approves and funds escrow for the package.
5. The contractor submits an invoice against the package or a milestone.
6. The Project Manager reviews and approves or rejects the request.
7. Finance releases funds when the approval conditions are satisfied.
8. The contractor sees released funds available for withdrawal.

The wider product concept also includes document references, evidence review, lightweight variation handling, audit visibility, and role-specific dashboards.

## What The Two Experiences Show

### Frontend Prototype

The static prototype is the most presentation-ready version of Construkt. It is intended to show judges the user journey, interface design, information hierarchy, and the full commercial workflow we want the product to support.

It demonstrates:

- role-based dashboards
- project creation
- work package creation
- contractor assignment
- escrow approval
- milestone-aware invoicing
- evidence and document review
- payment release
- contractor withdrawal balance visibility

This surface is a product walkthrough, not a live blockchain application.

### App

The React app is the backend-backed product runtime. It mirrors the same product direction, but its value is that it is wired to the actual Construkt state model rather than existing only as a static demo.

It demonstrates:

- the real project, work package, milestone, approval, and release model
- the split between on-chain payment-control rules and app-level metadata
- the progression from prototype UX into a true application runtime
- how the product can move from concept to enforceable workflow

## Repository Guide

| Directory | Public meaning |
| --- | --- |
| [`frontend-prototype/`](frontend-prototype/) | Product walkthrough and presentation prototype |
| [`app/`](app/) | Backend-backed application runtime |
| [`programs/construkt/`](programs/construkt/) | Solana program that enforces escrow and approval rules |
| [`tests/`](tests/) | Validation of the on-chain payment-control lifecycle |
| [`scripts/`](scripts/) | Support tooling used during development and validation |

## Architecture In Plain English

Construkt does not create a separate smart contract for every project. Instead, one Solana program manages a family of project, package, milestone, approval, and escrow accounts beneath it.

That matters because the product is not trying to be a generic blockchain showcase. The design is focused on one commercial problem:

- who can approve
- when funds can be locked
- when funds can be released
- how milestone-based payments can be controlled
- how the product keeps Finance, PMs, and Contractors aligned

## For Judges

The most useful way to read this repository is:

1. Start with the prototype to understand the intended product experience.
2. Look at the app to see how that experience is being translated into a real runtime.
3. Look at the Solana program and tests to see the payment-control logic that underpins the workflow.

This repository is being presented as a product submission rather than as an open-source contributor onboarding pack, so the top-level documentation focuses on the product, the user journey, and the architecture rather than local setup instructions.
