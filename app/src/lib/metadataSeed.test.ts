import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { MockConstruktClient } from "./mockClient";
import { MockMetadataClient } from "./metadataClient";
import { seedHospitalFitOut } from "./mockSeed";
import {
  demoDocumentRef,
  demoDocumentRequestRef,
  demoHoldRef,
  demoNoteRef,
  demoPackageScopeRef,
  demoProjectRef,
  seedDemoMetadata,
} from "./metadataSeed";

const PROGRAM_ID = new PublicKey("cTkcdfaMNy3LbZVtaX4j4RwFrE91j34gRZQ5CHTKCb4");

const seedBoth = async () => {
  const onchain = new MockConstruktClient({
    programId: PROGRAM_ID,
    clock: () => 1_700_000_000n,
  });
  const world = await seedHospitalFitOut(onchain, { programId: PROGRAM_ID });
  const metadata = new MockMetadataClient();
  seedDemoMetadata(metadata, world);
  return { onchain, world, metadata };
};

describe("seedDemoMetadata — project metadata", () => {
  it("populates the project with the Northstar narrative and full team", async () => {
    const { metadata, world } = await seedBoth();
    const project = await metadata.resolveProject(demoProjectRef());
    expect(project).not.toBeNull();
    expect(project!.client).toBe("Northstar Health Trust");
    expect(project!.team).toHaveLength(4);
    const wallets = project!.team.map((t) => t.wallet);
    expect(wallets).toContain(world.finance.publicKey.toBase58());
    expect(wallets).toContain(world.pm.publicKey.toBase58());
    expect(wallets).toContain(world.director.publicKey.toBase58());
    expect(wallets).toContain(world.contractor.publicKey.toBase58());
  });
});

describe("seedDemoMetadata — package scope", () => {
  it("populates scope metadata for every package in the world", async () => {
    const { metadata, world } = await seedBoth();
    for (const summary of Object.values(world.packages)) {
      const scope = await metadata.resolvePackageScope(
        demoPackageScopeRef(summary.name),
      );
      expect(scope).not.toBeNull();
      expect(scope!.contractorDisplayName).toBe("Daniel Okafor");
      expect(["milestone", "valuation", "bespoke"]).toContain(
        scope!.contractModel,
      );
    }
  });

  it("populates the interior package with display milestones", async () => {
    const { metadata, world } = await seedBoth();
    const scope = await metadata.resolvePackageScope(
      demoPackageScopeRef(world.packages.interior.name),
    );
    expect(scope?.contractModel).toBe("milestone");
    expect(scope?.internalMilestones).toHaveLength(4);
    expect(scope?.internalMilestones?.[0].amount).toBe(50_000_000n);
  });
});

describe("seedDemoMetadata — documents", () => {
  it("creates a document for every package that has a payment request", async () => {
    const { metadata, world } = await seedBoth();
    const summaries = Object.values(world.packages);
    const expectedDocs = summaries.filter((s) => s.request !== null);
    const noDoc = summaries.filter((s) => s.request === null);

    for (const summary of expectedDocs) {
      const doc = await metadata.resolveDocument(
        demoDocumentRef(summary.name, 1),
      );
      expect(doc).not.toBeNull();
      expect(doc!.documentType).toBe("invoice");
      expect(doc!.uploaderRole).toBe("contractor");
    }
    for (const summary of noDoc) {
      const doc = await metadata.resolveDocument(
        demoDocumentRef(summary.name, 1),
      );
      expect(doc).toBeNull();
    }
  });
});

describe("seedDemoMetadata — notes", () => {
  it("provides PM and optional high-approval notes for the released foundation request", async () => {
    const { metadata, world } = await seedBoth();
    const pmNote = await metadata.resolveNote(
      demoNoteRef(world.packages.foundation.name, "pm-approve"),
    );
    const dirNote = await metadata.resolveNote(
      demoNoteRef(world.packages.foundation.name, "director-approve"),
    );
    expect(pmNote?.authorRole).toBe("projectManager");
    expect(dirNote?.authorRole).toBe("director");
  });

  it("provides a PM rejection note for the rejected delta package", async () => {
    const { metadata, world } = await seedBoth();
    const note = await metadata.resolveNote(
      demoNoteRef(world.packages.rejectedDelta.name, "pm-reject"),
    );
    expect(note).not.toBeNull();
    expect(note!.text).toMatch(/re-price/i);
  });
});

describe("seedDemoMetadata — holds", () => {
  it("provides a finance-authored hold note for the held facade package", async () => {
    const { metadata, world } = await seedBoth();
    const hold = await metadata.resolveHold(
      demoHoldRef(world.packages.facade.name),
    );
    expect(hold).not.toBeNull();
    expect(hold!.authorRole).toBe("financeDirector");
    expect(hold!.reason).toMatch(/structural/i);
  });
});

describe("seedDemoMetadata - document requests", () => {
  it("creates an outstanding evidence request for the held facade package", async () => {
    const { metadata, world } = await seedBoth();
    const [ref, request] = (
      await metadata.listDocumentRequestsForPackage(
        world.packages.facade.address.toBase58(),
      )
    )[0];
    expect(ref).toBe(demoDocumentRequestRef(world.packages.facade.name));
    expect(request.status).toBe("requested");
    expect(request.paymentRequest).toBe(
      world.packages.facade.request!.toBase58(),
    );
    expect(request.note).toMatch(/inspector report/i);
  });
});

describe("seedDemoMetadata — ref/world consistency", () => {
  it("every on-chain payment request's documentRef resolves through metadata", async () => {
    const { onchain, metadata, world } = await seedBoth();
    const summaries = Object.values(world.packages).filter(
      (s) => s.request !== null,
    );
    for (const summary of summaries) {
      const request = await onchain.fetchPaymentRequest(summary.request!);
      const doc = await metadata.resolveDocument(request!.documentRef);
      expect(doc).not.toBeNull();
    }
  });

  it("the held facade request's holdRef resolves through metadata", async () => {
    const { onchain, metadata, world } = await seedBoth();
    const request = await onchain.fetchPaymentRequest(
      world.packages.facade.request!,
    );
    expect(request!.holdActive).toBe(true);
    const hold = await metadata.resolveHold(request!.holdRef);
    expect(hold).not.toBeNull();
  });
});
