import type { PublicKey } from "@solana/web3.js";
import type { ConstruktClient } from "./program";

/**
 * Phase 4 stub. The real implementation will wrap an Anchor `Program<Construkt>`,
 * a wallet adapter, and a connection — see Phase 4 of FrontBackMergePlan.md.
 *
 * Until then, calling `createAnchorClient()` throws so a misconfigured
 * composition root surfaces immediately instead of silently no-op'ing.
 */
export interface AnchorClientOptions {
  programId: PublicKey;
  // TODO(phase-4): wallet, connection, IDL.
}

export const createAnchorClient = (
  _opts: AnchorClientOptions,
): ConstruktClient => {
  throw new Error(
    "AnchorConstruktClient is not implemented yet — Phase 4 will wire wallet + IDL.",
  );
};
