import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import { MockConstruktClient } from "./mockClient";
import {
  deriveProjectAddress,
  deriveRoleAssignmentAddress,
  deriveWorkPackageAddress,
  derivePaymentRequestAddress,
  ROLE_BYTES,
} from "./pda";

const PROGRAM_ID = new PublicKey(
  "34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL",
);
const PROJECT_BUDGET = 2_000_000n;

const newClient = () =>
  new MockConstruktClient({
    programId: PROGRAM_ID,
    clock: () => 1_000_000n,
  });

const wallets = () => ({
  finance: Keypair.generate().publicKey,
  contractor: Keypair.generate().publicKey,
  pm: Keypair.generate().publicKey,
  director: Keypair.generate().publicKey,
  mint: Keypair.generate().publicKey,
  outsider: Keypair.generate().publicKey,
});

const seedFundedPackage = async () => {
  const client = newClient();
  const w = wallets();
  const projectId = 1n;
  const packageId = 1n;
  const project = deriveProjectAddress(PROGRAM_ID, w.finance, projectId);
  const workPackage = deriveWorkPackageAddress(PROGRAM_ID, project, packageId);

  await client.initializeProject({
    authority: w.finance,
    projectId,
    mint: w.mint,
    budgetAmount: PROJECT_BUDGET,
    name: "Demo Hospital Fit-Out",
    metadataRef: "ipfs://project-metadata",
  });
  await client.createWorkPackage({
    authority: w.finance,
    project,
    packageId,
    capAmount: 1_000_000n,
    contractor: w.contractor,
    mint: w.mint,
    scopeRef: "ipfs://scope",
  });
  await client.fundEscrow({
    authority: w.finance,
    project,
    workPackage,
    amount: 600_000n,
  });
  await client.assignRole({
    authority: w.finance,
    project,
    workPackage,
    role: "contractor",
    wallet: w.contractor,
  });
  await client.assignRole({
    authority: w.finance,
    project,
    workPackage,
    role: "lowApprover",
    wallet: w.pm,
  });
  await client.assignRole({
    authority: w.finance,
    project,
    workPackage,
    role: "highApprover",
    wallet: w.director,
  });
  return { client, w, project, workPackage, projectId, packageId };
};

describe("MockConstruktClient happy path", () => {
  it("walks submit → low approve → high approve → release", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    const requestId = 1n;
    const paymentRequest = derivePaymentRequestAddress(
      PROGRAM_ID,
      workPackage,
      requestId,
    );

    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId,
      amount: 400_000n,
      documentRef: "ipfs://invoice-1",
    });
    await client.approveRequest({
      approver: w.pm,
      project,
      workPackage,
      paymentRequest,
      role: "lowApprover",
      noteRef: "looks good",
    });
    await client.approveRequest({
      approver: w.director,
      project,
      workPackage,
      paymentRequest,
      role: "highApprover",
      noteRef: "approved",
    });
    await client.releasePayment({
      authority: w.finance,
      project,
      workPackage,
      paymentRequest,
      contractorTokenAccount: Keypair.generate().publicKey,
    });

    const wp = await client.fetchWorkPackage(workPackage);
    const pr = await client.fetchPaymentRequest(paymentRequest);
    const approvals = await client.fetchApprovalsForRequest(paymentRequest);
    expect(pr?.status).toBe("released");
    expect(pr?.releasedAmount).toBe(400_000n);
    expect(wp?.releasedAmount).toBe(400_000n);
    expect(wp?.hasActiveRequest).toBe(false);
    expect(approvals.map((a) => a.account.role).sort()).toEqual([
      "highApprover",
      "lowApprover",
    ]);
  });

  it("returns synthetic but unique signatures", async () => {
    const { client } = await seedFundedPackage();
    const sigs = new Set<string>();
    const projectId = 99n;
    const project = deriveProjectAddress(
      PROGRAM_ID,
      Keypair.generate().publicKey,
      projectId,
    );
    expect(project).toBeInstanceOf(PublicKey);
    for (let i = 2; i <= 4; i++) {
      const tx = await client.initializeProject({
        authority: Keypair.generate().publicKey,
        projectId: BigInt(i),
        mint: Keypair.generate().publicKey,
        budgetAmount: PROJECT_BUDGET,
        name: `p${i}`,
        metadataRef: "x",
      });
      sigs.add(tx.signature);
    }
    expect(sigs.size).toBe(3);
  });
});

describe("MockConstruktClient invariants", () => {
  it("rejects createWorkPackage from a non-authority", async () => {
    const client = newClient();
    const w = wallets();
    await client.initializeProject({
      authority: w.finance,
      projectId: 1n,
      mint: w.mint,
      budgetAmount: PROJECT_BUDGET,
      name: "p",
      metadataRef: "x",
    });
    const project = deriveProjectAddress(PROGRAM_ID, w.finance, 1n);
    await expect(
      client.createWorkPackage({
        authority: w.outsider,
        project,
        packageId: 1n,
        capAmount: 100n,
        contractor: w.contractor,
        mint: w.mint,
        scopeRef: "x",
      }),
    ).rejects.toMatchObject({ code: "Unauthorized" });
  });

  it("rejects createWorkPackage when package mint differs from project mint", async () => {
    const client = newClient();
    const w = wallets();
    await client.initializeProject({
      authority: w.finance,
      projectId: 1n,
      mint: w.mint,
      budgetAmount: PROJECT_BUDGET,
      name: "p",
      metadataRef: "x",
    });
    const project = deriveProjectAddress(PROGRAM_ID, w.finance, 1n);
    await expect(
      client.createWorkPackage({
        authority: w.finance,
        project,
        packageId: 1n,
        capAmount: 100n,
        contractor: w.contractor,
        mint: Keypair.generate().publicKey,
        scopeRef: "x",
      }),
    ).rejects.toMatchObject({ code: "WrongMint" });
  });

  it("rejects createWorkPackage when cap exceeds project remaining budget", async () => {
    const client = newClient();
    const w = wallets();
    await client.initializeProject({
      authority: w.finance,
      projectId: 1n,
      mint: w.mint,
      budgetAmount: 150n,
      name: "p",
      metadataRef: "x",
    });
    const project = deriveProjectAddress(PROGRAM_ID, w.finance, 1n);

    await client.createWorkPackage({
      authority: w.finance,
      project,
      packageId: 1n,
      capAmount: 100n,
      contractor: w.contractor,
      mint: w.mint,
      scopeRef: "x",
    });

    await expect(
      client.createWorkPackage({
        authority: w.finance,
        project,
        packageId: 2n,
        capAmount: 100n,
        contractor: w.contractor,
        mint: w.mint,
        scopeRef: "x",
      }),
    ).rejects.toMatchObject({ code: "InsufficientRemainingCap" });
  });

  it("matches on-chain createWorkPackage error precedence for overlapping validation failures", async () => {
    const client = newClient();
    const w = wallets();
    await client.initializeProject({
      authority: w.finance,
      projectId: 1n,
      mint: w.mint,
      budgetAmount: 150n,
      name: "p",
      metadataRef: "x",
    });
    const project = deriveProjectAddress(PROGRAM_ID, w.finance, 1n);

    await expect(
      client.createWorkPackage({
        authority: w.finance,
        project,
        packageId: 1n,
        capAmount: 200n,
        contractor: PublicKey.default,
        mint: w.mint,
        scopeRef: "x",
      }),
    ).rejects.toMatchObject({ code: "InvalidAccountRelationship" });

    await expect(
      client.createWorkPackage({
        authority: w.finance,
        project,
        packageId: 2n,
        capAmount: 200n,
        contractor: w.contractor,
        mint: w.mint,
        scopeRef: "x".repeat(129),
      }),
    ).rejects.toMatchObject({ code: "StringTooLong" });

    await expect(
      client.createWorkPackage({
        authority: w.finance,
        project,
        packageId: 3n,
        capAmount: 200n,
        contractor: w.contractor,
        mint: Keypair.generate().publicKey,
        scopeRef: "x".repeat(129),
      }),
    ).rejects.toMatchObject({ code: "WrongMint" });

    // cap=0 + wrongMint: on chain, the mint constraint is at the account
    // validation phase and fires before the body's cap > 0 check. The mock
    // must report WrongMint here, not InvalidAmount.
    await expect(
      client.createWorkPackage({
        authority: w.finance,
        project,
        packageId: 4n,
        capAmount: 0n,
        contractor: w.contractor,
        mint: Keypair.generate().publicKey,
        scopeRef: "x",
      }),
    ).rejects.toMatchObject({ code: "WrongMint" });
  });

  it("rejects a second active request before the first is closed", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 1n,
      amount: 100_000n,
      documentRef: "ipfs://invoice-1",
    });
    await expect(
      client.submitPaymentRequest({
        contractor: w.contractor,
        project,
        workPackage,
        requestId: 2n,
        amount: 100_000n,
        documentRef: "ipfs://invoice-2",
      }),
    ).rejects.toMatchObject({ code: "ActiveRequestExists" });
  });

  it("blocks high approval before low approval", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 1n,
      amount: 100_000n,
      documentRef: "ipfs://invoice-1",
    });
    const paymentRequest = derivePaymentRequestAddress(
      PROGRAM_ID,
      workPackage,
      1n,
    );
    await expect(
      client.approveRequest({
        approver: w.director,
        project,
        workPackage,
        paymentRequest,
        role: "highApprover",
        noteRef: "",
      }),
    ).rejects.toMatchObject({ code: "InvalidApprovalOrder" });
  });

  it("blocks the contractor from approving their own request", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 1n,
      amount: 100_000n,
      documentRef: "ipfs://invoice-1",
    });
    // Manually insert a contractor-as-lowApprover assignment to bypass the
    // role assignment lookup, so the test specifically targets the
    // ContractorCannotApprove guard rather than the missing-role guard.
    await client
      .assignRole({
        authority: w.finance,
        project,
        workPackage,
        role: "lowApprover",
        wallet: w.contractor,
      })
      .catch(() => undefined);
    const paymentRequest = derivePaymentRequestAddress(
      PROGRAM_ID,
      workPackage,
      1n,
    );
    await expect(
      client.approveRequest({
        approver: w.contractor,
        project,
        workPackage,
        paymentRequest,
        role: "lowApprover",
        noteRef: "",
      }),
    ).rejects.toMatchObject({ code: "ContractorCannotApprove" });
  });

  it("hold blocks approval and release; remove hold restores them", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 1n,
      amount: 100_000n,
      documentRef: "ipfs://invoice-1",
    });
    const paymentRequest = derivePaymentRequestAddress(
      PROGRAM_ID,
      workPackage,
      1n,
    );
    await client.placeHold({
      authority: w.finance,
      project,
      workPackage,
      paymentRequest,
      holdRef: "ipfs://hold",
    });
    await expect(
      client.approveRequest({
        approver: w.pm,
        project,
        workPackage,
        paymentRequest,
        role: "lowApprover",
        noteRef: "",
      }),
    ).rejects.toMatchObject({ code: "RequestOnHold" });
    await client.removeHold({
      authority: w.finance,
      project,
      workPackage,
      paymentRequest,
    });
    // Now approval works.
    await expect(
      client.approveRequest({
        approver: w.pm,
        project,
        workPackage,
        paymentRequest,
        role: "lowApprover",
        noteRef: "",
      }),
    ).resolves.toMatchObject({ signature: expect.any(String) });
  });

  it("release after PM approval succeeds without high approval", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 1n,
      amount: 100_000n,
      documentRef: "ipfs://invoice-1",
    });
    const paymentRequest = derivePaymentRequestAddress(
      PROGRAM_ID,
      workPackage,
      1n,
    );
    await client.approveRequest({
      approver: w.pm,
      project,
      workPackage,
      paymentRequest,
      role: "lowApprover",
      noteRef: "",
    });
    await expect(
      client.releasePayment({
        authority: w.finance,
        project,
        workPackage,
        paymentRequest,
        contractorTokenAccount: Keypair.generate().publicKey,
      }),
    ).resolves.toMatchObject({ signature: expect.any(String) });
  });

  it("rejecting clears the active request slot so a new request can be submitted", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 1n,
      amount: 100_000n,
      documentRef: "ipfs://invoice-1",
    });
    const firstRequest = derivePaymentRequestAddress(
      PROGRAM_ID,
      workPackage,
      1n,
    );
    await client.rejectRequest({
      approver: w.pm,
      project,
      workPackage,
      paymentRequest: firstRequest,
      role: "lowApprover",
      noteRef: "missing data",
    });

    const wp = await client.fetchWorkPackage(workPackage);
    expect(wp?.hasActiveRequest).toBe(false);

    await expect(
      client.submitPaymentRequest({
        contractor: w.contractor,
        project,
        workPackage,
        requestId: 2n,
        amount: 100_000n,
        documentRef: "ipfs://invoice-2",
      }),
    ).resolves.toMatchObject({ signature: expect.any(String) });
  });

  it("blocks approver-role-conflict: same wallet for low+high on same package", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    await expect(
      client.assignRole({
        authority: w.finance,
        project,
        workPackage,
        role: "highApprover",
        wallet: w.pm, // already lowApprover
      }),
    ).rejects.toMatchObject({ code: "ApproverRoleConflict" });
  });
});

describe("MockConstruktClient reads", () => {
  it("filters projects by authority", async () => {
    const client = newClient();
    const a = Keypair.generate().publicKey;
    const b = Keypair.generate().publicKey;
    await client.initializeProject({
      authority: a,
      projectId: 1n,
      mint: Keypair.generate().publicKey,
      budgetAmount: PROJECT_BUDGET,
      name: "A",
      metadataRef: "x",
    });
    await client.initializeProject({
      authority: b,
      projectId: 1n,
      mint: Keypair.generate().publicKey,
      budgetAmount: PROJECT_BUDGET,
      name: "B",
      metadataRef: "x",
    });
    const aProjects = await client.fetchProjects({ authority: a });
    expect(aProjects).toHaveLength(1);
    expect(aProjects[0]?.account.name).toBe("A");
  });

  it("fetchRoleAssignmentsForPackage groups by package", async () => {
    const { client, workPackage } = await seedFundedPackage();
    const roles = await client.fetchRoleAssignmentsForPackage(workPackage);
    const byRole = roles.map((r) => r.account.role).sort();
    expect(byRole).toEqual(["contractor", "highApprover", "lowApprover"]);
  });

  it("returns null for unknown account addresses", async () => {
    const client = newClient();
    const ghost = Keypair.generate().publicKey;
    expect(await client.fetchProject(ghost)).toBeNull();
    expect(await client.fetchWorkPackage(ghost)).toBeNull();
    expect(await client.fetchPaymentRequest(ghost)).toBeNull();
    expect(await client.fetchRoleAssignment(ghost)).toBeNull();
    expect(await client.fetchApprovalRecord(ghost)).toBeNull();
  });
});

describe("MockConstruktClient — pda derivation matches submitPaymentRequest output", () => {
  it("paymentRequest is keyed under derivePaymentRequestAddress", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 1n,
      amount: 100_000n,
      documentRef: "ipfs://invoice-1",
    });
    const expected = derivePaymentRequestAddress(PROGRAM_ID, workPackage, 1n);
    const fetched = await client.fetchPaymentRequest(expected);
    expect(fetched?.requestId).toBe(1n);

    const roleAddress = deriveRoleAssignmentAddress(
      PROGRAM_ID,
      workPackage,
      ROLE_BYTES.contractor,
      w.contractor,
    );
    const role = await client.fetchRoleAssignment(roleAddress);
    expect(role?.role).toBe("contractor");
    expect(role?.active).toBe(true);
  });
});
