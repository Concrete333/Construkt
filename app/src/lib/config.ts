import { PublicKey } from "@solana/web3.js";

/**
 * Canonical Construkt program ID (matches `programs/construkt/src/lib.rs`
 * `declare_id!`). Single source of truth for the app — tests hardcode the
 * same value because importing test fixtures from `app/` source bloats the
 * bundle.
 */
export const CONSTRUKT_PROGRAM_ID = new PublicKey(
  "cTkcdfaMNy3LbZVtaX4j4RwFrE91j34gRZQ5CHTKCb4",
);
