# Construkt Support Scripts

The `scripts/` folder contains development support tooling used during validation of the backend-backed Construkt experience.

This is not part of the public product surface. It exists to help the team exercise and reseed the demonstration environment while building and verifying the Solana-backed application.

## What These Scripts Support

In practical terms, these utilities help keep the demonstration environment consistent so that:

- the backend-backed app can be exercised against predictable project state
- the Solana program can be validated after changes
- demo data can be reset into known scenarios such as funded, held, approved, and released packages

## Public Meaning

For a judge or reviewer, this folder is best understood as project infrastructure.

It is here to support repeatable demonstrations and validation of the Construkt workflow, not because the product itself depends on end users running developer tooling.
