import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { CONSTRUKT_PROGRAM_ID } from "./config";
import type {
  MetadataClient,
  MetadataSnapshotStore,
  MetadataWriter,
} from "./metadataClient";
import {
  LocalStorageMetadataClient,
  MockMetadataClient,
} from "./metadataClient";
import { demoProjectRef, seedDemoMetadata } from "./metadataSeed";
import { MockConstruktClient } from "./mockClient";
import type { DemoWorld } from "./mockSeed";
import { seedHospitalFitOut } from "./mockSeed";
import {
  deriveMilestoneAddress,
  derivePaymentRequestAddress,
  deriveProjectAddress,
  deriveWorkPackageAddress,
} from "./pda";
import type { ConstruktClient } from "./program";
import type { DemoRole } from "./theme";

export interface AppWorld {
  finance: DemoWorld["finance"];
  pm: DemoWorld["pm"];
  director: DemoWorld["director"];
  contractor: DemoWorld["contractor"];
  mint: DemoWorld["mint"];
  project: DemoWorld["project"];
}

export interface AppClients {
  client: ConstruktClient;
  metadata: MetadataClient;
  /**
   * Off-chain metadata write surface. Present in V0 (the mock client
   * implements both interfaces). Backend-backed modes may set this to
   * `null` because real services own their own mutation paths. The UI must
   * handle the `null` case rather than assuming write capability.
   */
  metadataWriter: MetadataWriter | null;
  world: AppWorld;
}

/**
 * Build the V0 demo bundle: a mock on-chain client seeded with the
 * Demo Hospital Fit-Out world plus a metadata client populated with
 * matching display copy. `buildAnchorClients` exposes the same shape
 * for localnet/devnet without changing any consumer of this interface.
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
    world: {
      finance: world.finance,
      pm: world.pm,
      director: world.director,
      contractor: world.contractor,
      mint: world.mint,
      project: world.project,
    },
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

const buildDeterministicAnchorSeedWorld = (
  programId: PublicKey,
  finance: Keypair,
  pm: Keypair,
  director: Keypair,
  contractor: Keypair,
  mint: PublicKey,
): DemoWorld => {
  const project = deriveProjectAddress(programId, finance.publicKey, 1n);
  const pkgAddr = (id: bigint): PublicKey =>
    deriveWorkPackageAddress(programId, project, id);
  const reqAddr = (pkg: PublicKey, id: bigint): PublicKey =>
    derivePaymentRequestAddress(programId, pkg, id);
  const milestoneAddr = (pkg: PublicKey, id: bigint): PublicKey =>
    deriveMilestoneAddress(programId, pkg, id);
  const interior = pkgAddr(5n);

  return {
    finance,
    pm,
    director,
    contractor,
    mint,
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
        address: interior,
        request: null,
        milestones: [1n, 2n, 3n, 4n].map((id) => milestoneAddr(interior, id)),
        finalStatus: "noRequest",
      },
      rejectedDelta: {
        name: "Site Logistics Variation",
        address: pkgAddr(6n),
        request: reqAddr(pkgAddr(6n), 1n),
        finalStatus: "rejected",
      },
      complianceUpgrade: {
        name: "Fire & Compliance Upgrade",
        address: pkgAddr(7n),
        request: reqAddr(pkgAddr(7n), 1n),
        finalStatus: "lowApproved",
      },
    },
  };
};

const maybeSeedDemoMetadata = async (
  metadata: MetadataClient & MetadataWriter & MetadataSnapshotStore,
  world: DemoWorld,
): Promise<void> => {
  if ((await metadata.resolveProject(demoProjectRef())) !== null) return;

  const seeded = new MockMetadataClient();
  seedDemoMetadata(seeded, world);
  metadata.loadSnapshot(seeded.toSnapshot());
};

const hasSeededAnchorDemo = async (
  client: ConstruktClient,
  world: DemoWorld,
): Promise<boolean> => {
  const [project, ...packages] = await Promise.all([
    client.fetchProject(world.project),
    ...Object.values(world.packages).map((summary) =>
      client.fetchWorkPackage(summary.address),
    ),
  ]);
  const milestoneAccounts = await Promise.all(
    Object.values(world.packages).flatMap((summary) =>
      (summary.milestones ?? []).map((address) =>
        client.fetchMilestone(address),
      ),
    ),
  );
  return (
    project !== null &&
    packages.every((workPackage) => workPackage !== null) &&
    milestoneAccounts.every((milestone) => milestone !== null)
  );
};

/**
 * Build the Anchor-backed client bundle for localnet/devnet mode.
 * Demo wallets are deterministic, but package/request state must still
 * be proven by chain reads before any matching metadata is seeded.
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

  const seedWorld = buildDeterministicAnchorSeedWorld(
    CONSTRUKT_PROGRAM_ID,
    finance,
    pm,
    director,
    contractor,
    mintKp.publicKey,
  );

  const metadataStorage = browserLocalStorage();
  const metadata = metadataStorage
    ? new LocalStorageMetadataClient(metadataStorage)
    : new MockMetadataClient();
  if (await hasSeededAnchorDemo(client, seedWorld)) {
    await maybeSeedDemoMetadata(metadata, seedWorld);
  }

  return {
    client,
    metadata,
    metadataWriter: metadata,
    world: {
      finance: seedWorld.finance,
      pm: seedWorld.pm,
      director: seedWorld.director,
      contractor: seedWorld.contractor,
      mint: seedWorld.mint,
      project: seedWorld.project,
    },
  };
};

/**
 * Map a demo role to the seeded demo wallet that would sign for it on
 * chain. This is a demo convenience; production wallet connection may not
 * match the visible role, which is the whole reason "role visibility is
 * not authorization."
 */
export const walletForRole = (
  world: Pick<AppWorld, "finance" | "pm" | "director" | "contractor">,
  role: DemoRole,
): PublicKey => {
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
