# Construkt Validation

The `tests/` folder contains the validation layer for the Construkt payment-control model.

These tests matter because Construkt is not only a UI concept. The repository includes a real rules engine for approvals, escrow, milestone-aware requests, and release decisions, and this folder is how that behaviour is continuously checked.

## What Is Being Validated

The test suites are focused on the core lifecycle:

- project and work package creation
- role assignment and authority boundaries
- escrow funding
- payment request submission
- approvals and rejections
- holds and blocked states
- milestone behaviour
- release logic
- draft package and contractor-assignment flow

## Why This Matters For A Submission

For judges, this folder is useful as evidence that the product logic is being treated seriously.

Construkt is presenting:

- a polished prototype
- a backend-backed app
- a tested payment-control engine

That combination is important. It shows the project is not only visually coherent, but also structurally thought through.
