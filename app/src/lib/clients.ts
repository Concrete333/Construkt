import { MockConstruktClient } from "./mockClient";
import { MockMetadataClient } from "./metadataClient";
import { seedHospitalFitOut } from "./mockSeed";
import type { DemoWorld } from "./mockSeed";
import { seedDemoMetadata } from "./metadataSeed";
import { CONSTRUKT_PROGRAM_ID } from "./config";
import type { ConstruktClient } from "./program";
import type { MetadataClient } from "./metadataClient";

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
