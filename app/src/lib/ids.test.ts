import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  documentMetadataRef,
  holdMetadataRef,
  nextPaymentRequestId,
  nextProjectId,
  nextWorkPackageId,
  noteMetadataRef,
  packageScopeMetadataRef,
  projectMetadataRef,
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
});

describe("metadata refs", () => {
  it("builds deterministic refs from stable account ids", () => {
    expect(projectMetadataRef(3n)).toBe("metadata://demo/project/3");
    expect(packageScopeMetadataRef(key, 4n)).toContain("/4");
    expect(documentMetadataRef(key, 5n, 2)).toContain("/5/v2");
    expect(noteMetadataRef(key, "projectManager", "approve")).toContain(
      "/projectManager/approve",
    );
    expect(holdMetadataRef(key)).toContain("metadata://demo/hold/");
  });
});
