import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  documentMetadataRef,
  holdMetadataRef,
  nextDocumentVersion,
  nextPaymentRequestId,
  nextProjectId,
  nextWorkPackageId,
  noteMetadataRef,
  packageScopeMetadataRef,
  projectMetadataRef,
  variationRequestMetadataRef,
} from "./ids";
import type {
  Fetched,
  PaymentRequestAccount,
  ProjectAccount,
  WorkPackageAccount,
} from "./program";

const key = new PublicKey("11111111111111111111111111111111");

const project = (id: bigint): Fetched<ProjectAccount> => ({
  address: key,
  account: { projectId: id } as ProjectAccount,
});

const workPackage = (id: bigint): Fetched<WorkPackageAccount> => ({
  address: key,
  account: { packageId: id, requestCounter: 0n } as WorkPackageAccount,
});

const request = (id: bigint): Fetched<PaymentRequestAccount> => ({
  address: key,
  account: { requestId: id } as PaymentRequestAccount,
});

describe("next ids", () => {
  it("starts project and package ids at 1", () => {
    expect(nextProjectId([])).toBe(1n);
    expect(nextWorkPackageId([])).toBe(1n);
  });

  it("uses max existing ids rather than list length", () => {
    expect(nextProjectId([project(1n), project(7n), project(3n)])).toBe(8n);
    expect(nextWorkPackageId([workPackage(2n), workPackage(9n)])).toBe(10n);
  });

  it("uses the largest known request counter/request id", () => {
    const pkg = {
      requestCounter: 3n,
    } as WorkPackageAccount;
    expect(nextPaymentRequestId(pkg, [request(2n), request(8n)])).toBe(9n);
  });

  it("uses the package counter when it is ahead of fetched request ids", () => {
    const pkg = {
      requestCounter: 10n,
    } as WorkPackageAccount;
    expect(nextPaymentRequestId(pkg, [request(2n), request(8n)])).toBe(11n);
  });
});

describe("metadata refs", () => {
  it("builds deterministic refs from stable account ids", () => {
    expect(projectMetadataRef(key, 3n)).toBe(
      `metadata://demo/project/${key.toBase58()}/3`,
    );
    expect(packageScopeMetadataRef(key, 4n)).toContain("/4");
    expect(documentMetadataRef(key, 5n, 2)).toContain("/5/v2");
    expect(
      noteMetadataRef(
        key,
        "projectManager",
        "approve",
        "2026-05-07T12:34:56.000Z",
      ),
    ).toContain("/projectManager/approve/2026-05-07T12-34-56-000Z");
    expect(holdMetadataRef(key, "2026-05-07T12:34:56.000Z")).toContain(
      "metadata://demo/hold/",
    );
    expect(
      variationRequestMetadataRef(key, "2026-05-07T12:34:56.000Z"),
    ).toContain("/variation/");
  });
});

describe("document versions", () => {
  it("increments the explicit metadata version when present", () => {
    expect(nextDocumentVersion("metadata://demo/document/x/1/v1", 2)).toBe(3);
  });

  it("falls back to the ref suffix when metadata is missing", () => {
    expect(nextDocumentVersion("metadata://demo/document/x/1/v4")).toBe(5);
  });

  it("still bumps when the current ref is not in the versioned demo shape", () => {
    expect(nextDocumentVersion("external://invoice.pdf")).toBe(2);
  });

  it("starts at version 1 when no current ref exists", () => {
    expect(nextDocumentVersion("", null)).toBe(1);
    expect(nextDocumentVersion(undefined, undefined)).toBe(1);
  });
});
