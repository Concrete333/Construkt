import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createFixture, defaultPubkey, expectError, roleSeed } from "./setup";

describe("construkt b3 payment requests and approvals", () => {
  const fx = createFixture();
  let packageAddresses: {
    workPackage: anchor.web3.PublicKey;
    vaultAuthority: anchor.web3.PublicKey;
    vault: anchor.web3.PublicKey;
  };
  let contractorRoleAssignment: anchor.web3.PublicKey;
  let pmRoleAssignment: anchor.web3.PublicKey;
  let directorRoleAssignment: anchor.web3.PublicKey;
  let paymentRequest: anchor.web3.PublicKey;

  before(async () => {
    await fx.init();
    await fx.initializeProject();
    packageAddresses = await fx.createWorkPackageForTest(1);
    await fx.fundPackage(packageAddresses);
    const roles = await fx.assignDefaultRoles(packageAddresses);
    contractorRoleAssignment = roles.contractorRoleAssignment;
    pmRoleAssignment = roles.pmRoleAssignment;
    directorRoleAssignment = roles.directorRoleAssignment;
  });

  it("submit request with empty document reference fails", async () => {
    const targetRequest = fx.derivePaymentRequestAddress(
      packageAddresses.workPackage,
      1
    );

    await expectError(
      fx.program.methods
        .submitPaymentRequest(new anchor.BN(1), new anchor.BN(100_000), "")
        .accountsStrict({
          contractor: fx.contractor.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          contractorRoleAssignment,
          paymentRequest: targetRequest,
          vault: packageAddresses.vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.contractor])
        .rpc(),
      "MissingDocumentReference"
    );
  });

  it("rejects request id that does not match the next counter", async () => {
    const mismatchedRequest = fx.derivePaymentRequestAddress(
      packageAddresses.workPackage,
      99
    );

    await expectError(
      fx.program.methods
        .submitPaymentRequest(
          new anchor.BN(99),
          new anchor.BN(100_000),
          "ipfs://wrong-id"
        )
        .accountsStrict({
          contractor: fx.contractor.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          contractorRoleAssignment,
          paymentRequest: mismatchedRequest,
          vault: packageAddresses.vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.contractor])
        .rpc(),
      "InvalidRequestId"
    );
  });

  it("contractor submits payment request", async () => {
    paymentRequest = fx.derivePaymentRequestAddress(
      packageAddresses.workPackage,
      1
    );

    await fx.program.methods
      .submitPaymentRequest(
        new anchor.BN(1),
        new anchor.BN(100_000),
        "ipfs://invoice-001"
      )
      .accountsStrict({
        contractor: fx.contractor.publicKey,
        project: fx.project,
        workPackage: packageAddresses.workPackage,
        contractorRoleAssignment,
        paymentRequest,
        vault: packageAddresses.vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.contractor])
      .rpc();

    const prAccount = await fx.program.account.paymentRequestAccount.fetch(
      paymentRequest
    );
    assert.ok(prAccount.workPackage.equals(packageAddresses.workPackage));
    assert.strictEqual(prAccount.requestId.toNumber(), 1);
    assert.ok(prAccount.contractor.equals(fx.contractor.publicKey));
    assert.strictEqual(prAccount.amount.toNumber(), 100_000);
    assert.strictEqual(prAccount.documentRef, "ipfs://invoice-001");
    assert.deepStrictEqual(prAccount.status, { submitted: {} });
    assert.isFalse(prAccount.holdActive);

    const wpAccount = await fx.program.account.workPackageAccount.fetch(
      packageAddresses.workPackage
    );
    assert.isTrue(wpAccount.hasActiveRequest);
    assert.ok(wpAccount.activeRequest.equals(paymentRequest));
    assert.strictEqual(wpAccount.requestCounter.toNumber(), 1);
  });

  it("non-contractor cannot submit payment request", async () => {
    const fakeContractorRole = fx.roleAssignmentAddressForPackage(
      packageAddresses.workPackage,
      roleSeed.contractor,
      fx.unrelatedUser.publicKey
    );
    const fakeRequest = fx.derivePaymentRequestAddress(
      packageAddresses.workPackage,
      2
    );

    await expectError(
      fx.program.methods
        .submitPaymentRequest(
          new anchor.BN(2),
          new anchor.BN(100_000),
          "ipfs://fake"
        )
        .accountsStrict({
          contractor: fx.unrelatedUser.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          contractorRoleAssignment: fakeContractorRole,
          paymentRequest: fakeRequest,
          vault: packageAddresses.vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.unrelatedUser])
        .rpc(),
      "AccountNotInitialized"
    );
  });

  it("contractor cannot submit second active request", async () => {
    const secondRequest = fx.derivePaymentRequestAddress(
      packageAddresses.workPackage,
      2
    );

    await expectError(
      fx.program.methods
        .submitPaymentRequest(
          new anchor.BN(2),
          new anchor.BN(50_000),
          "ipfs://invoice-002"
        )
        .accountsStrict({
          contractor: fx.contractor.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          contractorRoleAssignment,
          paymentRequest: secondRequest,
          vault: packageAddresses.vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.contractor])
        .rpc(),
      "ActiveRequestExists"
    );
  });

  it("contractor can update document reference", async () => {
    await fx.program.methods
      .addDocumentReference("ipfs://invoice-001-v2")
      .accountsStrict({
        contractor: fx.contractor.publicKey,
        project: fx.project,
        workPackage: packageAddresses.workPackage,
        paymentRequest,
        contractorRoleAssignment,
      })
      .signers([fx.contractor])
      .rpc();

    const prAccount = await fx.program.account.paymentRequestAccount.fetch(
      paymentRequest
    );
    assert.strictEqual(prAccount.documentRef, "ipfs://invoice-001-v2");

    await expectError(
      fx.program.methods
        .addDocumentReference("ipfs://invoice-001-v2")
        .accountsStrict({
          contractor: fx.contractor.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          paymentRequest,
          contractorRoleAssignment,
        })
        .signers([fx.contractor])
        .rpc(),
      "DocumentReferenceUnchanged"
    );
  });

  it("contractor with approver role cannot approve own request", async () => {
    const selfApprovalPackage = await fx.createWorkPackageForTest(30);
    await fx.fundPackage(selfApprovalPackage, new anchor.BN(200_000));
    const contractorRole = await fx.assignRole(
      selfApprovalPackage,
      { contractor: {} },
      roleSeed.contractor,
      fx.contractor.publicKey
    );
    const contractorLowApproverRole = await fx.assignRole(
      selfApprovalPackage,
      { lowApprover: {} },
      roleSeed.lowApprover,
      fx.contractor.publicKey
    );
    const selfApprovalRequest = fx.derivePaymentRequestAddress(
      selfApprovalPackage.workPackage,
      1
    );

    await fx.program.methods
      .submitPaymentRequest(
        new anchor.BN(1),
        new anchor.BN(50_000),
        "ipfs://self-test"
      )
      .accountsStrict({
        contractor: fx.contractor.publicKey,
        project: fx.project,
        workPackage: selfApprovalPackage.workPackage,
        contractorRoleAssignment: contractorRole,
        paymentRequest: selfApprovalRequest,
        vault: selfApprovalPackage.vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.contractor])
      .rpc();

    await expectError(
      fx.program.methods
        .approveRequest({ lowApprover: {} }, "")
        .accountsStrict({
          approver: fx.contractor.publicKey,
          project: fx.project,
          workPackage: selfApprovalPackage.workPackage,
          paymentRequest: selfApprovalRequest,
          approverRoleAssignment: contractorLowApproverRole,
          approvalRecord: fx.deriveApprovalRecordAddress(
            selfApprovalRequest,
            roleSeed.lowApprover
          ),
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.contractor])
        .rpc(),
      "ContractorCannotApprove"
    );
  });

  it("director cannot approve before PM", async () => {
    await expectError(
      fx.program.methods
        .approveRequest({ highApprover: {} }, "")
        .accountsStrict({
          approver: fx.director.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          paymentRequest,
          approverRoleAssignment: directorRoleAssignment,
          approvalRecord: fx.deriveApprovalRecordAddress(
            paymentRequest,
            roleSeed.highApprover
          ),
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.director])
        .rpc(),
      "InvalidApprovalOrder"
    );
  });

  it("inactive approver cannot approve", async () => {
    const inactiveTestPackage = await fx.createWorkPackageForTest(31);
    await fx.fundPackage(inactiveTestPackage, new anchor.BN(200_000));
    const contractorRole = await fx.assignRole(
      inactiveTestPackage,
      { contractor: {} },
      roleSeed.contractor,
      fx.contractor.publicKey
    );
    const pm2LowApproverRole = await fx.assignRole(
      inactiveTestPackage,
      { lowApprover: {} },
      roleSeed.lowApprover,
      fx.pm2.publicKey
    );
    const inactiveTestRequest = fx.derivePaymentRequestAddress(
      inactiveTestPackage.workPackage,
      1
    );

    await fx.program.methods
      .submitPaymentRequest(
        new anchor.BN(1),
        new anchor.BN(50_000),
        "ipfs://inactive-test"
      )
      .accountsStrict({
        contractor: fx.contractor.publicKey,
        project: fx.project,
        workPackage: inactiveTestPackage.workPackage,
        contractorRoleAssignment: contractorRole,
        paymentRequest: inactiveTestRequest,
        vault: inactiveTestPackage.vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.contractor])
      .rpc();

    await fx.program.methods
      .setRoleActive(false)
      .accountsStrict({
        authority: fx.finance.publicKey,
        project: fx.project,
        workPackage: inactiveTestPackage.workPackage,
        roleAssignment: pm2LowApproverRole,
      })
      .rpc();

    await expectError(
      fx.program.methods
        .approveRequest({ lowApprover: {} }, "")
        .accountsStrict({
          approver: fx.pm2.publicKey,
          project: fx.project,
          workPackage: inactiveTestPackage.workPackage,
          paymentRequest: inactiveTestRequest,
          approverRoleAssignment: pm2LowApproverRole,
          approvalRecord: fx.deriveApprovalRecordAddress(
            inactiveTestRequest,
            roleSeed.lowApprover
          ),
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.pm2])
        .rpc(),
      "InactiveRoleAssignment"
    );
  });

  it("PM approves first", async () => {
    const pmApprovalRecord = fx.deriveApprovalRecordAddress(
      paymentRequest,
      roleSeed.lowApprover
    );

    await fx.program.methods
      .approveRequest({ lowApprover: {} }, "ipfs://pm-note")
      .accountsStrict({
        approver: fx.pm.publicKey,
        project: fx.project,
        workPackage: packageAddresses.workPackage,
        paymentRequest,
        approverRoleAssignment: pmRoleAssignment,
        approvalRecord: pmApprovalRecord,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.pm])
      .rpc();

    const prAccount = await fx.program.account.paymentRequestAccount.fetch(
      paymentRequest
    );
    assert.deepStrictEqual(prAccount.status, { lowApproved: {} });

    const approvalAccount = await fx.program.account.approvalRecord.fetch(
      pmApprovalRecord
    );
    assert.ok(approvalAccount.approver.equals(fx.pm.publicKey));
    assert.deepStrictEqual(approvalAccount.role, { lowApprover: {} });
    assert.deepStrictEqual(approvalAccount.decision, { approved: {} });
  });

  it("PM duplicate approval fails at the approval PDA", async () => {
    await expectError(
      fx.program.methods
        .approveRequest({ lowApprover: {} }, "")
        .accountsStrict({
          approver: fx.pm.publicKey,
          project: fx.project,
          workPackage: packageAddresses.workPackage,
          paymentRequest,
          approverRoleAssignment: pmRoleAssignment,
          approvalRecord: fx.deriveApprovalRecordAddress(
            paymentRequest,
            roleSeed.lowApprover
          ),
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fx.pm])
        .rpc(),
      "already in use"
    );
  });

  it("director approves second", async () => {
    const directorApprovalRecord = fx.deriveApprovalRecordAddress(
      paymentRequest,
      roleSeed.highApprover
    );

    await fx.program.methods
      .approveRequest({ highApprover: {} }, "ipfs://director-note")
      .accountsStrict({
        approver: fx.director.publicKey,
        project: fx.project,
        workPackage: packageAddresses.workPackage,
        paymentRequest,
        approverRoleAssignment: directorRoleAssignment,
        approvalRecord: directorApprovalRecord,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.director])
      .rpc();

    const prAccount = await fx.program.account.paymentRequestAccount.fetch(
      paymentRequest
    );
    assert.deepStrictEqual(prAccount.status, { highApproved: {} });

    const approvalAccount = await fx.program.account.approvalRecord.fetch(
      directorApprovalRecord
    );
    assert.ok(approvalAccount.approver.equals(fx.director.publicKey));
    assert.deepStrictEqual(approvalAccount.role, { highApprover: {} });
    assert.deepStrictEqual(approvalAccount.decision, { approved: {} });
  });

  it("PM can reject a submitted request", async () => {
    const rejectTestPackage = await fx.createWorkPackageForTest(32);
    await fx.fundPackage(rejectTestPackage, new anchor.BN(200_000));
    const contractorRole = await fx.assignRole(
      rejectTestPackage,
      { contractor: {} },
      roleSeed.contractor,
      fx.contractor.publicKey
    );
    const pmRole = await fx.assignRole(
      rejectTestPackage,
      { lowApprover: {} },
      roleSeed.lowApprover,
      fx.pm.publicKey
    );
    const rejectTestRequest = fx.derivePaymentRequestAddress(
      rejectTestPackage.workPackage,
      1
    );

    await fx.program.methods
      .submitPaymentRequest(
        new anchor.BN(1),
        new anchor.BN(50_000),
        "ipfs://reject-test"
      )
      .accountsStrict({
        contractor: fx.contractor.publicKey,
        project: fx.project,
        workPackage: rejectTestPackage.workPackage,
        contractorRoleAssignment: contractorRole,
        paymentRequest: rejectTestRequest,
        vault: rejectTestPackage.vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.contractor])
      .rpc();

    const rejectApprovalRecord = fx.deriveApprovalRecordAddress(
      rejectTestRequest,
      roleSeed.lowApprover
    );

    await fx.program.methods
      .rejectRequest({ lowApprover: {} }, "ipfs://rejection-note")
      .accountsStrict({
        approver: fx.pm.publicKey,
        project: fx.project,
        workPackage: rejectTestPackage.workPackage,
        paymentRequest: rejectTestRequest,
        approverRoleAssignment: pmRole,
        approvalRecord: rejectApprovalRecord,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fx.pm])
      .rpc();

    const prAccount = await fx.program.account.paymentRequestAccount.fetch(
      rejectTestRequest
    );
    assert.deepStrictEqual(prAccount.status, { rejected: {} });

    const wpAccount = await fx.program.account.workPackageAccount.fetch(
      rejectTestPackage.workPackage
    );
    assert.isFalse(wpAccount.hasActiveRequest);
    assert.ok(wpAccount.activeRequest.equals(defaultPubkey));

    const approvalAccount = await fx.program.account.approvalRecord.fetch(
      rejectApprovalRecord
    );
    assert.deepStrictEqual(approvalAccount.decision, { rejected: {} });
  });
});
