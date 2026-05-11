import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import { MockConstruktClient } from "./mockClient";
import {
  deriveMilestoneAddress,
  deriveProjectAddress,
  deriveRoleAssignmentAddress,
  deriveWorkPackageAddress,
  derivePaymentRequestAddress,
  ROLE_BYTES,
} from "./pda";

const PROGRAM_ID = new PublicKey("cTkcdfaMNy3LbZVtaX4j4RwFrE91j34gRZQ5CHTKCb4");
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

const seedFundedPackage = async (
  options: { highApprovalRequired?: boolean } = {},
) => {
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
    highApprovalRequired: options.highApprovalRequired,
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

const seedMilestonePackage = async (
  options: { highApprovalRequired?: boolean } = {},
) => {
  const client = newClient();
  const w = wallets();
  const projectId = 7n;
  const packageId = 9n;
  const project = deriveProjectAddress(PROGRAM_ID, w.finance, projectId);
  const workPackage = deriveWorkPackageAddress(PROGRAM_ID, project, packageId);
  const milestoneOne = deriveMilestoneAddress(PROGRAM_ID, workPackage, 1n);
  const milestoneTwo = deriveMilestoneAddress(PROGRAM_ID, workPackage, 2n);

  await client.initializeProject({
    authority: w.finance,
    projectId,
    mint: w.mint,
    budgetAmount: PROJECT_BUDGET,
    name: "Milestone project",
    metadataRef: "ipfs://project-metadata",
  });
  await client.createWorkPackage({
    authority: w.finance,
    project,
    packageId,
    capAmount: 300_000n,
    contractor: w.contractor,
    mint: w.mint,
    scopeRef: "ipfs://milestone-scope",
    highApprovalRequired: options.highApprovalRequired,
  });
  await client.createMilestone({
    authority: w.finance,
    project,
    workPackage,
    milestoneId: 1n,
    amount: 100_000n,
    startAt: 1_700_000_000n,
    endAt: 1_700_086_400n,
    metadataRef: "ipfs://milestone-1",
  });
  await client.createMilestone({
    authority: w.finance,
    project,
    workPackage,
    milestoneId: 2n,
    amount: 200_000n,
    startAt: 1_700_086_401n,
    endAt: 1_700_172_800n,
    metadataRef: "ipfs://milestone-2",
  });
  await client.fundEscrow({
    authority: w.finance,
    project,
    workPackage,
    amount: 300_000n,
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

  return {
    client,
    w,
    project,
    workPackage,
    milestoneOne,
    milestoneTwo,
  };
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

  it("rejects milestone creation after escrow funding has started", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();

    await expect(
      client.createMilestone({
        authority: w.finance,
        project,
        workPackage,
        milestoneId: 1n,
        amount: 1_000_000n,
        startAt: 1_700_000_000n,
        endAt: 1_700_086_400n,
        metadataRef: "ipfs://too-late",
      }),
    ).rejects.toMatchObject({ code: "InvalidStatus" });
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

  it("switches milestone packages into milestone-only request mode and tracks parallel milestone requests", async () => {
    const { client, w, project, workPackage, milestoneOne, milestoneTwo } =
      await seedMilestonePackage();
    const requestOne = derivePaymentRequestAddress(PROGRAM_ID, workPackage, 1n);
    const requestTwo = derivePaymentRequestAddress(PROGRAM_ID, workPackage, 2n);

    await expect(
      client.submitPaymentRequest({
        contractor: w.contractor,
        project,
        workPackage,
        requestId: 1n,
        amount: 50_000n,
        documentRef: "ipfs://package-level-on-milestone-package",
      }),
    ).rejects.toMatchObject({ code: "InvalidStatus" });

    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 1n,
      milestone: milestoneOne,
      amount: 100_000n,
      documentRef: "ipfs://milestone-request-1",
    });

    await expect(
      client.submitPaymentRequest({
        contractor: w.contractor,
        project,
        workPackage,
        requestId: 2n,
        milestone: milestoneOne,
        amount: 10_000n,
        documentRef: "ipfs://duplicate-milestone-request",
      }),
    ).rejects.toMatchObject({ code: "ActiveRequestExists" });

    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 2n,
      milestone: milestoneTwo,
      amount: 50_000n,
      documentRef: "ipfs://milestone-request-2",
    });

    const wp = await client.fetchWorkPackage(workPackage);
    const firstMilestone = await client.fetchMilestone(milestoneOne);
    const secondMilestone = await client.fetchMilestone(milestoneTwo);
    const pr1 = await client.fetchPaymentRequest(requestOne);
    const pr2 = await client.fetchPaymentRequest(requestTwo);

    expect(wp?.requestCounter).toBe(2n);
    expect(wp?.reservedRequestAmount).toBe(150_000n);
    expect(wp?.hasActiveRequest).toBe(false);
    expect(firstMilestone?.activeRequest.equals(requestOne)).toBe(true);
    expect(secondMilestone?.activeRequest.equals(requestTwo)).toBe(true);
    expect(pr1?.hasMilestone).toBe(true);
    expect(pr2?.hasMilestone).toBe(true);
  });

  it("releases milestone requests and updates milestone/package totals", async () => {
    const { client, w, project, workPackage, milestoneOne } =
      await seedMilestonePackage();
    const paymentRequest = derivePaymentRequestAddress(
      PROGRAM_ID,
      workPackage,
      1n,
    );

    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 1n,
      milestone: milestoneOne,
      amount: 100_000n,
      documentRef: "ipfs://milestone-release",
    });
    await client.approveRequest({
      approver: w.pm,
      project,
      workPackage,
      paymentRequest,
      role: "lowApprover",
      noteRef: "ready",
    });
    await client.releasePayment({
      authority: w.finance,
      project,
      workPackage,
      paymentRequest,
      contractorTokenAccount: Keypair.generate().publicKey,
    });

    const wp = await client.fetchWorkPackage(workPackage);
    const milestone = await client.fetchMilestone(milestoneOne);
    const pr = await client.fetchPaymentRequest(paymentRequest);
    expect(pr?.status).toBe("released");
    expect(pr?.releasedAmount).toBe(100_000n);
    expect(milestone?.releasedAmount).toBe(100_000n);
    expect(milestone?.status).toBe("completed");
    expect(wp?.releasedAmount).toBe(100_000n);
    expect(wp?.reservedRequestAmount).toBe(0n);
    expect(wp?.status).toBe("active");
  });

  it("marks the package complete when the final milestone is released", async () => {
    const { client, w, project, workPackage, milestoneOne, milestoneTwo } =
      await seedMilestonePackage();
    const requestOne = derivePaymentRequestAddress(PROGRAM_ID, workPackage, 1n);
    const requestTwo = derivePaymentRequestAddress(PROGRAM_ID, workPackage, 2n);

    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 1n,
      milestone: milestoneOne,
      amount: 100_000n,
      documentRef: "ipfs://milestone-release-1",
    });
    await client.approveRequest({
      approver: w.pm,
      project,
      workPackage,
      paymentRequest: requestOne,
      role: "lowApprover",
      noteRef: "ready-1",
    });
    await client.releasePayment({
      authority: w.finance,
      project,
      workPackage,
      paymentRequest: requestOne,
      contractorTokenAccount: Keypair.generate().publicKey,
    });

    await client.submitPaymentRequest({
      contractor: w.contractor,
      project,
      workPackage,
      requestId: 2n,
      milestone: milestoneTwo,
      amount: 200_000n,
      documentRef: "ipfs://milestone-release-2",
    });
    await client.approveRequest({
      approver: w.pm,
      project,
      workPackage,
      paymentRequest: requestTwo,
      role: "lowApprover",
      noteRef: "ready-2",
    });
    await client.releasePayment({
      authority: w.finance,
      project,
      workPackage,
      paymentRequest: requestTwo,
      contractorTokenAccount: Keypair.generate().publicKey,
    });

    const wp = await client.fetchWorkPackage(workPackage);
    const finalMilestone = await client.fetchMilestone(milestoneTwo);
    expect(wp?.releasedAmount).toBe(300_000n);
    expect(wp?.reservedRequestAmount).toBe(0n);
    expect(wp?.status).toBe("completed");
    expect(finalMilestone?.releasedAmount).toBe(200_000n);
    expect(finalMilestone?.status).toBe("completed");
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

describe("MockConstruktClient — high approval policy parity", () => {
  const submitAndApprove = async (
    args: {
      client: MockConstruktClient;
      w: ReturnType<typeof wallets>;
      project: PublicKey;
      workPackage: PublicKey;
    },
    {
      includeHigh,
    }: {
      includeHigh: boolean;
    },
  ) => {
    const { client, w, project, workPackage } = args;
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
      amount: 100_000n,
      documentRef: "ipfs://invoice-policy",
    });
    await client.approveRequest({
      approver: w.pm,
      project,
      workPackage,
      paymentRequest,
      role: "lowApprover",
      noteRef: "pm note",
    });
    if (includeHigh) {
      await client.approveRequest({
        approver: w.director,
        project,
        workPackage,
        paymentRequest,
        role: "highApprover",
        noteRef: "director note",
      });
    }
    return paymentRequest;
  };

  it("persists highApprovalRequired = true on createWorkPackage", async () => {
    const { client, workPackage } = await seedFundedPackage({
      highApprovalRequired: true,
    });
    const wp = await client.fetchWorkPackage(workPackage);
    expect(wp?.highApprovalRequired).toBe(true);
  });

  it("defaults highApprovalRequired to false on createWorkPackage", async () => {
    const { client, workPackage } = await seedFundedPackage();
    const wp = await client.fetchWorkPackage(workPackage);
    expect(wp?.highApprovalRequired).toBe(false);
  });

  it("createPackageDraft + activateWorkPackage preserves highApprovalRequired", async () => {
    const client = newClient();
    const w = wallets();
    const projectId = 11n;
    const packageId = 11n;
    const project = deriveProjectAddress(PROGRAM_ID, w.finance, projectId);
    const workPackage = deriveWorkPackageAddress(
      PROGRAM_ID,
      project,
      packageId,
    );

    await client.initializeProject({
      authority: w.finance,
      projectId,
      mint: w.mint,
      budgetAmount: PROJECT_BUDGET,
      name: "Draft policy project",
      metadataRef: "ipfs://draft-policy",
    });
    await client.assignProjectDrafter({
      authority: w.finance,
      project,
      wallet: w.pm,
    });
    await client.createPackageDraft({
      drafter: w.pm,
      project,
      packageId,
      capAmount: 500_000n,
      contractor: w.contractor,
      scopeRef: "ipfs://draft-policy-scope",
      highApprovalRequired: true,
    });

    const draft = await client.fetchWorkPackage(workPackage);
    expect(draft?.status).toBe("draft");
    expect(draft?.highApprovalRequired).toBe(true);
    await expect(
      client.fundEscrow({
        authority: w.finance,
        project,
        workPackage,
        amount: 1n,
      }),
    ).rejects.toMatchObject({ code: "InvalidStatus" });

    await client.activateWorkPackage({
      authority: w.finance,
      project,
      workPackage,
    });
    const active = await client.fetchWorkPackage(workPackage);
    expect(active?.status).toBe("active");
    expect(active?.highApprovalRequired).toBe(true);
  });

  it("activateAndFundWorkPackage approves and fully funds a draft in one client action", async () => {
    const client = newClient();
    const w = wallets();
    const projectId = 111n;
    const packageId = 111n;
    const capAmount = 500_000n;
    const project = deriveProjectAddress(PROGRAM_ID, w.finance, projectId);
    const workPackage = deriveWorkPackageAddress(
      PROGRAM_ID,
      project,
      packageId,
    );

    await client.initializeProject({
      authority: w.finance,
      projectId,
      mint: w.mint,
      budgetAmount: PROJECT_BUDGET,
      name: "Atomic activation project",
      metadataRef: "ipfs://atomic-activation",
    });
    await client.assignProjectDrafter({
      authority: w.finance,
      project,
      wallet: w.pm,
    });
    await client.createPackageDraft({
      drafter: w.pm,
      project,
      packageId,
      capAmount,
      contractor: w.contractor,
      scopeRef: "ipfs://atomic-activation-scope",
    });

    await client.activateAndFundWorkPackage({
      authority: w.finance,
      project,
      workPackage,
      amount: capAmount,
    });

    const active = await client.fetchWorkPackage(workPackage);
    expect(active?.status).toBe("active");
    expect(active?.fundedAmount).toBe(capAmount);
    const updatedProject = await client.fetchProject(project);
    expect(updatedProject?.allocatedAmount).toBe(capAmount);
  });

  it("allows PM draft estimates to be assigned to a contractor before activation", async () => {
    const client = newClient();
    const w = wallets();
    const projectId = 12n;
    const packageId = 12n;
    const project = deriveProjectAddress(PROGRAM_ID, w.finance, projectId);
    const workPackage = deriveWorkPackageAddress(
      PROGRAM_ID,
      project,
      packageId,
    );

    await client.initializeProject({
      authority: w.finance,
      projectId,
      mint: w.mint,
      budgetAmount: PROJECT_BUDGET,
      name: "Unassigned draft project",
      metadataRef: "ipfs://unassigned-draft",
    });
    await client.assignProjectDrafter({
      authority: w.finance,
      project,
      wallet: w.pm,
    });
    await client.createPackageDraft({
      drafter: w.pm,
      project,
      packageId,
      capAmount: 500_000n,
      contractor: PublicKey.default,
      scopeRef: "ipfs://unassigned-draft-scope",
    });

    let draft = await client.fetchWorkPackage(workPackage);
    expect(draft?.contractor.equals(PublicKey.default)).toBe(true);
    await expect(
      client.activateWorkPackage({
        authority: w.finance,
        project,
        workPackage,
      }),
    ).rejects.toMatchObject({ code: "InvalidAccountRelationship" });

    await client.setDraftContractor({
      drafter: w.pm,
      project,
      workPackage,
      contractor: w.contractor,
    });
    draft = await client.fetchWorkPackage(workPackage);
    expect(draft?.contractor.equals(w.contractor)).toBe(true);

    await client.activateWorkPackage({
      authority: w.finance,
      project,
      workPackage,
    });
    const active = await client.fetchWorkPackage(workPackage);
    expect(active?.status).toBe("active");
  });

  it("default policy releases on low-only approval", async () => {
    const seeded = await seedFundedPackage();
    const paymentRequest = await submitAndApprove(seeded, {
      includeHigh: false,
    });
    await seeded.client.releasePayment({
      authority: seeded.w.finance,
      project: seeded.project,
      workPackage: seeded.workPackage,
      paymentRequest,
      contractorTokenAccount: Keypair.generate().publicKey,
    });
    const pr = await seeded.client.fetchPaymentRequest(paymentRequest);
    expect(pr?.status).toBe("released");
  });

  it("required-high policy rejects low-only release with HighApprovalRequired", async () => {
    const seeded = await seedFundedPackage({ highApprovalRequired: true });
    const paymentRequest = await submitAndApprove(seeded, {
      includeHigh: false,
    });
    await expect(
      seeded.client.releasePayment({
        authority: seeded.w.finance,
        project: seeded.project,
        workPackage: seeded.workPackage,
        paymentRequest,
        contractorTokenAccount: Keypair.generate().publicKey,
      }),
    ).rejects.toMatchObject({ code: "HighApprovalRequired" });
    const pr = await seeded.client.fetchPaymentRequest(paymentRequest);
    expect(pr?.status).toBe("lowApproved");
  });

  it("required-high policy rejects low-only milestone release with HighApprovalRequired", async () => {
    const seeded = await seedMilestonePackage({ highApprovalRequired: true });
    const paymentRequest = derivePaymentRequestAddress(
      PROGRAM_ID,
      seeded.workPackage,
      1n,
    );
    await seeded.client.submitPaymentRequest({
      contractor: seeded.w.contractor,
      project: seeded.project,
      workPackage: seeded.workPackage,
      requestId: 1n,
      milestone: seeded.milestoneOne,
      amount: 100_000n,
      documentRef: "ipfs://milestone-policy-invoice",
    });
    await seeded.client.approveRequest({
      approver: seeded.w.pm,
      project: seeded.project,
      workPackage: seeded.workPackage,
      paymentRequest,
      role: "lowApprover",
      noteRef: "pm note",
    });

    await expect(
      seeded.client.releasePayment({
        authority: seeded.w.finance,
        project: seeded.project,
        workPackage: seeded.workPackage,
        paymentRequest,
        contractorTokenAccount: Keypair.generate().publicKey,
      }),
    ).rejects.toMatchObject({ code: "HighApprovalRequired" });

    const pr = await seeded.client.fetchPaymentRequest(paymentRequest);
    expect(pr?.status).toBe("lowApproved");
  });

  it("required-high policy releases after low + high approval", async () => {
    const seeded = await seedFundedPackage({ highApprovalRequired: true });
    const paymentRequest = await submitAndApprove(seeded, {
      includeHigh: true,
    });
    await seeded.client.releasePayment({
      authority: seeded.w.finance,
      project: seeded.project,
      workPackage: seeded.workPackage,
      paymentRequest,
      contractorTokenAccount: Keypair.generate().publicKey,
    });
    const pr = await seeded.client.fetchPaymentRequest(paymentRequest);
    expect(pr?.status).toBe("released");
  });

  it("Finance can flip highApprovalRequired both directions", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();

    await client.updateHighApprovalPolicy({
      authority: w.finance,
      project,
      workPackage,
      highApprovalRequired: true,
    });
    expect(
      (await client.fetchWorkPackage(workPackage))?.highApprovalRequired,
    ).toBe(true);

    await client.updateHighApprovalPolicy({
      authority: w.finance,
      project,
      workPackage,
      highApprovalRequired: false,
    });
    expect(
      (await client.fetchWorkPackage(workPackage))?.highApprovalRequired,
    ).toBe(false);
  });

  it("updateHighApprovalPolicy rejects no-op updates", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    await expect(
      client.updateHighApprovalPolicy({
        authority: w.finance,
        project,
        workPackage,
        highApprovalRequired: false,
      }),
    ).rejects.toMatchObject({ code: "RoleAlreadyInRequestedState" });
  });

  it("non-Finance cannot updateHighApprovalPolicy", async () => {
    const { client, w, project, workPackage } = await seedFundedPackage();
    await expect(
      client.updateHighApprovalPolicy({
        authority: w.outsider,
        project,
        workPackage,
        highApprovalRequired: true,
      }),
    ).rejects.toMatchObject({ code: "Unauthorized" });
  });

  it("updateHighApprovalPolicy is blocked while a request is active", async () => {
    const seeded = await seedFundedPackage();
    await submitAndApprove(seeded, { includeHigh: false });

    await expect(
      seeded.client.updateHighApprovalPolicy({
        authority: seeded.w.finance,
        project: seeded.project,
        workPackage: seeded.workPackage,
        highApprovalRequired: true,
      }),
    ).rejects.toMatchObject({ code: "ActiveRequestExists" });

    const wp = await seeded.client.fetchWorkPackage(seeded.workPackage);
    expect(wp?.highApprovalRequired).toBe(false);
  });

  it("updateHighApprovalPolicy is blocked while a milestone request is active", async () => {
    const seeded = await seedMilestonePackage();
    await seeded.client.submitPaymentRequest({
      contractor: seeded.w.contractor,
      project: seeded.project,
      workPackage: seeded.workPackage,
      requestId: 1n,
      milestone: seeded.milestoneOne,
      amount: 100_000n,
      documentRef: "ipfs://milestone-policy-lock",
    });

    await expect(
      seeded.client.updateHighApprovalPolicy({
        authority: seeded.w.finance,
        project: seeded.project,
        workPackage: seeded.workPackage,
        highApprovalRequired: true,
      }),
    ).rejects.toMatchObject({ code: "ActiveRequestExists" });

    const wp = await seeded.client.fetchWorkPackage(seeded.workPackage);
    expect(wp?.highApprovalRequired).toBe(false);
    expect(wp?.reservedRequestAmount).toBe(100_000n);
  });
});
