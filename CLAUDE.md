# Construkt Reference Notes

This repository contains the product, application, and on-chain reference layers for Construkt.

## What Construkt Is

Construkt is a Solana-backed escrow and approval product for construction work-package payments.

Its purpose is to make package-level payment controls clearer and more enforceable across three key actors:

- Finance Director
- Project Manager
- Contractor

## The Three Layers In This Repository

### 1. Frontend Prototype

The prototype is the clearest expression of the intended user experience. It communicates the full product journey and role-based workflow in the most polished way.

### 2. App

The app is the operational product surface. It brings the same commercial flow closer to a real runtime by connecting the experience to package, milestone, approval, and release state.

### 3. On-Chain Program

The Solana program is the payment-control engine. It is the layer that turns escrow, approval order, authority boundaries, and release readiness into enforceable behaviour.

## Core Product Story

Construkt is built around a simple commercial question:

How do you make project-package payments more controlled, transparent, and release-ready without forcing construction teams into a full enterprise software stack?

The repository answers that with:

- a product walkthrough
- a backend-backed app
- a tested on-chain control model

## Public Reading Guide

For public reviewers and judges, the best reading order is:

1. Root [`README.md`](README.md) for the overall product framing
2. [`frontend-prototype/`](frontend-prototype/) for the user-facing walkthrough
3. [`app/`](app/) for the backend-backed runtime
4. [`programs/construkt/`](programs/construkt/) and [`tests/`](tests/) for the control model and validation layer

## Important Distinction

Some workflow surfaces are more mature in the prototype than in the backend-backed runtime. That is intentional and documented.

The strength of the repository is that it shows:

- what the product experience aims to be
- what the application runtime already supports
- what the Solana control layer already enforces

That distinction should be read as product maturity in progress, not as inconsistency.
