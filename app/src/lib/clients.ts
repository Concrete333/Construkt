import { MockConstruktClient } from "./mockClient";
import { MockMetadataClient } from "./metadataClient";
import { seedHospitalFitOut } from "./mockSeed";
import type { DemoWorld } from "./mockSeed";
import { seedDemoMetadata } from "./metadataSeed";
import { CONSTRUKT_PROGRAM_ID } from "./config";
import type { ConstruktClient } from "./program";
import type { MetadataClient } from "./metadataClient";
import type { PublicKey } from "@solana/web3.js";
import type { DemoRole } from "./theme";

export interface AppClients {
  client: ConstruktClient;
  metadata: MetadataClient;
  world: DemoWorld;
}

/**
 * Build the V0 demo bundle: a mock on-chain client seeded with the
 * Demo Hospital Fit-Out world plus a metadata client populated with
 * matching display copy. Phase 4 will introduce a parallel
 * `buildAnchorClients` that targets localnet/devnet without changing
 * any consumer of this interface.
 */
export const buildDemoClients = async (): Promise<AppClients> => {
  const construktClient = new MockConstruktClient({
    programId: CONSTRUKT_PROGRAM_ID,
  });
  const world = await seedHospitalFitOut(construktClient, {
    programId: CONSTRUKT_PROGRAM_ID,
  });
  const metadata = new MockMetadataClient();
  seedDemoMetadata(metadata, world);
  return { client: construktClient, metadata, world };
};

/**
 * Map a demo role to the seeded demo wallet that would sign for it on
 * chain. V0 only — Phase 4 must replace this with a real connected
 * wallet (which may not match the visible role; that mismatch is the
 * whole reason "role visibility is not authorization").
 */
export const walletForRole = (world: DemoWorld, role: DemoRole): PublicKey => {
  switch (role) {
    case "financeDirector":
      return world.finance.publicKey;
    case "projectManager":
      return world.pm.publicKey;
    case "director":
      return world.director.publicKey;
    case "contractor":
      return world.contractor.publicKey;
  }
};
