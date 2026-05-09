import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createFixture, defaultPubkey, expectError, roleSeed } from "./setup";

describe("construkt b6 milestones", () => {
  // These tests share one roomy project for speed. Each case allocates fresh
  // package IDs, and the default fixture budget leaves broad headroom.
  const fx = createFixture();
  let nextPackageId = 200;

  before(async () => {
    await fx.init();
    await fx.initializeProject();
  });

  const createScheduledPackage = async (
    milestoneAmounts: anchor.BN[],
    packageCap = milestoneAmounts.reduce(
      (sum, amount) => sum.add(amount),
      new anchor.BN(0)
    )
  ) => {
    const packageAddresses = await fx.createWorkPackageForTest(
      nextPackageId++,
      fx.contractor.publicKey,
      packageCap
    );

    const milestones = [];
    for (const [index, amount] of milestoneAmounts.entries()) {
      const milestone = await fx.createMilestoneForTest(
        packageAddresses,
        index + 1,
        amount,
        new anchor.BN(1_700_000_000 + index * 1000),
        new anchor.BN(1_700_086_400 + index * 1000),
        `ipfs://milestone-${nextPackageId}-${index + 1}`
      );
      milestones.push(milestone);
    }

    return { packageAddresses, milestones };
  };

  const submitMilestoneRequest = async (params: {
    workPackage: anchor.web3.PublicKey;
    vault: anchor.web3.PublicKey;
    contractorRoleAssignment: anchor.web3.PublicKey;
    requestId: number;
    milestone: anchor.web3.PublicKey;
    amount: anchor.BN;
    documentRef?: string;
  }) => {
    const paymentRequest = fx.derivePaymentRequestAddress(
      params.workPackage,
      params.requestId
    );

    await fx.program.methods
      .submitPaymentRequest(
        new anchor.BN(params.requestId),
        params.amount,
        params.documentRef ?? `ipfs://milestone-request-${params.requestId}`,
        true
      )
      .accountsStrict({
        contractor: fx.contractor.publicKey,
        project: fx.project,
        workPackage: params.workPackage,
        contractorRoleAssignment: params.contractorRoleAssignment,
        paymentRequest,
        milestone: params.milestone,
        vault: params.vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.contractor])
      .rpc();

    return paymentRequest;
  };

  const approveLow = async (
    workPackage: anchor.web3.PublicKey,
    paymentRequest: anchor.web3.PublicKey,
    pmRoleAssignment: anchor.web3.PublicKey,
    noteRef = "ipfs://milestone-approval"
  ) => {
    await fx.program.methods
      .approveRequest({ lowApprover: {} }, noteRef)
      .accountsStrict({
        approver: fx.pm.publicKey,
        project: fx.project,
        workPackage,
        paymentRequest,
        approverRoleAssignment: pmRoleAssignment,
        approvalRecord: fx.deriveApprovalRecordAddress(
          paymentRequest,
          roleSeed.lowApprover
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.pm])
      .rpc();
  };

  const releasePayment = async (
    packageAddresses: {
      workPackage: anchor.web3.PublicKey;
      vaultAuthority: anchor.web3.PublicKey;
      vault: anchor.web3.PublicKey;
    },
    paymentRequest: anchor.web3.PublicKey,
    milestone: anchor.web3.PublicKey
  ) => {
    await fx.program.methods
      .releasePayment()
      .accountsStrict({
        authority: fx.finance.publicKey,
        project: fx.project,
        workPackage: packageAddresses.workPackage,
        paymentRequest,
        milestone,
        vaultAuthority: packageAddresses.vaultAuthority,
        vault: packageAddresses.vault,
        contractorTokenAccount: fx.contractorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  };

  it("requires milestone schedules to sum to the package cap before funding", async () => {
    const packageCap = new anchor.BN(300_000);
    const packageAddresses = await fx.createWorkPackageForTest(
      nextPackageId++,
      fx.contractor.publicKey,
      packageCap
    );

    await fx.createMilestoneForTest(
      packageAddresses,
      1,
      new anchor.BN(100_000),
      new anchor.BN(1_700_000_000),
      new anchor.BN(1_700_086_400)
    );

    await expectError(
      fx.fundPackage(packageAddresses, packageCap),
      "InvalidStatus"
    );

    await fx.createMilestoneForTest(
      packageAddresses,
      2,
      new anchor.BN(200_000),
      new anchor.BN(1_700_086_401),
      new anchor.BN(1_700_172_800)
    );
    await fx.fundPackage(packageAddresses, packageCap);

    const workPackage = await fx.program.account.workPackageAccount.fetch(
      packageAddresses.workPackage
    );
    assert.strictEqual(
      workPackage.allocatedMilestoneAmount.toNumber(),
      packageCap.toNumber()
    );
    assert.strictEqual(workPackage.milestoneCounter.toNumber(), 2);
  });

  it("rejects milestone creation that would exceed the package cap", async () => {
    const packageAddresses = await fx.createWorkPackageForTest(
      nextPackageId++,
      fx.contractor.publicKey,
      new anchor.BN(300_000)
    );

    await fx.createMilestoneForTest(
      packageAddresses,
      1,
      new anchor.BN(200_000),
      new anchor.BN(1_700_000_000),
      new anchor.BN(1_700_086_400)
    );

    await expectError(
      fx.createMilestoneForTest(
        packageAddresses,
        2,
        new anchor.BN(150_000),
        new anchor.BN(1_700_086_401),
        new anchor.BN(1_700_172_800)
      ),
      "InsufficientRemainingCap"
    );
  });

  it("rejects milestone creation after escrow funding has started", async () => {
    const packageAddresses = await fx.createWorkPackageForTest(
      nextPackageId++,
      fx.contractor.publicKey,
      new anchor.BN(300_000)
    );
    await fx.fundPackage(packageAddresses, new anchor.BN(100_000));

    await expectError(
      fx.createMilestoneForTest(
        packageAddresses,
        1,
        new anchor.BN(300_000),
        new anchor.BN(1_700_000_000),
        new anchor.BN(1_700_086_400)
      ),
      "InvalidStatus"
    );
  });

  it("blocks package-level requests once a package enters milestone mode", async () => {
    const { packageAddresses } = await createScheduledPackage([
      new anchor.BN(100_000),
      new anchor.BN(200_000),
    ]);
    await fx.fundPackage(packageAddresses, new anchor.BN(300_000));
    const roles = await fx.assignDefaultRoles(packageAddresses);
    const paymentRequest = fx.derivePaymentRequestAddress(
      packageAddresses.workPackage,
      1
    );

    await expectError(
      fx.program.methods
        .submitPaymentRequest(
          new anchor.BN(1),
          new anchor.BN(50_000),
          "ipfs://package-level-on-milestone-package",
          false
        )
        .accountsStrict({
          contractor: fx.contractor.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          contractorRoleAssignment: roles.contractorRoleAssignment,
          paymentRequest,
          milestone: packageAddresses.workPackage,
          vault: packageAddresses.vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.contractor])
        .rpc(),
      "InvalidStatus"
    );
  });

  it("allows parallel milestone requests on different milestones and blocks duplicates on the same milestone", async () => {
    const { packageAddresses, milestones } = await createScheduledPackage([
      new anchor.BN(100_000),
      new anchor.BN(200_000),
    ]);
    await fx.fundPackage(packageAddresses, new anchor.BN(300_000));
    const roles = await fx.assignDefaultRoles(packageAddresses);

    const firstRequest = await submitMilestoneRequest({
      workPackage: packageAddresses.workPackage,
      vault: packageAddresses.vault,
      contractorRoleAssignment: roles.contractorRoleAssignment,
      requestId: 1,
      milestone: milestones[0],
      amount: new anchor.BN(100_000),
    });

    await expectError(
      fx.program.methods
        .submitPaymentRequest(
          new anchor.BN(2),
          new anchor.BN(10_000),
          "ipfs://duplicate-milestone-request",
          true
        )
        .accountsStrict({
          contractor: fx.contractor.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          contractorRoleAssignment: roles.contractorRoleAssignment,
          paymentRequest: fx.derivePaymentRequestAddress(
            packageAddresses.workPackage,
            2
          ),
          milestone: milestones[0],
          vault: packageAddresses.vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.contractor])
        .rpc(),
      "ActiveRequestExists"
    );

    const secondRequest = await submitMilestoneRequest({
      workPackage: packageAddresses.workPackage,
      vault: packageAddresses.vault,
      contractorRoleAssignment: roles.contractorRoleAssignment,
      requestId: 2,
      milestone: milestones[1],
      amount: new anchor.BN(50_000),
    });

    const workPackage = await fx.program.account.workPackageAccount.fetch(
      packageAddresses.workPackage
    );
    assert.strictEqual(workPackage.requestCounter.toNumber(), 2);
    assert.strictEqual(workPackage.reservedRequestAmount.toNumber(), 150_000);
    assert.isFalse(workPackage.hasActiveRequest);
    assert.ok(workPackage.activeRequest.equals(defaultPubkey));

    const milestoneOne = await fx.program.account.milestoneAccount.fetch(
      milestones[0]
    );
    const milestoneTwo = await fx.program.account.milestoneAccount.fetch(
      milestones[1]
    );
    assert.isTrue(milestoneOne.hasActiveRequest);
    assert.ok(milestoneOne.activeRequest.equals(firstRequest));
    assert.isTrue(milestoneTwo.hasActiveRequest);
    assert.ok(milestoneTwo.activeRequest.equals(secondRequest));
  });

  it("releasing a milestone request updates both milestone and package totals", async () => {
    const { packageAddresses, milestones } = await createScheduledPackage([
      new anchor.BN(100_000),
      new anchor.BN(200_000),
    ]);
    await fx.fundPackage(packageAddresses, new anchor.BN(300_000));
    const roles = await fx.assignDefaultRoles(packageAddresses);

    const paymentRequest = await submitMilestoneRequest({
      workPackage: packageAddresses.workPackage,
      vault: packageAddresses.vault,
      contractorRoleAssignment: roles.contractorRoleAssignment,
      requestId: 1,
      milestone: milestones[0],
      amount: new anchor.BN(100_000),
    });

    await approveLow(
      packageAddresses.workPackage,
      paymentRequest,
      roles.pmRoleAssignment
    );
    await releasePayment(packageAddresses, paymentRequest, milestones[0]);

    const releasedRequest =
      await fx.program.account.paymentRequestAccount.fetch(paymentRequest);
    const releasedMilestone = await fx.program.account.milestoneAccount.fetch(
      milestones[0]
    );
    const untouchedMilestone = await fx.program.account.milestoneAccount.fetch(
      milestones[1]
    );
    const workPackage = await fx.program.account.workPackageAccount.fetch(
      packageAddresses.workPackage
    );

    assert.deepStrictEqual(releasedRequest.status, { released: {} });
    assert.strictEqual(releasedRequest.releasedAmount.toNumber(), 100_000);
    assert.isTrue(releasedRequest.hasMilestone);
    assert.ok(releasedRequest.milestone.equals(milestones[0]));

    assert.strictEqual(releasedMilestone.releasedAmount.toNumber(), 100_000);
    assert.deepStrictEqual(releasedMilestone.status, { completed: {} });
    assert.isFalse(releasedMilestone.hasActiveRequest);
    assert.ok(releasedMilestone.activeRequest.equals(defaultPubkey));

    assert.strictEqual(untouchedMilestone.releasedAmount.toNumber(), 0);
    assert.deepStrictEqual(untouchedMilestone.status, { active: {} });

    assert.strictEqual(workPackage.releasedAmount.toNumber(), 100_000);
    assert.strictEqual(workPackage.reservedRequestAmount.toNumber(), 0);
    assert.deepStrictEqual(workPackage.status, { active: {} });
  });

  it("releasing the final milestone marks the package complete", async () => {
    const { packageAddresses, milestones } = await createScheduledPackage([
      new anchor.BN(100_000),
      new anchor.BN(200_000),
    ]);
    await fx.fundPackage(packageAddresses, new anchor.BN(300_000));
    const roles = await fx.assignDefaultRoles(packageAddresses);

    const firstRequest = await submitMilestoneRequest({
      workPackage: packageAddresses.workPackage,
      vault: packageAddresses.vault,
      contractorRoleAssignment: roles.contractorRoleAssignment,
      requestId: 1,
      milestone: milestones[0],
      amount: new anchor.BN(100_000),
    });
    await approveLow(
      packageAddresses.workPackage,
      firstRequest,
      roles.pmRoleAssignment,
      "ipfs://milestone-1-approval"
    );
    await releasePayment(packageAddresses, firstRequest, milestones[0]);

    const secondRequest = await submitMilestoneRequest({
      workPackage: packageAddresses.workPackage,
      vault: packageAddresses.vault,
      contractorRoleAssignment: roles.contractorRoleAssignment,
      requestId: 2,
      milestone: milestones[1],
      amount: new anchor.BN(200_000),
    });
    await approveLow(
      packageAddresses.workPackage,
      secondRequest,
      roles.pmRoleAssignment,
      "ipfs://milestone-2-approval"
    );
    await releasePayment(packageAddresses, secondRequest, milestones[1]);

    const workPackage = await fx.program.account.workPackageAccount.fetch(
      packageAddresses.workPackage
    );
    const finalMilestone = await fx.program.account.milestoneAccount.fetch(
      milestones[1]
    );
    assert.strictEqual(workPackage.releasedAmount.toNumber(), 300_000);
    assert.strictEqual(workPackage.reservedRequestAmount.toNumber(), 0);
    assert.deepStrictEqual(workPackage.status, { completed: {} });
    assert.strictEqual(finalMilestone.releasedAmount.toNumber(), 200_000);
    assert.deepStrictEqual(finalMilestone.status, { completed: {} });
  });
});
