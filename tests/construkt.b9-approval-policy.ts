import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createFixture, expectError, roleSeed } from "./setup";

describe("construkt b9 approval policy", () => {
  const fx = createFixture();
  let nextPackageId = 900;

  type PackageAddresses = {
    workPackage: anchor.web3.PublicKey;
    vaultAuthority: anchor.web3.PublicKey;
    vault: anchor.web3.PublicKey;
  };

  type PreparedRequest = {
    packageAddresses: PackageAddresses;
    paymentRequest: anchor.web3.PublicKey;
    contractorRoleAssignment: anchor.web3.PublicKey;
    pmRoleAssignment: anchor.web3.PublicKey;
    directorRoleAssignment: anchor.web3.PublicKey;
    amount: anchor.BN;
  };

  before(async () => {
    await fx.init();
    await fx.initializeProject();
  });

  const submitRequest = async (
    packageAddresses: PackageAddresses,
    contractorRoleAssignment: anchor.web3.PublicKey,
    amount: anchor.BN
  ) => {
    const paymentRequest = fx.derivePaymentRequestAddress(
      packageAddresses.workPackage,
      1
    );

    await fx.program.methods
      .submitPaymentRequest(
        new anchor.BN(1),
        amount,
        "ipfs://invoice-b9",
        false
      )
      .accountsStrict({
        contractor: fx.contractor.publicKey,
        project: fx.project,
        workPackage: packageAddresses.workPackage,
        contractorRoleAssignment,
        paymentRequest,
        milestone: packageAddresses.workPackage,
        vault: packageAddresses.vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.contractor])
      .rpc();

    return paymentRequest;
  };

  const approvePm = async (prepared: PreparedRequest) => {
    await fx.program.methods
      .approveRequest({ lowApprover: {} }, "ipfs://pm-policy-note")
      .accountsStrict({
        approver: fx.pm.publicKey,
        project: fx.project,
        workPackage: prepared.packageAddresses.workPackage,
        paymentRequest: prepared.paymentRequest,
        approverRoleAssignment: prepared.pmRoleAssignment,
        approvalRecord: fx.deriveApprovalRecordAddress(
          prepared.paymentRequest,
          roleSeed.lowApprover
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.pm])
      .rpc();
  };

  const approveHigh = async (prepared: PreparedRequest) => {
    await fx.program.methods
      .approveRequest({ highApprover: {} }, "ipfs://director-policy-note")
      .accountsStrict({
        approver: fx.director.publicKey,
        project: fx.project,
        workPackage: prepared.packageAddresses.workPackage,
        paymentRequest: prepared.paymentRequest,
        approverRoleAssignment: prepared.directorRoleAssignment,
        approvalRecord: fx.deriveApprovalRecordAddress(
          prepared.paymentRequest,
          roleSeed.highApprover
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.director])
      .rpc();
  };

  const releasePayment = async (prepared: PreparedRequest) =>
    fx.program.methods
      .releasePayment()
      .accountsStrict({
        authority: fx.finance.publicKey,
        project: fx.project,
        workPackage: prepared.packageAddresses.workPackage,
        paymentRequest: prepared.paymentRequest,
        milestone: prepared.packageAddresses.workPackage,
        vaultAuthority: prepared.packageAddresses.vaultAuthority,
        vault: prepared.packageAddresses.vault,
        contractorTokenAccount: fx.contractorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

  const prepareRequest = async (
    highApprovalRequired: boolean
  ): Promise<PreparedRequest> => {
    const amount = new anchor.BN(100_000);
    const packageCap = new anchor.BN(200_000);
    const packageAddresses = await fx.createWorkPackageForTest(
      nextPackageId++,
      fx.contractor.publicKey,
      packageCap,
      "ipfs://b9-scope",
      highApprovalRequired
    );
    await fx.fundPackage(packageAddresses, packageCap);
    const roles = await fx.assignDefaultRoles(packageAddresses);
    const paymentRequest = await submitRequest(
      packageAddresses,
      roles.contractorRoleAssignment,
      amount
    );
    return {
      packageAddresses,
      paymentRequest,
      amount,
      ...roles,
    };
  };

  it("default policy stores high_approval_required = false on the work package", async () => {
    const prepared = await prepareRequest(false);
    const wp = await fx.program.account.workPackageAccount.fetch(
      prepared.packageAddresses.workPackage
    );
    assert.isFalse(wp.highApprovalRequired);
  });

  it("required-high policy stores high_approval_required = true on the work package", async () => {
    const prepared = await prepareRequest(true);
    const wp = await fx.program.account.workPackageAccount.fetch(
      prepared.packageAddresses.workPackage
    );
    assert.isTrue(wp.highApprovalRequired);
  });

  it("default policy releases after PM (low) approval alone", async () => {
    const prepared = await prepareRequest(false);
    await approvePm(prepared);
    await releasePayment(prepared);

    const requestAccount = await fx.program.account.paymentRequestAccount.fetch(
      prepared.paymentRequest
    );
    assert.deepStrictEqual(requestAccount.status, { released: {} });
  });

  it("required-high policy blocks release after PM-only approval", async () => {
    const prepared = await prepareRequest(true);
    await approvePm(prepared);

    await expectError(releasePayment(prepared), "HighApprovalRequired");

    const requestAccount = await fx.program.account.paymentRequestAccount.fetch(
      prepared.paymentRequest
    );
    assert.deepStrictEqual(requestAccount.status, { lowApproved: {} });
  });

  it("required-high policy releases after PM and high approval", async () => {
    const prepared = await prepareRequest(true);
    await approvePm(prepared);
    await approveHigh(prepared);
    await releasePayment(prepared);

    const requestAccount = await fx.program.account.paymentRequestAccount.fetch(
      prepared.paymentRequest
    );
    assert.deepStrictEqual(requestAccount.status, { released: {} });
  });

  const updatePolicy = (
    workPackage: anchor.web3.PublicKey,
    highApprovalRequired: boolean,
    authority: anchor.web3.Keypair = fx.finance
  ) =>
    fx.program.methods
      .updateHighApprovalPolicy(highApprovalRequired)
      .accountsStrict({
        authority: authority.publicKey,
        project: fx.project,
        workPackage,
      })
      .signers(authority === fx.finance ? [] : [authority])
      .rpc();

  it("Finance can flip high_approval_required when no request is active", async () => {
    const packageAddresses = await fx.createWorkPackageForTest(
      nextPackageId++,
      fx.contractor.publicKey,
      new anchor.BN(200_000),
      "ipfs://b9-policy-update",
      false
    );

    await updatePolicy(packageAddresses.workPackage, true);

    let wp = await fx.program.account.workPackageAccount.fetch(
      packageAddresses.workPackage
    );
    assert.isTrue(wp.highApprovalRequired);

    await updatePolicy(packageAddresses.workPackage, false);

    wp = await fx.program.account.workPackageAccount.fetch(
      packageAddresses.workPackage
    );
    assert.isFalse(wp.highApprovalRequired);
  });

  it("non-Finance cannot flip high_approval_required", async () => {
    const packageAddresses = await fx.createWorkPackageForTest(
      nextPackageId++,
      fx.contractor.publicKey,
      new anchor.BN(200_000),
      "ipfs://b9-policy-unauth",
      false
    );

    await expectError(
      updatePolicy(packageAddresses.workPackage, true, fx.unrelatedUser),
      "Unauthorized"
    );
  });

  it("flipping high_approval_required is blocked while a request is active", async () => {
    const prepared = await prepareRequest(false);

    await expectError(
      updatePolicy(prepared.packageAddresses.workPackage, true),
      "ActiveRequestExists"
    );

    const wp = await fx.program.account.workPackageAccount.fetch(
      prepared.packageAddresses.workPackage
    );
    assert.isFalse(wp.highApprovalRequired);
  });
});
