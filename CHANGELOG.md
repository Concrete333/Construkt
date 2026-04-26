# Changelog

## Unreleased - Backend M3 Test Promotion

### Added

- Implemented Backend Milestone 3 payment request flow from the Test version:
  `submit_payment_request`, `add_document_reference`, `approve_request`, `reject_request`,
  and `set_role_active`.
- Added payment request, approval record, and B3 event account structures.
- Added compact account helpers for request IDs, active request state, and terminal request checks.
- Split the backend tests by milestone:
  - `tests/construkt.b1-accounts.ts`
  - `tests/construkt.b2-funding.ts`
  - `tests/construkt.b3-requests.ts`
  - `tests/setup.ts`

### Fixed

- Enforced `request_id == work_package.request_counter + 1` to prevent payment request PDA/state drift.
- Replaced the unused `DuplicateApproval` program error with `InvalidRequestId`.
- Updated split tests to import the local `tests/setup.ts` helper instead of depending on the Test checkout.
- Updated `Anchor.toml` wallet path to `~/.config/solana/id.json`.

### Verified

- `npm.cmd run lint:fix`
- `cargo fmt --all`
- `sh scripts/wsl-anchor-test.sh`
- Result: 24 passing tests.
