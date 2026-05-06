import { describe, expect, it } from "vitest";
import { MockMetadataClient } from "./metadataClient";
import type {
  DocumentMetadata,
  HoldMetadata,
  NoteMetadata,
  PackageScopeMetadata,
  ProjectMetadata,
} from "./metadataClient";

const sampleProject: ProjectMetadata = {
  client: "Northstar Health Trust",
  contractModel: "referenceOnly",
  startDate: "2026-03-01",
  endDate: "2027-09-01",
  description: "Pediatric wing fit-out.",
  team: [
    {
      wallet: "11111111111111111111111111111111",
      displayName: "Maya Shah",
      org: "Northstar Capital",
      role: "financeDirector",
    },
  ],
};

const samplePackage: PackageScopeMetadata = {
  description: "Foundation pour, bay A only.",
  contractorDisplayName: "Daniel Okafor",
  contractorOrg: "Okafor Builders Ltd",
  contractModel: "milestone",
};

const sampleDocument: DocumentMetadata = {
  filename: "foundation-invoice-v1.pdf",
  version: 1,
  uploaderDisplayName: "Daniel Okafor",
  uploaderRole: "contractor",
  uploadedAt: "2026-04-12T10:30:00Z",
  documentType: "invoice",
};

const sampleNote: NoteMetadata = {
  text: "Approved subject to retention release schedule.",
  authorDisplayName: "Eleanor Lane",
  authorRole: "projectManager",
  authoredAt: "2026-04-13T09:00:00Z",
};

const sampleHold: HoldMetadata = {
  reason: "Awaiting structural sign-off from independent inspector.",
  authorDisplayName: "Maya Shah",
  authorRole: "financeDirector",
  authoredAt: "2026-04-15T14:20:00Z",
};

describe("MockMetadataClient — null on miss", () => {
  it("returns null for refs that have not been written", async () => {
    const client = new MockMetadataClient();
    expect(await client.resolveProject("missing")).toBeNull();
    expect(await client.resolvePackageScope("missing")).toBeNull();
    expect(await client.resolveDocument("missing")).toBeNull();
    expect(await client.resolveNote("missing")).toBeNull();
    expect(await client.resolveHold("missing")).toBeNull();
  });
});

describe("MockMetadataClient — round trips", () => {
  it("stores and retrieves project metadata", async () => {
    const client = new MockMetadataClient();
    client.putProject("p1", sampleProject);
    expect(await client.resolveProject("p1")).toEqual(sampleProject);
  });

  it("stores and retrieves package scope metadata", async () => {
    const client = new MockMetadataClient();
    client.putPackageScope("pkg1", samplePackage);
    expect(await client.resolvePackageScope("pkg1")).toEqual(samplePackage);
  });

  it("stores and retrieves document metadata", async () => {
    const client = new MockMetadataClient();
    client.putDocument("doc1", sampleDocument);
    expect(await client.resolveDocument("doc1")).toEqual(sampleDocument);
  });

  it("stores and retrieves note metadata", async () => {
    const client = new MockMetadataClient();
    client.putNote("note1", sampleNote);
    expect(await client.resolveNote("note1")).toEqual(sampleNote);
  });

  it("stores and retrieves hold metadata", async () => {
    const client = new MockMetadataClient();
    client.putHold("hold1", sampleHold);
    expect(await client.resolveHold("hold1")).toEqual(sampleHold);
  });
});

describe("MockMetadataClient — isolation", () => {
  it("clones on read so callers cannot mutate stored data", async () => {
    const client = new MockMetadataClient();
    client.putProject("p1", sampleProject);
    const first = (await client.resolveProject("p1"))!;
    first.client = "TAMPERED";
    first.team[0].displayName = "TAMPERED";
    const second = (await client.resolveProject("p1"))!;
    expect(second.client).toBe("Northstar Health Trust");
    expect(second.team[0].displayName).toBe("Maya Shah");
  });

  it("clones on write so caller mutations after put don't leak through", async () => {
    const client = new MockMetadataClient();
    const draft: ProjectMetadata = {
      ...sampleProject,
      team: [...sampleProject.team],
    };
    client.putProject("p1", draft);
    draft.client = "TAMPERED";
    draft.team[0] = { ...draft.team[0], displayName: "TAMPERED" };
    const stored = (await client.resolveProject("p1"))!;
    expect(stored.client).toBe("Northstar Health Trust");
    expect(stored.team[0].displayName).toBe("Maya Shah");
  });
});
