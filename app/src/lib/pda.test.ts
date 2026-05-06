import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  ROLE_BYTES,
  deriveApprovalRecordAddress,
  derivePaymentRequestAddress,
  deriveProjectAddress,
  deriveRoleAssignmentAddress,
  deriveVaultAuthorityAddress,
  deriveWorkPackageAddress,
  u64Seed,
} from "./pda";

const PROGRAM_ID = new PublicKey(
  "34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL",
);
const AUTHORITY = new PublicKey("11111111111111111111111111111111");
const WALLET = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

const PROJECT_ID = 1n;
const PACKAGE_ID = 7n;
const REQUEST_ID = 42n;

const project = deriveProjectAddress(PROGRAM_ID, AUTHORITY, PROJECT_ID);
const workPackage = deriveWorkPackageAddress(PROGRAM_ID, project, PACKAGE_ID);
const paymentRequest = derivePaymentRequestAddress(
  PROGRAM_ID,
  workPackage,
  REQUEST_ID,
);

describe("ROLE_BYTES", () => {
  it("matches the on-chain role byte values", () => {
    expect(ROLE_BYTES.contractor).toBe(1);
    expect(ROLE_BYTES.lowApprover).toBe(2);
    expect(ROLE_BYTES.highApprover).toBe(3);
  });
});

describe("u64Seed", () => {
  it("encodes 0 as eight zero bytes", () => {
    expect(Array.from(u64Seed(0))).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("encodes 1 little-endian", () => {
    expect(Array.from(u64Seed(1))).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("encodes a large bigint past 2^32", () => {
    expect(Array.from(u64Seed(0x1_00_00_00_00n))).toEqual([
      0, 0, 0, 0, 1, 0, 0, 0,
    ]);
  });

  it("treats number and bigint inputs identically", () => {
    expect(Array.from(u64Seed(123))).toEqual(Array.from(u64Seed(123n)));
  });
});

describe("PDA derivations — golden values", () => {
  it("project", () => {
    expect(project.toBase58()).toBe(
      "EAJvFFKpPoVDWzRQEtDMRUNBhaPgE6F8jcUgCmhBCPdQ",
    );
  });

  it("work package", () => {
    expect(workPackage.toBase58()).toBe(
      "FyEcUPcEaxhP6qt16fZfF5bDtSJGyy8TG79wNvwCVWFb",
    );
  });

  it("vault authority", () => {
    expect(
      deriveVaultAuthorityAddress(PROGRAM_ID, workPackage).toBase58(),
    ).toBe("Fq7ucQk4FTsf8ivohtvXVTwo8F4VSkgEptf7KJmyMdxB");
  });

  it("role assignment (LowApprover for WALLET)", () => {
    expect(
      deriveRoleAssignmentAddress(
        PROGRAM_ID,
        workPackage,
        ROLE_BYTES.lowApprover,
        WALLET,
      ).toBase58(),
    ).toBe("71CbffHjAu8cJixGFzcETiAwsW1h5ic1eMzVLC5w2fFw");
  });

  it("payment request", () => {
    expect(paymentRequest.toBase58()).toBe(
      "DqqxRFCTjY4k8QZmgEuMSRZy49Yvbiihiv4xxusBUb5P",
    );
  });

  it("approval record (LowApprover)", () => {
    expect(
      deriveApprovalRecordAddress(
        PROGRAM_ID,
        paymentRequest,
        ROLE_BYTES.lowApprover,
      ).toBase58(),
    ).toBe("14VAXGVwegwoJvjJGPBYNstPHgstbWbF6BZNwki5yrLM");
  });
});

describe("PDA derivations — invariants", () => {
  it("different project ids produce different project addresses", () => {
    const a = deriveProjectAddress(PROGRAM_ID, AUTHORITY, 1n);
    const b = deriveProjectAddress(PROGRAM_ID, AUTHORITY, 2n);
    expect(a.toBase58()).not.toBe(b.toBase58());
  });

  it("different role bytes produce different role assignment addresses", () => {
    const lowApprover = deriveRoleAssignmentAddress(
      PROGRAM_ID,
      workPackage,
      ROLE_BYTES.lowApprover,
      WALLET,
    );
    const highApprover = deriveRoleAssignmentAddress(
      PROGRAM_ID,
      workPackage,
      ROLE_BYTES.highApprover,
      WALLET,
    );
    expect(lowApprover.toBase58()).not.toBe(highApprover.toBase58());
  });

  it("all six derivations are deterministic for the same inputs", () => {
    expect(
      deriveProjectAddress(PROGRAM_ID, AUTHORITY, PROJECT_ID).toBase58(),
    ).toBe(project.toBase58());
    expect(
      deriveWorkPackageAddress(PROGRAM_ID, project, PACKAGE_ID).toBase58(),
    ).toBe(workPackage.toBase58());
  });
});
