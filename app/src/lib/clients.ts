import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import { CONSTRUKT_PROGRAM_ID } from "./config";
import type { MetadataClient, MetadataWriter } from "./metadataClient";
import {
  LocalStorageMetadataClient,
  MockMetadataClient,
} from "./metadataClient";
import { seedDemoMetadata } from "./metadataSeed";
import { MockConstruktClient } from "./mockClient";
import type { DemoWorld } from "./mockSeed";
import { seedHospitalFitOut } from "./mockSeed";
import {
  derivePaymentRequestAddress,
  deriveProjectAddress,
  deriveWorkPackageAddress,
} from "./pda";
import type { ConstruktClient } from "./program";
import type { DemoRole } from "./theme";

export interface AppClients {
  client: ConstruktClient;
  metadata: MetadataClient;
  /**
   * Off-chain metadata write surface. Present in V0 (the mock client
   * implements both interfaces); Phase 4 will likely set this to `null`
   * because real backends own their own mutation paths. The UI must
   * handle the `null` case rather than assuming write capability.
   */
  metadataWriter: MetadataWriter | null;
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
  return {
    client: construktClient,
    metadata,
    metadataWriter: metadata,
    world,
  };
};

const browserLocalStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * Build the Anchor-backed client bundle for localnet/devnet mode.
 * The world shape stays deterministic so existing UI routes and
 * selector assumptions keep working without extra chain lookups.
 */
export const buildAnchorClients = async (
  rpcUrl: string,
): Promise<AppClients> => {
  const { createAnchorClient } = await import("./anchorClient");
  const finance = Keypair.fromSeed(new Uint8Array(32).fill(1));
  const pm = Keypair.fromSeed(new Uint8Array(32).fill(2));
  const director = Keypair.fromSeed(new Uint8Array(32).fill(3));
  const contractor = Keypair.fromSeed(new Uint8Array(32).fill(4));
  const mintKp = Keypair.fromSeed(new Uint8Array(32).fill(10));

  const connection = new Connection(rpcUrl, "confirmed");
  const client = createAnchorClient({
    programId: CONSTRUKT_PROGRAM_ID,
    connection,
    keypairs: [finance, pm, director, contractor, mintKp],
  });

  const programId = CONSTRUKT_PROGRAM_ID;
  const project = deriveProjectAddress(programId, finance.publicKey, 1n);
  const pkgAddr = (id: bigint): PublicKey =>
    deriveWorkPackageAddress(programId, project, id);
  const reqAddr = (pkg: PublicKey, id: bigint): PublicKey =>
    derivePaymentRequestAddress(programId, pkg, id);

  const world: DemoWorld = {
    finance,
    pm,
    director,
    contractor,
    mint: mintKp.publicKey,
    project,
    packages: {
      foundation: {
        name: "Foundation Pour - Bay A",
        address: pkgAddr(1n),
        request: reqAddr(pkgAddr(1n), 1n),
        finalStatus: "released",
      },
      steelFrame: {
        name: "Steel Frame - Section B",
        address: pkgAddr(2n),
        request: reqAddr(pkgAddr(2n), 1n),
        finalStatus: "highApproved",
      },
      mepFirstFix: {
        name: "MEP First Fix",
        address: pkgAddr(3n),
        request: reqAddr(pkgAddr(3n), 1n),
        finalStatus: "lowApproved",
      },
      facade: {
        name: "Facade Remediation",
        address: pkgAddr(4n),
        request: reqAddr(pkgAddr(4n), 1n),
        finalStatus: "submittedOnHold",
      },
      interior: {
        name: "Interior Fit-Out",
        address: pkgAddr(5n),
        request: null,
        finalStatus: "noRequest",
      },
      rejectedDelta: {
        name: "Site Logistics Variation",
        address: pkgAddr(6n),
        request: reqAddr(pkgAddr(6n), 1n),
        finalStatus: "rejected",
      },
    },
  };

  const metadataStorage = browserLocalStorage();
  const metadata = metadataStorage
    ? new LocalStorageMetadataClient(metadataStorage)
    : new MockMetadataClient();
  seedDemoMetadata(metadata, world);

  return {
    client,
    metadata,
    metadataWriter: metadata,
    world,
  };
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
